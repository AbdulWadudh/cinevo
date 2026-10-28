/** doctor/docs.mjs — encoding, placeholders, paths, links, declared commands */
import fs from "node:fs";
import path from "node:path";
import { MOJIBAKE, PROJECT, TEXT_EXT, TIERS } from "../consts.mjs";
import { abs, exists, expand, fenceFree, json, read, readIf, sectionRows } from "../io.mjs";

export function docsChecks({ base, add, isTemplate, strict, fix, fixed }) {
	// 1. encoding
	const badEncoding = [];
	for (const dir of [".agent-kit", ".github", ".opencode"]) {
		for (const rel of expand(base, dir)) {
			if (!TEXT_EXT.has(path.extname(rel))) continue;
			const p = abs(base, rel);
			const buf = fs.readFileSync(p);
			if (buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf)
				badEncoding.push(`${rel} (BOM)`);
			try {
				const s = new TextDecoder("utf-8", { fatal: true }).decode(buf);
				// Built from escapes so this line cannot match itself.
				if (MOJIBAKE.test(s)) badEncoding.push(`${rel} (mojibake)`);
			} catch {
				badEncoding.push(`${rel} (not UTF-8)`);
			}
		}
	}
	add(
		badEncoding.length ? "FAIL" : "PASS",
		"encoding",
		badEncoding.slice(0, 5).join(", "),
	);
	if (fix)
		add(
			"PASS",
			"auto-fixed",
			fixed.length
				? `${fixed.length} file(s): BOM/CRLF/trailing whitespace`
				: "nothing mechanical to repair",
		);

	// 2. placeholders (seeds legitimately carry them)
	const unfilled = [];
	const scanned = [
		"AGENTS.md",
		"CLAUDE.md",
		".agent-kit/SKILL.md",
		".agent-kit",
	]
		.flatMap((e) => expand(base, e))
		.filter((rel) => {
			if (!rel.endsWith(".md")) return false;
			if (rel.startsWith(".agent-kit/templates/")) return false;
			if (rel.startsWith(".agent-kit/tasks/archive/")) return false;
			if (rel.startsWith(".agent-kit/tasks/active/")) return false;
			return true;
		});
	for (const rel of scanned) {
		const text = fenceFree(read(abs(base, rel)));
		const fills = (text.match(/<!--\s*FILL:[\s\S]*?-->/g) || []).length;
		const placeholders = (text.match(/<[A-Z][A-Z0-9 _-]{1,30}>/g) || []).length;
		if (fills + placeholders > 0)
			unfilled.push(`${rel} (${fills + placeholders})`);
	}
	if (isTemplate) {
		// This repo's docs ARE the seeds: markers here are the content, not a debt.
		add(
			"PASS",
			"unfilled markers",
			"n/a: template docs are seeds and carry the markers on purpose",
		);
	} else {
		add(
			unfilled.length ? (strict ? "FAIL" : "WARN") : "PASS",
			"unfilled markers",
			unfilled.slice(0, 6).join(", "),
		);
	}

	// 3. every path an index or doc names must exist
	const dangling = [];
	for (const rel of scanned) {
		const text = fenceFree(read(abs(base, rel)));
		const re =
			/((?:\.agent-kit|src|app|lib|tests?|packages|infra)\/[A-Za-z0-9_\-./[\]]+)/g;
		for (const m of text.matchAll(re)) {
			const ref = m[1].replace(/[.,;:)]+$/, "");
			if (
				!ref ||
				/[*{}<>$]/.test(ref) ||
				ref.endsWith("/") ||
				ref.includes("..")
			)
				continue;
			if (!exists(abs(base, ref))) dangling.push(`${rel} -> ${ref}`);
		}
	}
	add(
		dangling.length ? "FAIL" : "PASS",
		"doc paths resolve",
		[...new Set(dangling)].slice(0, 6).join(", "),
	);

	// 3b. every markdown link resolves (index rot)
	const brokenLinks = [];
	for (const rel of scanned) {
		const text = fenceFree(read(abs(base, rel)));
		for (const m of text.matchAll(/\[[^\]]*\]\(([^)\s]+)\)/g)) {
			const href = m[1];
			if (/^(https?:|mailto:|#)/.test(href) || /[<>*{}]/.test(href)) continue;
			const target = href.split("#")[0];
			if (!target) continue;
			const fromFile = path.resolve(path.dirname(abs(base, rel)), target);
			if (!exists(fromFile) && !exists(abs(base, target)))
				brokenLinks.push(`${rel} -> ${href}`);
		}
	}
	add(
		brokenLinks.length ? "FAIL" : "PASS",
		"markdown links resolve",
		[...new Set(brokenLinks)].slice(0, 6).join(", "),
	);

	// 4. declared commands exist
	const cmdProblems = [];
	for (const [action, command, when] of sectionRows(
		readIf(abs(base, PROJECT)) || "",
	)) {
		if (!TIERS.has(when))
			cmdProblems.push(`${action}: when "${when}" is not always|milestone`);
		const m = command.match(/\brun\s+([\w:.-]+)/);
		if (m) {
			const pkg = json(abs(base, "package.json"));
			if (!pkg) cmdProblems.push(`${action}: no package.json for "${command}"`);
			else if (!pkg.scripts?.[m[1]])
				cmdProblems.push(`${action}: script "${m[1]}" not in package.json`);
		}
	}
	add(
		cmdProblems.length ? "FAIL" : "PASS",
		"declared commands",
		cmdProblems.join(", "),
	);
}
