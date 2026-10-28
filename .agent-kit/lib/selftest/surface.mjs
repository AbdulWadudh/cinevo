/** selftest/surface.mjs — a harness skill file points at the root skill */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { SCRIPT_ROOT } from "../consts.mjs";
import { cmdDoctor } from "../doctor/index.mjs";
import { cmdHarnesses, detectHarnesses, harnessLines } from "../env.mjs";
import { cmdTaskGuard } from "../guard.mjs";
import { abs, exists, git, read, write } from "../io.mjs";
import { cmdSetup } from "../setup.mjs";

export function pointersScenario(ctx) {
	const { tmp, assert, quiet } = ctx;
	console.log("\n15. a harness skill file points at the root skill");
	write(
		abs(tmp, ".claude/skills/agent-kit/SKILL.md"),
		"---\nname: agent-kit\ndescription: pointer\n---\n\nRead `.agent-kit/SKILL.md` at the repository root.\n",
	);
	assert(
		quiet(() => cmdDoctor({ root: tmp })) === 0,
		"a short pointer passes",
	);
	write(
		abs(tmp, ".claude/skills/agent-kit/SKILL.md"),
		`---\nname: agent-kit\ndescription: pointer\n---\n\nRead \`.agent-kit/SKILL.md\` at the repository root.\n\n${Array.from(
			{ length: 150 },
			() => "a",
		).join("\n")}\n`,
	);
	assert(
		quiet(() => cmdDoctor({ root: tmp })) === 0,
		"150 one-word lines pass: the pointer cap counts characters, not lines",
	);
	write(
		abs(tmp, ".claude/skills/agent-kit/SKILL.md"),
		read(abs(tmp, ".agent-kit/SKILL.md")),
	);
	assert(
		quiet(() => cmdDoctor({ root: tmp })) === 1,
		"a copy of the loop fails, so it cannot drift",
	);
	fs.rmSync(abs(tmp, ".claude"), { recursive: true, force: true });
}

export function identityScenario(ctx) {
	const { tmp, assert, quiet } = ctx;
	console.log("\n16. commits carry the owner's identity only");
	git(tmp, ["config", "user.email", "owner@example.com"]);
	git(tmp, ["config", "user.name", "Owner"]);
	git(tmp, ["add", "-A"]);
	git(tmp, ["commit", "-q", "-m", "chore: owner commit"]);
	assert(
		quiet(() => cmdDoctor({ root: tmp })) === 0,
		"another human author warns, it does not fail a repo",
	);
	git(tmp, [
		"commit",
		"-q",
		"--allow-empty",
		"-m",
		"chore: x\n\nCo-Authored-By: Agent <agent@local>",
	]);
	assert(
		quiet(() => cmdDoctor({ root: tmp })) === 1,
		"an AI trailer fails, so the rule cannot silently lapse",
	);
}

export function machineScenarios(ctx) {
	const { tmp, assert, quiet } = ctx;
	console.log(
		"\n18. harnesses are found on the machine, not only in the repo",
	);
	const fakeHome = abs(tmp, "fake-home");
	fs.mkdirSync(abs(fakeHome, ".claude"), { recursive: true });
	fs.mkdirSync(abs(fakeHome, ".codex"), { recursive: true });
	fs.mkdirSync(abs(tmp, ".cursor"), { recursive: true });
	const found = detectHarnesses(tmp, fakeHome, "");
	const names = found.map((h) => h.name);
	assert(names.includes("Claude Code"), "a HOME config dir is a signal");
	assert(names.includes("Codex CLI"), "PATH is not the only signal");
	assert(names.includes("Cursor"), "a repo marker is a signal");
	assert(!names.includes("Windsurf"), "an absent harness is not reported");
	assert(
		harnessLines(found).join("\n").includes("Claude Code"),
		"the report names what was found",
	);
	assert(
		quiet(() => cmdHarnesses({ root: tmp, home: fakeHome, pathEnv: "" })) ===
			0,
		"harnesses exits 0",
	);
	console.log(
		"\n19. the commit message names the task and carries a summary",
	);
	const msgDir = fs.mkdtempSync(path.join(os.tmpdir(), "agent-kit-msg-"));
	const guardMsg = (text) => {
		const p = abs(msgDir, "msg.txt");
		write(p, text);
		const out = [];
		const log = console.log;
		const err = console.error;
		console.log = () => {};
		console.error = (s) => out.push(String(s));
		try {
			return {
				code: cmdTaskGuard({ root: tmp, message: p }),
				out: out.join("\n"),
			};
		} finally {
			console.log = log;
			console.error = err;
		}
	};
	const valid = guardMsg(
		"fix (TASK-101): close the scope gap\n\nTASK-101 — fixture change\n",
	);
	assert(
		valid.code === 0 && !valid.out,
		"a typed subject naming a known task, with a body, passes in silence",
	);
	const merged = guardMsg("Merge branch 'main' into fixture\n");
	assert(
		merged.code === 0 && !merged.out,
		"a merge message is not a session's commit",
	);
	const noBody = guardMsg("fix (TASK-101): close the scope gap\n");
	assert(
		noBody.code === 0 &&
			noBody.out.includes("commit message warning") &&
			noBody.out.includes("The body is empty"),
		"a subject with no body warns and lets the commit through",
	);
	const unknown = guardMsg(
		"fix (TASK-999): close the scope gap\n\nsummary\n",
	);
	assert(
		unknown.code === 0 && unknown.out.includes("TASK-999 is not a task"),
		"an unknown task ID warns and lets the commit through",
	);
	const untyped = guardMsg("update the guard\n\nsummary\n");
	assert(
		untyped.code === 0 && untyped.out.includes("commit message warning"),
		"a subject with no type or task warns and lets the commit through",
	);
	fs.rmSync(msgDir, { recursive: true, force: true });
}

