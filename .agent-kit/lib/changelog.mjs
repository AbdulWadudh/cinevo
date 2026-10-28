/** changelog.mjs — change cards */
import fs from "node:fs";
import path from "node:path";
import { LOG_DIR, RECENT_INDEXES } from "./consts.mjs";
import { abs, expand, frontMatter, posix, read, readIf, write } from "./io.mjs";
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

/**
 * `start` derives the five newest closes from the cards, so no index stores them. An older
 * install still carries a RECENT block in two indexes; the first close retires it rather than
 * leaving links that drift from the files.
 */
export function retireRecent(base) {
	for (const rel of RECENT_INDEXES) {
		const text = readIf(abs(base, rel));
		if (text === null || !text.includes("<!-- RECENT:START -->")) continue;
		const next = text
			.replace(/<!-- RECENT:START -->[\s\S]*?<!-- RECENT:END -->\r?\n?/, "")
			.replace(/## Recent\r?\n\r?\n(?=#|$)/, "");
		if (next !== text) write(abs(base, rel), next);
	}
}
