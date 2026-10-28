/** tasks/issue.mjs — ids: issue — mint the number, or import an issue someone else opened */
import { fetchIssue, mintIssue } from "../github.mjs";
import { die } from "../io.mjs";
import { usedIds } from "../taskfile.mjs";

/** The issue exists before the task file, because its number is the id. */
export async function mintTask(base, { summary, intent }) {
	const issue = await mintIssue(base, {
		title: summary,
		body: intent || summary,
	});
	if (!Number.isInteger(issue.number))
		throw new Error(
			"the issues API returned no number — is Issues enabled on this repo?",
		);
	// A repo that used local ids first can reach a number its history already carries. The issue
	// is open by now, so the message says what to do rather than pretending nothing happened.
	const id = `TASK-${issue.number}`;
	const taken = usedIds(base).find((u) => u.id === id);
	if (taken)
		throw new Error(
			`issue #${issue.number} was opened, but ${id} is already used by ${taken.rel} — this repo's history predates issue ids. Close issue #${issue.number}, then open the task again: numbers are not reused, so the next mint is free`,
		);
	return id;
}

/** `--from 131` adopts an issue a collaborator opened; the id is that number. */
export async function importTask(base, from) {
	const n = Number(String(from).replace(/^#+|^TASK-/i, ""));
	if (!Number.isInteger(n) || n <= 0)
		die(`--from needs an issue number, not ${from}`);
	const id = `TASK-${n}`;
	const taken = usedIds(base).find((u) => u.id === id);
	if (taken) die(`${id} is already used by ${taken.rel}`);
	const issue = await fetchIssue(base, n);
	const intent =
		String(issue.body || "")
			.split(/\r?\n\s*\r?\n/)
			.find((p) => p.trim()) || "";
	return {
		id,
		title: String(issue.title || "").trim(),
		intent: intent.trim().slice(0, 400),
	};
}
