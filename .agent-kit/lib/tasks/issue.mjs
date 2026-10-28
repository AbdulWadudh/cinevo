/** tasks/issue.mjs — ids: issue — mint the number, or import an issue someone else opened */
import { fetchIssue, mintIssue } from "../github.mjs";
import { die } from "../io.mjs";
import { usedIds } from "../taskfile.mjs";

/** The issue exists before the task file, because its number is the id. */
export async function mintTask(base, slug) {
	const issue = await mintIssue(base, {
		title: slug.replace(/-/g, " "),
		body: "Opened from agent-kit. The approved plan is published here with `task publish`, and the close is synced back with `task close --sync`.",
	});
	if (!Number.isInteger(issue.number))
		throw new Error(
			"the issues API returned no number — is Issues enabled on this repo?",
		);
	return `TASK-${issue.number}`;
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
