/** selftest/tasks.mjs — the scope guard bites, and an in-scope close records and archives */
import fs from "node:fs";
import { LOG_DIR, PROJECT, TASK_INDEX, TASKS } from "../consts.mjs";
import { cmdDoctor } from "../doctor/index.mjs";
import { cmdTaskGuard } from "../guard.mjs";
import { abs, exists, expand, git, read, walk, write } from "../io.mjs";
import { cmdTaskClose, cmdTaskNew, cmdStart, cmdTaskShow } from "../tasks/index.mjs";
import { cmdVerify } from "../verify/index.mjs";

export function scopeScenarios(ctx) {
	const { tmp, assert, captured, quiet, fillTask } = ctx;
	console.log("\n6. the scope guard bites");
	const gitOk = git(tmp, ["init"]) !== null;
	if (gitOk) {
		write(abs(tmp, ".gitignore"), "node_modules/\n");
		git(tmp, ["add", "-A"]);
		git(tmp, [
			"-c",
			"user.email=t@t",
			"-c",
			"user.name=t",
			"commit",
			"-m",
			"init",
		]);
	}
	assert(
		quiet(() =>
			cmdTaskNew({ root: tmp, slug: "scoped-change", lane: "quick" }),
		) === 0,
		"task new exits 0",
	);
	const freshDir = abs(tmp, `${TASKS}/active`);
	const freshText = read(
		abs(
			freshDir,
			fs.readdirSync(freshDir).find((f) => f.endsWith(".md")),
		),
	);
	assert(
		freshText.includes("**Decisions**") &&
			freshText.includes("| # | Request | Status | Subtask |") &&
			!/Assumptions taken|Learnings promoted|\*\*Files\*\*/.test(freshText) &&
			freshText.length < 2000,
		"a new task is a skeleton — intent, scope, queue, decisions, plan, proof, no guidance prose",
	);
	fillTask(
		["src/index.ts"],
		"fixture change",
		"The fixture changed one file, and the change file says so.",
	);
	write(abs(tmp, "src/index.ts"), "export const x = 2;\n");
	write(abs(tmp, "src/other.ts"), "export const y = 1;\n");
	git(tmp, ["add", "src/other.ts"]);
	assert(
		quiet(() => cmdTaskGuard({ root: tmp })) === 1,
		"the commit guard blocks an out-of-scope staged file",
	);
	assert(
		quiet(() => cmdTaskClose({ root: tmp })) === 1,
		"task close exits 1 on an out-of-scope file",
	);
	console.log("\n7. in-scope close records evidence and archives");
	fs.rmSync(abs(tmp, "src/other.ts"));
	git(tmp, ["reset"]);
	git(tmp, ["add", "src/index.ts"]);
	assert(
		quiet(() => cmdTaskGuard({ root: tmp })) === 0,
		"the commit guard passes an in-scope staged file",
	);
	const activeDir = abs(tmp, `${TASKS}/active`);
	const taskFile = abs(
		activeDir,
		fs.readdirSync(activeDir).find((f) => f.endsWith(".md")),
	);
	write(
		taskFile,
		read(taskFile).replace(/^summary: .*$/m, `summary: "${"x".repeat(200)}"`),
	);
	assert(
		quiet(() => cmdTaskClose({ root: tmp })) === 1,
		"a change title over 140 characters is refused",
	);
	write(
		taskFile,
		read(taskFile).replace(/^summary: .*$/m, 'summary: "fixture change"'),
	);
	write(
		taskFile,
		read(taskFile).replace(
			"## Plan",
			"The plan names <!-- VERIFY:START --> in prose.\n\n## Plan",
		),
	);
	// A pre-TASK-127 install carries a RECENT block in both indexes. The first close must retire
	// it rather than leave a second copy of the newest closes that drifts from the cards.
	const legacyRecent =
		"\n## Recent\n\n<!-- RECENT:START -->\n- TASK-100 — an older close\n<!-- RECENT:END -->\n";
	write(abs(tmp, TASK_INDEX), read(abs(tmp, TASK_INDEX)) + legacyRecent);
	write(abs(tmp, `${LOG_DIR}/INDEX.md`), read(abs(tmp, `${LOG_DIR}/INDEX.md`)) + legacyRecent);
	captured(() => cmdStart({ root: tmp }));
	assert(
		read(abs(tmp, TASK_INDEX)).includes("RECENT:START") &&
			read(abs(tmp, `${LOG_DIR}/INDEX.md`)).includes("RECENT:START"),
		"nothing but a close rewrites an index",
	);
	const before = quiet(() => cmdTaskClose({ root: tmp }));
	assert(before === 0, "task close exits 0 when the write set holds");
	assert(
		exists(abs(tmp, `${TASKS}/archive`)) &&
			fs.readdirSync(abs(tmp, `${TASKS}/archive`)).length > 0,
		"task archived",
	);
	const archivedRel =
		expand(tmp, `${TASKS}/archive`).find((rel) =>
			/TASK-101.*\.md$/.test(rel),
		) || "";
	const archivedText = read(abs(tmp, archivedRel));
	assert(
		archivedText.includes("<!-- VERIFY:START -->") &&
			!archivedText.includes("<!-- EVIDENCE:START -->"),
		"recorded runs sit in the VERIFY block, and the old marker is gone",
	);
	assert(
		archivedText.includes("The plan names <!-- VERIFY:START --> in prose.") &&
			archivedText.includes("## Plan"),
		"a marker named in the plan's prose is not mistaken for the real block",
	);
	const changeRel = expand(tmp, LOG_DIR).find((rel) =>
		/^\.agent-kit\/logs\/\d{2}-\d{4}\/.+\.md$/.test(rel),
	);
	assert(
		/^\.agent-kit\/logs\/\d{2}-\d{4}\/\d{4}-\d{2}-\d{2}-TASK-101-[\w-]+\.md$/.test(
			changeRel || "",
		),
		"the change is filed as logs/MM-YYYY/YYYY-MM-DD-TASK-ID-slug.md",
	);
	const changeText = read(abs(tmp, changeRel));
	assert(
		changeText.includes("# TASK-101 — fixture change") &&
			changeText.includes("## What changed") &&
			changeText.includes(
				"The fixture changed one file, and the change file says so.",
			),
		"the file says what the task did",
	);
	assert(
		changeText.includes("**Task:** [TASK-101](../../tasks/archive/") &&
			!changeText.includes("**Date:**") &&
			!changeText.includes("- `src/index.ts`") &&
			changeText.includes("**Scope:** src"),
		"the card links the task, keeps the date in the front matter, and lists no files",
	);
	assert(
		!changeText.includes("## Why") &&
			!changeText.includes("## Evidence") &&
			!changeText.includes("## Follow-ups"),
		"the plan's sections stay in the task; the change file does not copy them",
	);
	const taskIndexText = read(abs(tmp, TASK_INDEX));
	const logsIndexText = read(abs(tmp, `${LOG_DIR}/INDEX.md`));
	assert(
		!taskIndexText.includes("RECENT:START") &&
			!taskIndexText.includes("## Recent") &&
			!logsIndexText.includes("RECENT:START") &&
			!logsIndexText.includes("## Recent"),
		"the close retires a legacy RECENT block and its heading from both indexes",
	);
	const started = captured(() => cmdStart({ root: tmp }));
	assert(
		started.includes("Recent") &&
			started.includes("TASK-101") &&
			started.includes("fixture change"),
		"start derives the newest close from the card, not from an index",
	);
	assert(
		quiet(() => cmdDoctor({ root: tmp })) === 0,
		"doctor accepts a closed task and its change file",
	);
	const handArchived = abs(
		tmp,
		`${TASKS}/archive/2026-10/2099-01-01-TASK-999-hand-closed.md`,
	);
	write(handArchived, "---\nid: TASK-999\nstatus: DONE\n---\n# hand closed\n");
	assert(
		quiet(() => cmdDoctor({ root: tmp })) === 1,
		"doctor fails on an archived task with no change file",
	);
	fs.rmSync(handArchived);
	const archived =
		walk(abs(tmp, `${TASKS}/archive`)).map((f) =>
			read(abs(tmp, `${TASKS}/archive/${f}`)),
		)[0] || "";
	assert(
		archived.includes("`src/index.ts`"),
		"inventory lists the changed file",
	);
	assert(
		!archived.includes("`.agent-kit/tasks/"),
		"inventory excludes the kit bookkeeping",
	);
}

