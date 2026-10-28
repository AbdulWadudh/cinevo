/** selftest/state.mjs — a new directory is inventoried as files, not as one entry */
import { TASK_INDEX, TASKS } from "../consts.mjs";
import { abs, frontMatter, git, read, walk, write } from "../io.mjs";
import { activeTasks } from "../taskfile.mjs";
import {
	cmdStart,
	cmdTaskBlock,
	cmdTaskClose,
	cmdTaskNew,
	cmdTaskResume,
	cmdTaskShow,
} from "../tasks/index.mjs";

export function inventoryScenario(ctx) {
	const { tmp, assert, quiet, fillTask } = ctx;
	console.log(
		"\n14. a new directory is inventoried as files, not as one entry",
	);
	// Scenario 12 left an uncommitted edit; commit it so this task's diff is only its own.
	git(tmp, ["add", "-A"]);
	git(tmp, [
		"-c",
		"user.email=t@t",
		"-c",
		"user.name=t",
		"commit",
		"-qm",
		"settle",
	]);
	quiet(() =>
		cmdTaskNew({
			root: tmp,
			slug: "new-dir",
			lane: "quick",
			noBaseline: true,
		}),
	);
	fillTask(["src/lib/"], "added a small module");
	write(abs(tmp, "src/lib/a.ts"), "export const a = 1;\n");
	write(abs(tmp, "src/lib/b.ts"), "export const b = 2;\n");
	assert(
		quiet(() => cmdTaskClose({ root: tmp })) === 0,
		"close accepts a new directory inside the declared write set",
	);
	const withDir =
		walk(abs(tmp, `${TASKS}/archive`))
			.map((f) => read(abs(tmp, `${TASKS}/archive/${f}`)))
			.find((t) => t.includes("added a small module")) || "";
	assert(
		withDir.includes("- `src/lib/a.ts`") &&
			withDir.includes("- `src/lib/b.ts`"),
		"both files are listed",
	);
	assert(
		!withDir.includes("- `src/lib/`"),
		"the directory itself is not listed as a file",
	);
	assert(
		quiet(() => cmdTaskShow({ root: tmp })) === 0,
		'task show answers "nothing in flight" without failing',
	);
}

export function blockScenarios(ctx) {
	const { tmp, assert, captured, quiet, fillTask, spoken, doctorRow } = ctx;
	console.log("\n25. a blocked task frees the slot and waits on disk");
	git(tmp, ["add", "-A"]);
	git(tmp, [
		"-c",
		"user.email=t@t",
		"-c",
		"user.name=t",
		"commit",
		"-qm",
		"settle before block",
	]);
	quiet(() =>
		cmdTaskNew({
			root: tmp,
			slug: "blocked-a",
			lane: "quick",
			noBaseline: true,
		}),
	);
	const taskA = fillTask(["src/a.txt"], "prove a blocked task");
	const taskAId = frontMatter(read(taskA)).id;
	assert(
		spoken(() =>
			cmdTaskBlock({ root: tmp, id: taskAId, question: "pick A or B" }),
		).code === 0,
		"a task can block with a question",
	);
	assert(
		/^status: BLOCKED$/m.test(read(taskA)),
		"the status records the impasse",
	);
	assert(
		read(abs(tmp, TASK_INDEX)).includes(`\`${taskAId}\` [BLOCKED]`),
		"the index lists the blocked task",
	);
	const blockedText = read(taskA);
	write(
		taskA,
		blockedText.replace(
			/<!-- BLOCKED:START -->[\s\S]*?<!-- BLOCKED:END -->\r?\n?/,
			"",
		),
	);
	assert(
		doctorRow("blocked tasks").status === "FAIL",
		"doctor fails a blocked status with no question",
	);
	write(taskA, blockedText);
	assert(
		captured(() => cmdStart({ root: tmp })).includes("pick A or B"),
		"start surfaces the owner's question",
	);
	assert(
		captured(() => cmdTaskShow({ root: tmp, id: taskAId })).includes(
			"Blocked: pick A or B",
		),
		"show prints the question",
	);
	assert(
		spoken(() => cmdTaskClose({ root: tmp, id: taskAId })).code === 1,
		"a blocked task cannot close",
	);
	quiet(() =>
		cmdTaskNew({
			root: tmp,
			slug: "blocked-b",
			lane: "quick",
			noBaseline: true,
		}),
	);
	const taskB = fillTask(["src/b.txt"], "prove the slot frees");
	write(
		taskA,
		read(taskA).replace(/^status: BLOCKED$/m, "status: IN_PROGRESS"),
	);
	assert(
		doctorRow("blocked tasks").status === "FAIL",
		"doctor fails a block marker whose status disagrees",
	);
	write(
		taskA,
		read(taskA).replace(/^status: IN_PROGRESS$/m, "status: BLOCKED"),
	);
	assert(
		doctorRow("blocked tasks").status === "PASS",
		"doctor accepts the marker and the status together",
	);
	assert(
		spoken(() => cmdTaskBlock({ root: tmp, question: "which comes first?" }))
			.code === 0,
		"the second task can block too",
	);
	assert(
		spoken(() => cmdTaskResume({ root: tmp, id: taskAId })).code === 0,
		"resume names the blocked task and continues",
	);
	assert(
		/^status: IN_PROGRESS$/m.test(read(taskA)) &&
			!read(taskA).includes("BLOCKED:START"),
		"resume restores the status and removes the marker",
	);
	assert(
		frontMatter(read(taskB)).status === "BLOCKED" &&
			doctorRow("blocked tasks").status === "PASS",
		"the other task stays blocked and the pair is consistent",
	);
}

export function collisionScenario(ctx) {
	const { tmp, assert, quiet, fillTask, doctorRow } = ctx;
	console.log("\n29. a blocked card holds no write set");
	git(tmp, ["add", "-A"]);
	git(tmp, [
		"-c",
		"user.email=t@t",
		"-c",
		"user.name=t",
		"commit",
		"-qm",
		"settle before collisions",
	]);
	quiet(() =>
		cmdTaskNew({
			root: tmp,
			slug: "collide-a",
			lane: "quick",
			noBaseline: true,
		}),
	);
	fillTask(["src/shared.txt"], "first claim");
	quiet(() =>
		cmdTaskNew({
			root: tmp,
			slug: "collide-b",
			lane: "quick",
			noBaseline: true,
			force: true,
		}),
	);
	const collideB = abs(
		tmp,
		`${TASKS}/active/${activeTasks(tmp).find((t) => t.file.includes("-collide-b.md")).file}`,
	);
	write(
		collideB,
		read(collideB)
			.replace(/touches: \[\]/, 'touches: ["src/shared.txt"]')
			.replace(/summary: ""/, 'summary: "second claim"')
			.replace(
				/\*\*Summary\*\*\s*—\s*<!--\s*FILL:summary[\s\S]*?-->/,
				"**Summary** — second claim",
			)
			.replace(/<!--\s*FILL:[\s\S]*?-->/g, "filled by selftest"),
	);
	const collisionRow = doctorRow("write-set collisions");
	assert(
		collisionRow.status === "FAIL" &&
			collisionRow.detail.includes("collide-a") &&
			collisionRow.detail.includes("collide-b"),
		"doctor fails two workable tasks that claim one file",
	);
	quiet(() =>
		cmdTaskBlock({
			root: tmp,
			id: frontMatter(read(collideB)).id,
			question: "who owns the shared file?",
		}),
	);
	assert(
		doctorRow("write-set collisions").status === "PASS",
		"doctor drops a blocked task's write set",
	);
}
