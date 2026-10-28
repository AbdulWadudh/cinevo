/** tasks/start.mjs — the day-start summary */
import path from "node:path";
import { entriesIn } from "../changelog.mjs";
import { LOG_DIR, LOOP_LIMIT, PROJECT, RECENT_LIMIT } from "../consts.mjs";
import { abs, git, list, readIf, sectionRows } from "../io.mjs";
import { activeTasks, CHILD_ID, childrenOf, parentId } from "../taskfile.mjs";
import {
	blockedState,
	evidenceDetail,
	evidenceState,
	loopState,
} from "../verify/evidence.mjs";

export function cmdStart({ root } = {}) {
	const base = path.resolve(root || process.cwd());
	const branch = (
		git(base, ["rev-parse", "--abbrev-ref", "HEAD"]) || ""
	).trim();
	const dirty = (git(base, ["status", "--porcelain"]) || "")
		.split(/\r?\n/)
		.filter(Boolean).length;
	const cmds = sectionRows(readIf(abs(base, PROJECT)) || "");
	const tasks = activeTasks(base);

	console.log("\nagent-kit start\n");
	console.log(
		`Repo    ${path.basename(base)}${branch ? ` · ${branch}` : ""} · ${dirty} uncommitted file(s)`,
	);
	console.log(
		`Suite   ${cmds.length ? cmds.map(([a, c, w]) => `${a}: ${c} (${w})`).join(" · ") : "none declared"}`,
	);
	// Derived, never stored: the cards are the record, so a close does not rewrite an index.
	const recent = entriesIn(base, LOG_DIR, "date").slice(0, RECENT_LIMIT);
	if (recent.length) {
		console.log(`\nRecent  ${recent.length} close(s), newest first`);
		for (const e of recent)
			console.log(
				`  ${e.id}  ${e.date || "undated"} — ${e.summary || "(no summary)"}`,
			);
	}
	if (tasks.length === 0) {
		console.log("\nTask    none in flight");
		console.log(
			"\nNext    open one: agent-kit task new <slug> --lane quick|planned\n",
		);
		return 0;
	}
	console.log(`\nActive  ${tasks.length} task(s)`);
	for (const t of tasks)
		console.log(
			`  [${t.fm.status || "?"}] ${t.fm.id || "?"} — ${t.fm.summary || "(no summary)"}`,
		);

	const inProgress = tasks.filter((t) => t.fm.status === "IN_PROGRESS");
	const target =
		inProgress.length === 1
			? inProgress[0]
			: tasks.find((t) => t.fm.status === "BLOCKED") || null;
	if (!target) {
		console.log(
			"\nNext    more than one task is in progress; close one or pass --id\n",
		);
		return 0;
	}
	const fm = target.fm;
	const blocked = blockedState(target.text);
	console.log(
		`\nTask    ${fm.id}  ${fm.lane || "?"}  ${fm.status || "?"}  ${fm.summary || "(no summary)"}`,
	);
	if (parentId(fm)) console.log(`Parent  ${parentId(fm)}`);
	const family = CHILD_ID.test(fm.id || "") ? parentId(fm) : fm.id;
	const subtasks = family ? childrenOf(base, family) : [];
	if (subtasks.length)
		console.log(
			`Subtasks ${subtasks.filter((t) => t.fm.status === "DONE").length}/${subtasks.length} done — ${subtasks.map((t) => `${t.fm.id} [${t.fm.status || "?"}]`).join(", ")}`,
		);
	console.log(
		`Plan    ${list(fm.touches).length} file(s) in touches · depends on ${list(fm.depends_on).join(", ") || "none"}`,
	);
	console.log(
		fm.lane === "PLANNED"
			? "Gate    PLANNED — G1 before the first edit; G2 before close"
			: "Gate    QUICK — verify, then close",
	);
	const rows = evidenceDetail(target.text);
	if (rows.length)
		console.log(
			`Evidence  ${rows.map((r) => `${r.action}=${Number.isFinite(r.exit) ? r.exit : "?"} (${r.scope})`).join(" · ")}`,
		);
	else console.log("Evidence  not run");
	const es = evidenceState(base, target.text, fm);
	if (es.state === "stale")
		console.log("Stale   yes — files changed since the last verify");
	const loop = loopState(target.text);
	console.log(
		`Loop    ${loop?.fail ? `${loop.n}/${LOOP_LIMIT} — same failing set: ${loop.fail}` : `0/${LOOP_LIMIT}`}`,
	);
	if (blocked) console.log(`Blocked ${blocked.question}`);

	const red = rows.filter((r) => Number.isFinite(r.exit) && r.exit !== 0);
	const milestone = cmds.filter(([, , when]) => when === "milestone");
	const fullRun = rows.some((r) => r.scope === "full");
	let next;
	if (fm.status === "BLOCKED")
		next = `waiting on the owner: ${blocked ? blocked.question : "(no question recorded)"}`;
	else if (loop?.fail && loop.n >= LOOP_LIMIT)
		next = "the Plan must change before the next verify (loop guard)";
	else if (!rows.length)
		next = "verify — no run recorded since the task opened";
	else if (es.state === "stale")
		next = "verify — the task's files changed since the last run";
	else if (red.length)
		next = `fix ${red.map((r) => r.action).join(", ")}, then verify`;
	else if (milestone.length && !fullRun)
		next = fm.parent
			? "task close — a subtask closes on the quick suite; build runs at the main close"
			: subtasks.some((t) => t.fm.status !== "DONE")
				? "close the open subtasks — the main close runs build"
				: "task close — the main close runs build";
	else
		next = fm.parent
			? "task close — a subtask closes on the quick suite"
			: "task close — the suite is green";
	console.log(`\nNext    ${next}\n`);
	return 0;
}
