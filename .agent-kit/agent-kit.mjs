#!/usr/bin/env node

/**
 * agent-kit.mjs — the template's only executable surface.
 *
 * Zero dependencies. Runs on Bun or Node >= 18. Uses node: builtins only, so
 * `bun .agent-kit/agent-kit.mjs <cmd>` and `node .agent-kit/agent-kit.mjs <cmd>` are
 * the same program.
 *
 * Commands
 *   setup [target] [--source <path|url>]   scaffold a repo; never overwrites an authored file
 *          [--no-rtk]                     skip the token-saver install
 *   check [--json]                         drift table vs the template; never writes
 *   pull [--dry-run|--force|--seeds]       apply the sync, then doctor
 *   doctor [--strict] [--fix] [--json]     truth checks over the repo's own docs
 *   start                                  session brief: task, gate, evidence, next; never writes
 *   verify [--full|--baseline]             run the always-tier commands; --full adds milestone rows
 *   harnesses                              list the coding agents on this machine (HOME, PATH, repo)
 *   task new <slug> [--lane quick|planned] open a task and record the baseline run
 *            [--parent TASK-N]             ... as TASK-N.M, closing on the quick suite
 *   task show [--id TASK-N]                the active task's scope, plan, evidence and staleness
 *   task block "<question>"                stop at an impasse; the owner's question waits on disk
 *   task resume                            continue a blocked task
 *   task close [--amend "<why>"] [--pr]    quick for a subtask, full suite + archive for the main
 *   task guard [--message <file>]          hook gate: scope (pre-commit), message (commit-msg)
 *   learnings archive                      move entries past the 30 cap into .agent-kit/learnings/
 *   release <version>                      write .agent-kit/releases/vX.Y.Z.md from the unclaimed change files
 *   selftest                               prove every gate can fail, in a temp repo
 *
 * Design rule: one canonical home per fact. Commands live in .agent-kit/project.md
 * only; this file cites them, never restates them.
 */

import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_ROOT = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"..",
);
const MANIFEST = ".agent-kit/sync-manifest.json";
const STATE = ".agent-kit/template.json";
const PROJECT = ".agent-kit/project.md";
const TASKS = ".agent-kit/tasks";
const TASK_INDEX = `${TASKS}/INDEX.md`;
const TASK_TEMPLATE = ".agent-kit/templates/task.md";
const LOG_DIR = ".agent-kit/logs";

// A change is one file, filed under the month it landed in:
// `logs/MM-YYYY/YYYY-MM-DD-TASK-N-slug.md`. One home for the vocabulary: close validates
// against it, `release` renders the headings.
const CATEGORIES = [
	["added", "Added"],
	["changed", "Changed"],
	["fixed", "Fixed"],
	["removed", "Removed"],
];
const ENTRY_LIMIT = 140;
// A loop is the same red set over the same code: past this many identical runs, a new plan.
const LOOP_LIMIT = 3;
// `always` runs on every verify; `milestone` only on the baseline, `verify --full` and close.
// A missing cell means `always`, so a table written before tiers existed keeps its meaning.
const TIERS = new Set(["always", "milestone"]);

// The indexes carry the last few entries, so a session reads a list instead of a folder.
// [index, folder, date field]
const RECENT_LISTS = [
	[TASK_INDEX, `${TASKS}/archive`, "closed"],
	[`${LOG_DIR}/INDEX.md`, LOG_DIR, "date"],
];
const RECENT_LIMIT = 5;

const TEXT_EXT = new Set([
	".md",
	".mjs",
	".js",
	".json",
	".yml",
	".yaml",
	".sh",
	".txt",
	".toml",
]);
const SKIP_DIRS = new Set([
	".git",
	"node_modules",
	"dist",
	"build",
	"out",
	"coverage",
	".venv",
	"venv",
	"target",
	"__pycache__",
]);
// Common double-encoded UTF-8 sequences. Escaped so the pattern cannot match its own source.
const MOJIBAKE = /(dY[\x22\x27~-]|\u00c3[\x80-\xBF]|\u00e2\u20ac|\ufffd)/;

// ---------------------------------------------------------------- utilities

const abs = (root, p) => path.join(root, p);
const posix = (p) => p.split(path.sep).join("/");
const exists = (p) => fs.existsSync(p);
const isDir = (p) => exists(p) && fs.statSync(p).isDirectory();

function read(p) {
	return fs.readFileSync(p, "utf8");
}

function readIf(p) {
	return exists(p) ? read(p) : null;
}

function write(p, text) {
	fs.mkdirSync(path.dirname(p), { recursive: true });
	fs.writeFileSync(p, text, "utf8");
}

function copy(from, to) {
	fs.mkdirSync(path.dirname(to), { recursive: true });
	fs.copyFileSync(from, to);
	// Git runs a hook only when it is executable; a file copy does not carry the bit.
	if (path.basename(path.dirname(to)) === "githooks" && !to.endsWith(".md"))
		fs.chmodSync(to, 0o755);
}