export function setupPointerScenario(ctx) {
	const { tmp, assert, captured, quiet } = ctx;
	console.log("\n30. setup writes the pointer a harness discovers");
	const ptrTarget = abs(tmp, "pointer-target");
	fs.mkdirSync(abs(ptrTarget, ".claude"), { recursive: true });
	fs.mkdirSync(abs(tmp, "fake-home-2/.config/opencode"), { recursive: true });
	const ptrSetup = () =>
		quiet(() =>
			cmdSetup({
				target: ptrTarget,
				sourceRoot: SCRIPT_ROOT,
				noRtk: true,
				home: abs(tmp, "fake-home-2"),
				pathEnv: "",
			}),
		);
	ptrSetup();
	const ptr = abs(ptrTarget, ".claude/skills/agent-kit/SKILL.md");
	assert(exists(ptr), "a harness folder the repo keeps gets the pointer");
	assert(
		read(ptr).includes(".agent-kit/SKILL.md") &&
			read(ptr).includes("classify, open a task"),
		"the pointer carries the loop's frontmatter and names the file",
	);
	assert(
		!exists(abs(ptrTarget, ".opencode")),
		"a harness the repo does not use gets no folder",
	);
	assert(
		JSON.parse(
			captured(() => cmdDoctor({ root: ptrTarget, jsonOut: true })),
		).rows.find((r) => r.name === "skill pointers").status === "PASS",
		"doctor accepts the pointer setup wrote",
	);
	write(ptr, "---\nname: mine\n---\n\nauthored by the owner\n");
	ptrSetup();
	assert(
		read(ptr).includes("authored by the owner"),
		"an authored pointer is not overwritten",
	);
}

export function hookScenario(ctx) {
	const { tmp, assert, doctorRow } = ctx;
	console.log("\n31. a hook git cannot execute is reported");
	const hookRels = [
		".agent-kit/githooks/pre-commit",
		".agent-kit/githooks/commit-msg",
	];
	assert(
		doctorRow("hook mode").status === "WARN",
		"an unwired guard with no execute bit warns instead of failing",
	);
	git(tmp, ["update-index", "--chmod=+x", ...hookRels]);
	assert(
		doctorRow("hook mode").status === "PASS",
		"the execute bit clears the row, so the row can fail and can pass",
	);
}

export function budgetScenario(ctx) {
	const { tmp, assert, doctorRow } = ctx;
	console.log("\n32. a session's fixed cost has a ceiling");
	const agentsPath = abs(tmp, "AGENTS.md");
	const agentsText = read(agentsPath);
	write(agentsPath, `${agentsText}${"padding ".repeat(300)}`);
	assert(
		doctorRow("context budget").status === "FAIL",
		"an entry file past its cap fails, so the cap can bind",
	);
	write(agentsPath, agentsText);
	assert(
		doctorRow("context budget").status === "PASS",
		"the budget clears once the file is back under its cap",
	);

	const modulePath = abs(tmp, ".agent-kit/lib/io.mjs");
	const moduleText = read(modulePath);
	write(modulePath, `${moduleText}${"\n".repeat(320)}`);
	const longModule = doctorRow("source ceiling");
	assert(
		longModule.status === "FAIL" && longModule.detail.includes("io.mjs"),
		"a kit module past 300 lines fails, so the ceiling can bind",
	);
	write(modulePath, moduleText);
	assert(
		doctorRow("source ceiling").status === "PASS",
		"the ceiling clears once the module is back under the cap",
	);

	const docPath = abs(tmp, ".agent-kit/docs/LONG.md");
	write(docPath, `# Long\n\n${"word ".repeat(2500)}`);
	const longDoc = doctorRow("markdown ceiling");
	assert(
		longDoc.status === "FAIL" && longDoc.detail.includes("LONG.md"),
		"a reference doc past its character ceiling fails, so the ceiling can bind",
	);
	write(docPath, "# Long\n\nshort\n");
	assert(
		doctorRow("markdown ceiling").status === "PASS",
		"the markdown ceiling clears once the doc is back under the cap",
	);
	fs.rmSync(docPath);
}
