/** tasks/open.mjs — opening, inspecting and parking a task */
import path from "node:path";
import { LOOP_LIMIT, PROJECT, TASK_TEMPLATE, TASKS } from "../consts.mjs";
import {
	abs,
	die,
	exists,
	frontMatter,
	git,
	read,
	readIf,
	sectionRows,
	write,
} from "../io.mjs";
import {
	activeTasks,
	childrenOf,
	currentTask,
	matchTasks,
	nextChildId,
	nextId,
	parentId,
	refreshActive,
	slugify,
} from "../taskfile.mjs";
import {
	blockedState,
	evidenceDetail,
	evidenceState,
	loopState,
} from "../verify/evidence.mjs";
import { cmdVerify } from "../verify/index.mjs";

export function cmdTaskNew({ root, slug, lane, force, noBaseline, parent }) {
	const base = path.resolve(root || process.cwd());
	if (!slug)
		die("usage: task new <slug> [--lane quick|planned] [--parent TASK-N]");
	const activeDir = abs(base, `${TASKS}/active`);
	const tasks = activeTasks(base);

	let id;
	let parentTask = null;
	if (parent) {
		parentTask = tasks.find((t) => t.fm.id === parent);
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
		id = nextChildId(base, parent);
	} else {
		const inProgress = tasks.filter((t) => t.fm.status === "IN_PROGRESS");
		if (inProgress.length && !force)
			die(
				`a task is already in progress (${inProgress[0].file}). Close it, block it, or pass --force.`,
			);
		id = `TASK-${nextId(base)}`;
	}
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
	if (parent)
		body = /^parent:.*$/m.test(body)
			? body.replace(/^parent:.*$/m, `parent: ${parent}`)
			: body.replace(/^(id:.*\r?\n)/m, `$1parent: ${parent}\n`);
	write(abs(activeDir, file), body);

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

export function cmdTaskShow({ root, id }) {
	const base = path.resolve(root || process.cwd());
	const tasks = activeTasks(base);
	// Asking "what is in flight?" is normal. Nothing in flight is an answer, not an error.
	if (tasks.length === 0 && !id) {
		console.log("\nNothing in flight.\n");
		return 0;
	}
	const inProgress = tasks.filter((t) => t.fm.status === "IN_PROGRESS");
	const task = id
		? matchTasks(tasks, id)[0]
		: inProgress.length === 1
			? inProgress[0]
			: tasks.length === 1
				? tasks[0]
				: null;
	if (!task)
		die(
			id
				? `no active task matches ${id}`
				: `ambiguous: ${tasks.map((t) => t.file).join(", ")}; pass --id`,
		);
	const text = task.text;
	const fm = task.fm;
	console.log(
		`\n${fm.id}  ${fm.lane || "?"}  ${fm.status || "?"}  ${fm.summary || "(no summary)"}`,
	);
	console.log(`  ${TASKS}/active/${task.file}`);
	const taskParent = parentId(fm);
	if (taskParent) console.log(`  parent: ${taskParent}`);
	const subtasks = taskParent ? [] : childrenOf(base, fm.id);
	if (subtasks.length)
		console.log(
			`  subtasks: ${subtasks.filter((t) => t.fm.status === "DONE").length}/${subtasks.length} done — ${subtasks.map((t) => `${t.fm.id} [${t.fm.status || "?"}]`).join(", ")}`,
		);
	const plan = text.match(/## Scope[\s\S]*?(?=\n## Verification)/);
	console.log(plan ? `\n${plan[0].trim()}\n` : "\n(no scope/plan section)\n");
	const rows = evidenceDetail(text);
	console.log(
		rows.length
			? `Verification: ${rows.map((r) => `${r.action}=${Number.isFinite(r.exit) ? r.exit : "?"} (${r.scope})`).join(" ")}`
			: "Verification: not run",
	);
	const milestone = sectionRows(readIf(abs(base, PROJECT)) || "").filter(
		([, , when]) => when === "milestone",
	);
	if (milestone.length && !rows.some((r) => r.scope === "full"))
		console.log(
			taskParent
				? `Full suite: not run — ${milestone.length} milestone command(s) run at the main task's close`
				: `Full suite: not run — ${milestone.length} milestone command(s) wait for \`verify --full\` or close`,
		);
	const es = evidenceState(base, text, fm);
	if (es.state === "stale")
		console.log(
			"Evidence: STALE — files changed since the last verify; run verify again",
		);
	else if (es.state === "current") console.log("Evidence: current");
	else if (es.state === "unknown")
		console.log("Evidence: unknown (no loop record)");
	const loop = loopState(text);
	if (loop?.fail) {
		console.log(
			loop.n >= LOOP_LIMIT
				? `Loop: ${loop.n}/${LOOP_LIMIT} — verify refuses an identical run until the Plan changes`
				: `Loop: ${loop.n}/${LOOP_LIMIT} — same failing set, same files`,
		);
	} else {
		console.log(`Loop: 0/${LOOP_LIMIT}`);
	}
	const blocked = blockedState(text);
	if (blocked) console.log(`Blocked: ${blocked.question}`);
	console.log(
		fm.lane === "PLANNED"
			? "Gate: PLANNED needs approval before the first edit, and again before close.\n"
			: "Gate: QUICK — verify, then close.\n",
	);
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
