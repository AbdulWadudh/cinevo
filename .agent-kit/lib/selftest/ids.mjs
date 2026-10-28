/** selftest/ids.mjs — the local allocator, and the fixture the id scenarios share */
import fs from "node:fs";
import { PROJECT, SCRIPT_ROOT, TASKS } from "../consts.mjs";
import { cmdDoctor } from "../doctor/index.mjs";
import { abs, git, read, run, write } from "../io.mjs";
import { cmdSetup } from "../setup.mjs";
import { cmdTaskNew, cmdTaskRenumber } from "../tasks/index.mjs";
import { activeTasks, idsMode, nextId } from "../taskfile.mjs";

const json = (ctx, dir) =>
	JSON.parse(ctx.captured(() => cmdDoctor({ root: dir, jsonOut: true })));

export const row = (ctx, dir, name) => json(ctx, dir).rows.find((r) => r.name === name);

export const cli = (dir, args) =>
	run(
		`"${process.execPath}" "${abs(dir, ".agent-kit/agent-kit.mjs")}" ${args}`,
		dir,
		60000,
	);

/** A throwaway repo with a real git history, so a close has a baseline and a remote. */
export async function fixture(ctx, name, { ids } = {}) {
	const dir = abs(ctx.tmp, name);
	write(
		abs(dir, "package.json"),
		JSON.stringify(
			{
				name,
				scripts: { build: 'node -e ""', lint: 'node -e ""', test: 'node -e ""' },
			},
			null,
			2,
		),
	);
	write(abs(dir, "src/index.ts"), "export const x = 1;\n");
	git(dir, ["init", "-q"]);
	git(dir, ["config", "user.email", "t@t"]);
	git(dir, ["config", "user.name", "t"]);
	git(dir, ["remote", "add", "origin", "https://github.com/selftest/fixture.git"]);
	const code = await ctx.quietAsync(() =>
		cmdSetup({
			target: dir,
			sourceRoot: SCRIPT_ROOT,
			noRtk: true,
			home: abs(ctx.tmp, "no-home"),
			pathEnv: "",
			ids,
		}),
	);
	git(dir, ["add", "-A"]);
	git(dir, ["commit", "-qm", "install"]);
	return { dir, code };
}

/** Stub `fetch` so the suite never leaves the machine; the calls array is the witness. */
export function stubFetch(handler) {
	const real = globalThis.fetch;
	const calls = [];
	globalThis.fetch = async (url, opts = {}) => {
		const call = {
			url: String(url),
			method: opts.method || "GET",
			body: opts.body ? JSON.parse(opts.body) : null,
		};
		calls.push(call);
		const r = handler(call);
		return {
			ok: r.status < 400,
			status: r.status,
			text: async () => JSON.stringify(r.body),
		};
	};
	return { calls, restore: () => (globalThis.fetch = real) };
}

export async function localIdScenarios(ctx) {
	const { assert, quiet } = ctx;
	console.log("\n35. a local id is derived from the files, so no cell can go stale");
	const spy = stubFetch(() => ({ status: 500, body: {} }));
	const { dir, code } = await fixture(ctx, "ids-local");
	assert(code === 0, "setup exits 0 in local mode");
	assert(idsMode(dir) === "local", "setup records ids: local in project.md");
	assert(nextId(dir) === 101, "an empty repo starts at TASK-101");

	assert(
		quiet(() =>
			cmdTaskNew({ root: dir, slug: "first", lane: "quick", noBaseline: true }),
		) === 0,
		"a local task opens",
	);
	const first = activeTasks(dir)[0];
	assert(first.fm.id === "TASK-101", "the first id is TASK-101");
	assert(nextId(dir) === 102, "the next id is one past the highest on disk");
	write(abs(dir, `${TASKS}/.counter`), "5\n");
	assert(
		nextId(dir) === 102,
		"a stale .counter is ignored: the files are the only source",
	);
	fs.rmSync(abs(dir, `${TASKS}/.counter`));
	assert(spy.calls.length === 0, "local mode never calls the network");
	spy.restore();

	// Two clones that each minted 101 merge into one tree. The gate names both files; the fix
	// moves one, and the id it moves to is derived, not typed by hand.
	const active = abs(dir, `${TASKS}/active`);
	const dupName = first.file.replace(/-(TASK-\d+)-/, "-$1-dup-");
	fs.copyFileSync(abs(active, first.file), abs(active, dupName));
	assert(
		row(ctx, dir, "task ids unique").status === "FAIL",
		"doctor fails two files under one id",
	);
	const ambiguous = cli(dir, "task renumber TASK-101 --next");
	assert(
		ambiguous.code === 1 && ambiguous.out.includes("--file"),
		"a duplicate id names both files instead of guessing",
	);
	assert(
		quiet(() =>
			cmdTaskRenumber({
				root: dir,
				oldId: "TASK-101",
				next: true,
				file: dupName,
			}),
		) === 0,
		"renumber --file moves the one that was named",
	);
	const renamed = fs.readdirSync(active).find((f) => f.includes("-dup-"));
	assert(
		renamed.includes("TASK-102") &&
			read(abs(active, renamed)).startsWith("---\nid: TASK-102"),
		"the duplicate takes the next free id, in its front matter and its name",
	);
	assert(
		fs.readdirSync(active).includes(first.file),
		"the original keeps its id",
	);
	assert(
		row(ctx, dir, "task ids unique").status === "PASS",
		"one id, one file again",
	);

	const projectText = read(abs(dir, PROJECT));
	write(
		abs(dir, PROJECT),
		projectText.replace("| ids | local |", "| ids | remote |"),
	);
	assert(
		row(ctx, dir, "task ids").status === "FAIL",
		"an unknown id mode fails, so the row can bind",
	);
	write(abs(dir, PROJECT), projectText);

	const publish = cli(dir, "task publish");
	assert(
		publish.code === 1 && publish.out.includes("ids: local"),
		"task publish refuses a repo whose ids are its own",
	);
	const switching = cli(dir, `setup "${dir}" --no-rtk --ids issue`);
	assert(
		switching.code === 1 && switching.out.includes("before switching"),
		"setup refuses to switch the id mode while a task is open",
	);
}
