/** doctor/rules.mjs — learnings, checkable rules, the router */
import fs from "node:fs";
import path from "node:path";
import { abs, expand, fenceFree, isDir, read, readIf } from "../io.mjs";

export function rulesChecks({ base, add }) {
	// 6. learnings cap: the live file is a queue, not an archive — past the cap it moves on
	const learn = readIf(abs(base, ".agent-kit/rules/learnings.md"));
	if (learn !== null) {
		const n = learn
			.split(/\r?\n/)
			.filter((l) => l.trim().startsWith("-")).length;
		const archived = expand(base, ".agent-kit/learnings/archive").filter((r) =>
			r.endsWith(".md"),
		).length;
		add(
			n > 30 ? "WARN" : "PASS",
			"learnings size",
			`${n} live entries (cap 30)${n > 30 ? " — run agent-kit learnings archive" : ""}${
				archived ? `, ${archived} archive file(s)` : ""
			}`,
		);
	}

	// 6b. a rule that cannot be checked by reading a diff is advice, not a rule.
	const vague = [];
	for (const rel of expand(base, ".agent-kit/rules").filter((r) =>
		r.endsWith(".md"),
	)) {
		if (rel.endsWith("learnings.md")) continue;
		fenceFree(read(abs(base, rel)))
			.split(/\r?\n/)
			.forEach((line, i) => {
				const m = line.match(
					/\b(be careful|try to|make sure|consider (?:using|adding)|should probably|as needed|use your judgement|where possible)\b/i,
				);
				if (m) vague.push(`${rel}:${i + 1} "${m[0]}"`);
			});
	}
	add(
		vague.length ? "FAIL" : "PASS",
		"rules are checkable",
		vague.slice(0, 5).join(", "),
	);

	// 6c. the router and the folder agree: a row with no file, or a file with no row, fails.
	const rulesDir = abs(base, ".agent-kit/rules");
	const ruleFiles = new Set(
		isDir(rulesDir)
			? fs
					.readdirSync(rulesDir)
					.filter((f) => f.endsWith(".md") && f !== "INDEX.md")
			: [],
	);
	const ruleRows = new Set(
		(readIf(abs(rulesDir, "INDEX.md")) || "")
			.split(/\r?\n/)
			.filter((l) => l.startsWith("|"))
			.map((l) => (l.split("|")[2] || "").match(/`([^`]+\.md)`/))
			.filter(Boolean)
			.map((m) => path.basename(m[1])),
	);
	const ruleBreaks = [
		...[...ruleRows]
			.filter((f) => !ruleFiles.has(f))
			.map((f) => `${f} (no file)`),
		...[...ruleFiles]
			.filter((f) => !ruleRows.has(f))
			.map((f) => `${f} (no row)`),
	];
	add(
		ruleBreaks.length ? "FAIL" : "PASS",
		"rules indexed",
		ruleBreaks.slice(0, 5).join(", "),
	);
}
