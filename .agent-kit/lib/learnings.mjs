/** learnings.mjs — `learnings archive` */
import path from "node:path";
import { abs, die, readIf, write } from "./io.mjs";


/**
 * The live learnings file is a queue a session reads, so it has a cap. Past it, the oldest
 * entries go to `.agent-kit/learnings/archive/<YYYY-MM>.md` — same move as an archived task:
 * kept, dated, out of the way.
 */
export function cmdLearningsArchive({ root, keep = 30 }) {
	const base = path.resolve(root || process.cwd());
	const rel = ".agent-kit/rules/learnings.md";
	const text = readIf(abs(base, rel));
	if (text === null) die(`${rel} does not exist`);
	const lines = text.split(/\r?\n/);
	const at = lines
		.map((l, i) => (l.trim().startsWith("- ") ? i : -1))
		.filter((i) => i >= 0);
	if (at.length <= keep) {
		console.log(`nothing to archive — ${at.length} entries (cap ${keep})`);
		return 0;
	}
	const moving = at.slice(0, at.length - keep);
	const month = new Date().toISOString().slice(0, 7);
	const archiveRel = `.agent-kit/learnings/archive/${month}.md`;
	const head = readIf(abs(base, archiveRel));
	write(
		abs(base, archiveRel),
		`${
			head === null
				? `# Learnings archive — ${month}\n\nEntries that left \`${rel}\` when it passed the cap.\n\n`
				: head.replace(/\s*$/, "\n")
		}${moving.map((i) => lines[i]).join("\n")}\n`,
	);
	write(
		abs(base, rel),
		`${lines
			.filter((_, i) => !moving.includes(i))
			.join("\n")
			.replace(/\s*$/, "")}\n`,
	);
	console.log(
		`archived ${moving.length} to ${archiveRel}, kept ${keep} live\n`,
	);
	return 0;
}
