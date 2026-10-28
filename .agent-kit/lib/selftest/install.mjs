/** selftest/install.mjs — setup: the install, the fill gate, drift and pull */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { MANIFEST, PROJECT, SCRIPT_ROOT, TASK_INDEX, TASKS } from "../consts.mjs";
import { cmdDoctor } from "../doctor/index.mjs";
import { abs, exists, read, run, write } from "../io.mjs";
import { cmdSetup } from "../setup.mjs";
import { cmdCheck, cmdPull } from "../sync.mjs";

export function installScenarios(ctx) {
	const { tmp, assert, captured, quiet } = ctx;
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
	// The kit is a tree now, so only a real process proves every import travelled: an
	// in-process call would use modules this run already loaded.
	const boot = (root) =>
		run(
			`"${process.execPath}" "${abs(root, ".agent-kit/agent-kit.mjs")}" help`,
			root,
			60000,
		).code;
	assert(
		boot(tmp) === 0,
		"the installed kit boots: every module the entry imports was copied",
	);
	const broken = `${tmp}-broken`;
	fs.cpSync(abs(tmp, ".agent-kit"), abs(broken, ".agent-kit"), {
		recursive: true,
	});
	fs.rmSync(abs(broken, ".agent-kit/lib"), { recursive: true, force: true });
	assert(
		boot(broken) !== 0,
		"an install missing a module refuses to boot, so the row can bind",
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
	const withoutLib = JSON.parse(manifestText);
	withoutLib.machinery = withoutLib.machinery.filter(
		(m) => m !== ".agent-kit/lib",
	);
	write(manifestP, `${JSON.stringify(withoutLib, null, 2)}\n`);
	assert(
		quiet(() => cmdDoctor({ root: tmp })) === 1,
		"doctor fails a module the manifest does not cover",
	);
	write(manifestP, manifestText);
	console.log("\n4. drift is detected and refused");
	fs.appendFileSync(
		abs(tmp, ".agent-kit/agent-kit.mjs"),
		"\n// local edit\n",
	);
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
}

export function copyScenario(ctx) {
	const { assert, quiet, shared } = ctx;
	console.log("\n8. a manual copy can adopt itself in place");
	shared.junkDir = fs.mkdtempSync(path.join(os.tmpdir(), "agent-kit-copy-"));
	fs.cpSync(SCRIPT_ROOT, shared.junkDir, { recursive: true });
	// A self-copy of an issue-id repo cannot switch to local ids while a task is open, and this
	// scenario is about provenance: start the copy with no in-flight task.
	const copyActive = abs(shared.junkDir, `${TASKS}/active`);
	fs.rmSync(copyActive, { recursive: true, force: true });
	fs.mkdirSync(copyActive, { recursive: true });
	// This scenario is about provenance, not issue ids: local mode keeps it offline and sync,
	// so the assertion is on an exit code rather than an unresolved setup promise.
	assert(
		quiet(() =>
			cmdSetup({
				target: shared.junkDir,
				sourceRoot: shared.junkDir,
				sourceSpec: shared.junkDir,
				noRtk: true,
				ids: "local",
			}),
		) === 0,
		"setup exits 0 on a self-copy",
	);
	const selfState = JSON.parse(
		read(abs(shared.junkDir, ".agent-kit/template.json")),
	);
	assert(
		selfState.role === "target" && selfState.source === "",
		"self-copy becomes a target with no upstream",
	);
}

export function syncScenarios(ctx) {
	const { tmp, assert, captured, quiet } = ctx;
	console.log("\n12. check --json and pull --dry-run are read-only");
	fs.appendFileSync(
		abs(tmp, ".agent-kit/agent-kit.mjs"),
		"\n// local edit 2\n",
	);
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
}
