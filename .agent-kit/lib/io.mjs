/** io.mjs — filesystem, process and text helpers */
import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { SKIP_DIRS } from "./consts.mjs";

// ---------------------------------------------------------------- utilities

export const abs = (root, p) => path.join(root, p);
export const posix = (p) => p.split(path.sep).join("/");
export const exists = (p) => fs.existsSync(p);
export const isDir = (p) => exists(p) && fs.statSync(p).isDirectory();

export function read(p) {
	return fs.readFileSync(p, "utf8");
}

export function readIf(p) {
	return exists(p) ? read(p) : null;
}

export function write(p, text) {
	fs.mkdirSync(path.dirname(p), { recursive: true });
	fs.writeFileSync(p, text, "utf8");
}

export function copy(from, to) {
	fs.mkdirSync(path.dirname(to), { recursive: true });
	fs.copyFileSync(from, to);
	// Git runs a hook only when it is executable; a file copy does not carry the bit.
	if (path.basename(path.dirname(to)) === "githooks" && !to.endsWith(".md"))
		fs.chmodSync(to, 0o755);
}

export function walk(dir, base = dir, acc = []) {
	if (!isDir(dir)) return acc;
	for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
		if (e.isDirectory()) {
			if (SKIP_DIRS.has(e.name)) continue;
			walk(path.join(dir, e.name), base, acc);
		} else {
			acc.push(posix(path.relative(base, path.join(dir, e.name))));
		}
	}
	return acc;
}

/** State stores are addressed by their parent index, not by one of their own. */
export const STATE_DIRS = new Set(["active", "archive", "learnings", "releases"]);

/** Directories under `dir`, repo-relative. Month folders are entries, not areas to index. */
export function walkDirs(dir, base = dir, acc = []) {
	if (!isDir(dir)) return acc;
	for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
		if (!e.isDirectory() || SKIP_DIRS.has(e.name) || STATE_DIRS.has(e.name))
			continue;
		if (/^\d{2}-\d{4}$/.test(e.name)) continue;
		const p = path.join(dir, e.name);
		acc.push(posix(path.relative(base, p)));
		walkDirs(p, base, acc);
	}
	return acc;
}

/** Entries are repo-relative. A directory entry yields every file beneath it. */
export function expand(root, entry) {
	const p = abs(root, entry);
	if (!exists(p)) return [];
	if (isDir(p)) return walk(p, root);
	return [entry];
}

/** Compare semantics, not encoding artifacts: BOM and CRLF are not drift. */
export function normalize(buf) {
	let s = buf.toString("utf8");
	if (s.charCodeAt(0) === 0xfeff) s = s.slice(1);
	return s.split("\r\n").join("\n");
}

export function hashFile(p) {
	if (!exists(p) || isDir(p)) return null;
	return crypto
		.createHash("sha256")
		.update(normalize(fs.readFileSync(p)))
		.digest("hex")
		.slice(0, 16);
}

export function json(p, fallback = null) {
	const t = readIf(p);
	if (t === null) return fallback;
	try {
		return JSON.parse(t);
	} catch (e) {
		die(`${p}: invalid JSON (${e.message})`);
	}
}

export function die(msg, code = 1) {
	console.error(`agent-kit: ${msg}`);
	process.exit(code);
}

export function run(
	cmd,
	cwd,
	timeout = Number(process.env.AGENT_KIT_TIMEOUT || 600000),
) {
	const r = spawnSync(cmd, {
		cwd,
		shell: true,
		encoding: "utf8",
		timeout,
		env: process.env,
	});
	return {
		code: r.status === null ? 124 : r.status,
		out: `${r.stdout || ""}${r.stderr || ""}`,
	};
}

export function git(root, args) {
	const r = spawnSync("git", args, { cwd: root, encoding: "utf8" });
	// Trailing whitespace only: porcelain output is column-sensitive, so a full trim
	// would eat the leading space of the first status line.
	return r.status === 0 ? r.stdout.replace(/\s+$/, "") : null;
}

