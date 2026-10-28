/** release.mjs — `release`: the note built from unclaimed change files */
import path from "node:path";
import { CATEGORIES, LOG_DIR } from "./consts.mjs";
import { repoSlug } from "./github.mjs";
import { abs, exists, expand, frontMatter, git, posix, read, run, write } from "./io.mjs";
import { CHILD_ID, idsMode } from "./taskfile.mjs";


/** The archived task a card points at, repo-relative, or "" when the card has no link. */
function taskRelOf(cardRel, text) {
	const m = text.match(/^\*\*Task:\*\*\s+\[[^\]]+\]\(([^)]+)\)/m);
	if (!m) return "";
	const rel = path.posix.normalize(
		path.posix.join(path.posix.dirname(cardRel), m[1]),
	);
	return rel.startsWith("..") ? "" : posix(rel);
}

/**
 * Issue number by task id. A task minted under issue ids is `TASK-<issue>`; a task that was
 * backfilled from a local id has that id in its issue title. `gh` is the same credential the
 * mint uses, and a failure leaves the note without issue links rather than stopping the cut.
 */
function issueNumbers(base) {
	const r = run(
		"gh issue list --state all --limit 500 --json number,title",
		base,
		30000,
	);
	if (r.code !== 0) return new Map();
	try {
		const map = new Map();
		for (const issue of JSON.parse(r.out)) {
			const n = Number(issue.number);
			if (!Number.isInteger(n)) continue;
			map.set(`TASK-${n}`, n);
			const m = String(issue.title || "").match(/^(TASK-\d+)\b/);
			if (m) map.set(m[1], n);
		}
		return map;
	} catch {
		return new Map();
	}
}
/** The close wrote this paragraph; the note quotes it instead of asking for a second text. */
export function cardNote(text) {
	const section = text.split(/^## /m).find((s) => s.startsWith("What changed"));
	return section ? section.split(/\r?\n/).slice(1).join("\n").trim() : "";
}

/** The commit that last touched this card: the one that shipped its task, once it is committed. */
function shippedIn(base, rel) {
	return git(base, ["log", "-1", "--format=%h", "--", rel]) || "";
}

/** The change files no earlier release claims, oldest first. */
export function unreleasedChanges(base) {
	const claimed = new Set();
	for (const rel of expand(base, ".agent-kit/releases").filter((r) => r.endsWith(".md")))
		for (const m of read(abs(base, rel)).matchAll(
			/<!--\s*RELEASED:START\s*-->([\s\S]*?)<!--\s*RELEASED:END\s*-->/g,
		))
			for (const id of m[1].matchAll(/\bTASK-\d+\b/g)) claimed.add(id[0]);

	return expand(base, LOG_DIR)
		.filter((rel) => rel.endsWith(".md") && !rel.endsWith("INDEX.md"))
		.map((rel) => {
			const text = read(abs(base, rel));
			const fm = frontMatter(text);
			return {
				id: fm.id || "",
				type: (fm.type || "changed").toLowerCase(),
				summary: fm.summary || "",
				date: fm.date || "",
				note: cardNote(text),
				commit: shippedIn(base, rel),
				taskRel: taskRelOf(rel, text),
			};
		})
		.filter((e) => e.id && !CHILD_ID.test(e.id) && !claimed.has(e.id))
		.sort((a, b) =>
			`${a.date}\u0000${a.id}`.localeCompare(`${b.date}\u0000${b.id}`),
		);
}

/**
 * `.agent-kit/releases/vX.Y.Z.md` — the short, user-facing layer over the change files. It is written
 * once per version and read by git and people, not by an agent index. Cutting the note never commits
 * or tags; `--tag` is the second half, and it refuses to tag a note that is not committed yet.
 */
export function cmdRelease({ root, version, tag }) {
	const base = path.resolve(root || process.cwd());
	const raw = String(version || "").trim().replace(/^v/i, "");
	if (!/^\d+\.\d+\.\d+$/.test(raw)) {
		console.error(
			"agent-kit: usage: release <version>  (X.Y.Z or vX.Y.Z) | release --tag <version>",
		);
		return 1;
	}
	const rel = `.agent-kit/releases/v${raw}.md`;

	if (tag) {
		if (!exists(abs(base, rel))) {
			console.error(
				`\nCannot tag: ${rel} does not exist — cut the note first.\n`,
			);
			return 1;
		}
		if (git(base, ["status", "--porcelain", "--", rel]) !== "") {
			console.error(
				`\nCannot tag: ${rel} is not committed. Commit it first, so the tag can carry it:\n  git add ${rel} && git commit -m "docs: release v${raw}"\n`,
			);
			return 1;
		}
		if (git(base, ["tag", "-l", `v${raw}`])) {
			console.error(
				`\nCannot tag: v${raw} already exists — a tag is never moved; bump the version.\n`,
			);
			return 1;
		}
		// The note becomes the tag message, so `git show vX.Y.Z` and every release page
		// carry it without a second copy to keep in sync. `verbatim` matters: git's default
		// cleanup eats the `#` and `###` lines, which is the note's whole structure.
		if (
			git(base, [
				"tag",
				"-a",
				`v${raw}`,
				"-F",
				abs(base, rel),
				"--cleanup=verbatim",
			]) === null
		) {
			console.error(`\nCannot tag: git refused to create v${raw}.\n`);
			return 1;
		}
		console.log(`\nTagged v${raw} — annotated with ${rel}\n`);
		console.log(`Push    git push origin v${raw}`);
		console.log(
			`Publish gh release create v${raw} --notes-file ${rel}   (the tag must be pushed first)\n`,
		);
		return 0;
	}
	if (exists(abs(base, rel))) {
		console.error(`\nCannot release: ${rel} already exists — bump the version.\n`);
		return 1;
	}
	const fresh = unreleasedChanges(base);
	if (!fresh.length) {
		console.error(
			"\nCannot release: nothing new — every change file is claimed by a release.\n",
		);
		return 1;
	}

	const day = new Date().toISOString().slice(0, 10);
	const slug = repoSlug(base);
	const issueById = idsMode(base) === "issue" ? issueNumbers(base) : new Map();
	const tagName = `v${raw}`;
	const taskLink = (e) =>
		slug && e.taskRel
			? `[${e.id}](https://github.com/${slug}/blob/${tagName}/${e.taskRel})`
			: e.id;
	const issueLink = (e) => {
		const n = slug ? issueById.get(e.id) : null;
		return n
			? ` · [issue #${n}](https://github.com/${slug}/issues/${n})`
			: "";
	};
	const lines = [`# Release v${raw}`, "", `**Date:** ${day}`, ""];
	for (const [type, label] of CATEGORIES) {
		const group = fresh.filter((e) => e.type === type);
		if (!group.length) continue;
		lines.push(`### ${label}`, "");
		for (const e of group) {
			lines.push(
				`**${e.summary}** (${taskLink(e)}${e.commit ? ` · ${e.commit}` : ""})`,
				"",
			);
			if (e.note && e.note !== e.summary) lines.push(e.note, "");
		}
	}
	lines.push(
		"---",
		"",
		"<!-- RELEASED:START -->",
		...fresh.map((e) => `- ${taskLink(e)}${issueLink(e)}`),
		"<!-- RELEASED:END -->",
		"",
	);
	write(abs(base, rel), lines.join("\n"));
	console.log(`\nWrote ${rel} — ${fresh.length} change(s)\n`);
	const unnamed = fresh.filter((e) => !e.commit);
	if (unnamed.length)
		console.log(
			`Note    ${unnamed.length} card(s) are not committed yet — the note cannot name their commits: ${unnamed.map((e) => e.id).join(", ")}\n`,
		);
	console.log(`Commit  git add ${rel} && git commit -m "docs: release v${raw}"`);
	console.log(
		`Tag     agent-kit release --tag v${raw}   (the note becomes the tag message)`,
	);
	console.log(
		`Push    git push origin v${raw} && gh release create v${raw} --notes-file ${rel}\n`,
	);
	return 0;
}
