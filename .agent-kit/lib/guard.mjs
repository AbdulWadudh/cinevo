/** guard.mjs — `task guard`: the hook gate */
import path from "node:path";
import { LOG_DIR, TASKS } from "./consts.mjs";
import {
	abs,
	covers,
	frontMatter,
	git,
	list,
	read,
	readIf,
	walk,
} from "./io.mjs";
import { activeTasks } from "./taskfile.mjs";

export const COMMIT_TYPES =
	"feat|fix|docs|refactor|test|chore|perf|build|ci|style|revert";

/**
 * Message gate, run by `.agent-kit/githooks/commit-msg`. The subject names the type and the task; the
 * body is the change file's `## What changed` paragraph. A repo with no task yet (the setup
 * fill commit) has no
 * ID to name, so the gate stays out of the way until the first task exists.
 *
 * Advisory by design: a shared checkout must never block a human's `git commit`. A wrong
 * message prints the expected shape and exits 0; the rule itself stays binding on the agent.
 */
export function guardCommitMessage(base, file) {
	const text = readIf(file);
	if (text === null) {
		console.error(`agent-kit: cannot read the commit message file: ${file}`);
		return 0;
	}
	const lines = text.split(/\r?\n/).filter((l) => !/^\s*#/.test(l));
	while (lines.length && !lines[0].trim()) lines.shift();
	while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
	const subject = lines[0] || "";
	// Git writes these itself; the session did not author them.
	if (/^(Merge |Revert "|fixup! |squash! )/.test(subject)) return 0;

	const ids = new Set();
	for (const lane of ["active", "archive"]) {
		const dir = abs(base, TASKS, lane);
		for (const rel of walk(dir)) {
			if (!rel.endsWith(".md")) continue;
			const id = frontMatter(read(abs(dir, rel))).id;
			if (id) ids.add(id);
		}
	}
	if (ids.size === 0) return 0;

	const ref = subject.match(
		new RegExp(`^(${COMMIT_TYPES}) \\((TASK-\\d+)\\): \\S`),
	);
	const fail = (why) => {
		console.error(`\nagent-kit: commit message warning. ${why}`);
		console.error(`  got:   ${subject || "(empty)"}`);
		console.error("  want:  <type> (TASK-ID): <summary>");
		console.error(`  types: ${COMMIT_TYPES.replaceAll("|", ", ")}`);
		console.error(
			"  body:  a blank line, then the change file's What-changed paragraph",
		);
		console.error(
			"  The commit proceeds; rewrite it with `git commit --amend`.\n",
		);
		return 0;
	};
	if (!ref) return fail("The subject is not `type (TASK-ID): summary`.");
	if (!ids.has(ref[2]))
		return fail(`${ref[2]} is not a task in active/ or archive/.`);
	if ((lines[1] || "").trim())
		return fail("The body must start after a blank line.");
	if (!lines.slice(2).some((l) => l.trim()))
		return fail("The body is empty: write what changed and why.");
	return 0;
}

/**
 * Hook gate. Opt-in per clone (`git config core.hooksPath .agent-kit/githooks`): a shared repo must not
 * rewrite a human's git behaviour on install. Without `--message`, the pre-commit scope check,
 * silent when no task is open; with it, the commit-msg check.
 */
export function cmdTaskGuard({ root, message }) {
	const base = path.resolve(root || process.cwd());
	if (message) return guardCommitMessage(base, message);
	const inProgress = activeTasks(base).filter(
		(t) => t.fm.status === "IN_PROGRESS",
	);
	if (inProgress.length === 0) return 0;
	if (inProgress.length > 1) {
		console.error(
			`agent-kit: ${inProgress.length} tasks are in progress. Close one before committing.`,
		);
		return 1;
	}
	const touches = list(inProgress[0].fm.touches);
	const staged = (git(base, ["diff", "--staged", "--name-only"]) || "")
		.split(/\r?\n/)
		.filter(Boolean)
		.filter((c) => !c.startsWith(`${TASKS}/`) && !c.startsWith(`${LOG_DIR}/`));
	const breached = staged.filter((c) => !touches.some((t) => covers(t, c)));
	if (breached.length === 0) return 0;
	console.error(
		`\nagent-kit: refusing this commit. ${inProgress[0].file} declares touches:`,
	);
	console.error(`  ${touches.join(", ") || "(none)"}`);
	console.error("Staged and not covered:");
	for (const b of breached) console.error(`  ${b}`);
	console.error(
		"\nEither add them to the task's `touches`, unstage them (git restore --staged <file>),",
	);
	console.error("or close the task first.\n");
	return 1;
}