export function fenceFree(text) {
	return text.replace(/^[ \t]*(```|~~~)[\s\S]*?^[ \t]*\1[ \t]*$/gm, "");
}

export function frontMatter(text) {
	const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
	if (!m) return {};
	const out = {};
	for (const line of m[1].split(/\r?\n/)) {
		const i = line.indexOf(":");
		if (i < 0) continue;
		const raw = line.slice(i + 1).trim();
		// Quotes are YAML syntax, not content: `summary: "x # y"` keeps the hash, `a # b` does not.
		const quoted = raw.match(/^(["'])([\s\S]*)\1$/);
		let value;
		if (!quoted) value = raw.replace(/\s+#.*$/, "").trim();
		// A double-quoted YAML scalar escapes its own quote; a release note is read by people, so
		// `\"` must not survive into the tag message.
		else if (quoted[1] === '"') value = quoted[2].replace(/\\(["\\])/g, "$1");
		else value = quoted[2];
		out[line.slice(0, i).trim()] = value;
	}
	return out;
}

export function list(value) {
	const t = (value || "").trim();
	if (!t.startsWith("[")) return t ? [t] : [];
	try {
		return JSON.parse(t.replace(/'/g, '"'));
	} catch {
		return t
			.slice(1, -1)
			.split(",")
			.map((s) => s.trim().replace(/^["']|["']$/g, ""))
			.filter(Boolean);
	}
}

export function normGlob(s) {
	return posix(s).replace(/^\.\//, "").replace(/\/+$/, "").toLowerCase();
}

export const segs = (s) => normGlob(s).split("/").filter(Boolean);

/** Does `glob` cover `file`? Segment-wise: * = one segment, ** = zero or more,
 *  and a shorter glob covers everything beneath it (path-prefix rule). */
export function covers(glob, file) {
	const g = segs(glob);
	const f = segs(file);
	const m = (i, j) => {
		if (i === g.length) return true;
		if (g[i] === "**") return m(i + 1, j) || (j < f.length && m(i, j + 1));
		if (j >= f.length) return false;
		return (g[i] === "*" || g[i] === f[j]) && m(i + 1, j + 1);
	};
	return m(0, 0);
}

/** Conservative overlap used only to flag two in-flight tasks on the same files. */
export function overlaps(a, b) {
	const A = segs(a);
	const B = segs(b);
	for (let i = 0; i < Math.min(A.length, B.length); i++) {
		if (A[i] === "**" || B[i] === "**") return true;
		if (A[i] !== "*" && B[i] !== "*" && A[i] !== B[i]) return false;
	}
	return true;
}

// Markers count only as a whole line: the engine writes them that way, and prose that merely
// names one must never be mistaken for the block.
export function block(text, name, body) {
	const re = new RegExp(
		`(^<!-- ${name}:START -->\\r?$)[\\s\\S]*?(^<!-- ${name}:END -->\\r?$)`,
		"m",
	);
	if (!re.test(text)) return text;
	return text.replace(re, (_, open, close) => `${open}\n${body}\n${close}`);
}

/** The body of a named block, or null when its markers are absent. */
export function blockBody(text, name) {
	const m = text.match(
		new RegExp(
			`^<!-- ${name}:START -->\\r?$([\\s\\S]*?)^<!-- ${name}:END -->\\r?$`,
			"m",
		),
	);
	return m ? m[1].trim() : null;
}

export function sectionRows(text) {
	const m = text.match(/##\s+Commands\s*\n([\s\S]*?)(\n##\s|$)/);
	if (!m) return [];
	return m[1]
		.split(/\r?\n/)
		.map((l) =>
			l.match(
				/^\|\s*([a-z]+)\s*\|\s*`?([^`|]+?)`?\s*\|\s*([a-z-]*)\s*\|?\s*$/,
			),
		)
		.filter(Boolean)
		.map((mm) => [mm[1], mm[2].trim(), (mm[3] || "always").toLowerCase()]);
}

export function table(rows) {
	const width = Math.max(7, ...rows.map((r) => r[0].length));
	for (const [status, name, detail] of rows) {
		console.log(
			`  ${status.padEnd(width)}  ${name}${detail ? `  ${detail}` : ""}`,
		);
	}
}
