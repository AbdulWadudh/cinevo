/** env.mjs — token saver and harness detection */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { abs, exists, isDir, posix, read, run, write } from "./io.mjs";

// ---------------------------------------------------------------- token saver

/**
 * `rtk` filters shell output before an agent reads it. It is a machine tool, not a repo file:
 * setup installs it once, every later run only verifies it. The skill calls it explicitly
 * (`rtk git status`), so no harness hook has to be patched.
 */
export function rtkVersion(root) {
	if (run("rtk gain", root, 30000).code !== 0) return null;
	return (run("rtk --version", root, 15000).out || "").trim() || "installed";
}

export function ensureRtk(root) {
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
export const HARNESSES = [
	{
		name: "Claude Code",
		home: [".claude"],
		bin: ["claude"],
		repo: [".claude"],
		skill: ".claude/skills/agent-kit/SKILL.md",
	},
	{ name: "Codex CLI", home: [".codex"], bin: ["codex"], repo: [".codex"] },
	{ name: "Cursor", home: [".cursor"], bin: ["cursor"], repo: [".cursor"] },
	{
		name: "Gemini CLI",
		home: [".gemini"],
		bin: ["gemini"],
		repo: [".gemini", "GEMINI.md"],
	},
	{
		name: "GitHub Copilot",
		home: [".copilot", ".config/github-copilot"],
		bin: ["copilot"],
		repo: [".github/copilot-instructions.md"],
	},
	{
		name: "Windsurf",
		home: [".codeium/windsurf"],
		bin: ["windsurf"],
		repo: [".windsurf"],
	},
	{
		name: "OpenCode",
		home: [".config/opencode", ".local/share/opencode"],
		bin: ["opencode"],
		repo: [".opencode", "opencode.json"],
		skill: ".opencode/skills/agent-kit/SKILL.md",
	},
	{ name: "Qoder", home: [".qoder"], repo: [".qoder"] },
	{
		name: "Qwen Code",
		home: [".qwen"],
		bin: ["qwen"],
		repo: [".qwen", "QWEN.md"],
	},
	{ name: "Cline", home: [".cline"], repo: [".cline", ".clinerules"] },
	{ name: "Kiro", home: [".kiro"], repo: [".kiro"] },
	{ name: "Kilo Code", home: [".config/kilo"], repo: [".kilocode"] },
	{
		name: "Aider",
		home: [".aider", ".aider.conf.yml"],
		bin: ["aider"],
		repo: [".aider.conf.yml"],
	},
	{ name: "Amp", home: [".config/amp"], bin: ["amp"], repo: [".amp"] },
	{
		name: "Goose",
		home: [".config/goose"],
		bin: ["goose"],
		repo: [".goosehints"],
	},
	{ name: "Crush", home: [".config/crush"], bin: ["crush"], repo: [".crush"] },
	{
		name: "Factory Droid",
		home: [".factory"],
		bin: ["droid"],
		repo: [".factory"],
	},
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

export function onPath(bin, pathEnv) {
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

export function detectHarnesses(
	repoRoot,
	home,
	pathEnv = process.env.PATH || "",
) {
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
export function skillPointer(root) {
	const src = read(abs(root, ".agent-kit/SKILL.md")) || "";
	const fm = /^---\r?\n([\s\S]*?)\r?\n---/.exec(src);
	return `---\n${fm ? fm[1].trim() : "name: agent-kit"}\n---\n\nRead \`.agent-kit/SKILL.md\` at the repository root. It is the one copy of the loop.\n`;
}

/**
 * A harness that already keeps its folder in the repo gets a pointer, so its skill list
 * carries the loop without anyone reading the entry file first. It never creates the folder
 * (a repo that does not use that harness stays clean) and never overwrites an authored file.
 */
export function writeSkillPointers(root, found) {
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
export function harnessLines(found, wired = []) {
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

export function cmdHarnesses({ root, home, pathEnv } = {}) {
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