export function redRunScenario(ctx) {
	const { tmp, assert, quiet, fillTask } = ctx;
	console.log("\n11. a red run cannot be closed as done");
	quiet(() => cmdTaskNew({ root: tmp, slug: "red-then-green", lane: "quick" }));
	const taskP = fillTask(
		[".agent-kit/sync-manifest.json"],
		"prove the evidence gate",
	);
	write(
		abs(tmp, PROJECT),
		read(abs(tmp, PROJECT)).replace(
			/\| test \| .* \|/,
			'| test | node -e "process.exit(1)" |',
		),
	);
	assert(
		quiet(() => cmdVerify({ root: tmp, baseline: true })) === 1,
		"the baseline run records the red state",
	);
	assert(
		read(taskP).includes("<!-- BASELINE:START -->"),
		"baseline block written into the task",
	);
	assert(
		quiet(() => cmdTaskClose({ root: tmp })) === 1,
		"close refuses while the evidence table is red",
	);
	write(
		abs(tmp, PROJECT),
		read(abs(tmp, PROJECT)).replace(/process\.exit\(1\)/, "process.exit(0)"),
	);
	assert(
		quiet(() => cmdVerify({ root: tmp })) === 0,
		"verify exits 0 after the fix",
	);
	assert(quiet(() => cmdTaskShow({ root: tmp })) === 0, "task show exits 0");
	assert(
		quiet(() => cmdTaskClose({ root: tmp })) === 1,
		"close still refuses the out-of-scope file",
	);
	assert(
		quiet(() =>
			cmdTaskClose({
				root: tmp,
				amend: "restored the declared test command",
			}),
		) === 0,
		"close --amend accepts it with a reason",
	);
	const amendedFile =
		walk(abs(tmp, `${TASKS}/archive`))
			.map((f) => read(abs(tmp, `${TASKS}/archive/${f}`)))
			.pop() || "";
	assert(
		amendedFile.includes("Scope amended at close"),
		"the amendment is written into the plan",
	);
}
