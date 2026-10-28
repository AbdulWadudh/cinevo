/** release.mjs — `release`: the note built from unclaimed change files */
import path from "node:path";
import { CATEGORIES, LOG_DIR } from "./consts.mjs";
import { abs, exists, expand, frontMatter, git, read, write } from "./io.mjs";
import { CHILD_ID } from "./taskfile.mjs";


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
			const fm = frontMatter(read(abs(base, rel)));
			return {
				id: fm.id || "",
				type: (fm.type || "changed").toLowerCase(),
				summary: fm.summary || "",
				date: fm.date || "",
			};
		})
		.filter((e) => e.id && !CHILD_ID.test(e.id) && !claimed.has(e.id))
		.sort((a, b) =>
			`${a.date}\u0000${a.id}`.localeCompare(`${b.date}\u0000${b.id}`),
		);
}

/**
 * `.agent-kit/releases/vX.Y.Z.md` — the short, user-facing layer over the change files. It is written
 * once per version and read by git and people, not by an agent index. Cutting the note never runs
 * git; `--tag` is the second half, and it refuses to tag a note that is not committed yet.
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
	const lines = [`# Release v${raw}`, "", `**Date:** ${day}`, ""];
	for (const [type, label] of CATEGORIES) {
		const group = fresh.filter((e) => e.type === type);
		if (!group.length) continue;
		lines.push(`### ${label}`, "");
		for (const e of group) lines.push(`- ${e.summary} (${e.id})`);
		lines.push("");
	}
	lines.push(
		"---",
		"",
		"<!-- RELEASED:START -->",
		...fresh.map((e) => `- ${e.id}`),
		"<!-- RELEASED:END -->",
		"",
	);
	write(abs(base, rel), lines.join("\n"));
	console.log(`\nWrote ${rel} — ${fresh.length} change(s)\n`);
	console.log(`Commit  git add ${rel} && git commit -m "docs: release v${raw}"`);
	console.log(
		`Tag     agent-kit release --tag v${raw}   (the note becomes the tag message)`,
	);
	console.log(
		`Push    git push origin v${raw} && gh release create v${raw} --notes-file ${rel}\n`,
	);
	return 0;
}