function walk(dir, base = dir, acc = []) {
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
const STATE_DIRS = new Set(["active", "archive", "learnings", "releases"]);

/** Directories under `dir`, repo-relative. Month folders are entries, not areas to index. */
function walkDirs(dir, base = dir, acc = []) {
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
function expand(root, entry) {
	const p = abs(root, entry);
	if (!exists(p)) return [];
	if (isDir(p)) return walk(p, root);
	return [entry];
}

/** Compare semantics, not encoding artifacts: BOM and CRLF are not drift. */
function normalize(buf) {
	let s = buf.toString("utf8");
	if (s.charCodeAt(0) === 0xfeff) s = s.slice(1);
	return s.split("\r\n").join("\n");
}

function hashFile(p) {
	if (!exists(p) || isDir(p)) return null;
	return crypto
		.createHash("sha256")
		.update(normalize(fs.readFileSync(p)))
		.digest("hex")
		.slice(0, 16);
}

function json(p, fallback = null) {
	const t = readIf(p);
	if (t === null) return fallback;
	try {
		return JSON.parse(t);
	} catch (e) {
		die(`${p}: invalid JSON (${e.message})`);
	}
}

function die(msg, code = 1) {
	console.error(`agent-kit: ${msg}`);
	process.exit(code);
}

function run(
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

function git(root, args) {
	const r = spawnSync("git", args, { cwd: root, encoding: "utf8" });
	// Trailing whitespace only: porcelain output is column-sensitive, so a full trim
	// would eat the leading space of the first status line.
	return r.status === 0 ? r.stdout.replace(/\s+$/, "") : null;
}

function fenceFree(text) {
	return text.replace(/^[ \t]*(```|~~~)[\s\S]*?^[ \t]*\1[ \t]*$/gm, "");
}

function frontMatter(text) {
	const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
	if (!m) return {};
	const out = {};
	for (const line of m[1].split(/\r?\n/)) {
		const i = line.indexOf(":");
		if (i < 0) continue;
		const raw = line.slice(i + 1).trim();
		// Quotes are YAML syntax, not content: `summary: "x # y"` keeps the hash, `a # b` does not.
		const quoted = raw.match(/^(["'])([\s\S]*)\1$/);
		out[line.slice(0, i).trim()] = quoted
			? quoted[2]
			: raw.replace(/\s+#.*$/, "").trim();
	}
	return out;
}

function list(value) {
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

function normGlob(s) {
	return posix(s).replace(/^\.\//, "").replace(/\/+$/, "").toLowerCase();
}

const segs = (s) => normGlob(s).split("/").filter(Boolean);

/** Does `glob` cover `file`? Segment-wise: * = one segment, ** = zero or more,
 *  and a shorter glob covers everything beneath it (path-prefix rule). */
function covers(glob, file) {
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
function overlaps(a, b) {
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
function block(text, name, body) {
	const re = new RegExp(
		`(^<!-- ${name}:START -->\\r?$)[\\s\\S]*?(^<!-- ${name}:END -->\\r?$)`,
		"m",
	);
	if (!re.test(text)) return text;
	return text.replace(re, (_, open, close) => `${open}\n${body}\n${close}`);
}

/** The body of a named block, or null when its markers are absent. */
function blockBody(text, name) {
	const m = text.match(
		new RegExp(
			`^<!-- ${name}:START -->\\r?$([\\s\\S]*?)^<!-- ${name}:END -->\\r?$`,
			"m",
		),
	);
	return m ? m[1].trim() : null;
}

function sectionRows(text) {
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

function table(rows) {
	const width = Math.max(7, ...rows.map((r) => r[0].length));
	for (const [status, name, detail] of rows) {
		console.log(
			`  ${status.padEnd(width)}  ${name}${detail ? `  ${detail}` : ""}`,
		);
	}
}

// ---------------------------------------------------------------- manifest

function manifestOf(root) {
	const m = json(abs(root, MANIFEST));
	if (!m) return null;
	m.machinery = m.machinery || [];
	m.seeds = m.seeds || {};
	m.prune = m.prune || [];
	m.owned = m.owned || [];
	return m;
}

function sourceFor(root, override) {
	if (override) return resolveSpec(root, override);
	const state = json(abs(root, STATE));
	if (state?.source) return resolveSpec(root, state.source);
	return null;
}

function resolveSpec(root, spec) {
	const looksRemote =
		/^(https?:\/\/|git@|ssh:\/\/)/.test(spec) || spec.endsWith(".git");
	if (!looksRemote) {
		const p = path.resolve(root, spec);
		if (!isDir(p)) die(`source not found: ${p}`);
		return { root: p, spec, temp: false };
	}
	const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "agent-kit-"));
	const r = run(`git clone --depth 1 "${spec}" "${tmp}"`, root);
	if (r.code !== 0) die(`git clone failed for ${spec}\n${r.out}`);
	return { root: tmp, spec, temp: true };
}

// ---------------------------------------------------------------- stack detection

function detectStack(root) {
	const out = {
		languages: [],
		manifests: [],
		pm: null,
		commands: {},
		entry: [],
		generated: [],
		notes: [],
	};
	const pkg = json(abs(root, "package.json"));

	if (pkg) {
		out.languages.push("JavaScript");
		out.manifests.push("package.json");
		if (
			exists(abs(root, "tsconfig.json")) ||
			pkg.devDependencies?.typescript ||
			pkg.dependencies?.typescript
		) {
			out.languages.push("TypeScript");
		}
		const declared = (pkg.packageManager || "").split("@")[0];
		const lock = [
			["bun", ["bun.lockb", "bun.lock"]],
			["pnpm", ["pnpm-lock.yaml"]],
			["yarn", ["yarn.lock"]],
			["npm", ["package-lock.json"]],
		].find(([, files]) => files.some((f) => exists(abs(root, f))));
		out.pm = declared || (lock ? lock[0] : "npm");
		const s = pkg.scripts || {};
		const pick = (...names) => names.find((n) => s[n]);
		const install = {
			bun: "bun install",
			pnpm: "pnpm install",
			yarn: "yarn install",
			npm: "npm install",
		}[out.pm];
		out.commands.install = install;
		const build = pick("build", "compile");
		const test = pick("test", "test:unit", "vitest", "jest");
		const lint = pick("lint", "eslint");
		const typecheck = pick("typecheck", "type-check", "tsc");
		if (build) out.commands.build = `${out.pm} run ${build}`;
		if (test) out.commands.test = `${out.pm} run ${test}`;
		if (lint) out.commands.lint = `${out.pm} run ${lint}`;
		if (typecheck) out.commands.typecheck = `${out.pm} run ${typecheck}`;
		else if (
			out.languages.includes("TypeScript") &&
			exists(abs(root, "tsconfig.json"))
		) {
			out.commands.typecheck = `${out.pm === "bun" ? "bunx" : "npx"} tsc --noEmit`;
		}
		const entry = [
			pkg.main,
			pkg.module,
			...(Array.isArray(pkg.bin) ? pkg.bin : pkg.bin ? [pkg.bin] : []),
		]
			.filter(Boolean)
			.map((e) => posix(e));
		out.entry.push(...entry);
		if (pkg.workspaces) {
			out.notes.push(
				"Monorepo: the command table describes the root. Per-package work may need `--filter`/`-w`; confirm before trusting it.",
			);
		}
		if (!test)
			out.notes.push(
				"No test script found. If tests exist, add the real command to the table by hand.",
			);
	}

	const py = ["pyproject.toml", "requirements.txt", "setup.py"].filter((f) =>
		exists(abs(root, f)),
	);
	if (py.length) {
		out.languages.push("Python");
		out.manifests.push(...py);
		out.commands.install ||= "python -m pip install -r requirements.txt";
		const hasTests = exists(abs(root, "tests")) || exists(abs(root, "test"));
		if (hasTests) out.commands.test ||= "python -m pytest -q";
		const pyText = readIf(abs(root, "pyproject.toml")) || "";
		if (/ruff/.test(pyText)) out.commands.lint ||= "python -m ruff check .";
		if (/mypy/.test(pyText)) out.commands.typecheck ||= "python -m mypy .";
	}

	if (exists(abs(root, "go.mod"))) {
		out.languages.push("Go");
		out.manifests.push("go.mod");
		out.commands.install ||= "go mod download";
		out.commands.build ||= "go build ./...";
		out.commands.test ||= "go test ./...";
		out.commands.lint ||= "go vet ./...";
	}

	if (exists(abs(root, "Cargo.toml"))) {
		out.languages.push("Rust");
		out.manifests.push("Cargo.toml");
		out.commands.install ||= "cargo fetch";
		out.commands.build ||= "cargo build";
		out.commands.test ||= "cargo test";
		out.commands.lint ||= "cargo clippy -- -D warnings";
	}

	if (out.languages.length === 0 && exists(abs(root, "Makefile"))) {
		const mk = read(abs(root, "Makefile"));
		out.manifests.push("Makefile");
		for (const target of ["build", "test", "lint"]) {
			if (new RegExp(`^${target}:`, "m").test(mk))
				out.commands[target] = `make ${target}`;
		}
	}

	if (out.entry.length === 0) {
		for (const c of [
			"src/index.ts",
			"src/index.js",
			"src/main.ts",
			"src/main.js",
			"main.py",
			"app/main.py",
			"src/main.rs",
			"cmd",
		]) {
			if (exists(abs(root, c))) out.entry.push(c);
		}
	}

	for (const d of [
		"node_modules",
		"dist",
		"build",
		"out",
		".next",
		".nuxt",
		".svelte-kit",
		"coverage",
		".venv",
		"venv",
		"__pycache__",
		"target",
		"vendor",
		".turbo",
		".cache",
	]) {
		if (exists(abs(root, d))) out.generated.push(d);
	}

	return out;
}

function projectMd(stack, today) {
	const lines = [];
	lines.push("# Project Profile", "");
	lines.push(
		"<!-- Generated by agent-kit setup. Review it, then keep it current.",
	);
	lines.push(
		"     This file is the ONLY home for stack facts and commands. AGENTS.md, the",
	);
	lines.push(
		"     rules and the verification gate cite it; none of them restate it. -->",
		"",
	);
	lines.push("## Stack", "", "| Fact | Value |", "|---|---|");
	lines.push(`| Languages | ${stack.languages.join(", ") || "undetected"} |`);
	lines.push(`| Package manager | ${stack.pm || "n/a"} |`);
	lines.push(`| Manifests | ${stack.manifests.join(", ") || "none found"} |`);
	lines.push(
		"",
		"## Commands",
		"",
		"`always` runs on every `verify` and every close; `milestone` runs on the baseline,",
		"`verify --full` and a top-level task's close — a subtask's close is quick. Mark a slow",
		"command `milestone` so the inner loop and subtask closes stay short.",
		"",
		"| Action | Command | When |",
		"|---|---|---|",
	);
	const order = ["install", "build", "typecheck", "lint", "test"];
	const milestone = new Set(["build"]);
	for (const action of order) {
		if (stack.commands[action])
			lines.push(
				`| ${action} | ${stack.commands[action]} | ${milestone.has(action) ? "milestone" : "always"} |`,
			);
	}
	if (Object.keys(stack.commands).length === 0)
		lines.push("| build | <!-- FILL:build-command --> |");
	lines.push("", "## Entry points", "");
	lines.push(
		...(stack.entry.length
			? stack.entry.map((e) => `- ${e}`)
			: ["<!-- FILL:entry-points -->"]),
	);
	lines.push("", "## Never edit (generated)", "");
	lines.push(
		stack.generated.length
			? stack.generated.map((g) => `- ${g}/`).join("\n")
			: "- none detected",
	);
	if (stack.notes.length) {
		lines.push(
			"",
			"## Detection notes",
			"",
			"Guesses the detector is not sure about. Confirm or delete each one.",
		);
		lines.push(...stack.notes.map((n) => `- ${n}`));
	}
	lines.push("", "## Domain notes", "");
	lines.push(
		"<!-- FILL:domain-notes — 3-6 bullets an agent cannot infer from the code:",
	);
	lines.push(
		"     ownership boundaries, external services, invariants that must not break. -->",
	);
	lines.push(
		"",
		"---",
		"",
		`Generated ${today}. Re-run \`agent-kit setup\` only to refresh a missing file.`,
		"",
	);
	return lines.join("\n");
}

// ---------------------------------------------------------------- token saver

/**
 * `rtk` filters shell output before an agent reads it. It is a machine tool, not a repo file:
 * setup installs it once, every later run only verifies it. The skill calls it explicitly
 * (`rtk git status`), so no harness hook has to be patched.
 */
function rtkVersion(root) {
	if (run("rtk gain", root, 30000).code !== 0) return null;
	return (run("rtk --version", root, 15000).out || "").trim() || "installed";
}

function ensureRtk(root) {
	const version = rtkVersion(root);
	if (version) return ["PRESENT", "rtk", version];
	// `rtk --version` working while `gain` fails is the other rtk package (Rust Type Kit).
	if (run("rtk --version", root, 15000).code === 0)
		return [
			"CONFLICT",
			"rtk",
			"another rtk is installed (Rust Type Kit): cargo uninstall rtk, then install rtk-ai.rtk",
		];

	const installs = {
		win32: [
			"winget install --id rtk-ai.rtk -e --accept-source-agreements --accept-package-agreements",
			"cargo install --git https://github.com/rtk-ai/rtk rtk",
		],
		unix: [
			"brew install rtk",
			"curl -fsSL https://raw.githubusercontent.com/rtk-ai/rtk/refs/heads/master/install.sh | sh",
		],
	};
	const commands =
		process.platform === "win32"
			? installs.win32
			: run("brew --version", root, 15000).code === 0
				? installs.unix
				: installs.unix.slice(1);

	for (const command of commands) {
		if (run(command, root, 600000).code !== 0) continue;
		const after = rtkVersion(root);
		return after
			? ["INSTALLED", "rtk", after]
			: ["INSTALLED", "rtk", "reopen the shell if rtk is not on PATH"];
	}
	return [
		"MISSING",
		"rtk",
		"install manually: https://github.com/rtk-ai/rtk — `rtk gain` must work",
	];
}

// ---------------------------------------------------------------- harnesses

/**
 * A harness is what the owner runs an agent in. Its config lives in HOME, not in the repo:
 * a target with no harness files can still be driven by several of them. This is a report,
 * not a gate — a machine without one is advice, not a broken repo.
 *
 * `home` and `repo` are markers, `bin` is a PATH name. `skill` is the in-repo pointer the
 * harness discovers on its own; add one only where the folder convention is known.
 */
const HARNESSES = [
	{ name: "Claude Code", home: [".claude"], bin: ["claude"], repo: [".claude"], skill: ".claude/skills/agent-kit/SKILL.md" },
	{ name: "Codex CLI", home: [".codex"], bin: ["codex"], repo: [".codex"] },
	{ name: "Cursor", home: [".cursor"], bin: ["cursor"], repo: [".cursor"] },
	{ name: "Gemini CLI", home: [".gemini"], bin: ["gemini"], repo: [".gemini", "GEMINI.md"] },
	{ name: "GitHub Copilot", home: [".copilot", ".config/github-copilot"], bin: ["copilot"], repo: [".github/copilot-instructions.md"] },
	{ name: "Windsurf", home: [".codeium/windsurf"], bin: ["windsurf"], repo: [".windsurf"] },
	{ name: "OpenCode", home: [".config/opencode", ".local/share/opencode"], bin: ["opencode"], repo: [".opencode", "opencode.json"], skill: ".opencode/skills/agent-kit/SKILL.md" },
	{ name: "Qoder", home: [".qoder"], repo: [".qoder"] },
	{ name: "Qwen Code", home: [".qwen"], bin: ["qwen"], repo: [".qwen", "QWEN.md"] },
	{ name: "Cline", home: [".cline"], repo: [".cline", ".clinerules"] },
	{ name: "Kiro", home: [".kiro"], repo: [".kiro"] },
	{ name: "Kilo Code", home: [".config/kilo"], repo: [".kilocode"] },
	{ name: "Aider", home: [".aider", ".aider.conf.yml"], bin: ["aider"], repo: [".aider.conf.yml"] },
	{ name: "Amp", home: [".config/amp"], bin: ["amp"], repo: [".amp"] },
	{ name: "Goose", home: [".config/goose"], bin: ["goose"], repo: [".goosehints"] },
	{ name: "Crush", home: [".config/crush"], bin: ["crush"], repo: [".crush"] },
	{ name: "Factory Droid", home: [".factory"], bin: ["droid"], repo: [".factory"] },
	{ name: "OpenHands", home: [".openhands"], repo: [".openhands"] },
	{ name: "Warp", home: [".warp"], repo: ["WARP.md"] },
	{ name: "Continue", home: [".continue"], repo: [".continue"] },
	{ name: "Roo Code", home: [".roo"], repo: [".roo", ".roorules"] },
	{ name: "Trae", home: [".trae"], repo: [".trae"] },
	{ name: "Zed", home: [".config/zed"], bin: ["zed"], repo: [".zed"] },
	{ name: "Augment Code", home: [".augment"], repo: [".augment"] },
	{ name: "Amazon Q Developer", home: [".aws/amazonq"], repo: [".amazonq"] },
	{ name: "iFlow", home: [".iflow"], bin: ["iflow"], repo: [".iflow"] },
	{ name: "Kimi CLI", home: [".kimi"], bin: ["kimi"], repo: [".kimi"] },
	{ name: "Mistral Vibe", home: [".vibe"], bin: ["vibe"], repo: [".vibe"] },
	{ name: "Plandex", home: [".plandex"], bin: ["plandex"], repo: [".plandex"] },
	{ name: "Junie", home: [".junie"], repo: [".junie"] },
];

function onPath(bin, pathEnv) {
	const exts =
		process.platform === "win32"
			? ["", ...(process.env.PATHEXT || ".EXE;.CMD;.BAT;.COM").split(";")]
			: [""];
	for (const raw of pathEnv.split(path.delimiter)) {
		const dir = raw.replace(/^"|"$/g, "");
		if (!dir) continue;
		for (const ext of exts) {
			const p = path.join(dir, bin + ext);
			if (exists(p) && fs.statSync(p).isFile()) return true;
		}
	}
	return false;
}

function detectHarnesses(repoRoot, home, pathEnv = process.env.PATH || "") {
	const homeDir = home === undefined ? os.homedir() : home;
	const found = [];
	for (const h of HARNESSES) {
		const evidence = [];
		for (const p of h.home || [])
			if (exists(path.join(homeDir, p))) evidence.push(`~/${posix(p)}`);
		for (const b of h.bin || [])
			if (onPath(b, pathEnv)) evidence.push(`${b} on PATH`);
		for (const p of h.repo || [])
			if (exists(abs(repoRoot, p))) evidence.push(p);
		if (evidence.length) found.push({ ...h, evidence });
	}
	return found;
}

/**
 * The pointer a harness discovers: the loop's own frontmatter, a one-line body, no copy.
 * `doctor` fails anything over 700 characters that does not name `.agent-kit/SKILL.md`.
 */
function skillPointer(root) {
	const src = read(abs(root, ".agent-kit/SKILL.md")) || "";
	const fm = /^---\r?\n([\s\S]*?)\r?\n---/.exec(src);
	return `---\n${fm ? fm[1].trim() : "name: agent-kit"}\n---\n\nRead \`.agent-kit/SKILL.md\` at the repository root. It is the one copy of the loop.\n`;
}

/**
 * A harness that already keeps its folder in the repo gets a pointer, so its skill list
 * carries the loop without anyone reading the entry file first. It never creates the folder
 * (a repo that does not use that harness stays clean) and never overwrites an authored file.
 */
function writeSkillPointers(root, found) {
	const handled = [];
	for (const h of found) {
		if (!h.skill) continue;
		if (exists(abs(root, h.skill))) {
			handled.push(h.skill);
			continue;
		}
		if (!isDir(abs(root, h.skill.split("/")[0]))) continue;
		write(abs(root, h.skill), skillPointer(root));
		handled.push(h.skill);
	}
	return handled;
}

/** The sentence setup and `harnesses` both print. One home for the finding and the wiring. */
function harnessLines(found, wired = []) {
	if (!found.length)
		return [
			"Harnesses found: none in HOME, PATH or the repo.",
			"  AGENTS.md is still the entry point for any agent that reads it.",
		];
	const lines = [
		`Harnesses found: ${found.map((h) => h.name).join(", ")}`,
		"  Say this list. The repo may show none of them: detection reads HOME config and PATH.",
	];
	if (wired.length) lines.push(`  Skill pointer: ${wired.join(", ")}`);
	const pointers = found.filter((h) => h.skill && !wired.includes(h.skill));
	if (pointers.length)
		lines.push(
			`  Wire the skill for each: ${pointers.map((h) => h.skill).join(", ")}`,
		);
	return lines;
}

function cmdHarnesses({ root, home, pathEnv } = {}) {
	const base = path.resolve(root || process.cwd());
	const found = detectHarnesses(base, home, pathEnv);
	console.log("\nHarnesses on this machine (HOME config, PATH, repo markers):");
	for (const h of found)
		console.log(`  ${h.name.padEnd(20)}  ${h.evidence.join(", ")}`);
	if (found.length) console.log("");
	for (const line of harnessLines(found)) console.log(`  ${line}`);
	console.log("");
	return 0;
}

// ---------------------------------------------------------------- setup

function cmdSetup({ target, sourceRoot, sourceSpec, noRtk, home, pathEnv }) {
	const root = path.resolve(target || process.cwd());
	const src = path.resolve(sourceRoot || SCRIPT_ROOT);
	const selfAdopt = root === src;
	const existing = json(abs(root, STATE), {});
	if (existing.role === "template" && !selfAdopt)
		die("that directory is the template source, not a target");
	if (selfAdopt) {
		console.log(
			"Adopting this repo in place: the hash baseline records what exists now.",
		);
		console.log("Pass --source <path|url> to enable check/pull later.");
	}
	const manifest = manifestOf(src);
	if (!manifest) die(`no ${MANIFEST} in ${src}`);

	const today = new Date().toISOString().slice(0, 10);
	const state = json(abs(root, STATE), {}) || {};
	const rows = [];
	let copied = 0;
	let kept = 0;

	for (const entry of manifest.machinery) {
		for (const rel of expand(src, entry)) {
			const to = abs(root, rel);
			if (exists(to)) {
				kept++;
				continue;
			}
			copy(abs(src, rel), to);
			copied++;
			rows.push(["COPIED", rel, ""]);
		}
	}

	for (const [dest, seed] of Object.entries(manifest.seeds)) {
		if (exists(abs(root, dest))) {
			kept++;
			continue;
		}
		if (!exists(abs(src, seed))) {
			rows.push(["MISSING", dest, `seed ${seed} not in template`]);
			continue;
		}
		copy(abs(src, seed), abs(root, dest));
		copied++;
		rows.push(["COPIED", dest, ""]);
	}

	fs.mkdirSync(abs(root, `${TASKS}/active`), { recursive: true });
	fs.mkdirSync(abs(root, `${TASKS}/archive`), { recursive: true });
	fs.mkdirSync(abs(root, ".agent-kit/logs"), { recursive: true });

	if (!exists(abs(root, PROJECT))) {
		write(abs(root, PROJECT), projectMd(detectStack(root), today));
		rows.push(["COPIED", PROJECT, "generated from the manifests"]);
	} else {
		kept++;
	}

	const rtk = noRtk
		? ["SKIPPED", "rtk", "--no-rtk: shell output stays uncompressed"]
		: ensureRtk(root);
	rows.push(rtk);

	// Baseline = what we just installed. Drift is measured against this, never against memory.
	const next = {
		role: "target",
		// In-place adoption has no upstream to diff against; an empty source keeps check honest.
		source: selfAdopt ? "" : sourceSpec || state.source || src,
		version: manifest.version || 1,
		installed_at: state.installed_at || today,
		last_pull: today,
		machinery: {},
		seeds: {},
	};
	for (const entry of manifest.machinery) {
		for (const rel of expand(src, entry)) {
			const h = hashFile(abs(src, rel));
			if (h) next.machinery[rel] = h;
		}
	}
	for (const [dest, seed] of Object.entries(manifest.seeds)) {
		const h = hashFile(abs(src, seed));
		if (h) next.seeds[dest] = h;
	}
	write(abs(root, STATE), `${JSON.stringify(next, null, 2)}\n`);

	console.log(`\nSetup -> ${root}`);
	console.log(`  ${copied} copied, ${kept} kept, template v${next.version}\n`);
	if (rows.length) table(rows);
	if (rtk[0] === "MISSING" || rtk[0] === "CONFLICT")
		console.log(`\nToken saver: ${rtk[2]}`);
	console.log("");
	const found = detectHarnesses(root, home, pathEnv);
	const wired = writeSkillPointers(root, found);
	for (const line of harnessLines(found, wired)) console.log(line);
	console.log(
		"\n  Optional commit guard (off by default, per clone, bypassable):",
		"\n    git config core.hooksPath .agent-kit/githooks",
		"\n  It refuses a commit outside the active task's write set, and warns — never blocks —",
		"\n  on a message that is not `type (TASK-ID): summary` with a summary in the body.",
		"\n  `task close` performs the scope check either way; the message rule is the session's.",
	);
	console.log(
		"\nNext (the only work that needs judgement — ask the owner, do not invent):",
	);
	console.log(
		"  1. AGENTS.md        every <!-- FILL:... --> / <PLACEHOLDER>, and rules 1-4:",
	);
	console.log(
		"                      propose candidates from the tree, get a yes, then write them",
	);
	console.log(
		"  2. .agent-kit/project.md   confirm the detected commands; add what the code cannot say",
	);
	console.log(
		"  3. .agent-kit/docs/            ARCH_MAP, ENTRY_POINTS, API_SKELETON from the real tree;",
	);
	console.log(
		"                      the full pass is .agent-kit/templates/docs-populate.md",
	);
	console.log(
		"\nThen: agent-kit doctor --strict   (must exit 0 before you call setup done)\n",
	);
	return 0;
}

// ---------------------------------------------------------------- sync

function computeSync(targetRoot, sourceRoot) {
	const manifest = manifestOf(sourceRoot);
	if (!manifest) die(`no ${MANIFEST} in ${sourceRoot}`);
	const state = json(abs(targetRoot, STATE), {}) || {
		machinery: {},
		seeds: {},
	};
	const rows = [];

	for (const entry of manifest.machinery) {
		for (const rel of expand(sourceRoot, entry)) {
			const src = hashFile(abs(sourceRoot, rel));
			const tgt = hashFile(abs(targetRoot, rel));
			const base = state.machinery?.[rel];
			let status;
			if (tgt === null) status = "MISSING";
			else if (tgt === src) status = "CURRENT";
			else if (base && tgt === base) status = "UPGRADE";
			else status = "DRIFT";
			rows.push({ status, rel, src, tgt, base, entry });
		}
	}

	for (const [dest, seed] of Object.entries(manifest.seeds)) {
		const srcSeed = hashFile(abs(sourceRoot, seed));
		const tgt = hashFile(abs(targetRoot, dest));
		const base = state.seeds?.[dest];
		let status;
		if (tgt === null) status = "MISSING";
		// No recorded base means this destination is new to the kit (or predates the seed):
		// treat it as an upstream update so `pull --seeds` can install it explicitly.
		else if (srcSeed && srcSeed !== base) status = "SEED-UPDATED";
		else status = "CURRENT";
		rows.push({ status, rel: dest, seed, src: srcSeed, tgt, base });
	}

	for (const rel of manifest.prune) {
		if (exists(abs(targetRoot, rel))) rows.push({ status: "PRUNE", rel });
	}

	const version = manifest.version || 1;
	const mine = state.version || 0;
	rows.push({
		status: mine === version ? "CURRENT" : mine > version ? "AHEAD" : "BEHIND",
		rel: "template version",
		detail: `installed v${mine}, template v${version}`,
	});

	return { manifest, state, rows };
}

function cmdCheck({ target, sourceRoot, jsonOut }) {
	const root = path.resolve(target || process.cwd());
	if (!sourceRoot) {
		console.log(
			'Not set up: no .agent-kit/template.json source recorded. Run "agent-kit setup . --source <path|url>".',
		);
		return 0;
	}
	if (root === path.resolve(sourceRoot)) {
		console.log("This is the template itself: nothing to compare.");
		return 0;
	}
	const { rows } = computeSync(root, sourceRoot);
	const bad = rows.filter((r) => !["CURRENT"].includes(r.status));
	if (jsonOut) {
		console.log(
			JSON.stringify(
				{
					ok: bad.length === 0,
					root,
					rows: rows.map(({ status, rel, detail }) => ({
						status,
						rel,
						detail: detail || "",
					})),
				},
				null,
				2,
			),
		);
		return bad.length === 0 ? 0 : 1;
	}
	console.log(`\nDrift check: ${root}`);
	table(rows.map((r) => [r.status, r.rel, r.detail || ""]));
	console.log(
		bad.length === 0
			? "\nIN SYNC\n"
			: `\n${bad.length} item(s) need attention. Run "agent-kit pull" (never writes over DRIFT without --force).\n`,
	);
	return bad.length === 0 ? 0 : 1;
}

function cmdPull({ target, sourceRoot, force, seeds, dryRun }) {
	const root = path.resolve(target || process.cwd());
	if (!sourceRoot)
		die(
			"not set up: no provenance in .agent-kit/template.json. Run setup --source <path|url> first.",
		);
	const { manifest, state, rows } = computeSync(root, sourceRoot);
	if (rows.some((r) => r.status === "AHEAD"))
		die(
			"installed version is ahead of the template; refusing to rewind (reconcile by hand)",
		);

	if (dryRun) {
		const planned = rows.filter((r) =>
			["UPGRADE", "MISSING", "DRIFT", "PRUNE", "SEED-UPDATED"].includes(
				r.status,
			),
		);
		console.log(
			`\nDry run: ${planned.length} row(s) would change. Nothing was written.\n`,
		);
		for (const r of planned) {
			const skip =
				r.status === "DRIFT" && !force
					? " (skipped: locally modified, needs --force)"
					: "";
			const skipSeed =
				r.status === "SEED-UPDATED" && !seeds
					? " (skipped: needs --seeds)"
					: "";
			console.log(`${r.status.padEnd(12)} ${r.rel}${skip}${skipSeed}`);
			if (r.status === "PRUNE") continue;
			const from = abs(sourceRoot, r.seed || r.rel);
			const to = abs(root, r.rel);
			if (!exists(to)) {
				console.log(
					`             would create, ${readIf(from) === null ? "no source" : `${read(from).split(/\r?\n/).length} lines`}`,
				);
				continue;
			}
			const d = run(
				`git --no-pager diff --no-index --unified=1 -- "${to}" "${from}"`,
				root,
			);
			const lines = d.out.trim().split(/\r?\n/).filter(Boolean);
			console.log(
				lines.length
					? lines
							.slice(0, 24)
							.map((l) => `             ${l}`)
							.join("\n")
					: "             would change (binary or no textual diff)",
			);
		}
		console.log("");
		return 0;
	}

	const applied = [];
	for (const r of rows) {
		if (r.status === "DRIFT" && !force) continue;
		if (
			r.status === "UPGRADE" ||
			(r.status === "DRIFT" && force) ||
			r.status === "MISSING"
		) {
			if (r.rel === "template version") continue;
			copy(abs(sourceRoot, r.seed || r.rel), abs(root, r.rel));
			applied.push(["WROTE", r.rel, ""]);
			continue;
		}
		if (r.status === "PRUNE") {
			fs.rmSync(abs(root, r.rel), { recursive: true, force: true });
			applied.push(["PRUNED", r.rel, ""]);
			continue;
		}
		if (r.status === "SEED-UPDATED" && seeds) {
			copy(abs(sourceRoot, r.seed), abs(root, r.rel));
			applied.push([
				"REPLACED SEED",
				r.rel,
				"your authored copy was overwritten (--seeds)",
			]);
		}
	}

	// A seed pull can replace an index; the entries it lists are derived, so rebuild them.
	refreshRecents(root);

	const next = {
		role: "target",
		source: state.source || sourceRoot,
		version: manifest.version || 1,
		installed_at: state.installed_at || new Date().toISOString().slice(0, 10),
		last_pull: new Date().toISOString().slice(0, 10),
		machinery: {},
		seeds: {},
	};
	for (const entry of manifest.machinery) {
		for (const rel of expand(sourceRoot, entry)) {
			const h = hashFile(abs(root, rel));
			if (h) next.machinery[rel] = h;
		}
	}
	for (const [dest, seed] of Object.entries(manifest.seeds)) {
		const h = hashFile(abs(sourceRoot, seed));
		if (h) next.seeds[dest] = h;
	}
	write(abs(root, STATE), `${JSON.stringify(next, null, 2)}\n`);

	console.log(`\nPull v${next.version}: ${applied.length} change(s)`);
	if (applied.length) table(applied);
	const skipped = rows.filter((r) => r.status === "DRIFT" && !force);
	if (skipped.length) {
		console.log("\nLeft alone (locally modified, use --force to overwrite):");
		for (const r of skipped) console.log(`  ${r.rel}`);
	}
	const seedDrift = rows.filter((r) => r.status === "SEED-UPDATED" && !seeds);
	if (seedDrift.length) {
		console.log("\nUpstream seed changed since install (your copy was kept):");
		for (const r of seedDrift) console.log(`  ${r.rel}  <- ${r.seed}`);
	}
	console.log("");
	return cmdDoctor({ root, strict: false });
}

// ---------------------------------------------------------------- doctor

function cmdDoctor({ root, strict, fix, jsonOut }) {
	const base = path.resolve(root || process.cwd());
	const state = json(abs(base, STATE), {});
	const isTemplate = state.role === "template";
	const rows = [];
	const add = (status, name, detail = "") => rows.push([status, name, detail]);

	// --fix: mechanical repairs only. Anything needing judgement stays a failure.
	const fixed = [];
	if (fix) {
		for (const dir of [".agent-kit", ".github", ".opencode"]) {
			for (const rel of expand(base, dir)) {
				if (!TEXT_EXT.has(path.extname(rel))) continue;
				const p = abs(base, rel);
				const buf = fs.readFileSync(p);
				const s = buf.toString("utf8").replace(/^\uFEFF/, "");
				const t = s
					.replace(/\r\n/g, "\n")
					.replace(/[ \t]+$/gm, "")
					.replace(/\s*$/, "\n");
				if (t !== s) {
					fs.writeFileSync(p, t, "utf8");
					fixed.push(rel);
				}
			}
		}
	}

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

	// The token saver is a machine tool, not a repo invariant: missing is advice, not failure.
	const rtk = rtkVersion(base);
	add(
		rtk ? "PASS" : "WARN",
		"token saver",
		rtk ||
			"rtk gain failed — install rtk-ai.rtk (winget) or brew install rtk; setup does it",
	);

	if (exists(abs(base, ".git"))) {
		const wired = git(base, ["config", "core.hooksPath"]) === ".agent-kit/githooks";
		add(
			wired ? "PASS" : "WARN",
			"commit guard",
			wired
				? "wired to .agent-kit/githooks (scope + message)"
				: "optional: git config core.hooksPath .agent-kit/githooks (task close checks anyway)",
		);

		// Commits belong to the owner: no session identity, no AI trailer. A second human
		// author is a WARN, not a FAIL — only the trailer is never acceptable.
		const history = git(base, ["log", "--format=%an <%ae>%x00%B%x1e"]) || "";
		const commits = history
			.split("\x1e")
			.filter((c) => c.trim())
			.map((c) => {
				const [who, ...rest] = c.split("\x00");
				return { who: who.trim(), body: rest.join("\x00") };
			});
		const attributed = commits.filter((c) =>
			/(^|\n)co-authored-by:[ \t]*\S|(^|\n)generated with |noreply@anthropic\.com|🤖/i.test(
				c.body,
			),
		);
		const identity = git(base, ["config", "user.email"]);
		const foreign = identity
			? [...new Set(commits.map((c) => c.who))].filter(
					(w) => !w.toLowerCase().includes(identity.toLowerCase()),
				)
			: [];
		add(
			attributed.length ? "FAIL" : foreign.length ? "WARN" : "PASS",
			"commit identity",
			attributed.length
				? `${attributed.length} commit(s) carry AI attribution`
				: foreign.length
					? `not ${identity}: ${foreign.join(", ")}`
					: identity || "no identity configured",
		);
	}

	if (!isTemplate) {
		const manifest = manifestOf(base) || {
			owned: [],
			machinery: [],
			seeds: {},
		};
		const conflict = manifest.owned.filter(
			(o) =>
				manifest.machinery.some(
					(m) =>
						path.extname(m) === "" &&
						(normGlob(o) === normGlob(m) ||
							normGlob(o).startsWith(`${normGlob(m)}/`)),
				) || Object.keys(manifest.seeds).includes(o),
		);
		// The install surface is `.agent-kit/`, plus the files a harness or CI must find at a
		// fixed root path: the two entry points and the workflow.
		const outside = [
			...manifest.machinery,
			...Object.keys(manifest.seeds),
			...manifest.owned,
		].filter((p) => {
			const n = normGlob(p);
			return (
				n !== "agents.md" &&
				n !== "claude.md" &&
				n !== ".github/workflows/agent-kit.yml" &&
				!n.startsWith(".agent-kit/")
			);
		});
		add(
			conflict.length || outside.length ? "FAIL" : "PASS",
			"manifest integrity",
			[...conflict, ...outside.map((p) => `${p} outside .agent-kit`)].join(", "),
		);
		if (!state.source)
			add("WARN", "provenance", "no .agent-kit/template.json source recorded");
	}

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

	// 5. task hygiene
	const activeDir = abs(base, `${TASKS}/active`);
	const active = exists(activeDir)
		? fs.readdirSync(activeDir).filter((f) => f.endsWith(".md"))
		: [];
	const index = readIf(abs(base, TASK_INDEX)) || "";
	const unindexed = active.filter((f) => {
		const id = frontMatter(read(abs(activeDir, f))).id;
		return !id || !index.includes(id);
	});
	add(
		unindexed.length ? "FAIL" : "PASS",
		"active tasks indexed",
		unindexed.join(", "),
	);

	const collisions = [];
	// A blocked card is parked, not in flight: `task resume` refuses while another task is in
	// progress, so it can never be edited alongside one. Reserving its files only deadlocks the
	// card that is actually in flight.
	const touches = active
		.map((f) => ({ f, fm: frontMatter(read(abs(activeDir, f))) }))
		.filter(({ fm }) => fm.status !== "BLOCKED")
		.map(({ f, fm }) => ({
			f,
			t: list(fm.touches),
			family: CHILD_ID.test(fm.id || "") ? parentId(fm) : fm.id,
		}));
	for (let i = 0; i < touches.length; i++) {
		for (let j = i + 1; j < touches.length; j++) {
			// A parent and its subtasks share one delivery; overlapping write sets inside a
			// family are the point of the split, not a collision.
			if (touches[i].family && touches[i].family === touches[j].family)
				continue;
			for (const a of touches[i].t)
				for (const b of touches[j].t)
					if (covers(a, b) || covers(b, a) || overlaps(a, b))
						collisions.push(`${touches[i].f} <> ${touches[j].f}`);
		}
	}
	add(
		collisions.length ? "FAIL" : "PASS",
		"write-set collisions",
		[...new Set(collisions)].join(", "),
	);

	const unknown = active
		.map((f) => ({ f, s: frontMatter(read(abs(activeDir, f))).status }))
		.filter(
			({ s }) =>
				!["QUEUED", "IN_PROGRESS", "BLOCKED", "REVIEW", "DONE"].includes(s),
		);
	add(
		unknown.length ? "WARN" : "PASS",
		"task statuses",
		unknown.map((u) => `${u.f} (${u.s || "missing"})`).join(", "),
	);

	const blockProblems = [];
	for (const task of activeTasks(base)) {
		const blocked = blockedState(task.text);
		if (task.fm.status === "BLOCKED" && !blocked)
			blockProblems.push(`${task.file}: BLOCKED with no question`);
		if (task.fm.status !== "BLOCKED" && blocked)
			blockProblems.push(
				`${task.file}: block marker but status ${task.fm.status || "missing"}`,
			);
	}
	add(
		blockProblems.length ? "FAIL" : "PASS",
		"blocked tasks",
		blockProblems.join(", "),
	);

	// 5c. a subtask belongs to a live parent, and the parent holds the slot only once every
	// subtask is done — the state `task new --parent` and the last subtask close maintain.
	const subtaskProblems = [];
	const byId = new Map(
		active.map((f) => [frontMatter(read(abs(activeDir, f))).id, f]),
	);
	const kidsByParent = new Map();
	for (const f of active) {
		const fm = frontMatter(read(abs(activeDir, f)));
		if (!CHILD_ID.test(fm.id || "")) continue;
		const parent = parentId(fm);
		if (!parent) {
			subtaskProblems.push(`${f}: subtask with no parent`);
			continue;
		}
		if (!byId.has(parent)) {
			subtaskProblems.push(`${f}: parent ${parent} is not active`);
			continue;
		}
		if (!kidsByParent.has(parent)) kidsByParent.set(parent, []);
		kidsByParent.get(parent).push({ f, fm });
	}
	for (const [parent, kids] of kidsByParent) {
		const pf = byId.get(parent);
		const pfm = frontMatter(read(abs(activeDir, pf)));
		const open = kids.filter((k) => k.fm.status !== "DONE");
		if (pfm.status === "DONE")
			subtaskProblems.push(`${pf}: DONE with subtasks still active`);
		else if (pfm.status === "IN_PROGRESS" && open.length)
			subtaskProblems.push(
				`${pf}: in progress while ${open.map((k) => k.fm.id).join(", ")} open`,
			);
		else if (pfm.status === "QUEUED" && !open.length)
			subtaskProblems.push(`${pf}: queued with every subtask done`);
	}
	add(
		subtaskProblems.length ? "FAIL" : "PASS",
		"subtasks",
		subtaskProblems.join(", "),
	);

	// 5b. parked work is a candidate, not a second task list: the vocabulary and identity are
	// checked, and a promoted row is deleted rather than marked done.
	const backlogText = readIf(abs(base, `${TASKS}/BACKLOG.md`));
	if (backlogText === null) {
		add("PASS", "backlog", "not installed");
	} else {
		const allowed = new Set(["later", "not-now", "not-important"]);
		const ids = new Set();
		const badRows = [];
		const backlogRows = fenceFree(backlogText)
			.split(/\r?\n/)
			.filter((l) => l.trim().startsWith("|"))
			.map((l) =>
				l
					.split("|")
					.slice(1, -1)
					.map((c) => c.replace(/`/g, "").trim()),
			)
			.filter(
				(c) =>
					c.length &&
					c[0].toLowerCase() !== "id" &&
					!c.every((cell) => /^:?-+:?$/.test(cell)),
			);
		for (const cells of backlogRows) {
			const [id, status, item, source, next] = cells;
			if (cells.length !== 5) {
				badRows.push(`${id || "(row)"}: needs 5 cells`);
				continue;
			}
			if (!/^B-\d{2,}$/.test(id)) badRows.push(`${id || "(no id)"}: ID is B-NN`);
			else if (ids.has(id)) badRows.push(`${id}: duplicate`);
			else ids.add(id);
			if (!allowed.has(status)) badRows.push(`${id}: status "${status}"`);
			if (!item || !source || !next) badRows.push(`${id}: empty cell`);
		}
		add(
			badRows.length ? "FAIL" : "PASS",
			"backlog",
			badRows.length ? badRows.slice(0, 4).join(", ") : `${ids.size} row(s)`,
		);
	}

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

	// 7. completeness: an archived task with no change file is a change nobody can find.
	const logged = new Set(
		expand(base, LOG_DIR)
			.filter((rel) => rel.endsWith(".md"))
			.map((rel) => frontMatter(read(abs(base, rel))).id)
			.filter(Boolean),
	);
	const undocumented = expand(base, `${TASKS}/archive`)
		.filter((rel) => rel.endsWith(".md"))
		.filter((rel) => {
			const id = frontMatter(read(abs(base, rel))).id;
			// A subtask archives inside its parent's delivery and is named in that change file.
			return id && !CHILD_ID.test(id) && !logged.has(id);
		});
	add(
		undocumented.length ? "FAIL" : "PASS",
		"archived tasks changelogged",
		undocumented.slice(0, 3).join(", "),
	);

	// 7b. the indexes carry the last five entries, so a session reads one list instead of a folder.
	const staleRecents = [];
	for (const [rel, dir, field] of RECENT_LISTS) {
		const text = readIf(abs(base, rel));
		// A Windows checkout (autocrlf) rewrites file content to CRLF; the generated lines are
		// LF. Compare meaning, not line endings.
		const body = text === null ? null : blockBody(text, "RECENT");
		const actual = body === null ? null : body.split("\r\n").join("\n");
		if (actual === null) staleRecents.push(`${rel}: no RECENT block`);
		else if (actual !== recentLines(base, rel, dir, field))
			staleRecents.push(`${rel}: stale`);
	}
	add(
		staleRecents.length ? "FAIL" : "PASS",
		"recent lists",
		staleRecents.join(", "),
	);

	// 7c. a release note is named for its version and says so on the first line, so a note
	// cannot be filed under the wrong tag. A repo that never cuts a release has no folder.
	const releaseDir = abs(base, ".agent-kit/releases");
	const releaseFiles = isDir(releaseDir)
		? fs.readdirSync(releaseDir).filter((f) => f.endsWith(".md"))
		: [];
	const misnamed = releaseFiles.filter((f) => {
		const first = (read(path.join(releaseDir, f)).split(/\r?\n/)[0] || "").trim();
		return first !== `# Release ${f.replace(/\.md$/, "")}`;
	});
	add(
		misnamed.length ? "FAIL" : "PASS",
		"release notes",
		misnamed.length
			? `${misnamed.join(", ")} — first line must be "# 🚀 Release v<version>" matching the filename`
			: releaseFiles.length
				? `${releaseFiles.length} release(s)`
				: "none yet",
	);

	const fails = rows.filter((r) => r[0] === "FAIL").length;
	const warns = rows.filter((r) => r[0] === "WARN").length;
	if (jsonOut) {
		console.log(
			JSON.stringify(
				{
					ok: fails === 0,
					strict: !!strict,
					fails,
					warns,
					rows: rows.map(([status, name, detail]) => ({
						status,
						name,
						detail: detail || "",
					})),
				},
				null,
				2,
			),
		);
		return fails === 0 ? 0 : 1;
	}
	console.log(`\nDoctor${strict ? " (strict)" : ""}: ${base}`);
	table(rows);
	console.log(
		`\n${fails === 0 ? "PASS" : "FAIL"} — ${fails} failure(s), ${warns} warning(s)\n`,
	);
	return fails === 0 ? 0 : 1;
}

// ---------------------------------------------------------------- verify

/** Rows of a `| Action | Command | ... | Exit |` block, newest block only. */
/** Evidence rows, both shapes: five cells from older tasks, six with the Scope column. */
function evidenceDetail(text) {
	const m = text.match(
		/^<!-- VERIFY:START -->\r?$([\s\S]*?)^<!-- VERIFY:END -->\r?$/m,
	);
	if (!m) return [];
	return m[1]
		.split(/\r?\n/)
		.filter((l) => /^\|/.test(l) && !/^\|\s*-+/.test(l) && !/Action/.test(l))
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

function evidenceRows(text) {
	return evidenceDetail(text).map(({ action, exit }) => ({ action, exit }));
}

function hashText(s) {
	return crypto.createHash("sha256").update(s).digest("hex").slice(0, 16);
}

/** The authored intent: Scope and Plan, stopping before the generated baseline/evidence. */
function planText(text) {
	const m = text.match(
		/##\s+Scope[\s\S]*?(?=\n##\s+(?:Baseline|Verification))/,
	);
	return m ? m[0].trim() : "";
}

/** `n` identical red runs, the failing set, and the hashes that say nothing moved. */
function loopState(text) {
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
function evidenceState(base, text, fm) {
	const rows = evidenceDetail(text);
	const loop = loopState(text);
	if (!rows.length) return { state: "never", rows };
	if (!loop || !loop.diff) return { state: "unknown", rows };
	return {
		state: loop.diff === productHash(base, fm) ? "current" : "stale",
		rows,
	};
}

/** The owner question `task block` wrote, or null. */
function blockedState(text) {
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
function productHash(base, fm) {
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
		h.update(exists(p) && !isDir(p) ? normalize(fs.readFileSync(p)) : "(missing)");
		h.update("\0");
	}
	return h.digest("hex").slice(0, 16);
}

/** Replace the rows this run produced; keep a milestone row's last full run visible. */
function mergeEvidence(order, prior, run) {
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

function cmdVerify({ root, baseline, full }) {
	const base = path.resolve(root || process.cwd());
	const declared = sectionRows(readIf(abs(base, PROJECT)) || "");
	const all = declared.filter(([a]) =>
		["build", "typecheck", "lint", "test"].includes(a),
	);
	// A bare `--baseline` still means the full suite; only the caller can ask for a quick one.
	const fullRun = full === undefined ? !!baseline : !!full;
	const runnable = fullRun ? all : all.filter(([, , when]) => when === "always");
	if (all.length === 0) {
		console.log(
			"SKIPPED — no build/typecheck/lint/test command declared in .agent-kit/project.md",
		);
		return 0;
	}
	if (runnable.length === 0) {
		console.log(
			`SKIPPED — every declared command is milestone-tier; \`verify --full\` runs ${all.length}.`,
		);
		return 0;
	}
	const tasks = activeTasks(base);
	const inProgress = tasks.filter((t) => t.fm.status === "IN_PROGRESS");
	const target = inProgress.length === 1 ? inProgress[0].path : null;
	const taskText = target ? read(target) : "";
	const before = target ? evidenceDetail(taskText) : [];
	const taskFm = taskText ? frontMatter(taskText) : {};
	const planHash = taskText ? hashText(planText(taskText)) : "";
	const diffHash = target ? productHash(base, taskFm) : "";
	const priorLoop = taskText ? loopState(taskText) : null;

	// A loop is not another attempt: the same red set over the same diff needs a new plan.
	if (
		target &&
		!baseline &&
		priorLoop &&
		priorLoop.n >= LOOP_LIMIT &&
		priorLoop.plan === planHash &&
		priorLoop.diff === diffHash
	) {
		console.log(
			`\nLoop guard: ${LOOP_LIMIT} red runs in a row with the same failing set and no change to the task's files.`,
		);
		console.log(
			"  The next attempt needs a new plan, not another run. Edit the Plan section with what",
		);
		console.log("  will be different, then verify again.\n");
		return 1;
	}

	const evidence = [];
	let failed = 0;
	for (const [action, command] of runnable) {
		console.log(`\n> ${action}: ${command}`);
		const r = run(command, base);
		const tail = r.out.trim().split(/\r?\n/).slice(-4).join("\n");
		if (tail) console.log(tail);
		const ok = r.code === 0;
		if (!ok) failed++;
		evidence.push({
			action,
			command,
			scope: fullRun ? "full" : "quick",
			exit: r.code,
		});
	}

	const now = evidence.map(({ action, exit }) => ({ action, exit }));
	if (before.length) {
		const prior = new Map(before.map((r) => [r.action, r.exit]));
		const regressed = now
			.filter((r) => r.exit !== 0 && prior.get(r.action) === 0)
			.map((r) => r.action);
		const fixed = now
			.filter(
				(r) => r.exit === 0 && prior.get(r.action) !== 0 && prior.has(r.action),
			)
			.map((r) => r.action);
		if (regressed.length || fixed.length) {
			console.log(
				`\nAgainst the previous run: ${regressed.length ? `regressed: ${regressed.join(", ")}` : "nothing regressed"}${fixed.length ? `; fixed: ${fixed.join(", ")}` : ""}`,
			);
		}
	}

	if (target) {
		const name = baseline ? "BASELINE" : "VERIFY";
		let marker = "";
		let attempts = 0;
		if (!baseline) {
			const failKey = now
				.filter((r) => r.exit !== 0)
				.map((r) => r.action)
				.sort()
				.join(",");
			const same =
				priorLoop &&
				priorLoop.plan === planHash &&
				priorLoop.diff === diffHash &&
				priorLoop.fail === failKey;
			attempts = failKey ? (same ? (priorLoop.n || 0) + 1 : 1) : 0;
			marker = `\n<!-- LOOP ${JSON.stringify({ n: attempts, fail: failKey, diff: diffHash, plan: planHash })} -->`;
		}
		const rows = baseline
			? evidence
			: mergeEvidence(all.map(([action]) => action), before, evidence);
		const body =
			[
				"| Action | Command | Scope | Expected | Observed | Exit |",
				"|---|---|---|---|---|---|",
				...rows.map(
					(row) =>
						`| ${row.action} | \`${row.command}\` | ${row.scope} | exit 0 | exit ${row.exit} | ${row.exit} |`,
				),
			].join("\n") + marker;
		write(target, block(read(target), name, body));
		console.log(
			`\nRecorded in ${TASKS}/active/${path.basename(target)} (${baseline ? "baseline" : "verification"})`,
		);
		if (attempts >= LOOP_LIMIT) {
			console.log(
				`Loop: ${attempts}/${LOOP_LIMIT} — the next identical run is refused until the Plan changes.`,
			);
		}
	} else if (tasks.length) {
		console.log(
			`\nNot recorded: ${inProgress.length > 1 ? "more than one task is in progress" : "no task is in progress — run `task resume` first"}.`,
		);
	}

	if (!fullRun && all.length > runnable.length) {
		console.log(
			`\nQuick suite: ${all.length - runnable.length} milestone command(s) held for the baseline, \`verify --full\` or close.`,
		);
	}

	console.log(
		`\n${failed === 0 ? "PASS" : "FAIL"} (${fullRun ? "full" : "quick"}) — ${evidence.length - failed}/${evidence.length} command(s) exited 0\n`,
	);
	return failed === 0 ? 0 : 1;
}

// ---------------------------------------------------------------- tasks

function slugify(s) {
	return (
		s
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-|-$/g, "")
			.slice(0, 48) || "task"
	);
}

function nextId(root) {
	const p = abs(root, `${TASKS}/.counter`);
	const n = exists(p) ? parseInt(read(p).trim(), 10) || 100 : 100;
	write(p, `${n + 1}\n`);
	return n + 1;
}

/** Every active file with its parsed state. The status decides the slot, not the file count. */
function activeTasks(root) {
	const dir = abs(root, `${TASKS}/active`);
	if (!exists(dir)) return [];
	return fs
		.readdirSync(dir)
		.filter((f) => f.endsWith(".md"))
		.map((f) => {
			const p = abs(dir, f);
			const text = read(p);
			return { file: f, path: p, text, fm: frontMatter(text) };
		});
}

const CHILD_ID = /^TASK-\d+\.\d+$/;

/** Subtasks name their parent in `parent:`; a top-level task has none. */
function parentId(fm) {
	return (fm.parent || "").trim();
}

function childrenOf(root, parent) {
	return activeTasks(root).filter((t) => parentId(t.fm) === parent);
}

/** `TASK-104.2` after `.1`, never touching the top-level `.counter`. */
function nextChildId(root, parent) {
	let n = 0;
	const bump = (id) => {
		const m = String(id || "").match(/^TASK-\d+\.(\d+)$/);
		if (m) n = Math.max(n, Number(m[1]));
	};
	for (const t of childrenOf(root, parent)) bump(t.fm.id);
	for (const rel of expand(root, `${TASKS}/archive`)) {
		if (!rel.endsWith(".md")) continue;
		const fm = frontMatter(read(abs(root, rel)));
		if (parentId(fm) === parent) bump(fm.id);
	}
	return `${parent}.${n + 1}`;
}

/** The write set a task answers for: its own, plus its subtasks' when it has any. */
function scopeTouches(root, fm) {
	const own = list(fm.touches);
	const id = fm.id || "";
	const family = CHILD_ID.test(id) ? parentId(fm) : id;
	const tasks = activeTasks(root);
	const parent = tasks.find((t) => t.fm.id === family);
	const kids = family ? tasks.filter((t) => parentId(t.fm) === family) : [];
	return [
		...new Set([
			...(parent ? list(parent.fm.touches) : []),
			...own,
			...kids.flatMap((t) => list(t.fm.touches)),
		]),
	];
}

/** The Active block is derived from active/, so a status change cannot rot it. */
function refreshActive(base) {
	const rank = { IN_PROGRESS: 0, REVIEW: 1, BLOCKED: 2, QUEUED: 3, DONE: 4 };
	const rows = activeTasks(base)
		.sort(
			(a, b) =>
				(rank[a.fm.status] ?? 9) - (rank[b.fm.status] ?? 9) ||
				a.file.localeCompare(b.file),
		)
		.map(
			({ file, fm }) =>
				`- \`${fm.id || "?"}\` [${fm.status || "?"}] ${fm.lane || "?"} — [${file}](active/${file})`,
		);
	write(
		abs(base, TASK_INDEX),
		block(
			read(abs(base, TASK_INDEX)),
			"ACTIVE",
			rows.join("\n") || "_Nothing in flight._",
		),
	);
}

function cmdTaskNew({ root, slug, lane, force, noBaseline, parent }) {
	const base = path.resolve(root || process.cwd());
	if (!slug)
		die("usage: task new <slug> [--lane quick|planned] [--parent TASK-N]");
	const activeDir = abs(base, `${TASKS}/active`);
	const tasks = activeTasks(base);

	let id;
	let parentTask = null;
	if (parent) {
		parentTask = tasks.find((t) => t.fm.id === parent);
		if (!parentTask) die(`no active task with id ${parent}`);
		if (parentTask.fm.status === "BLOCKED")
			die(`${parent} is blocked; resume it first`);
		if (!["IN_PROGRESS", "QUEUED"].includes(parentTask.fm.status))
			die(
				`${parent} is ${parentTask.fm.status || "statusless"}; only an in-progress or queued task takes subtasks`,
			);
		const openChild = tasks.find(
			(t) => parentId(t.fm) === parent && t.fm.status === "IN_PROGRESS",
		);
		if (openChild)
			die(`${openChild.fm.id} is in progress; close it before opening another subtask`);
		if (parentTask.fm.status === "IN_PROGRESS") {
			write(
				parentTask.path,
				read(parentTask.path).replace(/^status:.*$/m, "status: QUEUED"),
			);
		}
		id = nextChildId(base, parent);
	} else {
		const inProgress = tasks.filter((t) => t.fm.status === "IN_PROGRESS");
		if (inProgress.length && !force)
			die(
				`a task is already in progress (${inProgress[0].file}). Close it, block it, or pass --force.`,
			);
		id = `TASK-${nextId(base)}`;
	}
	if (!exists(abs(base, TASK_TEMPLATE))) die(`missing ${TASK_TEMPLATE}`);

	const today = new Date().toISOString().slice(0, 10);
	const file = `${today}-${id}-${slugify(slug)}.md`;
	const baseline = git(base, ["rev-parse", "HEAD"]) || "none";
	let body = read(abs(base, TASK_TEMPLATE))
		.replaceAll("{{ID}}", id)
		.replaceAll("{{DATE}}", today)
		.replaceAll("{{LANE}}", (lane || "planned").toUpperCase())
		.replaceAll("{{TITLE}}", slug.replace(/-/g, " "))
		.replaceAll("{{BASELINE}}", baseline);
	if (parent)
		body = /^parent:.*$/m.test(body)
			? body.replace(/^parent:.*$/m, `parent: ${parent}`)
			: body.replace(/^(id:.*\r?\n)/m, `$1parent: ${parent}\n`);
	write(abs(activeDir, file), body);

	refreshActive(base);

	console.log(`\nOpened ${id} -> ${TASKS}/active/${file}`);
	if (parent)
		console.log(
			`Subtask of ${parent}; it closes on the quick suite (lint included). The main close adds build.`,
		);
	console.log(
		"Fill: touches, scope, plan. PLANNED halts for approval before the first edit.",
	);
	if (noBaseline) {
		console.log("Baseline skipped (--no-baseline): the 'was it already broken' answer is now missing.\n");
		return 0;
	}
	console.log("Baseline run, so a red command is reported rather than blamed on this task:\n");
	cmdVerify({ root: base, baseline: true, full: !parent });
	return 0;
}

/** Find by exact id first: `TASK-104` is a prefix of its own subtasks' file names. */
function matchTasks(tasks, id) {
	const exact = tasks.filter((t) => t.fm.id === id);
	return exact.length ? exact : tasks.filter((t) => t.file.includes(id));
}

function currentTask(root, id) {
	const tasks = activeTasks(root);
	const hit = id
		? matchTasks(tasks, id)
		: tasks.filter((t) => t.fm.status === "IN_PROGRESS");
	if (hit.length !== 1)
		die(
			hit.length === 0
				? id
					? `no active task matches ${id}`
					: "no task is in progress"
				: `ambiguous: ${hit.map((t) => t.file).join(", ")}; pass --id`,
		);
	return hit[0].file;
}

function cmdTaskShow({ root, id }) {
	const base = path.resolve(root || process.cwd());
	const tasks = activeTasks(base);
	// Asking "what is in flight?" is normal. Nothing in flight is an answer, not an error.
	if (tasks.length === 0 && !id) {
		console.log("\nNothing in flight.\n");
		return 0;
	}
	const inProgress = tasks.filter((t) => t.fm.status === "IN_PROGRESS");
	const task = id
		? matchTasks(tasks, id)[0]
		: inProgress.length === 1
			? inProgress[0]
			: tasks.length === 1
				? tasks[0]
				: null;
	if (!task)
		die(
			id
				? `no active task matches ${id}`
				: `ambiguous: ${tasks.map((t) => t.file).join(", ")}; pass --id`,
		);
	const text = task.text;
	const fm = task.fm;
	console.log(
		`\n${fm.id}  ${fm.lane || "?"}  ${fm.status || "?"}  ${fm.summary || "(no summary)"}`,
	);
	console.log(`  ${TASKS}/active/${task.file}`);
	const taskParent = parentId(fm);
	if (taskParent) console.log(`  parent: ${taskParent}`);
	const subtasks = taskParent ? [] : childrenOf(base, fm.id);
	if (subtasks.length)
		console.log(
			`  subtasks: ${subtasks.filter((t) => t.fm.status === "DONE").length}/${subtasks.length} done — ${subtasks.map((t) => `${t.fm.id} [${t.fm.status || "?"}]`).join(", ")}`,
		);
	const plan = text.match(/## Scope[\s\S]*?(?=\n## Verification)/);
	console.log(plan ? `\n${plan[0].trim()}\n` : "\n(no scope/plan section)\n");
	const rows = evidenceDetail(text);
	console.log(
		rows.length
			? `Verification: ${rows.map((r) => `${r.action}=${Number.isFinite(r.exit) ? r.exit : "?"} (${r.scope})`).join(" ")}`
			: "Verification: not run",
	);
	const milestone = sectionRows(readIf(abs(base, PROJECT)) || "").filter(
		([, , when]) => when === "milestone",
	);
	if (milestone.length && !rows.some((r) => r.scope === "full"))
		console.log(
			taskParent
				? `Full suite: not run — ${milestone.length} milestone command(s) run at the main task's close`
				: `Full suite: not run — ${milestone.length} milestone command(s) wait for \`verify --full\` or close`,
		);
	const es = evidenceState(base, text, fm);
	if (es.state === "stale")
		console.log(
			"Evidence: STALE — files changed since the last verify; run verify again",
		);
	else if (es.state === "current") console.log("Evidence: current");
	else if (es.state === "unknown")
		console.log("Evidence: unknown (no loop record)");
	const loop = loopState(text);
	if (loop && loop.fail) {
		console.log(
			loop.n >= LOOP_LIMIT
				? `Loop: ${loop.n}/${LOOP_LIMIT} — verify refuses an identical run until the Plan changes`
				: `Loop: ${loop.n}/${LOOP_LIMIT} — same failing set, same files`,
		);
	} else {
		console.log(`Loop: 0/${LOOP_LIMIT}`);
	}
	const blocked = blockedState(text);
	if (blocked) console.log(`Blocked: ${blocked.question}`);
	console.log(
		fm.lane === "PLANNED"
			? "Gate: PLANNED needs approval before the first edit, and again before close.\n"
			: "Gate: QUICK — verify, then close.\n",
	);
	return 0;
}

function cmdTaskBlock({ root, id, question }) {
	const base = path.resolve(root || process.cwd());
	if (!question) die('usage: task block "<question for the owner>"');
	const file = currentTask(base, id);
	const p = abs(base, `${TASKS}/active/${file}`);
	let text = read(p);
	const fm = frontMatter(text);
	if (fm.status === "BLOCKED")
		die(`${fm.id} is already blocked; use \`task resume\``);
	if (fm.status !== "IN_PROGRESS")
		die(
			`only an in-progress task can be blocked (${fm.id} is ${fm.status || "missing"})`,
		);
	if (!/^# /m.test(text)) die("task file has no heading to place the block under");
	const today = new Date().toISOString().slice(0, 10);
	const note = [
		"<!-- BLOCKED:START -->",
		`**BLOCKED ${today}** — ${question}`,
		"Resume with `agent-kit task resume` once the owner answers.",
		"<!-- BLOCKED:END -->",
	].join("\n");
	text = text
		.replace(/^(# .*\r?\n)/m, `$1\n${note}\n`)
		.replace(/^status:.*$/m, "status: BLOCKED");
	write(p, text);
	refreshActive(base);
	console.log(`\nBlocked ${fm.id} — the owner must answer:`);
	console.log(`  ${question}`);
	console.log("  Later: `agent-kit task resume`\n");
	return 0;
}

function cmdTaskResume({ root, id }) {
	const base = path.resolve(root || process.cwd());
	const tasks = activeTasks(base);
	const hit = id
		? matchTasks(tasks, id)
		: tasks.filter((t) => t.fm.status === "BLOCKED");
	if (hit.length !== 1)
		die(
			hit.length === 0
				? id
					? `no active task matches ${id}`
					: "no blocked task"
				: `ambiguous: ${hit.map((t) => t.file).join(", ")}; pass --id`,
		);
	const task = hit[0];
	if (!blockedState(task.text)) die(`${task.fm.id} carries no block marker`);
	const other = tasks.find(
		(t) => t.file !== task.file && t.fm.status === "IN_PROGRESS",
	);
	if (other)
		die(`${other.fm.id} is already in progress; close or block it first`);
	write(
		task.path,
		task.text
			.replace(
				/^<!-- BLOCKED:START -->\r?$[\s\S]*?^<!-- BLOCKED:END -->\r?$\r?\n?/m,
				"",
			)
			.replace(/^status:.*$/m, "status: IN_PROGRESS"),
	);
	refreshActive(base);
	console.log(`\nResumed ${task.fm.id}\n`);
	return 0;
}

function cmdStart({ root } = {}) {
	const base = path.resolve(root || process.cwd());
	const branch = (
		git(base, ["rev-parse", "--abbrev-ref", "HEAD"]) || ""
	).trim();
	const dirty = (git(base, ["status", "--porcelain"]) || "")
		.split(/\r?\n/)
		.filter(Boolean).length;
	const cmds = sectionRows(readIf(abs(base, PROJECT)) || "");
	const tasks = activeTasks(base);

	console.log("\nagent-kit start\n");
	console.log(
		`Repo    ${path.basename(base)}${branch ? ` · ${branch}` : ""} · ${dirty} uncommitted file(s)`,
	);
	console.log(
		`Suite   ${cmds.length ? cmds.map(([a, c, w]) => `${a}: ${c} (${w})`).join(" · ") : "none declared"}`,
	);
	if (tasks.length === 0) {
		console.log("\nTask    none in flight");
		console.log(
			"\nNext    open one: agent-kit task new <slug> --lane quick|planned\n",
		);
		return 0;
	}
	console.log(`\nActive  ${tasks.length} task(s)`);
	for (const t of tasks)
		console.log(
			`  [${t.fm.status || "?"}] ${t.fm.id || "?"} — ${t.fm.summary || "(no summary)"}`,
		);

	const inProgress = tasks.filter((t) => t.fm.status === "IN_PROGRESS");
	const target =
		inProgress.length === 1
			? inProgress[0]
			: tasks.find((t) => t.fm.status === "BLOCKED") || null;
	if (!target) {
		console.log(
			"\nNext    more than one task is in progress; close one or pass --id\n",
		);
		return 0;
	}
	const fm = target.fm;
	const blocked = blockedState(target.text);
	console.log(
		`\nTask    ${fm.id}  ${fm.lane || "?"}  ${fm.status || "?"}  ${fm.summary || "(no summary)"}`,
	);
	if (parentId(fm)) console.log(`Parent  ${parentId(fm)}`);
	const family = CHILD_ID.test(fm.id || "") ? parentId(fm) : fm.id;
	const subtasks = family ? childrenOf(base, family) : [];
	if (subtasks.length)
		console.log(
			`Subtasks ${subtasks.filter((t) => t.fm.status === "DONE").length}/${subtasks.length} done — ${subtasks.map((t) => `${t.fm.id} [${t.fm.status || "?"}]`).join(", ")}`,
		);
	console.log(
		`Plan    ${list(fm.touches).length} file(s) in touches · depends on ${list(fm.depends_on).join(", ") || "none"}`,
	);
	console.log(
		fm.lane === "PLANNED"
			? "Gate    PLANNED — G1 before the first edit; G2 before close"
			: "Gate    QUICK — verify, then close",
	);
	const rows = evidenceDetail(target.text);
	if (rows.length)
		console.log(
			`Evidence  ${rows.map((r) => `${r.action}=${Number.isFinite(r.exit) ? r.exit : "?"} (${r.scope})`).join(" · ")}`,
		);
	else console.log("Evidence  not run");
	const es = evidenceState(base, target.text, fm);
	if (es.state === "stale")
		console.log("Stale   yes — files changed since the last verify");
	const loop = loopState(target.text);
	console.log(
		`Loop    ${loop && loop.fail ? `${loop.n}/${LOOP_LIMIT} — same failing set: ${loop.fail}` : `0/${LOOP_LIMIT}`}`,
	);
	if (blocked) console.log(`Blocked ${blocked.question}`);

	const red = rows.filter((r) => Number.isFinite(r.exit) && r.exit !== 0);
	const milestone = cmds.filter(([, , when]) => when === "milestone");
	const fullRun = rows.some((r) => r.scope === "full");
	let next;
	if (fm.status === "BLOCKED")
		next = `waiting on the owner: ${blocked ? blocked.question : "(no question recorded)"}`;
	else if (loop && loop.fail && loop.n >= LOOP_LIMIT)
		next = "the Plan must change before the next verify (loop guard)";
	else if (!rows.length) next = "verify — no run recorded since the task opened";
	else if (es.state === "stale")
		next = "verify — the task's files changed since the last run";
	else if (red.length) next = `fix ${red.map((r) => r.action).join(", ")}, then verify`;
	else if (milestone.length && !fullRun)
		next = fm.parent
			? "task close — a subtask closes on the quick suite; build runs at the main close"
			: subtasks.some((t) => t.fm.status !== "DONE")
				? "close the open subtasks — the main close runs build"
				: "task close — the main close runs build";
	else next = fm.parent
		? "task close — a subtask closes on the quick suite"
		: "task close — the suite is green";
	console.log(`\nNext    ${next}\n`);
	return 0;
}

/** A `**Field** — …` block in a task's prose, up to the next field, comment or heading. */
function closeOutField(text, name) {
	const m = (text || "").match(
		new RegExp(
			`\\*\\*${name}\\*\\*\\s*—?\\s*([\\s\\S]*?)(?=\\n\\*\\*|\\n<!--|\\n##\\s|$)`,
		),
	);
	return m ? m[1].trim() : "";
}

/** The commit subject and body a close prints: the change file's wording, or the summary. */
function closingNote(text, fm, type) {
	const note = closeOutField(text, "Summary") || closeOutField(text, "Outcome");
	const notes = note && !/<!--/.test(note) ? note : fm.summary;
	const commitType =
		{ added: "feat", changed: "feat", fixed: "fix", removed: "refactor" }[
			type
		] || "chore";
	return { commitType, notes };
}

function cmdTaskClose({ root, id, amend, noVerify, pr }) {
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
			c !== rel &&
			!c.startsWith(`${TASKS}/`) &&
			!c.startsWith(`${LOG_DIR}/`),
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
			files.length ? files.map((c) => `- \`${c}\``).join("\n") : "- none detected",
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
		console.log(`  inventory ${files.length} file(s) — the parent's change file covers the family`);
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

// ------------------------------------------------------------- changelog

/**
 * One file per change, written at close. The folder is the month it landed in, the filename
 * is the record: `logs/MM-YYYY/YYYY-MM-DD-TASK-N-slug.md`. There is no second ledger —
 * this file *is* the changelog entry, and `doctor` finds an archived task through its id.
 *
 * It is the completion record, not the plan: the close-out paragraph, the files git reported,
 * and the two lines that place it. Intent, evidence and follow-ups stay in the archived task;
 * the id is the pointer to them, and copying them here would make a second home.
 */
function writeChange(base, { id, type, slug, summary, changed, task, taskRel }) {
	const day = new Date().toISOString().slice(0, 10);
	const month = `${day.slice(5, 7)}-${day.slice(0, 4)}`;
	const dir = `${LOG_DIR}/${month}`;
	const rel = `${dir}/${day}-${id}-${slug}.md`;
	const note = closeOutField(task, "Summary") || closeOutField(task, "Outcome");
	const areas = [...new Set(changed.map((c) => c.split("/")[0]))].sort();
	const link = posix(path.relative(path.dirname(rel), taskRel));
	fs.mkdirSync(abs(base, dir), { recursive: true });
	write(
		abs(base, rel),
		[
			"---",
			`id: ${id}`,
			`type: ${type}`,
			`date: ${day}`,
			`summary: ${JSON.stringify(summary)}`,
			"---",
			"",
			`# ${id} — ${summary}`,
			"",
			`**Task:** [${id}](${link})`,
			`**Scope:** ${areas.join(", ") || "none"}`,
			"",
			"## What changed",
			"",
			note && !/<!--/.test(note) ? note : summary,
			"",
		].join("\n"),
	);
	return rel;
}

/** Markdown files under a state folder, newest first. Each entry is one index line. */
function entriesIn(base, dir, dateField) {
	return expand(base, dir)
		.filter((rel) => rel.endsWith(".md") && path.basename(rel) !== "INDEX.md")
		.map((rel) => {
			const fm = frontMatter(read(abs(base, rel)));
			const name = (path.basename(rel).match(/^\d{4}-\d{2}-\d{2}/) || [""])[0];
			return {
				rel,
				id: fm.id,
				summary: fm.summary,
				date: fm[dateField] || fm.created || name,
			};
		})
		.filter((e) => e.id && !CHILD_ID.test(e.id))
		.sort((a, b) =>
			`${b.date}\u0000${b.rel}`.localeCompare(`${a.date}\u0000${a.rel}`),
		);
}

/** The body of an index's RECENT block: five links, newest first, one line each. */
function recentLines(base, indexRel, dir, dateField) {
	const recent = entriesIn(base, dir, dateField).slice(0, RECENT_LIMIT);
	if (!recent.length) return "_Nothing yet._";
	const from = path.dirname(indexRel);
	return recent
		.map(
			(e) =>
				`- \`${e.date || "undated"}\` [${e.id}](${posix(path.relative(from, e.rel))}) — ${e.summary || "(no summary)"}`,
		)
		.join("\n");
}

function refreshRecents(base) {
	for (const [rel, dir, field] of RECENT_LISTS) {
		const text = readIf(abs(base, rel));
		if (text === null) continue;
		write(
			abs(base, rel),
			block(text, "RECENT", recentLines(base, rel, dir, field)),
		);
	}
}

// --------------------------------------------------------------- release

/** The change files no earlier release claims, oldest first. */
function unreleasedChanges(base) {
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
 * once per version and read by git and people, not by an agent index. The command never runs
 * git: tagging, pushing and `gh release create` stay with the owner.
 */
function cmdRelease({ root, version }) {
	const base = path.resolve(root || process.cwd());
	const raw = String(version || "").trim().replace(/^v/i, "");
	if (!/^\d+\.\d+\.\d+$/.test(raw)) {
		console.error("agent-kit: usage: release <version>  (X.Y.Z or vX.Y.Z)");
		return 1;
	}
	const rel = `.agent-kit/releases/v${raw}.md`;
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
		for (const e of group) lines.push(`- ${e.summary} (${e.id})`, "");
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
	console.log(`Next    gh release create v${raw} --notes-file ${rel}\n`);
	return 0;
}

// ---------------------------------------------------------------- guard

const COMMIT_TYPES =
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
function guardCommitMessage(base, file) {
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
		console.error("  The commit proceeds; rewrite it with `git commit --amend`.\n");
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
function cmdTaskGuard({ root, message }) {
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
	const breached = staged.filter(
		(c) => !touches.some((t) => covers(t, c)),
	);
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

// ---------------------------------------------------------------- learnings

/**
 * The live learnings file is a queue a session reads, so it has a cap. Past it, the oldest
 * entries go to `.agent-kit/learnings/archive/<YYYY-MM>.md` — same move as an archived task:
 * kept, dated, out of the way.
 */
function cmdLearningsArchive({ root, keep = 30 }) {
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

// ---------------------------------------------------------------- selftest

function cmdSelftest() {
	const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "agent-kit-test-"));
	let junkDir = null;
	const failures = [];
	const assert = (ok, label) => {
		if (!ok) failures.push(label);
		console.log(`  ${ok ? "ok  " : "FAIL"}  ${label}`);
	};
	const captured = (fn) => {
		const buf = [];
		const log = console.log;
		console.log = (s) => buf.push(String(s));
		try {
			fn();
		} finally {
			console.log = log;
		}
		return buf.join("\n");
	};
	const quiet = (fn) => {
		const log = console.log;
		const err = console.error;
		console.log = () => {};
		console.error = () => {};
		try {
			return fn();
		} finally {
			console.log = log;
			console.error = err;
		}
	};
	/** Fill the in-progress task the way a session would: write set, summary, no markers. */
	const fillTask = (touches, summary, note = "filled by selftest") => {
		const dir = abs(tmp, `${TASKS}/active`);
		const files = fs.readdirSync(dir).filter((f) => f.endsWith(".md"));
		const p = abs(
			dir,
			files.find((f) =>
				/^status: IN_PROGRESS$/m.test(read(abs(dir, f))),
			) || files[0],
		);
		write(
			p,
			read(p)
				.replace(
					/touches: \[\]/,
					`touches: [${touches.map((t) => `"${t}"`).join(", ")}]`,
				)
				.replace(/summary: ""/, `summary: "${summary}"`)
				.replace(
					/\*\*Summary\*\*\s*—\s*<!--\s*FILL:summary[\s\S]*?-->/,
					`**Summary** — ${note}`,
				)
				.replace(/<!--\s*FILL:[\s\S]*?-->/g, "filled by selftest"),
		);
		return p;
	};

	try {
		write(
			abs(tmp, "package.json"),
			JSON.stringify(
				{
					name: "fixture",
					scripts: {
						build: 'node -e ""',
						lint: 'node -e ""',
						test: 'node -e ""',
					},
				},
				null,
				2,
			),
		);
		write(abs(tmp, "src/index.ts"), "export const x = 1;\n");

		console.log("\n1. setup");
		let setupCode;
		const setupOut = captured(() => {
			setupCode = cmdSetup({
				target: tmp,
				sourceRoot: SCRIPT_ROOT,
				sourceSpec: SCRIPT_ROOT,
				noRtk: true,
				home: abs(tmp, "no-home"),
				pathEnv: "",
			});
		});
		assert(setupCode === 0, "setup exits 0");
		assert(
			setupOut.includes("Harnesses found: none"),
			"setup says which harnesses it found",
		);
		assert(exists(abs(tmp, PROJECT)), "project.md generated");
		assert(
			read(abs(tmp, PROJECT)).includes("npm run build"),
			"detected build command",
		);
		assert(exists(abs(tmp, ".agent-kit/template.json")), "provenance recorded");
		assert(
			exists(abs(tmp, ".agent-kit/SKILL.md")),
			"the project skill is installed",
		);
		assert(
			!exists(abs(tmp, ".agent-kit/rules/typescript.md")),
			"no rule file for a language the repo may not have",
		);
		assert(
			read(abs(tmp, TASK_INDEX)).includes("_Nothing in flight._"),
			"installed task index is empty state, not the template's in-flight task",
		);

		console.log("\n2. doctor fails before the fill work");
		assert(
			quiet(() => cmdDoctor({ root: tmp, strict: true })) === 1,
			"doctor --strict exits 1 on unfilled markers",
		);

		console.log("\n3. fill, then doctor passes");
		for (const rel of [
			"AGENTS.md",
			PROJECT,
			".agent-kit/docs/INDEX.md",
			".agent-kit/docs/ARCH_MAP.md",
			".agent-kit/docs/API_SKELETON.md",
			".agent-kit/docs/ENTRY_POINTS.md",
			".agent-kit/tasks/INDEX.md",
		]) {
			const p = abs(tmp, rel);
			if (!exists(p)) continue;
			write(
				p,
				read(p)
					.replace(/<!--\s*FILL:[\s\S]*?-->/g, "Filled by selftest.")
					.replace(/<[A-Z][A-Z0-9 _-]{1,30}>/g, "fixture"),
			);
		}
		assert(
			quiet(() => cmdDoctor({ root: tmp, strict: true })) === 0,
			"doctor --strict exits 0 after the fill",
		);
		const manifestP = abs(tmp, MANIFEST);
		const manifestText = read(manifestP);
		const withOutside = JSON.parse(manifestText);
		withOutside.machinery.push("docs/INDEX.md");
		write(manifestP, `${JSON.stringify(withOutside, null, 2)}\n`);
		assert(
			quiet(() => cmdDoctor({ root: tmp })) === 1,
			"doctor fails an install path outside .agent-kit",
		);
		write(manifestP, manifestText);
		const logsIndex = abs(tmp, ".agent-kit/logs/INDEX.md");
		const logsIndexText = read(logsIndex);
		fs.rmSync(logsIndex);
		assert(
			quiet(() => cmdDoctor({ root: tmp })) === 1,
			"doctor fails a directory without its INDEX.md",
		);
		write(logsIndex, logsIndexText);

		console.log("\n4. drift is detected and refused");
		fs.appendFileSync(abs(tmp, ".agent-kit/agent-kit.mjs"), "\n// local edit\n");
		assert(
			quiet(() => cmdCheck({ target: tmp, sourceRoot: SCRIPT_ROOT })) === 1,
			"check exits 1 on DRIFT",
		);

		console.log("\n5. pull --force repairs it");
		quiet(() => cmdPull({ target: tmp, sourceRoot: SCRIPT_ROOT, force: true }));
		assert(
			quiet(() => cmdCheck({ target: tmp, sourceRoot: SCRIPT_ROOT })) === 0,
			"check exits 0 after pull --force",
		);

		console.log("\n6. the scope guard bites");
		const gitOk = git(tmp, ["init"]) !== null;
		if (gitOk) {
			write(abs(tmp, ".gitignore"), "node_modules/\n");
			git(tmp, ["add", "-A"]);
			git(tmp, [
				"-c",
				"user.email=t@t",
				"-c",
				"user.name=t",
				"commit",
				"-m",
				"init",
			]);
		}
		assert(
			quiet(() =>
				cmdTaskNew({ root: tmp, slug: "scoped-change", lane: "quick" }),
			) === 0,
			"task new exits 0",
		);
		const freshDir = abs(tmp, `${TASKS}/active`);
		const freshText = read(
			abs(freshDir, fs.readdirSync(freshDir).find((f) => f.endsWith(".md"))),
		);
		assert(
			freshText.includes("**Decisions**") &&
				!/Assumptions taken|Learnings promoted|\*\*Files\*\*/.test(freshText) &&
				freshText.length < 1800,
			"a new task is a skeleton — intent, scope, decisions, plan, proof, no guidance prose",
		);
		fillTask(
			["src/index.ts"],
			"fixture change",
			"The fixture changed one file, and the change file says so.",
		);
		write(abs(tmp, "src/index.ts"), "export const x = 2;\n");
		write(abs(tmp, "src/other.ts"), "export const y = 1;\n");
		git(tmp, ["add", "src/other.ts"]);
		assert(
			quiet(() => cmdTaskGuard({ root: tmp })) === 1,
			"the commit guard blocks an out-of-scope staged file",
		);
		assert(
			quiet(() => cmdTaskClose({ root: tmp })) === 1,
			"task close exits 1 on an out-of-scope file",
		);

		console.log("\n7. in-scope close records evidence and archives");
		fs.rmSync(abs(tmp, "src/other.ts"));
		git(tmp, ["reset"]);
		git(tmp, ["add", "src/index.ts"]);
		assert(
			quiet(() => cmdTaskGuard({ root: tmp })) === 0,
			"the commit guard passes an in-scope staged file",
		);
		const activeDir = abs(tmp, `${TASKS}/active`);
		const taskFile = abs(
			activeDir,
			fs.readdirSync(activeDir).find((f) => f.endsWith(".md")),
		);
		write(
			taskFile,
			read(taskFile).replace(/^summary: .*$/m, `summary: "${"x".repeat(200)}"`),
		);
		assert(
			quiet(() => cmdTaskClose({ root: tmp })) === 1,
			"a change title over 140 characters is refused",
		);
		write(
			taskFile,
			read(taskFile).replace(/^summary: .*$/m, 'summary: "fixture change"'),
		);
		write(
			taskFile,
			read(taskFile).replace(
				"## Plan",
				"The plan names <!-- VERIFY:START --> in prose.\n\n## Plan",
			),
		);
		const before = quiet(() => cmdTaskClose({ root: tmp }));
		assert(before === 0, "task close exits 0 when the write set holds");
		assert(
			exists(abs(tmp, `${TASKS}/archive`)) &&
				fs.readdirSync(abs(tmp, `${TASKS}/archive`)).length > 0,
			"task archived",
		);
		const archivedRel =
			expand(tmp, `${TASKS}/archive`).find((rel) => /TASK-101.*\.md$/.test(rel)) ||
			"";
		const archivedText = read(abs(tmp, archivedRel));
		assert(
			archivedText.includes("<!-- VERIFY:START -->") &&
				!archivedText.includes("<!-- EVIDENCE:START -->"),
			"recorded runs sit in the VERIFY block, and the old marker is gone",
		);
		assert(
			archivedText.includes("The plan names <!-- VERIFY:START --> in prose.") &&
				archivedText.includes("## Plan"),
			"a marker named in the plan's prose is not mistaken for the real block",
		);
		const changeRel = expand(tmp, LOG_DIR).find((rel) =>
			/^\.agent-kit\/logs\/\d{2}-\d{4}\/.+\.md$/.test(rel),
		);
		assert(
			/^\.agent-kit\/logs\/\d{2}-\d{4}\/\d{4}-\d{2}-\d{2}-TASK-101-[\w-]+\.md$/.test(
				changeRel || "",
			),
			"the change is filed as logs/MM-YYYY/YYYY-MM-DD-TASK-ID-slug.md",
		);
		const changeText = read(abs(tmp, changeRel));
		assert(
			changeText.includes("# TASK-101 — fixture change") &&
				changeText.includes("## What changed") &&
				changeText.includes(
					"The fixture changed one file, and the change file says so.",
				),
			"the file says what the task did",
		);
		assert(
			changeText.includes("**Task:** [TASK-101](../../tasks/archive/") &&
				!changeText.includes("**Date:**") &&
				!changeText.includes("- `src/index.ts`") &&
				changeText.includes("**Scope:** src"),
			"the card links the task, keeps the date in the front matter, and lists no files",
		);
		assert(
			!changeText.includes("## Why") &&
				!changeText.includes("## Evidence") &&
				!changeText.includes("## Follow-ups"),
			"the plan's sections stay in the task; the change file does not copy them",
		);
		const taskIndexText = read(abs(tmp, TASK_INDEX));
		assert(
			taskIndexText.includes("<!-- RECENT:START -->") &&
				/\[TASK-101\]\(archive\/\d{4}-\d{2}\//.test(taskIndexText) &&
				taskIndexText.includes("fixture change"),
			"the task index lists the last closed tasks and links the archive",
		);
		const logsRecent = read(abs(tmp, `${LOG_DIR}/INDEX.md`));
		assert(
			/\[TASK-101\]\(\d{2}-\d{4}\/\d{4}-\d{2}-\d{2}-TASK-101-[\w-]+\.md\)/.test(
				logsRecent,
			) && logsRecent.includes("fixture change"),
			"the logs index lists the last changes and links the month folder",
		);
		write(
			abs(tmp, `${LOG_DIR}/INDEX.md`),
			logsRecent.replace(
				/<!-- RECENT:START -->[\s\S]*?<!-- RECENT:END -->/,
				"<!-- RECENT:START -->\n_Nothing yet._\n<!-- RECENT:END -->",
			),
		);
		assert(
			quiet(() => cmdDoctor({ root: tmp })) === 1,
			"doctor fails a stale recent list",
		);
		write(abs(tmp, `${LOG_DIR}/INDEX.md`), logsRecent);
		assert(
			quiet(() => cmdDoctor({ root: tmp })) === 0,
			"doctor accepts a closed task and its change file",
		);
		const handArchived = abs(
			tmp,
			`${TASKS}/archive/2026-10/2099-01-01-TASK-999-hand-closed.md`,
		);
		write(handArchived, "---\nid: TASK-999\nstatus: DONE\n---\n# hand closed\n");
		assert(
			quiet(() => cmdDoctor({ root: tmp })) === 1,
			"doctor fails on an archived task with no change file",
		);
		fs.rmSync(handArchived);
		const archived =
			walk(abs(tmp, `${TASKS}/archive`)).map((f) =>
				read(abs(tmp, `${TASKS}/archive/${f}`)),
			)[0] || "";
		assert(
			archived.includes("`src/index.ts`"),
			"inventory lists the changed file",
		);
		assert(
			!archived.includes("`.agent-kit/tasks/"),
			"inventory excludes the kit bookkeeping",
		);

		console.log("\n8. a manual copy can adopt itself in place");
		junkDir = fs.mkdtempSync(path.join(os.tmpdir(), "agent-kit-copy-"));
		fs.cpSync(SCRIPT_ROOT, junkDir, { recursive: true });
		assert(
			quiet(() =>
				cmdSetup({
					target: junkDir,
					sourceRoot: junkDir,
					sourceSpec: junkDir,
					noRtk: true,
				}),
			) === 0,
			"setup exits 0 on a self-copy",
		);
		const selfState = JSON.parse(read(abs(junkDir, ".agent-kit/template.json")));
		assert(
			selfState.role === "target" && selfState.source === "",
			"self-copy becomes a target with no upstream",
		);

		console.log("\n9. vague advice is not a rule");
		const beh = abs(tmp, ".agent-kit/rules/_behavior.md");
		const behText = read(beh);
		write(beh, `${behText}\n- Be careful with the config.\n`);
		assert(
			quiet(() => cmdDoctor({ root: tmp })) === 1,
			"doctor exits 1 on advice instead of a rule",
		);
		write(beh, behText);
		assert(
			quiet(() => cmdDoctor({ root: tmp })) === 0,
			"doctor exits 0 once the advice is gone",
		);

		console.log("\n10. doctor --fix repairs encoding only");
		const docP = abs(tmp, ".agent-kit/docs/ARCH_MAP.md");
		// Normalise first: a Windows checkout with autocrlf hands us CRLF already, and the
		// assertion below is about --fix, not about what the template shipped.
		write(
			docP,
			`\uFEFF${read(docP)
				.replace(/\r\n/g, "\n")
				.replace(/\n/g, "\r\n")}`,
		);
		assert(
			quiet(() => cmdDoctor({ root: tmp })) === 1,
			"doctor exits 1 on a BOM",
		);
		assert(
			quiet(() => cmdDoctor({ root: tmp, fix: true })) === 0,
			"doctor --fix clears the mechanical failure",
		);
		assert(
			!read(docP).startsWith("\uFEFF") && !read(docP).includes("\r"),
			"BOM and CRLF are gone from the file",
		);

		console.log("\n11. a red run cannot be closed as done");
		quiet(() =>
			cmdTaskNew({ root: tmp, slug: "red-then-green", lane: "quick" }),
		);
		const taskP = fillTask(
			[".agent-kit/sync-manifest.json"],
			"prove the evidence gate",
		);
		write(
			abs(tmp, PROJECT),
			read(abs(tmp, PROJECT)).replace(
				/\| test \| .* \|/,
				'| test | node -e "process.exit(1)" |',
			),
		);
		assert(
			quiet(() => cmdVerify({ root: tmp, baseline: true })) === 1,
			"the baseline run records the red state",
		);
		assert(
			read(taskP).includes("<!-- BASELINE:START -->"),
			"baseline block written into the task",
		);
		assert(
			quiet(() => cmdTaskClose({ root: tmp })) === 1,
			"close refuses while the evidence table is red",
		);
		write(
			abs(tmp, PROJECT),
			read(abs(tmp, PROJECT)).replace(/process\.exit\(1\)/, "process.exit(0)"),
		);
		assert(
			quiet(() => cmdVerify({ root: tmp })) === 0,
			"verify exits 0 after the fix",
		);
		assert(quiet(() => cmdTaskShow({ root: tmp })) === 0, "task show exits 0");
		assert(
			quiet(() => cmdTaskClose({ root: tmp })) === 1,
			"close still refuses the out-of-scope file",
		);
		assert(
			quiet(() =>
				cmdTaskClose({
					root: tmp,
					amend: "restored the declared test command",
				}),
			) === 0,
			"close --amend accepts it with a reason",
		);
		const amendedFile =
			walk(abs(tmp, `${TASKS}/archive`))
				.map((f) => read(abs(tmp, `${TASKS}/archive/${f}`)))
				.pop() || "";
		assert(
			amendedFile.includes("Scope amended at close"),
			"the amendment is written into the plan",
		);

		console.log("\n12. check --json and pull --dry-run are read-only");
		fs.appendFileSync(abs(tmp, ".agent-kit/agent-kit.mjs"), "\n// local edit 2\n");
		const jsonTxt = captured(() =>
			cmdCheck({ target: tmp, sourceRoot: SCRIPT_ROOT, jsonOut: true }),
		);
		assert(
			JSON.parse(jsonTxt).ok === false,
			"check --json reports drift in a parseable shape",
		);
		assert(
			quiet(() =>
				cmdPull({ target: tmp, sourceRoot: SCRIPT_ROOT, dryRun: true }),
			) === 0,
			"pull --dry-run exits 0",
		);
		assert(
			read(abs(tmp, ".agent-kit/agent-kit.mjs")).includes("local edit 2"),
			"the dry run wrote nothing",
		);

		console.log("\n13. the change log is a folder of dated files, not a release ledger");
		const changes = expand(tmp, LOG_DIR).filter(
			(r) => r.endsWith(".md") && !r.endsWith("INDEX.md"),
		);
		assert(
			changes.some((rel) =>
				/^\.agent-kit\/logs\/\d{2}-\d{4}\/\d{4}-\d{2}-\d{2}-TASK-101-[\w-]+\.md$/.test(
					rel,
				),
			),
			"a change sits in its month folder, named by date, task and slug",
		);
		assert(
			!exists(abs(tmp, `${LOG_DIR}/changelog.md`)),
			"there is no accumulating changelog to keep in sync",
		);
		assert(
			quiet(() => cmdDoctor({ root: tmp })) === 0,
			"doctor accepts the change log as it is",
		);

		console.log("\n14. a new directory is inventoried as files, not as one entry");
		// Scenario 12 left an uncommitted edit; commit it so this task's diff is only its own.
		git(tmp, ["add", "-A"]);
		git(tmp, [
			"-c",
			"user.email=t@t",
			"-c",
			"user.name=t",
			"commit",
			"-qm",
			"settle",
		]);
		quiet(() =>
			cmdTaskNew({ root: tmp, slug: "new-dir", lane: "quick", noBaseline: true }),
		);
		fillTask(["src/lib/"], "added a small module");
		write(abs(tmp, "src/lib/a.ts"), "export const a = 1;\n");
		write(abs(tmp, "src/lib/b.ts"), "export const b = 2;\n");
		assert(
			quiet(() => cmdTaskClose({ root: tmp })) === 0,
			"close accepts a new directory inside the declared write set",
		);
		const withDir =
			walk(abs(tmp, `${TASKS}/archive`))
				.map((f) => read(abs(tmp, `${TASKS}/archive/${f}`)))
				.find((t) => t.includes("added a small module")) || "";
		assert(
			withDir.includes("- `src/lib/a.ts`") &&
				withDir.includes("- `src/lib/b.ts`"),
			"both files are listed",
		);
		assert(
			!withDir.includes("- `src/lib/`"),
			"the directory itself is not listed as a file",
		);
		assert(
			quiet(() => cmdTaskShow({ root: tmp })) === 0,
			"task show answers \"nothing in flight\" without failing",
		);

		console.log("\n15. a harness skill file points at the root skill");
		write(
			abs(tmp, ".claude/skills/agent-kit/SKILL.md"),
			"---\nname: agent-kit\ndescription: pointer\n---\n\nRead `.agent-kit/SKILL.md` at the repository root.\n",
		);
		assert(
			quiet(() => cmdDoctor({ root: tmp })) === 0,
			"a short pointer passes",
		);
		write(
			abs(tmp, ".claude/skills/agent-kit/SKILL.md"),
			`---\nname: agent-kit\ndescription: pointer\n---\n\nRead \`.agent-kit/SKILL.md\` at the repository root.\n\n${Array.from(
				{ length: 150 },
				() => "a",
			).join("\n")}\n`,
		);
		assert(
			quiet(() => cmdDoctor({ root: tmp })) === 0,
			"150 one-word lines pass: the pointer cap counts characters, not lines",
		);
		write(abs(tmp, ".claude/skills/agent-kit/SKILL.md"), read(abs(tmp, ".agent-kit/SKILL.md")));
		assert(
			quiet(() => cmdDoctor({ root: tmp })) === 1,
			"a copy of the loop fails, so it cannot drift",
		);
		fs.rmSync(abs(tmp, ".claude"), { recursive: true, force: true });

		console.log("\n16. commits carry the owner's identity only");
		git(tmp, ["config", "user.email", "owner@example.com"]);
		git(tmp, ["config", "user.name", "Owner"]);
		git(tmp, ["add", "-A"]);
		git(tmp, ["commit", "-q", "-m", "chore: owner commit"]);
		assert(
			quiet(() => cmdDoctor({ root: tmp })) === 0,
			"another human author warns, it does not fail a repo",
		);
		git(tmp, [
			"commit",
			"-q",
			"--allow-empty",
			"-m",
			"chore: x\n\nCo-Authored-By: Agent <agent@local>",
		]);
		assert(
			quiet(() => cmdDoctor({ root: tmp })) === 1,
			"an AI trailer fails, so the rule cannot silently lapse",
		);

		console.log("\n17. learnings past the cap move to the archive");
		const learnP = abs(tmp, ".agent-kit/rules/learnings.md");
		const live = () =>
			read(learnP)
				.split(/\r?\n/)
				.filter((l) => l.trim().startsWith("- ")).length;
		write(
			learnP,
			`${read(learnP).replace(/\s*$/, "\n")}${Array.from(
				{ length: 31 },
				(_, i) => `- lesson ${i + 1}`,
			).join("\n")}\n`,
		);
		assert(live() > 30, "the live list is over the cap");
		assert(
			quiet(() => cmdLearningsArchive({ root: tmp })) === 0,
			"learnings archive exits 0",
		);
		assert(live() === 30, "the live list is cut back to the cap");
		const archivedFiles = expand(tmp, ".agent-kit/learnings/archive").filter((r) =>
			r.endsWith(".md"),
		);
		assert(
			archivedFiles.length === 1 &&
				read(abs(tmp, archivedFiles[0])).includes("\n- lesson 1\n"),
			"the oldest entries are kept, in a dated archive file",
		);
		assert(
			!read(learnP).includes("\n- lesson 1\n"),
			"and they are gone from the list a session reads",
		);

		console.log("\n18. harnesses are found on the machine, not only in the repo");
		const fakeHome = abs(tmp, "fake-home");
		fs.mkdirSync(abs(fakeHome, ".claude"), { recursive: true });
		fs.mkdirSync(abs(fakeHome, ".codex"), { recursive: true });
		fs.mkdirSync(abs(tmp, ".cursor"), { recursive: true });
		const found = detectHarnesses(tmp, fakeHome, "");
		const names = found.map((h) => h.name);
		assert(names.includes("Claude Code"), "a HOME config dir is a signal");
		assert(names.includes("Codex CLI"), "PATH is not the only signal");
		assert(names.includes("Cursor"), "a repo marker is a signal");
		assert(!names.includes("Windsurf"), "an absent harness is not reported");
		assert(
			harnessLines(found).join("\n").includes("Claude Code"),
			"the report names what was found",
		);
		assert(
			quiet(() => cmdHarnesses({ root: tmp, home: fakeHome, pathEnv: "" })) ===
				0,
			"harnesses exits 0",
		);

		console.log("\n19. the commit message names the task and carries a summary");
		const msgDir = fs.mkdtempSync(path.join(os.tmpdir(), "agent-kit-msg-"));
		const guardMsg = (text) => {
			const p = abs(msgDir, "msg.txt");
			write(p, text);
			const out = [];
			const log = console.log;
			const err = console.error;
			console.log = () => {};
			console.error = (s) => out.push(String(s));
			try {
				return { code: cmdTaskGuard({ root: tmp, message: p }), out: out.join("\n") };
			} finally {
				console.log = log;
				console.error = err;
			}
		};
		const valid = guardMsg(
			"fix (TASK-101): close the scope gap\n\nTASK-101 — fixture change\n",
		);
		assert(
			valid.code === 0 && !valid.out,
			"a typed subject naming a known task, with a body, passes in silence",
		);
		const merged = guardMsg("Merge branch 'main' into fixture\n");
		assert(
			merged.code === 0 && !merged.out,
			"a merge message is not a session's commit",
		);
		const noBody = guardMsg("fix (TASK-101): close the scope gap\n");
		assert(
			noBody.code === 0 &&
				noBody.out.includes("commit message warning") &&
				noBody.out.includes("The body is empty"),
			"a subject with no body warns and lets the commit through",
		);
		const unknown = guardMsg(
			"fix (TASK-999): close the scope gap\n\nsummary\n",
		);
		assert(
			unknown.code === 0 && unknown.out.includes("TASK-999 is not a task"),
			"an unknown task ID warns and lets the commit through",
		);
		const untyped = guardMsg("update the guard\n\nsummary\n");
		assert(
			untyped.code === 0 && untyped.out.includes("commit message warning"),
			"a subject with no type or task warns and lets the commit through",
		);
		fs.rmSync(msgDir, { recursive: true, force: true });

		console.log("\n20. the rules router and the folder agree");
		// Scenario 16 leaves a red doctor on purpose, so assert the row, not the exit code.
		const doctorRow = (name) => {
			const out = captured(() => cmdDoctor({ root: tmp, jsonOut: true }));
			return JSON.parse(out).rows.find((r) => r.name === name);
		};
		const rulesRow = () => doctorRow("rules indexed");
		const extraRule = abs(tmp, ".agent-kit/rules/extra.md");
		write(extraRule, "# extra\n\n- a rule for a domain nobody indexed.\n");
		const noRow = rulesRow();
		assert(
			noRow.status === "FAIL" && noRow.detail.includes("extra.md (no row)"),
			"doctor fails a rule file with no row",
		);
		fs.rmSync(extraRule);
		const antiRule = abs(tmp, ".agent-kit/rules/anti-patterns.md");
		const antiText = read(antiRule);
		fs.rmSync(antiRule);
		const noFile = rulesRow();
		assert(
			noFile.status === "FAIL" &&
				noFile.detail.includes("anti-patterns.md (no file)"),
			"doctor fails a row with no file",
		);
		write(antiRule, antiText);
		assert(
			rulesRow().status === "PASS",
			"doctor accepts the router and the folder once they agree",
		);

		console.log("\n21. the backlog holds candidates, not tasks");
		const backlogP = abs(tmp, `${TASKS}/BACKLOG.md`);
		const backlog = (rows) =>
			write(
				backlogP,
				[
					"# Backlog — parked work",
					"",
					"| ID | Status | Item | Source | Next step |",
					"|---|---|---|---|---|",
					...rows,
					"",
				].join("\n"),
			);
		assert(
			exists(backlogP) && doctorRow("backlog").status === "PASS",
			"setup installs a backlog that passes with nothing parked",
		);
		backlog([
			"| `B-01` | `later` | retry the upload | `src/index.ts:1` | decide the budget |",
		]);
		assert(doctorRow("backlog").status === "PASS", "a well-formed row passes");
		backlog([
			"| `B-01` | `someday` | retry the upload | `src/index.ts:1` | decide the budget |",
		]);
		const statusRow = doctorRow("backlog");
		assert(
			statusRow.status === "FAIL" && statusRow.detail.includes("someday"),
			"doctor fails a status outside the vocabulary",
		);
		backlog([
			"| `B-01` | `later` | retry the upload | `src/index.ts:1` | decide the budget |",
			"| `B-01` | `later` | retry the download | `src/index.ts:2` | decide the budget |",
		]);
		assert(
			doctorRow("backlog").detail.includes("duplicate"),
			"doctor fails a reused ID",
		);
		backlog([
			"| `B-01` | `later` | retry the upload | `src/index.ts:1` |  |",
		]);
		assert(
			doctorRow("backlog").status === "FAIL",
			"doctor fails a row with no next step",
		);
		backlog([]);
		assert(
			doctorRow("backlog").status === "PASS",
			"doctor accepts the empty backlog again",
		);
		fs.rmSync(backlogP);
		const noBacklog = doctorRow("backlog");
		assert(
			noBacklog.status === "PASS" && noBacklog.detail.includes("not installed"),
			"an older install without the seed is not failed",
		);
		write(backlogP, read(abs(SCRIPT_ROOT, ".agent-kit/templates/backlog.seed.md")));

		console.log("\n22. the same red run over the same files stops at three");
		// Scenario 21 restored the backlog; commit the accumulated state so this task's diff
		// is only its own.
		git(tmp, ["add", "-A"]);
		git(tmp, [
			"-c",
			"user.email=t@t",
			"-c",
			"user.name=t",
			"commit",
			"-qm",
			"settle before loop",
		]);
		quiet(() =>
			cmdTaskNew({
				root: tmp,
				slug: "loop-guard",
				lane: "quick",
				noBaseline: true,
			}),
		);
		const loopTask = fillTask(["src/loop.txt"], "prove the loop guard");
		write(abs(tmp, "src/loop.txt"), "one\n");
		const greenProject = read(abs(tmp, PROJECT));
		write(
			abs(tmp, PROJECT),
			greenProject.replace(
				/\| test \| .* \|/,
				'| test | node -e "process.exit(1)" |',
			),
		);
		const loopOf = () => {
			const m = read(loopTask).match(/<!--\s*LOOP\s+(\{[^\n]*\})\s*-->/);
			return m ? JSON.parse(m[1]) : null;
		};
		const counts = [];
		for (let i = 0; i < 3; i++) {
			assert(
				quiet(() => cmdVerify({ root: tmp })) === 1,
				`red run ${i + 1} exits 1`,
			);
			counts.push(loopOf() && loopOf().n);
		}
		assert(
			counts.join(",") === "1,2,3",
			"the attempt count climbs while nothing changes",
		);
		assert(
			captured(() => cmdTaskShow({ root: tmp })).includes("Loop: 3/3"),
			"task show reports the loop state",
		);
		const spoken = (fn) => {
			const out = [];
			const log = console.log;
			const err = console.error;
			console.log = (s) => out.push(String(s));
			console.error = (s) => out.push(String(s));
			try {
				return { code: fn(), out: out.join("\n") };
			} finally {
				console.log = log;
				console.error = err;
			}
		};
		const refused = spoken(() => cmdTaskClose({ root: tmp }));
		assert(
			refused.code === 1 && refused.out.includes("Loop guard"),
			"close refuses the fourth identical attempt",
		);
		assert(loopOf().n === 3, "the refusal records no new attempt");
		write(
			loopTask,
			read(loopTask).replace(
				"\n## Baseline",
				"\n**Next attempt** — isolate the fixture before rerunning.\n\n## Baseline",
			),
		);
		assert(
			quiet(() => cmdVerify({ root: tmp })) === 1 && loopOf().n === 1,
			"a new plan earns one fresh attempt",
		);
		write(abs(tmp, PROJECT), greenProject);
		assert(
			quiet(() => cmdVerify({ root: tmp })) === 0 && loopOf().n === 0,
			"a green run clears the count",
		);
		assert(
			quiet(() => cmdTaskClose({ root: tmp })) === 0,
			"close proceeds once the suite is green",
		);

		console.log("\n23. the milestone tier keeps the slow build out of the inner loop");
		git(tmp, ["add", "-A"]);
		git(tmp, [
			"-c",
			"user.email=t@t",
			"-c",
			"user.name=t",
			"commit",
			"-qm",
			"settle before tiers",
		]);
		quiet(() => cmdTaskNew({ root: tmp, slug: "command-tiers", lane: "quick" }));
		const tierTask = fillTask(["src/tier.txt"], "prove the command tiers");
		write(abs(tmp, "src/tier.txt"), "one\n");
		const tierProject = read(abs(tmp, PROJECT));
		assert(
			/\| build \| npm run build \| milestone \|/.test(tierProject),
			"setup marks the build milestone and the test always",
		);
		assert(
			/\| lint \| npm run lint \| always \|/.test(tierProject),
			"lint rides the quick suite, so subtask closes run it",
		);
		const tierText = () => read(tierTask);
		assert(
			/^\| build \|.*\| full \|/m.test(tierText()),
			"the baseline is a full run, so the milestone command is recorded",
		);
		assert(
			doctorRow("declared commands").status === "PASS",
			"doctor accepts the tiers setup wrote",
		);
		write(
			abs(tmp, PROJECT),
			tierProject.replace(
				"| build | npm run build | milestone |",
				"| build | npm run build | sometimes |",
			),
		);
		const badTier = doctorRow("declared commands");
		assert(
			badTier.status === "FAIL" && badTier.detail.includes("sometimes"),
			"doctor fails a When value outside always|milestone",
		);
		write(abs(tmp, PROJECT), tierProject);
		write(
			abs(tmp, PROJECT),
			tierProject.replace(
				"| build | npm run build | milestone |",
				'| build | node -e "process.exit(1)" | milestone |',
			),
		);
		const quick = spoken(() => cmdVerify({ root: tmp }));
		assert(quick.code === 0, "a red build does not fail the quick suite");
		assert(
			quick.out.includes("milestone command(s) held"),
			"verify says which commands it held back",
		);
		assert(
			!/^\| build \|.*\| 1 \|$/m.test(tierText()),
			"the quick run records no build failure",
		);
		assert(
			quiet(() => cmdVerify({ root: tmp, full: true })) === 1,
			"verify --full runs the milestone row and fails on it",
		);
		assert(
			/^\| build \|.*\| full \| exit 0 \| exit 1 \| 1 \|$/m.test(tierText()),
			"--full records the build failure with its scope",
		);
		const tierRefused = spoken(() => cmdTaskClose({ root: tmp }));
		assert(
			tierRefused.code === 1 && tierRefused.out.includes("verification failed"),
			"close refuses while the milestone command is red",
		);
		write(abs(tmp, PROJECT), tierProject);
		assert(
			quiet(() => cmdTaskClose({ root: tmp })) === 0,
			"close runs the full suite itself and closes once it is green",
		);

		console.log(
			"\n24. evidence goes stale when the files move under it, and close hands over the message",
		);
		git(tmp, ["add", "-A"]);
		git(tmp, [
			"-c",
			"user.email=t@t",
			"-c",
			"user.name=t",
			"commit",
			"-qm",
			"settle before stale",
		]);
		quiet(() => cmdTaskNew({ root: tmp, slug: "stale-evidence", lane: "quick" }));
		const staleTask = fillTask(["src/stale.txt"], "prove stale evidence");
		write(abs(tmp, "src/stale.txt"), "one\n");
		assert(
			quiet(() => cmdVerify({ root: tmp })) === 0,
			"the first run is green",
		);
		assert(
			captured(() => cmdTaskShow({ root: tmp })).includes("Evidence: current"),
			"show calls the run current",
		);
		write(abs(tmp, "src/stale.txt"), "two\n");
		assert(
			captured(() => cmdTaskShow({ root: tmp })).includes("Evidence: STALE"),
			"an edit after the run makes the evidence stale",
		);
		assert(
			captured(() => cmdStart({ root: tmp })).includes("Stale   yes"),
			"start flags the stale run",
		);
		assert(
			quiet(() => cmdVerify({ root: tmp })) === 0,
			"a fresh run is green again",
		);
		const prClose = spoken(() => cmdTaskClose({ root: tmp, pr: true }));
		assert(prClose.code === 0, "close succeeds");
		assert(
			prClose.out.includes("Commit message:"),
			"close prints the commit message to use",
		);
		assert(
			/^feat \(TASK-\d+\): prove stale evidence$/m.test(prClose.out),
			"the subject is typed and names the task",
		);
		assert(
			prClose.out.includes("## Summary") &&
				prClose.out.includes("## Verification"),
			"--pr prints a PR body with the evidence",
		);

		console.log("\n25. a blocked task frees the slot and waits on disk");
		git(tmp, ["add", "-A"]);
		git(tmp, [
			"-c",
			"user.email=t@t",
			"-c",
			"user.name=t",
			"commit",
			"-qm",
			"settle before block",
		]);
		quiet(() =>
			cmdTaskNew({
				root: tmp,
				slug: "blocked-a",
				lane: "quick",
				noBaseline: true,
			}),
		);
		const taskA = fillTask(["src/a.txt"], "prove a blocked task");
		const taskAId = frontMatter(read(taskA)).id;
		assert(
			spoken(() =>
				cmdTaskBlock({ root: tmp, id: taskAId, question: "pick A or B" }),
			).code === 0,
			"a task can block with a question",
		);
		assert(
			/^status: BLOCKED$/m.test(read(taskA)),
			"the status records the impasse",
		);
		assert(
			read(abs(tmp, TASK_INDEX)).includes(`\`${taskAId}\` [BLOCKED]`),
			"the index lists the blocked task",
		);
		const blockedText = read(taskA);
		write(
			taskA,
			blockedText.replace(
				/<!-- BLOCKED:START -->[\s\S]*?<!-- BLOCKED:END -->\r?\n?/,
				"",
			),
		);
		assert(
			doctorRow("blocked tasks").status === "FAIL",
			"doctor fails a blocked status with no question",
		);
		write(taskA, blockedText);
		assert(
			captured(() => cmdStart({ root: tmp })).includes("pick A or B"),
			"start surfaces the owner's question",
		);
		assert(
			captured(() => cmdTaskShow({ root: tmp, id: taskAId })).includes(
				"Blocked: pick A or B",
			),
			"show prints the question",
		);
		assert(
			spoken(() => cmdTaskClose({ root: tmp, id: taskAId })).code === 1,
			"a blocked task cannot close",
		);
		quiet(() =>
			cmdTaskNew({
				root: tmp,
				slug: "blocked-b",
				lane: "quick",
				noBaseline: true,
			}),
		);
		const taskB = fillTask(["src/b.txt"], "prove the slot frees");
		write(
			taskA,
			read(taskA).replace(/^status: BLOCKED$/m, "status: IN_PROGRESS"),
		);
		assert(
			doctorRow("blocked tasks").status === "FAIL",
			"doctor fails a block marker whose status disagrees",
		);
		write(
			taskA,
			read(taskA).replace(/^status: IN_PROGRESS$/m, "status: BLOCKED"),
		);
		assert(
			doctorRow("blocked tasks").status === "PASS",
			"doctor accepts the marker and the status together",
		);
		assert(
			spoken(() =>
				cmdTaskBlock({ root: tmp, question: "which comes first?" }),
			).code === 0,
			"the second task can block too",
		);
		assert(
			spoken(() => cmdTaskResume({ root: tmp, id: taskAId })).code === 0,
			"resume names the blocked task and continues",
		);
		assert(
			/^status: IN_PROGRESS$/m.test(read(taskA)) &&
				!read(taskA).includes("BLOCKED:START"),
			"resume restores the status and removes the marker",
		);
		assert(
			frontMatter(read(taskB)).status === "BLOCKED" &&
				doctorRow("blocked tasks").status === "PASS",
			"the other task stays blocked and the pair is consistent",
		);

		console.log(
			"\n26. a subtask closes quick and the main close is where build runs",
		);
		assert(
			quiet(() => cmdTaskClose({ root: tmp })) === 0,
			"the resumed task closes and frees the slot",
		);
		quiet(() =>
			cmdTaskNew({ root: tmp, slug: "subtask-main", lane: "quick" }),
		);
		const mainTask = fillTask(
			[],
			"prove the main close runs build",
		);
		const mainId = frontMatter(read(mainTask)).id;
		const counterBefore = read(abs(tmp, `${TASKS}/.counter`));
		quiet(() =>
			cmdTaskNew({
				root: tmp,
				slug: "subtask-one",
				lane: "quick",
				parent: mainId,
			}),
		);
		// The close edits project.md to redden the build, so it is part of the write set.
		const childTask = fillTask(
			["src/child.txt", PROJECT],
			"prove a child close is quick",
		);
		const childId = frontMatter(read(childTask)).id;
		write(abs(tmp, "src/child.txt"), "one\n");
		assert(childId === `${mainId}.1`, "a subtask id extends the main id");
		assert(
			read(abs(tmp, `${TASKS}/.counter`)) === counterBefore,
			"opening a subtask does not move the top-level counter",
		);
		assert(
			frontMatter(read(mainTask)).status === "QUEUED",
			"the main task waits while its subtask works",
		);
		assert(
			captured(() => cmdStart({ root: tmp })).includes(`Parent  ${mainId}`),
			"start names the parent of the active subtask",
		);
		const tieredProject = read(abs(tmp, PROJECT));
		const redBuild = tieredProject.replace(
			"| build | npm run build | milestone |",
			'| build | node -e "process.exit(1)" | milestone |',
		);
		assert(redBuild !== tieredProject, "the fixture can turn the build red");
		write(abs(tmp, PROJECT), redBuild);
		const childClose = spoken(() => cmdTaskClose({ root: tmp }));
		assert(
			childClose.code === 0,
			"a red build does not block a subtask close",
		);
		assert(
			/^feat \(TASK-\d+\.\d+\): prove a child close is quick$/m.test(
				childClose.out,
			),
			"the subtask prints its own commit message",
		);
		assert(
			/^status: DONE$/m.test(read(childTask)),
			"the subtask is DONE and still in active/",
		);
		assert(
			!expand(tmp, LOG_DIR).some((rel) => rel.includes(`${childId}-`)),
			"the subtask writes no change file",
		);
		assert(
			frontMatter(read(mainTask)).status === "IN_PROGRESS",
			"closing the last subtask hands the slot back",
		);
		assert(
			captured(() => cmdStart({ root: tmp })).includes("Subtasks 1/1 done"),
			"start reports the family state",
		);
		const mainRefused = spoken(() => cmdTaskClose({ root: tmp }));
		assert(
			mainRefused.code === 1 &&
				mainRefused.out.includes("verification failed"),
			"the main close runs build and refuses a red result",
		);
		assert(exists(mainTask), "a refused main close archives nothing");
		write(abs(tmp, PROJECT), tieredProject);
		const mainClose = spoken(() => cmdTaskClose({ root: tmp }));
		assert(
			mainClose.code === 0,
			"fixing the build at the main close lets it through",
		);
		const archivedDir = abs(
			tmp,
			`${TASKS}/archive/${new Date().toISOString().slice(0, 7)}`,
		);
		assert(
			exists(abs(archivedDir, path.basename(childTask))),
			"the done subtask archives with the main task",
		);
		assert(
			expand(tmp, LOG_DIR).filter((rel) => rel.includes(`-${mainId}-`))
				.length === 1,
			"one change file under the main id",
		);
		assert(
			doctorRow("archived tasks changelogged").status === "PASS",
			"doctor accepts a subtask archived inside its main task",
		);
		assert(
			!read(abs(tmp, TASK_INDEX)).includes(childId),
			"the recent list names the main task, not its subtasks",
		);

		console.log(
			"\n27. a family shares one write set, one archive and one change file",
		);
		git(tmp, ["add", "-A"]);
		git(tmp, [
			"-c",
			"user.email=t@t",
			"-c",
			"user.name=t",
			"commit",
			"-qm",
			"settle before family",
		]);
		quiet(() =>
			cmdTaskNew({ root: tmp, slug: "family-main", lane: "planned" }),
		);
		const familyMain = fillTask(["src/family"], "prove the family write set");
		const familyId = frontMatter(read(familyMain)).id;
		const familyCounter = read(abs(tmp, `${TASKS}/.counter`));
		quiet(() =>
			cmdTaskNew({
				root: tmp,
				slug: "family-one",
				lane: "quick",
				parent: familyId,
			}),
		);
		const familyOne = fillTask(["src/family/one.txt"], "first slice");
		write(abs(tmp, "src/family/one.txt"), "one\n");
		assert(
			doctorRow("write-set collisions").status === "PASS",
			"doctor accepts a main task and its subtask sharing files",
		);
		assert(
			quiet(() => cmdTaskClose({ root: tmp })) === 0,
			"the first slice closes on the quick suite",
		);
		quiet(() =>
			cmdTaskNew({
				root: tmp,
				slug: "family-two",
				lane: "quick",
				parent: familyId,
			}),
		);
		const familyTwo = fillTask(["src/family/two.txt"], "second slice");
		write(abs(tmp, "src/family/two.txt"), "two\n");
		const familyTwoId = frontMatter(read(familyTwo)).id;
		assert(
			familyTwoId === `${familyId}.2`,
			"the second subtask takes the next dotted number",
		);
		assert(
			read(abs(tmp, `${TASKS}/.counter`)) === familyCounter,
			"neither subtask moves the counter",
		);
		assert(
			frontMatter(read(familyMain)).status === "QUEUED",
			"opening the next subtask queues the main task again",
		);
		assert(
			captured(() => cmdStart({ root: tmp })).includes("Subtasks 1/2 done"),
			"start counts the family",
		);
		const openRefused = spoken(() => cmdTaskClose({ root: tmp, id: familyId }));
		assert(
			openRefused.code === 1 &&
				openRefused.out.includes("subtasks still open"),
			"the main close refuses while a subtask is open",
		);
		assert(
			quiet(() => cmdTaskClose({ root: tmp })) === 0,
			"the second slice closes on the quick suite",
		);
		const familyClose = spoken(() => cmdTaskClose({ root: tmp }));
		assert(familyClose.code === 0, "the main close delivers the family");
		assert(
			exists(abs(archivedDir, path.basename(familyOne))) &&
				exists(abs(archivedDir, path.basename(familyTwo))),
			"both subtasks archive with the main task",
		);
		assert(
			expand(tmp, LOG_DIR).filter((rel) => rel.includes(`-${familyId}-`))
				.length === 1,
			"one change file for the whole delivery",
		);
		assert(
			doctorRow("subtasks").status === "PASS",
			"doctor accepts the family once it is archived",
		);

		console.log("\n28. a release collects the change files no release claims");
		assert(
			quiet(() => cmdRelease({ root: tmp, version: "v0.1.0" })) === 0,
			"release writes the version file",
		);
		const releaseRel = ".agent-kit/releases/v0.1.0.md";
		assert(exists(abs(tmp, releaseRel)), ".agent-kit/releases/v0.1.0.md exists");
		const releaseText = read(abs(tmp, releaseRel));
		assert(
			releaseText.split(/\r?\n/)[0] === "# Release v0.1.0",
			"the first line names the version",
		);
		assert(
			releaseText.includes("### Changed") &&
				releaseText.includes("- fixture change (TASK-101)") &&
				!releaseText.includes("Touched Modules"),
			"the release lists each task under its category, with no file inventory",
		);
		assert(
			/<!-- RELEASED:START -->[\s\S]*TASK-101[\s\S]*<!-- RELEASED:END -->/.test(
				releaseText,
			),
			"the release records the tasks it claims",
		);
		assert(
			doctorRow("release notes").status === "PASS",
			"doctor accepts a release file",
		);
		assert(
			quiet(() => cmdRelease({ root: tmp, version: "0.1.0" })) === 1,
			"the same version is refused",
		);
		assert(
			quiet(() => cmdRelease({ root: tmp, version: "0.2.0" })) === 1,
			"a version with nothing new is refused",
		);
		write(
			abs(tmp, releaseRel),
			releaseText.replace("# Release v0.1.0", "# Release 0.1.0"),
		);
		assert(
			doctorRow("release notes").status === "FAIL",
			"doctor fails a release whose first line does not name its version",
		);
		write(abs(tmp, releaseRel), releaseText);
		assert(
			doctorRow("release notes").status === "PASS",
			"doctor accepts it again once the heading is restored",
		);

		console.log("\n29. a blocked card holds no write set");
		git(tmp, ["add", "-A"]);
		git(tmp, [
			"-c",
			"user.email=t@t",
			"-c",
			"user.name=t",
			"commit",
			"-qm",
			"settle before collisions",
		]);
		quiet(() =>
			cmdTaskNew({
				root: tmp,
				slug: "collide-a",
				lane: "quick",
				noBaseline: true,
			}),
		);
		fillTask(["src/shared.txt"], "first claim");
		quiet(() =>
			cmdTaskNew({
				root: tmp,
				slug: "collide-b",
				lane: "quick",
				noBaseline: true,
				force: true,
			}),
		);
		const collideB = abs(
			tmp,
			`${TASKS}/active/${activeTasks(tmp).find((t) => t.file.includes("-collide-b.md")).file}`,
		);
		write(
			collideB,
			read(collideB)
				.replace(/touches: \[\]/, 'touches: ["src/shared.txt"]')
				.replace(/summary: ""/, 'summary: "second claim"')
				.replace(
					/\*\*Summary\*\*\s*—\s*<!--\s*FILL:summary[\s\S]*?-->/,
					"**Summary** — second claim",
				)
				.replace(/<!--\s*FILL:[\s\S]*?-->/g, "filled by selftest"),
		);
		const collisionRow = doctorRow("write-set collisions");
		assert(
			collisionRow.status === "FAIL" &&
				collisionRow.detail.includes("collide-a") &&
				collisionRow.detail.includes("collide-b"),
			"doctor fails two workable tasks that claim one file",
		);
		quiet(() =>
			cmdTaskBlock({
				root: tmp,
				id: frontMatter(read(collideB)).id,
				question: "who owns the shared file?",
			}),
		);
		assert(
			doctorRow("write-set collisions").status === "PASS",
			"doctor drops a blocked task's write set",
		);

		console.log("\n30. setup writes the pointer a harness discovers");
		const ptrTarget = abs(tmp, "pointer-target");
		fs.mkdirSync(abs(ptrTarget, ".claude"), { recursive: true });
		fs.mkdirSync(abs(tmp, "fake-home-2/.config/opencode"), { recursive: true });
		const ptrSetup = () =>
			quiet(() =>
				cmdSetup({
					target: ptrTarget,
					sourceRoot: SCRIPT_ROOT,
					noRtk: true,
					home: abs(tmp, "fake-home-2"),
					pathEnv: "",
				}),
			);
		ptrSetup();
		const ptr = abs(ptrTarget, ".claude/skills/agent-kit/SKILL.md");
		assert(exists(ptr), "a harness folder the repo keeps gets the pointer");
		assert(
			read(ptr).includes(".agent-kit/SKILL.md") &&
				read(ptr).includes("classify, open a task"),
			"the pointer carries the loop's frontmatter and names the file",
		);
		assert(
			!exists(abs(ptrTarget, ".opencode")),
			"a harness the repo does not use gets no folder",
		);
		assert(
			JSON.parse(captured(() => cmdDoctor({ root: ptrTarget, jsonOut: true })))
				.rows.find((r) => r.name === "skill pointers").status === "PASS",
			"doctor accepts the pointer setup wrote",
		);
		write(ptr, "---\nname: mine\n---\n\nauthored by the owner\n");
		ptrSetup();
		assert(
			read(ptr).includes("authored by the owner"),
			"an authored pointer is not overwritten",
		);
	} finally {
		fs.rmSync(tmp, { recursive: true, force: true });
		if (junkDir) fs.rmSync(junkDir, { recursive: true, force: true });
	}

	console.log(
		failures.length
			? `\nSELFTEST FAILED (${failures.length})\n`
			: "\nSELFTEST PASSED\n",
	);
	return failures.length ? 1 : 0;
}

// ---------------------------------------------------------------- main

function main(argv) {
	const args = argv.slice(2);
	const cmd = args[0];
	const flag = (name) => args.includes(`--${name}`);
	const value = (name) => {
		const i = args.indexOf(`--${name}`);
		return i >= 0 ? args[i + 1] : undefined;
	};
	const positional = args
		.slice(1)
		.filter(
			(a, i, all) =>
				!a.startsWith("--") && !(all[i - 1] || "").startsWith("--"),
		);

	switch (cmd) {
		case "setup": {
			const target = path.resolve(positional[0] || process.cwd());
			const src = sourceFor(target, value("source")) || {
				root: SCRIPT_ROOT,
				spec: SCRIPT_ROOT,
			};
			return cmdSetup({
				target,
				sourceRoot: src.root,
				sourceSpec: src.spec,
				noRtk: flag("no-rtk"),
			});
		}
		case "check": {
			const target = path.resolve(process.cwd());
			const src = sourceFor(target, value("source"));
			return cmdCheck({
				target,
				sourceRoot: src ? src.root : null,
				jsonOut: flag("json"),
			});
		}
		case "pull": {
			const target = path.resolve(process.cwd());
			const src = sourceFor(target, value("source"));
			return cmdPull({
				target,
				sourceRoot: src ? src.root : null,
				force: flag("force"),
				seeds: flag("seeds"),
				dryRun: flag("dry-run"),
			});
		}
		case "doctor":
			return cmdDoctor({
				root: process.cwd(),
				strict: flag("strict"),
				fix: flag("fix"),
				jsonOut: flag("json"),
			});
		case "start":
			return cmdStart({ root: process.cwd() });
		case "verify":
			return cmdVerify({
				root: process.cwd(),
				baseline: flag("baseline"),
				full: flag("full") ? true : undefined,
			});
		case "harnesses":
			return cmdHarnesses({ root: process.cwd() });
		case "task": {
			const sub = args[1];
			if (sub === "new")
				return cmdTaskNew({
					root: process.cwd(),
					slug: args[2],
					lane: value("lane"),
					force: flag("force"),
					noBaseline: flag("no-baseline"),
					parent: value("parent"),
				});
			if (sub === "show")
				return cmdTaskShow({ root: process.cwd(), id: value("id") });
			if (sub === "block")
				return cmdTaskBlock({
					root: process.cwd(),
					id: value("id"),
					question: positional.slice(1).join(" "),
				});
			if (sub === "resume")
				return cmdTaskResume({ root: process.cwd(), id: value("id") });
			if (sub === "close")
				return cmdTaskClose({
					root: process.cwd(),
					id: value("id"),
					amend: value("amend"),
					noVerify: flag("no-verify"),
					pr: flag("pr"),
				});
			if (sub === "guard")
				return cmdTaskGuard({
					root: process.cwd(),
					message: value("message"),
				});
			return die(
				'usage: task new <slug> [--parent TASK-N] | task show | task block "<question>" | task resume | task close [--id TASK-N] [--amend "<why>"] [--pr] | task guard [--message <file>]',
			);
		}
		case "learnings": {
			if (args[1] !== "archive")
				return die("usage: learnings archive  (moves entries past the 30 cap)");
			return cmdLearningsArchive({ root: process.cwd() });
		}
		case "release":
			return cmdRelease({ root: process.cwd(), version: positional[0] });
		case "selftest":
			return cmdSelftest();
		case "help":
		case undefined:
			console.log(
				read(path.join(SCRIPT_ROOT, ".agent-kit/agent-kit.mjs"))
					.split("\n")
					.slice(1, 27)
					.join("\n"),
			);
			return 0;
		default:
			return die(
				`unknown command: ${cmd} (setup|check|pull|doctor|start|verify|harnesses|task|learnings|release|selftest)`,
			);
	}
}

process.exitCode = main(process.argv);
