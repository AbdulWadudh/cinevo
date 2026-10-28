/** verify/evidence.mjs — reading, hashing and merging the evidence a task carries */
import crypto from "node:crypto";
import fs from "node:fs";
import { LOG_DIR, TASKS } from "../consts.mjs";
import {
	abs,
	covers,
	exists,
	expand,
	git,
	isDir,
	list,
	normalize,
} from "../io.mjs";

/** Rows of a `| Action | Command | ... | Exit |` block, newest block only. */
/** Evidence rows, both shapes: five cells from older tasks, six with the Scope column. */
export function evidenceDetail(text) {
	const m = text.match(
		/^<!-- VERIFY:START -->\r?$([\s\S]*?)^<!-- VERIFY:END -->\r?$/m,
	);
	if (!m) return [];
	return m[1]
		.split(/\r?\n/)
		.filter(
			(l) => l.startsWith("|") && !/^\|\s*-+/.test(l) && !/Action/.test(l),
		)
		.map((l) =>
			l
				.split("|")
				.slice(1, -1)
				.map((c) => c.trim()),
		)
		.filter((c) => c.length >= 5 && c[0] && c[0] !== "—")
		.map((c) =>
			c.length >= 6
				? { action: c[0], command: c[1], scope: c[2], exit: Number(c[5]) }
				: { action: c[0], command: c[1], scope: "full", exit: Number(c[4]) },
		);
}

export function evidenceRows(text) {
	return evidenceDetail(text).map(({ action, exit }) => ({ action, exit }));
}

export function hashText(s) {
	return crypto.createHash("sha256").update(s).digest("hex").slice(0, 16);
}

/** The authored intent: Scope and Plan, stopping before the generated baseline/evidence. */
export function planText(text) {
	const m = text.match(
		/##\s+Scope[\s\S]*?(?=\n##\s+(?:Baseline|Verification))/,
	);
	return m ? m[0].trim() : "";
}

/** `n` identical red runs, the failing set, and the hashes that say nothing moved. */
export function loopState(text) {
	const m = text.match(/<!--\s*LOOP\s+(\{[^\n]*\})\s*-->/);
	if (!m) return null;
	try {
		return JSON.parse(m[1]);
	} catch {
		return null;
	}
}

/**
 * Is the recorded evidence still about the current code? The last verify stores its write-set
 * hash; a mismatch means the tree moved after the green run.
 */
export function evidenceState(base, text, fm) {
	const rows = evidenceDetail(text);
	const loop = loopState(text);
	if (!rows.length) return { state: "never", rows };
	if (!loop?.diff) return { state: "unknown", rows };
	return {
		state: loop.diff === productHash(base, fm) ? "current" : "stale",
		rows,
	};
}

/** The owner question `task block` wrote, or null. */
export function blockedState(text) {
	const m = text.match(
		/^<!-- BLOCKED:START -->\r?$([\s\S]*?)^<!-- BLOCKED:END -->\r?$/m,
	);
	if (!m) return null;
	const line = m[1]
		.split(/\r?\n/)
		.map((l) => l.trim())
		.find((l) => l.startsWith("**BLOCKED"));
	const question = line
		? line.replace(/^\*\*BLOCKED[^*]*\*\*\s*—?\s*/, "").trim()
		: m[1].trim();
	return { question: question || "(no question recorded)" };
}

/** Hash of the changed files inside the write set: the same hash means the same code. */
export function productHash(base, fm) {
	const changed = [];
	if (fm.baseline && fm.baseline !== "none") {
		const committed = git(base, [
			"diff",
			"--name-only",
			`${fm.baseline}..HEAD`,
		]);
		if (committed) changed.push(...committed.split(/\r?\n/).filter(Boolean));
	}
	const dirty = (git(base, ["status", "--porcelain"]) || "")
		.split(/\r?\n/)
		.map((l) => l.slice(3).trim().split(" -> ").pop())
		.filter(Boolean)
		.flatMap((d) => (d.endsWith("/") ? expand(base, d) : [d]));
	changed.push(...dirty);
	const touches = list(fm.touches);
	const files = [...new Set(changed)]
		.filter(
			(c) =>
				!c.startsWith(`${TASKS}/`) &&
				!c.startsWith(`${LOG_DIR}/`) &&
				(touches.length === 0 || touches.some((t) => covers(t, c))),
		)
		.sort();
	const h = crypto.createHash("sha256");
	for (const f of files) {
		const p = abs(base, f);
		h.update(f).update("\0");
		h.update(
			exists(p) && !isDir(p) ? normalize(fs.readFileSync(p)) : "(missing)",
		);
		h.update("\0");
	}
	return h.digest("hex").slice(0, 16);
}

/** Replace the rows this run produced; keep a milestone row's last full run visible. */
export function mergeEvidence(order, prior, run) {
	const map = new Map(prior.map((r) => [r.action, r]));
	for (const r of run) map.set(r.action, r);
	const rows = [];
	const seen = new Set();
	for (const action of order) {
		const row = map.get(action);
		if (row) {
			rows.push(row);
			seen.add(action);
		}
	}
	for (const row of map.values()) if (!seen.has(row.action)) rows.push(row);
	return rows;
}
