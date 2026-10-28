/** doctor/tasks.mjs — task hygiene, statuses, subtasks, backlog */
import fs from "node:fs";
import path from "node:path";
import { LOG_DIR, TASK_INDEX, TASKS } from "../consts.mjs";
import {
	abs,
	covers,
	exists,
	expand,
	fenceFree,
	frontMatter,
	list,
	overlaps,
	read,
	readIf,
} from "../io.mjs";
import {
	activeTasks,
	CHILD_ID,
	ID_MODES,
	idsMode,
	parentId,
	queueRows,
} from "../taskfile.mjs";
import { blockedState } from "../verify/evidence.mjs";

export function taskChecks({ base, add }) {
	// 5. task hygiene
	const activeDir = abs(base, `${TASKS}/active`);
	const active = exists(activeDir)
		? fs.readdirSync(activeDir).filter((f) => f.endsWith(".md"))
		: [];
	const index = readIf(abs(base, TASK_INDEX)) || "";
	const unindexed = active.filter((f) => {
		const id = frontMatter(read(abs(activeDir, f))).id;
		return !id || !index.includes(id);
	});
	add(
		unindexed.length ? "FAIL" : "PASS",
		"active tasks indexed",
		unindexed.join(", "),
	);

	// One id source per repo, recorded in project.md. A missing row is how a pre-ids install
	// looks; it still allocates locally, so it warns instead of failing.
	const mode = idsMode(base);
	add(
		!mode ? "WARN" : ID_MODES.has(mode) ? "PASS" : "FAIL",
		"task ids",
		!mode
			? "project.md has no `ids:` row — allocating locally; re-run setup to record it"
			: ID_MODES.has(mode)
				? mode
				: `${mode} — expected local or issue`,
	);

	// One id, one task file, one change card. Two branches that minted the same number, or a
	// hand copy, is the case this catches. Task files and cards are grouped apart because a
	// close writes both under one id by design.
	const idProblems = [];
	const group = (rels) => {
		const by = new Map();
		for (const rel of rels.filter((r) => r.endsWith(".md"))) {
			const id = frontMatter(read(abs(base, rel))).id;
			if (!id) {
				idProblems.push(`${rel}: no id`);
				continue;
			}
			if (!/^TASK-\d+(?:\.\d+)?$/.test(id))
				idProblems.push(`${rel}: ${id} is not TASK-N`);
			else if (!path.basename(rel).includes(`-${id}-`))
				idProblems.push(`${rel}: id ${id} does not match the file name`);
			if (!by.has(id)) by.set(id, []);
			by.get(id).push(path.basename(rel));
		}
		for (const [id, files] of by)
			if (files.length > 1) idProblems.push(`${id}: ${files.join(" = ")}`);
		return by.size;
	};
	const taskIds = group([
		...expand(base, `${TASKS}/active`),
		...expand(base, `${TASKS}/archive`),
	]);
	// `logs/INDEX.md` heads the month folders; only a card under MM-YYYY/ carries an id.
	const cardIds = group(
		expand(base, LOG_DIR).filter((rel) => /\d{2}-\d{4}\//.test(rel)),
	);
	add(
		idProblems.length ? "FAIL" : "PASS",
		"task ids unique",
		idProblems.length
			? idProblems.slice(0, 4).join("; ")
			: `${taskIds} task id(s), ${cardIds} change card(s)`,
	);

	const collisions = [];
	// A blocked card is parked, not in flight: `task resume` refuses while another task is in
	// progress, so it can never be edited alongside one. Reserving its files only deadlocks the
	// card that is actually in flight.
	const touches = active
		.map((f) => ({ f, fm: frontMatter(read(abs(activeDir, f))) }))
		.filter(({ fm }) => fm.status !== "BLOCKED")
		.map(({ f, fm }) => ({
			f,
			t: list(fm.touches),
			family: CHILD_ID.test(fm.id || "") ? parentId(fm) : fm.id,
		}));
	for (let i = 0; i < touches.length; i++) {
		for (let j = i + 1; j < touches.length; j++) {
			// A parent and its subtasks share one delivery; overlapping write sets inside a
			// family are the point of the split, not a collision.
			if (touches[i].family && touches[i].family === touches[j].family)
				continue;
			for (const a of touches[i].t)
				for (const b of touches[j].t)
					if (covers(a, b) || covers(b, a) || overlaps(a, b))
						collisions.push(`${touches[i].f} <> ${touches[j].f}`);
		}
	}
	add(
		collisions.length ? "FAIL" : "PASS",
		"write-set collisions",
		[...new Set(collisions)].join(", "),
	);

	const unknown = active
		.map((f) => ({ f, s: frontMatter(read(abs(activeDir, f))).status }))
		.filter(
			({ s }) =>
				!["QUEUED", "IN_PROGRESS", "BLOCKED", "REVIEW", "DONE"].includes(s),
		);
	add(
		unknown.length ? "WARN" : "PASS",
		"task statuses",
		unknown.map((u) => `${u.f} (${u.s || "missing"})`).join(", "),
	);

	const blockProblems = [];
	for (const task of activeTasks(base)) {
		const blocked = blockedState(task.text);
		if (task.fm.status === "BLOCKED" && !blocked)
			blockProblems.push(`${task.file}: BLOCKED with no question`);
		if (task.fm.status !== "BLOCKED" && blocked)
			blockProblems.push(
				`${task.file}: block marker but status ${task.fm.status || "missing"}`,
			);
	}
	add(
		blockProblems.length ? "FAIL" : "PASS",
		"blocked tasks",
		blockProblems.join(", "),
	);

	// 5c. a subtask belongs to a live parent, and the parent holds the slot only once every
	// subtask is done — the state `task new --parent` and the last subtask close maintain.
	const subtaskProblems = [];
	const byId = new Map(
		active.map((f) => [frontMatter(read(abs(activeDir, f))).id, f]),
	);
	const kidsByParent = new Map();
	for (const f of active) {
		const fm = frontMatter(read(abs(activeDir, f)));
		if (!CHILD_ID.test(fm.id || "")) continue;
		const parent = parentId(fm);
		if (!parent) {
			subtaskProblems.push(`${f}: subtask with no parent`);
			continue;
		}
		if (!byId.has(parent)) {
			subtaskProblems.push(`${f}: parent ${parent} is not active`);
			continue;
		}
		if (!kidsByParent.has(parent)) kidsByParent.set(parent, []);
		kidsByParent.get(parent).push({ f, fm });
	}
	for (const [parent, kids] of kidsByParent) {
		const pf = byId.get(parent);
		const pfm = frontMatter(read(abs(activeDir, pf)));
		const open = kids.filter((k) => k.fm.status !== "DONE");
		if (pfm.status === "DONE")
			subtaskProblems.push(`${pf}: DONE with subtasks still active`);
		else if (pfm.status === "IN_PROGRESS" && open.length)
			subtaskProblems.push(
				`${pf}: in progress while ${open.map((k) => k.fm.id).join(", ")} open`,
			);
		else if (pfm.status === "QUEUED" && !open.length)
			subtaskProblems.push(`${pf}: queued with every subtask done`);
	}
	add(
		subtaskProblems.length ? "FAIL" : "PASS",
		"subtasks",
		subtaskProblems.join(", "),
	);

	// 5d. the queue captures requests; it is not a second backlog. Statuses are fixed, and a
	// started row names this task's own subtask, so a row cannot point at someone else's work.
	const queueProblems = [];
	for (const task of activeTasks(base)) {
		if (CHILD_ID.test(task.fm.id || "")) continue;
		const allowed = new Set(["queued", "in progress", "done", "dropped"]);
		const seen = new Set();
		for (const cells of queueRows(task.text)) {
			const [n, request, status, sub] = cells;
			if (cells.length !== 4) {
				queueProblems.push(`${task.file}: a row needs 4 cells`);
				continue;
			}
			if (!/^\d+$/.test(n))
				queueProblems.push(`${task.file}: row "${n || "(no #)"}" is not a number`);
			else if (seen.has(n))
				queueProblems.push(`${task.file}: row ${n} duplicate`);
			else seen.add(n);
			if (!request)
				queueProblems.push(`${task.file}: row ${n} has no request`);
			if (!allowed.has(status))
				queueProblems.push(`${task.file}: row ${n} status "${status}"`);
			else if (status === "queued" || status === "dropped") {
				if (sub)
					queueProblems.push(`${task.file}: row ${n} is ${status} but names ${sub}`);
			} else if (!sub)
				queueProblems.push(`${task.file}: row ${n} is ${status} with no subtask`);
			else if (!sub.startsWith(`${task.fm.id}.`))
				queueProblems.push(`${task.file}: row ${n} subtask ${sub} is not under ${task.fm.id}`);
			else if (!byId.has(sub))
				queueProblems.push(`${task.file}: row ${n} subtask ${sub} is not active`);
		}
	}
	add(
		queueProblems.length ? "FAIL" : "PASS",
		"task queue",
		queueProblems.slice(0, 4).join(", "),
	);

	// 5b. parked work is a candidate, not a second task list: the vocabulary and identity are
	// checked, and a promoted row is deleted rather than marked done.
	const backlogText = readIf(abs(base, `${TASKS}/BACKLOG.md`));
	if (backlogText === null) {
		add("PASS", "backlog", "not installed");
	} else {
		const allowed = new Set(["later", "not-now", "not-important"]);
		const ids = new Set();
		const badRows = [];
		const backlogRows = fenceFree(backlogText)
			.split(/\r?\n/)
			.filter((l) => l.trim().startsWith("|"))
			.map((l) =>
				l
					.split("|")
					.slice(1, -1)
					.map((c) => c.replace(/`/g, "").trim()),
			)
			.filter(
				(c) =>
					c.length &&
					c[0].toLowerCase() !== "id" &&
					!c.every((cell) => /^:?-+:?$/.test(cell)),
			);
		for (const cells of backlogRows) {
			const [id, status, item, source, next] = cells;
			if (cells.length !== 5) {
				badRows.push(`${id || "(row)"}: needs 5 cells`);
				continue;
			}
			if (!/^B-\d{2,}$/.test(id))
				badRows.push(`${id || "(no id)"}: ID is B-NN`);
			else if (ids.has(id)) badRows.push(`${id}: duplicate`);
			else ids.add(id);
			if (!allowed.has(status)) badRows.push(`${id}: status "${status}"`);
			if (!item || !source || !next) badRows.push(`${id}: empty cell`);
		}
		add(
			badRows.length ? "FAIL" : "PASS",
			"backlog",
			badRows.length ? badRows.slice(0, 4).join(", ") : `${ids.size} row(s)`,
		);
	}
}
