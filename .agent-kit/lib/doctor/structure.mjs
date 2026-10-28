/** doctor/structure.mjs — files, indexes, pointers, budgets */
import fs from "node:fs";
import { LOG_DIR, MANIFEST, PROJECT, SKIP_DIRS, STATE, TASK_INDEX } from "../consts.mjs";
import { prerequisites } from "../env.mjs";
import { abs, exists, isDir, read, walk, walkDirs } from "../io.mjs";
import { idsMode } from "../taskfile.mjs";

export function structureChecks({ base, add, isTemplate }) {
	const required = [
		"AGENTS.md",
		"CLAUDE.md",
		MANIFEST,
		TASK_INDEX,
		`${LOG_DIR}/INDEX.md`,
		".agent-kit/docs/INDEX.md",
		".agent-kit/agent-kit.mjs",
		".agent-kit/SKILL.md",
	];
	if (!isTemplate) required.push(PROJECT, STATE);
	const missing = required.filter((r) => !exists(abs(base, r)));
	add(missing.length ? "FAIL" : "PASS", "required files", missing.join(", "));

	// 0b. every directory an agent may open is indexed, so it reads one index and one file
	// instead of listing a folder into context. State stores are covered by their parent.
	const unindexedDirs = [".agent-kit"]
		.filter((dir) => isDir(abs(base, dir)))
		.flatMap((dir) => [dir, ...walkDirs(abs(base, dir), base)])
		.filter((rel) => !exists(abs(base, `${rel}/INDEX.md`)));
	add(
		unindexedDirs.length ? "FAIL" : "PASS",
		"directory indexes",
		unindexedDirs.slice(0, 4).join(", "),
	);

	// A harness skill file is a pointer: the loop lives in `.agent-kit/SKILL.md`, and a copy in
	// `.claude/skills/` or `.opencode/skills/` would drift the first time either is edited.
	const harnessDirs = fs
		.readdirSync(base, { withFileTypes: true })
		.filter(
			(e) =>
				e.isDirectory() && e.name.startsWith(".") && !SKIP_DIRS.has(e.name),
		)
		.map((e) => e.name)
		// Only a harness with a skills/ folder can hold a SKILL.md; walking a build cache
		// like .next would cost more than this check is worth.
		.filter((d) => isDir(abs(base, `${d}/skills`)));
	const pointers = harnessDirs
		.flatMap((d) => walk(abs(base, d), base))
		.filter((rel) => /(^|\/)skills\/[^/]+\/SKILL\.md$/.test(rel));
	const notPointer = pointers.filter((rel) => {
		const t = read(abs(base, rel));
		// A session pays for characters, not line breaks: a pointer is frontmatter plus one
		// line, and a copy of the loop is thousands of characters.
		return t.length > 700 || !t.includes(".agent-kit/SKILL.md");
	});
	add(
		notPointer.length ? "FAIL" : "PASS",
		"skill pointers",
		notPointer.length
			? `${notPointer.join(", ")} — a copy, not a pointer to .agent-kit/SKILL.md`
			: pointers.length
				? pointers.join(", ")
				: "none: AGENTS.md already points at .agent-kit/SKILL.md",
	);

	// The machine's tools are a gate, not advice (owner 2026-10-28): a missing one is how silent
	// token waste and a task with no derivable inventory happen. Presence only, except GitHub,
	// which is listed only when the repo takes its ids from issues.
	const issueIds = idsMode(base) === "issue";
	const req = prerequisites(base, { issue: issueIds });
	const absent = req.filter((p) => !p.ok);
	add(
		absent.length ? "FAIL" : "PASS",
		"prerequisites",
		absent.length
			? absent.map((p) => `${p.name}: ${p.fix}`).join("; ")
			: req.map((p) => `${p.name} ${p.found}`).join(", "),
	);

	// A session pays for these four files before it plans anything, so they are the budget. A
	// section that outgrows its cap moves to a file reached by an index, which is the JIT path.
	const budget = [
		["AGENTS.md", 9000],
		[".agent-kit/SKILL.md", 10000],
		[".agent-kit/rules/_behavior.md", 7500],
		[".agent-kit/rules/INDEX.md", 1800],
	];
	const over = budget
		.map(([rel, cap]) => {
			const p = abs(base, rel);
			return exists(p) ? { rel, cap, chars: read(p).length } : null;
		})
		.filter((r) => r && r.chars > r.cap);
	add(
		over.length ? "FAIL" : "PASS",
		"context budget",
		over.length
			? `${over.map((r) => `${r.rel} ${r.chars}/${r.cap}`).join(", ")} - move detail behind an index, see .agent-kit/prompts/trim-agents-md.md`
			: "",
	);
}
