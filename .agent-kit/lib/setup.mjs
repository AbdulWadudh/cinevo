/** setup.mjs — `setup`: scaffold a target repo */
import fs from "node:fs";
import path from "node:path";
import { MANIFEST, PROJECT, SCRIPT_ROOT, STATE, TASKS } from "./consts.mjs";
import {
	detectHarnesses,
	ensureRtk,
	harnessLines,
	writeSkillPointers,
} from "./env.mjs";
import {
	abs,
	copy,
	die,
	exists,
	expand,
	git,
	hashFile,
	json,
	table,
	write,
} from "./io.mjs";
import { isRemote, manifestOf, SEMVER } from "./manifest.mjs";
import { detectStack, projectMd } from "./project.mjs";

export function cmdSetup({
	target,
	sourceRoot,
	sourceSpec,
	ref,
	noRtk,
	home,
	pathEnv,
}) {
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
	const pin = !selfAdopt && isRemote(sourceSpec || "") ? ref || "" : "";
	const next = {
		role: "target",
		// In-place adoption has no upstream to diff against; an empty source keeps check honest.
		source: selfAdopt ? "" : sourceSpec || state.source || src,
		ref: pin,
		release: SEMVER.test(pin) ? pin.replace(/^v/i, "") : "",
		commit: pin ? git(src, ["rev-parse", "--short", "HEAD"]) || "" : "",
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
	console.log(
		`  ${copied} copied, ${kept} kept, template v${next.version}${next.ref ? ` at ${next.ref}` : ""}\n`,
	);
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
		"                      the full pass is .agent-kit/prompts/docs-populate.md",
	);
	console.log(
		"\nThen: agent-kit doctor --strict   (must exit 0 before you call setup done)\n",
	);
	return 0;
}
