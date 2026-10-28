/** tasks/publish.mjs — send the task record to its issue, and close it there */
import path from "node:path";
import { CHILD_ID, currentTask, idsMode } from "../taskfile.mjs";
import { TASKS } from "../consts.mjs";
import { commentIssue, patchIssue } from "../github.mjs";
import { abs, die, frontMatter, read } from "../io.mjs";

/** The issue body is the task file's prose; the front matter and the path stay in the repo. */
export function issueBody(text, rel) {
	const at = text.indexOf("\n# ");
	const body = at >= 0 ? text.slice(at + 1) : text;
	return `${body.trim()}\n\n---\n_Published from \`${rel}\` by agent-kit._\n`;
}

const issueNumber = (fm) => Number(String(fm.id || "").replace(/^TASK-/, ""));

export async function cmdTaskPublish({ root, id }) {
	const base = path.resolve(root || process.cwd());
	if ((idsMode(base) || "local") !== "issue")
		die(
			"ids: local — the task file is the whole record; `setup --ids issue` makes the issue the shared copy",
		);
	const file = currentTask(base, id);
	const rel = `${TASKS}/active/${file}`;
	const text = read(abs(base, rel));
	const fm = frontMatter(text);
	if (CHILD_ID.test(fm.id || ""))
		die(`${fm.id} is a subtask — its parent's issue carries the family`);
	try {
		const issue = await patchIssue(base, issueNumber(fm), {
			...(fm.summary ? { title: fm.summary } : {}),
			body: issueBody(text, rel),
		});
		console.log(
			`\nPublished ${fm.id} -> ${issue.html_url || `issue #${issueNumber(fm)}`}\n`,
		);
	} catch (e) {
		console.error(`agent-kit: ${e.message}\n`);
		return 1;
	}
	return 0;
}

/**
 * Runs after the local close is written, so a failed sync reports and returns 1 — it never
 * takes back a close that is already on disk.
 */
export async function syncAfterClose({ base, fm, body, rel, change }) {
	if (CHILD_ID.test(fm.id || "")) return 0;
	const n = issueNumber(fm);
	try {
		await patchIssue(base, n, {
			state: "closed",
			...(fm.summary ? { title: fm.summary } : {}),
			body: issueBody(body, rel),
		});
		await commentIssue(
			base,
			n,
			`## Summary\n\n${fm.summary}\n\nChange card: \`${change}\``,
		);
		console.log(`  issue     #${n} closed with the final record`);
	} catch (e) {
		console.error(`agent-kit: ${e.message}`);
		console.error(
			`  ${fm.id} is closed locally; fix access and run \`task publish\` to update #${n}\n`,
		);
		return 1;
	}
	return 0;
}
