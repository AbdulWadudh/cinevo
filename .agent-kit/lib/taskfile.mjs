/** taskfile.mjs — task state: active tasks, ids, the index block */
import fs from "node:fs";
import { TASK_INDEX, TASKS } from "./consts.mjs";
import {
	abs,
	block,
	die,
	exists,
	expand,
	frontMatter,
	list,
	read,
	write,
} from "./io.mjs";

export function slugify(s) {
	return (
		s
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-|-$/g, "")
			.slice(0, 48) || "task"
	);
}

export function nextId(root) {
	const p = abs(root, `${TASKS}/.counter`);
	const n = exists(p) ? parseInt(read(p).trim(), 10) || 100 : 100;
	write(p, `${n + 1}\n`);
	return n + 1;
}

/** Every active file with its parsed state. The status decides the slot, not the file count. */
export function activeTasks(root) {
	const dir = abs(root, `${TASKS}/active`);
	if (!exists(dir)) return [];
	return fs
		.readdirSync(dir)
		.filter((f) => f.endsWith(".md"))
		.map((f) => {
			const p = abs(dir, f);
			const text = read(p);
			return { file: f, path: p, text, fm: frontMatter(text) };
		});
}

export const CHILD_ID = /^TASK-\d+\.\d+$/;

/** Subtasks name their parent in `parent:`; a top-level task has none. */
export function parentId(fm) {
	return (fm.parent || "").trim();
}

export function childrenOf(root, parent) {
	return activeTasks(root).filter((t) => parentId(t.fm) === parent);
}

/** `TASK-104.2` after `.1`, never touching the top-level `.counter`. */
export function nextChildId(root, parent) {
	let n = 0;
	const bump = (id) => {
		const m = String(id || "").match(/^TASK-\d+\.(\d+)$/);
		if (m) n = Math.max(n, Number(m[1]));
	};
	for (const t of childrenOf(root, parent)) bump(t.fm.id);
	for (const rel of expand(root, `${TASKS}/archive`)) {
		if (!rel.endsWith(".md")) continue;
		const fm = frontMatter(read(abs(root, rel)));
		if (parentId(fm) === parent) bump(fm.id);
	}
	return `${parent}.${n + 1}`;
}

/** The write set a task answers for: its own, plus its subtasks' when it has any. */
export function scopeTouches(root, fm) {
	const own = list(fm.touches);
	const id = fm.id || "";
	const family = CHILD_ID.test(id) ? parentId(fm) : id;
	const tasks = activeTasks(root);
	const parent = tasks.find((t) => t.fm.id === family);
	const kids = family ? tasks.filter((t) => parentId(t.fm) === family) : [];
	return [
		...new Set([
			...(parent ? list(parent.fm.touches) : []),
			...own,
			...kids.flatMap((t) => list(t.fm.touches)),
		]),
	];
}

/** The Active block is derived from active/, so a status change cannot rot it. */
export function refreshActive(base) {
	const rank = { IN_PROGRESS: 0, REVIEW: 1, BLOCKED: 2, QUEUED: 3, DONE: 4 };
	const rows = activeTasks(base)
		.sort(
			(a, b) =>
				(rank[a.fm.status] ?? 9) - (rank[b.fm.status] ?? 9) ||
				a.file.localeCompare(b.file),
		)
		.map(
			({ file, fm }) =>
				`- \`${fm.id || "?"}\` [${fm.status || "?"}] ${fm.lane || "?"} — [${file}](active/${file})`,
		);
	write(
		abs(base, TASK_INDEX),
		block(
			read(abs(base, TASK_INDEX)),
			"ACTIVE",
			rows.join("\n") || "_Nothing in flight._",
		),
	);
}

/** Find by exact id first: `TASK-104` is a prefix of its own subtasks' file names. */
export function matchTasks(tasks, id) {
	const exact = tasks.filter((t) => t.fm.id === id);
	return exact.length ? exact : tasks.filter((t) => t.file.includes(id));
}

export function currentTask(root, id) {
	const tasks = activeTasks(root);
	const hit = id
		? matchTasks(tasks, id)
		: tasks.filter((t) => t.fm.status === "IN_PROGRESS");
	if (hit.length !== 1)
		die(
			hit.length === 0
				? id
					? `no active task matches ${id}`
					: "no task is in progress"
				: `ambiguous: ${hit.map((t) => t.file).join(", ")}; pass --id`,
		);
	return hit[0].file;
}

/** A `**Field** — …` block in a task's prose, up to the next field, comment or heading. */
export function closeOutField(text, name) {
	const m = (text || "").match(
		new RegExp(
			`\\*\\*${name}\\*\\*\\s*—?\\s*([\\s\\S]*?)(?=\\n\\*\\*|\\n<!--|\\n##\\s|$)`,
		),
	);
	return m ? m[1].trim() : "";
}

/** The commit subject and body a close prints: the change file's wording, or the summary. */
export function closingNote(text, fm, type) {
	const note = closeOutField(text, "Summary") || closeOutField(text, "Outcome");
	const notes = note && !/<!--/.test(note) ? note : fm.summary;
	const commitType =
		{ added: "feat", changed: "feat", fixed: "fix", removed: "refactor" }[
			type
		] || "chore";
	return { commitType, notes };
}
