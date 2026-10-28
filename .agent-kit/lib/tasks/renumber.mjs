/** tasks/renumber.mjs — change a local task id, and everything that cites it */
import fs from "node:fs";
import path from "node:path";
import { TASKS } from "../consts.mjs";
import { abs, die, write } from "../io.mjs";
import {
	activeTasks,
	CHILD_ID,
	childrenOf,
	idsMode,
	nextId,
	refreshActive,
	usedIds,
} from "../taskfile.mjs";

const normal = (v) =>
	String(v || "")
		.trim()
		.toUpperCase()
		.replace(/^TASK-?/, "TASK-");

/**
 * `ids: local` only: an issue number belongs to the issue and is never rewritten. A parent's
 * subtasks follow it, because a dotted id is derived from its parent. Two clones that minted the
 * same number produce two files under one id; `--file` says which one moves.
 */
export function cmdTaskRenumber({ root, oldId, newId, next, file }) {
	const base = path.resolve(root || process.cwd());
	if ((idsMode(base) || "local") === "issue")
		die(
			"ids: issue — the task id is the issue number and is never rewritten; open a new task instead",
		);
	if (!oldId)
		die(
			"usage: task renumber <TASK-N> <TASK-M>  |  task renumber <TASK-N> --next [--file <name>]",
		);
	const from = normal(oldId);
	const hits = activeTasks(base).filter(
		(t) => t.fm.id === from && (!file || t.file === file),
	);
	if (!hits.length)
		die(
			usedIds(base).some((u) => u.id === from)
				? `${from} is archived — history keeps its id; renumber the active task that duplicates it`
				: `no active task with id ${from}${file ? ` in ${file}` : ""}`,
		);
	if (hits.length > 1)
		die(
			`${hits.length} active tasks carry ${from} — add --file to say which one moves:\n  ${hits.map((t) => t.file).join("\n  ")}`,
		);
	const task = hits[0];
	if (CHILD_ID.test(from))
		die(
			`${from} is a subtask — renumber its parent ${from.split(".")[0]}; subtask ids follow it`,
		);

	const to = next ? `TASK-${nextId(base)}` : normal(newId);
	if (!newId && !next)
		die(
			"usage: task renumber <TASK-N> <TASK-M>  |  task renumber <TASK-N> --next [--file <name>]",
		);
	if (!/^TASK-\d+$/.test(to)) die(`new id must be TASK-<number>, not ${to}`);
	if (to === from) die(`${from} is already ${to}`);
	const taken = usedIds(base).find((u) => u.id === to || u.id.startsWith(`${to}.`));
	if (taken) die(`${to} is already used by ${taken.rel}`);

	const family = [task, ...childrenOf(base, from)];
	const moved = [];
	for (const t of family) {
		const old = t.fm.id;
		const fresh = old.replace(from, to);
		let text = t.text
			.replace(/^id:.*$/m, `id: ${fresh}`)
			.replace(new RegExp(`^# ${old.replace(/\./g, "\\.")}\\b`, "m"), `# ${fresh}`);
		if (CHILD_ID.test(fresh))
			text = text.replace(/^parent:.*$/m, `parent: ${to}`);
		const file = t.file.replace(old, fresh);
		write(abs(base, `${TASKS}/active/${file}`), text);
		if (file !== t.file) fs.rmSync(path.join(base, TASKS, "active", t.file));
		moved.push({ old, fresh, file });
	}

	// A declaration that names an id is a reference; it moves with the id.
	const ref = new RegExp(`\\b${from.replace(/\./g, "\\.")}(?!\\d)`, "g");
	for (const t of activeTasks(base)) {
		if (moved.some((m) => m.file === t.file)) continue;
		const text = t.text.replace(/^depends_on:.*$/m, (line) =>
			line.replace(ref, to),
		);
		if (text !== t.text) write(t.path, text);
	}
	refreshActive(base);

	console.log(`\nRenumbered ${from} -> ${to}`);
	for (const m of moved) console.log(`  ${m.old.padEnd(12)} ${m.file}`);
	if (moved.length > 1)
		console.log(
			`  ${moved.length - 1} subtask id(s) followed; their files moved with them`,
		);
	console.log(
		"\nCommits already written keep the old id; the renumbered plan is the trace.\n",
	);
	return 0;
}
