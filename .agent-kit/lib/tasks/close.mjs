/** tasks/close.mjs — the close gate, inventory, archive and change card */
import fs from "node:fs";
import path from "node:path";
import { refreshRecents, writeChange } from "../changelog.mjs";
import { CATEGORIES, ENTRY_LIMIT, LOG_DIR, TASKS } from "../consts.mjs";
import {
	abs,
	block,
	covers,
	expand,
	frontMatter,
	git,
	list,
	read,
	write,
} from "../io.mjs";
import {
	activeTasks,
	CHILD_ID,
	childrenOf,
	closingNote,
	currentTask,
	parentId,
	refreshActive,
	scopeTouches,
} from "../taskfile.mjs";
import { evidenceDetail, evidenceRows } from "../verify/evidence.mjs";
import { cmdVerify } from "../verify/index.mjs";

export function cmdTaskClose({ root, id, amend, noVerify, pr }) {
	const base = path.resolve(root || process.cwd());
	const file = currentTask(base, id);
	const rel = `${TASKS}/active/${file}`;
	let text = read(abs(base, rel));
	const fm = frontMatter(text);
	const today = new Date().toISOString().slice(0, 10);
	const problems = [];
	const isChild = CHILD_ID.test(fm.id || "");
	const parent = isChild ? parentId(fm) : "";
	const kids = isChild ? [] : childrenOf(base, fm.id);
	const openKids = kids.filter((t) => t.fm.status !== "DONE");

	if (fm.status === "BLOCKED") {
		console.error(
			`\nCannot close ${file}: it is BLOCKED — resume it first (\`task resume\`).\n`,
		);
		return 1;
	}
	if (fm.status === "DONE") {
		console.error(`\nCannot close ${file}: it is already DONE.\n`);
		return 1;
	}
	if (isChild && !parent)
		problems.push(
			"subtask front matter has no parent (a `TASK-N.M` id needs `parent: TASK-N`)",
		);
	// The main close is the milestone: build runs here, after every subtask is done.
	if (!isChild && openKids.length)
		problems.push(
			`subtasks still open: ${openKids.map((t) => `${t.fm.id} (${t.fm.status || "?"})`).join(", ")} — close them first; the main close is where build runs`,
		);

	if (!fm.summary)
		problems.push(
			"front-matter summary is empty (it becomes the change file title)",
		);
	if (fm.summary && fm.summary.length > ENTRY_LIMIT)
		problems.push(
			`front-matter summary is ${fm.summary.length} characters (limit ${ENTRY_LIMIT}: the change file title is one clause)`,
		);
	const type = (fm.type || "changed").toLowerCase();
	if (!CATEGORIES.some(([t]) => t === type))
		problems.push(
			`front-matter type "${fm.type}" is not one of ${CATEGORIES.map(([t]) => t).join(", ")}`,
		);
	if (list(fm.touches).length === 0 && !kids.length)
		problems.push("front-matter touches is empty (declare the write set)");
	if (/<!--\s*FILL:/.test(text))
		problems.push("unfilled <!-- FILL: --> marker left in the task file");

	// A subtask answers for the family's files; the main task answers for its own plus every
	// child's, because the one change file it writes covers the whole delivery.
	const touches = scopeTouches(base, fm);

	// Close runs the suite itself: the last moment the tree is still "as delivered" is the
	// only moment worth recording, and an agent cannot forget a step it never had to take.
	if (!problems.length && !noVerify) {
		console.log(
			isChild
				? "Verification (a subtask closes on the quick suite; build runs at the main close):"
				: "Verification (close runs the full suite; `verify` is the mid-flight quick check):",
		);
		if (cmdVerify({ root: base, full: !isChild }) !== 0)
			problems.push(
				"verification failed — the recorded table in the task file holds the exit codes",
			);
		text = read(abs(base, rel));
	}

	// Mechanical inventory: what actually changed, never what the session remembers.
	let changed = [];
	if (
		fm.baseline &&
		fm.baseline !== "none" &&
		git(base, ["rev-parse", "HEAD"])
	) {
		const diff =
			git(base, ["diff", "--name-only", `${fm.baseline}..HEAD`]) || "";
		const dirty = (git(base, ["status", "--porcelain"]) || "")
			.split(/\r?\n/)
			.map((l) => l.slice(3).trim().split(" -> ").pop())
			.filter(Boolean)
			// git reports a new directory as one `dir/` entry; the inventory is about files.
			.flatMap((d) => (d.endsWith("/") ? expand(base, d) : [d]));
		changed = [...new Set([...diff.split(/\r?\n/), ...dirty].filter(Boolean))];
	} else {
		problems.push(
			"no git baseline recorded; the changed-file inventory cannot be derived",
		);
	}
	// Inventory is product files only: the kit's own bookkeeping (task file, index, counter,
	// changelog) is written by these commands, so counting it would flag every close as a breach.
	changed = changed.filter(
		(c) =>
			c !== rel && !c.startsWith(`${TASKS}/`) && !c.startsWith(`${LOG_DIR}/`),
	);

	const outOfScope = touches.length
		? changed.filter((c) => !touches.some((t) => covers(t, c)))
		: [];
	if (outOfScope.length && !amend) {
		problems.push(
			`scope breach — not covered by touches: ${outOfScope.join(", ")} (pass --amend "<reason>" to accept it)`,
		);
	}

	// Evidence gate: the recorded runs are the only proof, so they must all be green.
	const recorded = evidenceRows(text);
	const red = recorded.filter((r) => Number.isFinite(r.exit) && r.exit !== 0);
	if (red.length)
		problems.push(
			`verification recorded as failing: ${red.map((r) => r.action).join(", ")} — fix it, or close with the failure written down by hand`,
		);

	if (problems.length) {
		console.error(`\nCannot close ${file}:`);
		for (const p of problems) console.error(`  - ${p}`);
		console.error("");
		return 1;
	}

	if (outOfScope.length) {
		const amended = [...list(fm.touches), ...outOfScope];
		text = text.replace(
			/^touches:.*$/m,
			`touches: [${amended.map((t) => `"${t}"`).join(", ")}]`,
		);
		text = text.replace(
			"<!-- FILES:START -->",
			`**Scope amended at close** — ${amend}: ${outOfScope.map((c) => `\`${c}\``).join(", ")}\n\n<!-- FILES:START -->`,
		);
		console.log(`\nScope amended: ${outOfScope.join(", ")}`);
	}

	// A subtask closes quietly: it keeps its file for the main close to archive, and its share
	// of the inventory is already inside the parent's baseline diff.
	if (isChild) {
		const own = list(fm.touches);
		const files = changed.filter((c) => own.some((t) => covers(t, c)));
		text = block(
			text,
			"FILES",
			files.length
				? files.map((c) => `- \`${c}\``).join("\n")
				: "- none detected",
		);
		text = text.replace(/^status:.*$/m, `status: DONE\nclosed: ${today}`);
		write(abs(base, rel), text);
		refreshActive(base);

		const stillOpen = childrenOf(base, parent).filter(
			(t) => t.fm.status !== "DONE",
		);
		const parentTask = activeTasks(base).find((t) => t.fm.id === parent);
		let promoted = "";
		if (!stillOpen.length && parentTask && parentTask.fm.status === "QUEUED") {
			write(
				parentTask.path,
				read(parentTask.path).replace(/^status:.*$/m, "status: IN_PROGRESS"),
			);
			refreshActive(base);
			promoted = parent;
		}

		const { commitType, notes } = closingNote(text, fm, type);
		console.log(`\nClosed ${fm.id} (subtask)`);
		console.log(
			`  inventory ${files.length} file(s) — the parent's change file covers the family`,
		);
		console.log(
			promoted
				? `  parent    ${promoted} is back in progress — its close runs build`
				: `  parent    ${parent} — ${stillOpen.length} subtask(s) still open`,
		);
		console.log("\nCommit message:\n");
		console.log(`${commitType} (${fm.id}): ${fm.summary}`);
		console.log("");
		console.log(`${notes} (${fm.id})\n`);
		return 0;
	}

	text = block(
		text,
		"FILES",
		changed.length
			? changed.map((c) => `- \`${c}\``).join("\n")
			: "- none detected",
	);
	text = text.replace(/^status:.*$/m, `status: DONE\nclosed: ${today}`);

	const month = today.slice(0, 7);
	const archive = `${TASKS}/archive/${month}`;
	fs.mkdirSync(abs(base, archive), { recursive: true });
	write(abs(base, `${archive}/${file}`), text);
	fs.rmSync(abs(base, rel));

	// Done subtasks travel with the parent: one delivery, one archive, one change file.
	for (const kid of kids)
		if (kid.fm.status === "DONE") {
			write(abs(base, `${archive}/${kid.file}`), kid.text);
			fs.rmSync(abs(base, `${TASKS}/active/${kid.file}`));
		}

	const change = writeChange(base, {
		id: fm.id,
		type,
		slug: String(file)
			.replace(/\.md$/, "")
			.replace(/^\d{4}-\d{2}-\d{2}-/, "")
			.replace(/^[A-Z][A-Z0-9-]*-/, ""),
		summary: fm.summary,
		changed,
		task: text,
		taskRel: `${archive}/${file}`,
	});

	refreshActive(base);
	refreshRecents(base);

	console.log(`\nClosed ${fm.id}`);
	console.log(`  archived  ${archive}/${file}`);
	if (kids.length)
		console.log(
			`  subtasks  ${kids.filter((k) => k.fm.status === "DONE").length} archived with it`,
		);
	console.log(`  inventory ${changed.length} file(s)`);
	console.log(`  change    ${change} (${type})`);

	const archived = read(abs(base, `${archive}/${file}`));
	const { commitType, notes } = closingNote(archived, fm, type);
	console.log("\nCommit message:\n");
	console.log(`${commitType} (${fm.id}): ${fm.summary}`);
	console.log("");
	console.log(`${notes} (${fm.id})\n`);

	if (pr) {
		const rows = evidenceDetail(archived);
		const prBody = [
			"## Summary",
			`${fm.summary} (${fm.id})`,
			"",
			"## Changes",
			...(changed.length
				? changed.map((c) => `- \`${c}\``)
				: ["- none detected"]),
			"",
			"## Verification",
			"| Action | Scope | Exit |",
			"|---|---|---|",
			...(rows.length
				? rows.map((r) => `| ${r.action} | ${r.scope} | ${r.exit} |`)
				: ["| — | — | — |"]),
			"",
			"## Notes",
			notes,
		].join("\n");
		console.log(`PR body:\n\n${prBody}\n`);
	}
	return 0;
}
