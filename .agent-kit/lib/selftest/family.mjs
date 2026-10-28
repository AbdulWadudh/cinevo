/** selftest/family.mjs — a subtask closes quick, and a family shares one write set */
import path from "node:path";
import { LOG_DIR, PROJECT, TASK_INDEX, TASKS } from "../consts.mjs";
import { abs, exists, expand, frontMatter, git, read, write } from "../io.mjs";
import { cmdStart, cmdTaskClose, cmdTaskNew } from "../tasks/index.mjs";
import { nextId } from "../taskfile.mjs";

export function familyScenarios(ctx) {
	const { tmp, assert, captured, quiet, fillTask, spoken, doctorRow } = ctx;
	console.log(
		"\n26. a subtask closes quick and the main close is where build runs",
	);
	assert(
		quiet(() => cmdTaskClose({ root: tmp })) === 0,
		"the resumed task closes and frees the slot",
	);
	quiet(() => cmdTaskNew({ root: tmp, slug: "subtask-main", lane: "quick" }));
	const mainTask = fillTask([], "prove the main close runs build");
	const mainId = frontMatter(read(mainTask)).id;
	const nextBefore = nextId(tmp);
	quiet(() =>
		cmdTaskNew({
			root: tmp,
			slug: "subtask-one",
			lane: "quick",
			parent: mainId,
		}),
	);
	// The close edits project.md to redden the build, so it is part of the write set.
	const childTask = fillTask(
		["src/child.txt", PROJECT],
		"prove a child close is quick",
	);
	const childId = frontMatter(read(childTask)).id;
	write(abs(tmp, "src/child.txt"), "one\n");
	assert(childId === `${mainId}.1`, "a subtask id extends the main id");
	assert(
		nextId(tmp) === nextBefore,
		"opening a subtask does not advance the next top-level id",
	);
	assert(
		frontMatter(read(mainTask)).status === "QUEUED",
		"the main task waits while its subtask works",
	);
	assert(
		captured(() => cmdStart({ root: tmp })).includes(`Parent  ${mainId}`),
		"start names the parent of the active subtask",
	);
	const tieredProject = read(abs(tmp, PROJECT));
	const redBuild = tieredProject.replace(
		"| build | npm run build | milestone |",
		'| build | node -e "process.exit(1)" | milestone |',
	);
	assert(redBuild !== tieredProject, "the fixture can turn the build red");
	write(abs(tmp, PROJECT), redBuild);
	const childClose = spoken(() => cmdTaskClose({ root: tmp }));
	assert(childClose.code === 0, "a red build does not block a subtask close");
	assert(
		/^feat \(TASK-\d+\.\d+\): prove a child close is quick$/m.test(
			childClose.out,
		),
		"the subtask prints its own commit message",
	);
	assert(
		/^status: DONE$/m.test(read(childTask)),
		"the subtask is DONE and still in active/",
	);
	assert(
		!expand(tmp, LOG_DIR).some((rel) => rel.includes(`${childId}-`)),
		"the subtask writes no change file",
	);
	assert(
		frontMatter(read(mainTask)).status === "IN_PROGRESS",
		"closing the last subtask hands the slot back",
	);
	assert(
		captured(() => cmdStart({ root: tmp })).includes("Subtasks 1/1 done"),
		"start reports the family state",
	);
	const mainRefused = spoken(() => cmdTaskClose({ root: tmp }));
	assert(
		mainRefused.code === 1 && mainRefused.out.includes("verification failed"),
		"the main close runs build and refuses a red result",
	);
	assert(exists(mainTask), "a refused main close archives nothing");
	write(abs(tmp, PROJECT), tieredProject);
	const mainClose = spoken(() => cmdTaskClose({ root: tmp }));
	assert(
		mainClose.code === 0,
		"fixing the build at the main close lets it through",
	);
	const archivedDir = abs(
		tmp,
		`${TASKS}/archive/${new Date().toISOString().slice(0, 7)}`,
	);
	assert(
		exists(abs(archivedDir, path.basename(childTask))),
		"the done subtask archives with the main task",
	);
	assert(
		expand(tmp, LOG_DIR).filter((rel) => rel.includes(`-${mainId}-`)).length ===
			1,
		"one change file under the main id",
	);
	assert(
		doctorRow("archived tasks changelogged").status === "PASS",
		"doctor accepts a subtask archived inside its main task",
	);
	assert(
		!read(abs(tmp, TASK_INDEX)).includes(childId),
		"the recent list names the main task, not its subtasks",
	);
	console.log(
		"\n27. a family shares one write set, one archive and one change file",
	);
	git(tmp, ["add", "-A"]);
	git(tmp, [
		"-c",
		"user.email=t@t",
		"-c",
		"user.name=t",
		"commit",
		"-qm",
		"settle before family",
	]);
	quiet(() => cmdTaskNew({ root: tmp, slug: "family-main", lane: "planned" }));
	const familyMain = fillTask(["src/family"], "prove the family write set");
	const familyId = frontMatter(read(familyMain)).id;
	const familyNext = nextId(tmp);
	quiet(() =>
		cmdTaskNew({
			root: tmp,
			slug: "family-one",
			lane: "quick",
			parent: familyId,
		}),
	);
	const familyOne = fillTask(["src/family/one.txt"], "first slice");
	write(abs(tmp, "src/family/one.txt"), "one\n");
	assert(
		doctorRow("write-set collisions").status === "PASS",
		"doctor accepts a main task and its subtask sharing files",
	);
	assert(
		quiet(() => cmdTaskClose({ root: tmp })) === 0,
		"the first slice closes on the quick suite",
	);
	quiet(() =>
		cmdTaskNew({
			root: tmp,
			slug: "family-two",
			lane: "quick",
			parent: familyId,
		}),
	);
	const familyTwo = fillTask(["src/family/two.txt"], "second slice");
	write(abs(tmp, "src/family/two.txt"), "two\n");
	const familyTwoId = frontMatter(read(familyTwo)).id;
	assert(
		familyTwoId === `${familyId}.2`,
		"the second subtask takes the next dotted number",
	);
	assert(
		nextId(tmp) === familyNext,
		"neither subtask advances the next top-level id",
	);
	assert(
		frontMatter(read(familyMain)).status === "QUEUED",
		"opening the next subtask queues the main task again",
	);
	assert(
		captured(() => cmdStart({ root: tmp })).includes("Subtasks 1/2 done"),
		"start counts the family",
	);
	const openRefused = spoken(() => cmdTaskClose({ root: tmp, id: familyId }));
	assert(
		openRefused.code === 1 && openRefused.out.includes("subtasks still open"),
		"the main close refuses while a subtask is open",
	);
	assert(
		quiet(() => cmdTaskClose({ root: tmp })) === 0,
		"the second slice closes on the quick suite",
	);
	const familyClose = spoken(() => cmdTaskClose({ root: tmp }));
	assert(familyClose.code === 0, "the main close delivers the family");
	assert(
		exists(abs(archivedDir, path.basename(familyOne))) &&
			exists(abs(archivedDir, path.basename(familyTwo))),
		"both subtasks archive with the main task",
	);
	assert(
		expand(tmp, LOG_DIR).filter((rel) => rel.includes(`-${familyId}-`))
			.length === 1,
		"one change file for the whole delivery",
	);
	assert(
		doctorRow("subtasks").status === "PASS",
		"doctor accepts the family once it is archived",
	);
}
