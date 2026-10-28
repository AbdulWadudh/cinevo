/** tasks/show.mjs — `task show`: the active task's scope, plan, evidence and staleness */
import path from "node:path";
import { LOOP_LIMIT, PROJECT, TASKS } from "../consts.mjs";
import { abs, die, readIf, sectionRows } from "../io.mjs";
import { activeTasks, childrenOf, matchTasks, parentId } from "../taskfile.mjs";
import {
	blockedState,
	evidenceDetail,
	evidenceState,
	loopState,
} from "../verify/evidence.mjs";

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
