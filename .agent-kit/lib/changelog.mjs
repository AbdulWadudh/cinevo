/** changelog.mjs — change cards and the recent lists */
import fs from "node:fs";
import path from "node:path";
import { LOG_DIR, RECENT_LIMIT, RECENT_LISTS } from "./consts.mjs";
import { abs, block, expand, frontMatter, posix, read, readIf, write } from "./io.mjs";
import { CHILD_ID, closeOutField } from "./taskfile.mjs";


/**
 * One file per change, written at close. The folder is the month it landed in, the filename
 * is the record: `logs/MM-YYYY/YYYY-MM-DD-TASK-N-slug.md`. There is no second ledger —
 * this file *is* the changelog entry, and `doctor` finds an archived task through its id.
 *
 * It is the completion record, not the plan: the close-out paragraph, the files git reported,
 * and the two lines that place it. Intent, evidence and follow-ups stay in the archived task;
 * the id is the pointer to them, and copying them here would make a second home.
 */
export function writeChange(base, { id, type, slug, summary, changed, task, taskRel }) {
	const day = new Date().toISOString().slice(0, 10);
	const month = `${day.slice(5, 7)}-${day.slice(0, 4)}`;
	const dir = `${LOG_DIR}/${month}`;
	const rel = `${dir}/${day}-${id}-${slug}.md`;
	const note = closeOutField(task, "Summary") || closeOutField(task, "Outcome");
	const areas = [...new Set(changed.map((c) => c.split("/")[0]))].sort();
	const link = posix(path.relative(path.dirname(rel), taskRel));
	fs.mkdirSync(abs(base, dir), { recursive: true });
	write(
		abs(base, rel),
		[
			"---",
			`id: ${id}`,
			`type: ${type}`,
			`date: ${day}`,
			`summary: ${JSON.stringify(summary)}`,
			"---",
			"",
			`# ${id} — ${summary}`,
			"",
			`**Task:** [${id}](${link})`,
			`**Scope:** ${areas.join(", ") || "none"}`,
			"",
			"## What changed",
			"",
			note && !/<!--/.test(note) ? note : summary,
			"",
		].join("\n"),
	);
	return rel;
}

/** Markdown files under a state folder, newest first. Each entry is one index line. */
export function entriesIn(base, dir, dateField) {
	return expand(base, dir)
		.filter((rel) => rel.endsWith(".md") && path.basename(rel) !== "INDEX.md")
		.map((rel) => {
			const fm = frontMatter(read(abs(base, rel)));
			const name = (path.basename(rel).match(/^\d{4}-\d{2}-\d{2}/) || [""])[0];
			return {
				rel,
				id: fm.id,
				summary: fm.summary,
				date: fm[dateField] || fm.created || name,
			};
		})
		.filter((e) => e.id && !CHILD_ID.test(e.id))
		.sort((a, b) =>
			`${b.date}\u0000${b.rel}`.localeCompare(`${a.date}\u0000${a.rel}`),
		);
}

/** The body of an index's RECENT block: five links, newest first, one line each. */
export function recentLines(base, indexRel, dir, dateField) {
	const recent = entriesIn(base, dir, dateField).slice(0, RECENT_LIMIT);
	if (!recent.length) return "_Nothing yet._";
	const from = path.dirname(indexRel);
	return recent
		.map(
			(e) =>
				`- \`${e.date || "undated"}\` [${e.id}](${posix(path.relative(from, e.rel))}) — ${e.summary || "(no summary)"}`,
		)
		.join("\n");
}

export function refreshRecents(base) {
	for (const [rel, dir, field] of RECENT_LISTS) {
		const text = readIf(abs(base, rel));
		if (text === null) continue;
		write(
			abs(base, rel),
			block(text, "RECENT", recentLines(base, rel, dir, field)),
		);
	}
}
