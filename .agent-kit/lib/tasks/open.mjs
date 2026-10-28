/** tasks/open.mjs — opening and parking a task */
import path from "node:path";
import { TASK_TEMPLATE, TASKS } from "../consts.mjs";
import { abs, die, exists, frontMatter, git, read, write } from "../io.mjs";
import {
	activeTasks,
	currentTask,
	idsMode,
	matchTasks,
	nextChildId,
	nextId,
	parentId,
	refreshActive,
	slugify,
} from "../taskfile.mjs";
import { blockedState } from "../verify/evidence.mjs";
import { cmdVerify } from "../verify/index.mjs";
import { importTask, mintTask } from "./issue.mjs";

export function cmdTaskNew({
	root,
	slug,
	lane,
	force,
	noBaseline,
	parent,
	from,
}) {
	const base = path.resolve(root || process.cwd());
	if (!slug && !from)
		die(
			"usage: task new <slug> [--lane quick|planned] [--parent TASK-N] [--from <issue>]",
		);
	const tasks = activeTasks(base);

	if (parent) {
		const parentTask = tasks.find((t) => t.fm.id === parent);
		if (!parentTask) die(`no active task with id ${parent}`);
		if (parentTask.fm.status === "BLOCKED")
			die(`${parent} is blocked; resume it first`);
		if (!["IN_PROGRESS", "QUEUED"].includes(parentTask.fm.status))
			die(
				`${parent} is ${parentTask.fm.status || "statusless"}; only an in-progress or queued task takes subtasks`,
			);
		const openChild = tasks.find(
			(t) => parentId(t.fm) === parent && t.fm.status === "IN_PROGRESS",
		);
		if (openChild)
			die(
				`${openChild.fm.id} is in progress; close it before opening another subtask`,
			);
		if (parentTask.fm.status === "IN_PROGRESS") {
			write(
				parentTask.path,
				read(parentTask.path).replace(/^status:.*$/m, "status: QUEUED"),
			);
		}
		return openTask(base, {
			id: nextChildId(base, parent),
			slug,
			lane,
			parent,
			noBaseline,
		});
	}

	const inProgress = tasks.filter((t) => t.fm.status === "IN_PROGRESS");
	if (inProgress.length && !force)
		die(
			`a task is already in progress (${inProgress[0].file}). Close it, block it, or pass --force.`,
		);

	// The repo's one id source. Both remote branches are async; the local one stays synchronous
	// so every caller that does not mint keeps returning a number. A remote failure leaves no
	// task file: the id comes first, so there is nothing to undo.
	const fail = (e) => {
		console.error(`agent-kit: ${e.message}\n`);
		return 1;
	};
	if (from)
		return importTask(base, from)
			.then((issue) =>
				openTask(base, {
					id: issue.id,
					slug: slug || issue.title,
					lane,
					noBaseline,
					intent: issue.intent,
				}),
			)
			.catch(fail);
	if ((idsMode(base) || "local") === "issue")
		return mintTask(base, slug)
			.then((id) => openTask(base, { id, slug, lane, noBaseline }))
			.catch(fail);
	return openTask(base, { id: `TASK-${nextId(base)}`, slug, lane, noBaseline });
}

/** Write the task file from the template, refresh the index, and record the baseline. */
function openTask(base, { id, slug, lane, parent, noBaseline, intent }) {
	if (!exists(abs(base, TASK_TEMPLATE))) die(`missing ${TASK_TEMPLATE}`);
	const today = new Date().toISOString().slice(0, 10);
	const file = `${today}-${id}-${slugify(slug)}.md`;
	const baseline = git(base, ["rev-parse", "HEAD"]) || "none";
	let body = read(abs(base, TASK_TEMPLATE))
		.replaceAll("{{ID}}", id)
		.replaceAll("{{DATE}}", today)
		.replaceAll("{{LANE}}", (lane || "planned").toUpperCase())
		.replaceAll("{{TITLE}}", slug.replace(/-/g, " "))
		.replaceAll("{{BASELINE}}", baseline);
	if (intent)
		body = body.replace(/<!--\s*FILL:intent[\s\S]*?-->/, intent);
	if (parent)
		body = /^parent:.*$/m.test(body)
			? body.replace(/^parent:.*$/m, `parent: ${parent}`)
			: body.replace(/^(id:.*\r?\n)/m, `$1parent: ${parent}\n`);
	write(abs(base, `${TASKS}/active/${file}`), body);

	refreshActive(base);

	console.log(`\nOpened ${id} -> ${TASKS}/active/${file}`);
	if (parent)
		console.log(
			`Subtask of ${parent}; it closes on the quick suite (lint included). The main close adds build.`,
		);
	console.log(
		"Fill: touches, scope, plan. PLANNED halts for approval before the first edit.",
	);
	if (noBaseline) {
		console.log(
			"Baseline skipped (--no-baseline): the 'was it already broken' answer is now missing.\n",
		);
		return 0;
	}
	console.log(
		"Baseline run, so a red command is reported rather than blamed on this task:\n",
	);
	cmdVerify({ root: base, baseline: true, full: !parent });
	return 0;
}

export function cmdTaskBlock({ root, id, question }) {
	const base = path.resolve(root || process.cwd());
	if (!question) die('usage: task block "<question for the owner>"');
	const file = currentTask(base, id);
	const p = abs(base, `${TASKS}/active/${file}`);
	let text = read(p);
	const fm = frontMatter(text);
	if (fm.status === "BLOCKED")
		die(`${fm.id} is already blocked; use \`task resume\``);
	if (fm.status !== "IN_PROGRESS")
		die(
			`only an in-progress task can be blocked (${fm.id} is ${fm.status || "missing"})`,
		);
	if (!/^# /m.test(text))
		die("task file has no heading to place the block under");
	const today = new Date().toISOString().slice(0, 10);
	const note = [
		"<!-- BLOCKED:START -->",
		`**BLOCKED ${today}** — ${question}`,
		"Resume with `agent-kit task resume` once the owner answers.",
		"<!-- BLOCKED:END -->",
	].join("\n");
	text = text
		.replace(/^(# .*\r?\n)/m, `$1\n${note}\n`)
		.replace(/^status:.*$/m, "status: BLOCKED");
	write(p, text);
	refreshActive(base);
	console.log(`\nBlocked ${fm.id} — the owner must answer:`);
	console.log(`  ${question}`);
	console.log("  Later: `agent-kit task resume`\n");
	return 0;
}

export function cmdTaskResume({ root, id }) {
	const base = path.resolve(root || process.cwd());
	const tasks = activeTasks(base);
	const hit = id
		? matchTasks(tasks, id)
		: tasks.filter((t) => t.fm.status === "BLOCKED");
	if (hit.length !== 1)
		die(
			hit.length === 0
				? id
					? `no active task matches ${id}`
					: "no blocked task"
				: `ambiguous: ${hit.map((t) => t.file).join(", ")}; pass --id`,
		);
	const task = hit[0];
	if (!blockedState(task.text)) die(`${task.fm.id} carries no block marker`);
	const other = tasks.find(
		(t) => t.file !== task.file && t.fm.status === "IN_PROGRESS",
	);
	if (other)
		die(`${other.fm.id} is already in progress; close or block it first`);
	write(
		task.path,
		task.text
			.replace(
				/^<!-- BLOCKED:START -->\r?$[\s\S]*?^<!-- BLOCKED:END -->\r?$\r?\n?/m,
				"",
			)
			.replace(/^status:.*$/m, "status: IN_PROGRESS"),
	);
	refreshActive(base);
	console.log(`\nResumed ${task.fm.id}\n`);
	return 0;
}
