/** tasks/migrate.mjs — give every archived task the issue it never got */
import path from "node:path";
import { entriesIn } from "../changelog.mjs";
import { LOG_DIR, TASKS } from "../consts.mjs";
import { listIssues, mintIssue, patchIssue } from "../github.mjs";
import { abs, expand, frontMatter, read } from "../io.mjs";
import { cardNote } from "../release.mjs";
import { CHILD_ID } from "../taskfile.mjs";

/** Archived tasks, oldest id first, so the issues land in the order the work did. */
function archived(base) {
	return expand(base, `${TASKS}/archive`)
		.filter((rel) => rel.endsWith(".md"))
		.map((rel) => {
			const text = read(abs(base, rel));
			return { rel, text, fm: frontMatter(text) };
		})
		.filter(({ fm }) => fm.id && !CHILD_ID.test(fm.id))
		.sort((a, b) => Number(a.fm.id.slice(5)) - Number(b.fm.id.slice(5)));
}

/** The card's summary is the title; the heading is the fallback a pre-card archive still has. */
function summaryOf({ rel, text, fm }, card) {
	const fromCard = String(card?.summary || "").trim();
	if (fromCard) return fromCard;
	const fromFm = String(fm.summary || "").trim();
	if (fromFm) return fromFm;
	const heading = (text.match(/^# (.+)$/m) || [])[1] || "";
	return (
		heading
			.replace(new RegExp(`^${fm.id}\\s*[—:-]\\s*`), "")
			.trim() || rel
	);
}

/**
 * The issue is a record, not a second plan: the paragraph a close already wrote, and the two
 * paths that hold the detail. The id is in the title because the number cannot be the id —
 * these tasks were closed before this repo took ids from issues.
 */
function issueText({ id, rel }, card) {
	const note = card?.note || "";
	const lines = [note || `No change card was written for ${id}.`, "", "---", ""];
	if (card) lines.push(`Change card: \`${card.rel}\``);
	lines.push(`Archived plan: \`${rel}\``);
	lines.push(
		"",
		`_${id} was closed before this repo took its task ids from issues, so its id is the title._`,
	);
	return lines.join("\n");
}

export async function cmdTaskMigrate({ root, dry }) {
	const base = path.resolve(root || process.cwd());
	const cards = new Map(
		entriesIn(base, LOG_DIR, "date").map((e) => [
			e.id,
			{ ...e, note: cardNote(read(abs(base, e.rel))) },
		]),
	);
	const queue = archived(base).map((task) => {
		const card = cards.get(task.fm.id);
		const summary = summaryOf(task, card);
		return {
			id: task.fm.id,
			rel: task.rel,
			card,
			summary,
			title: `${task.fm.id} — ${summary}`,
		};
	});
	if (queue.length === 0) {
		console.log("\nNothing archived to migrate.\n");
		return 0;
	}

	if (dry) {
		console.log(
			`\nWould open ${queue.length} closed issue(s) from the archive:\n`,
		);
		for (const q of queue) console.log(`  ${q.title}`);
		console.log("\nDry run: nothing was sent.\n");
		return 0;
	}

	let existing;
	try {
		existing = await listIssues(base);
	} catch (e) {
		console.error(`agent-kit: ${e.message}\n`);
		return 1;
	}
	// A title starting with the id is the task's issue: the id is the only durable key, since
	// the number differs from it by design.
	const titled = new Set(
		existing
			.map((i) => (String(i.title || "").match(/^(TASK-\d+)\b/) || [])[1])
			.filter(Boolean),
	);
	const todo = queue.filter((q) => !titled.has(q.id));
	if (todo.length === 0) {
		console.log(
			`\nAll ${queue.length} archived task(s) already have an issue.\n`,
		);
		return 0;
	}

	console.log(`\nMigrating ${todo.length} archived task(s):\n`);
	let failed = 0;
	for (const q of todo) {
		try {
			const issue = await mintIssue(base, {
				title: q.title,
				body: issueText(q, q.card),
			});
			await patchIssue(base, issue.number, {
				state: "closed",
				state_reason: "completed",
			});
			console.log(`  ${q.id.padEnd(10)} #${issue.number}  ${q.summary}`);
		} catch (e) {
			failed++;
			console.error(`  ${q.id.padEnd(10)} failed: ${e.message}`);
		}
	}
	const made = todo.length - failed;
	console.log(
		`\n${made} created, ${queue.length - todo.length} already had an issue${failed ? `, ${failed} failed — run it again to resume` : ""}\n`,
	);
	return failed ? 1 : 0;
}
