/** setup.mjs — `setup`: scaffold a target repo */
import fs from "node:fs";
import path from "node:path";
import { MANIFEST, PROJECT, SCRIPT_ROOT, STATE, TASKS } from "./consts.mjs";
import {
	detectHarnesses,
	ensureRtk,
	harnessLines,
	prerequisites,
	rtkVersion,
	writeSkillPointers,
} from "./env.mjs";
import { repoInfo } from "./github.mjs";
import {
	abs,
	copy,
	die,
	exists,
	expand,
	git,
	hashFile,
	json,
	readIf,
	table,
	write,
} from "./io.mjs";
import { isRemote, manifestOf, SEMVER } from "./manifest.mjs";
import { detectStack, projectMd, tasksSection } from "./project.mjs";
import { activeTasks, ID_MODES, idsMode } from "./taskfile.mjs";

const IDS_ROW = /^\|\s*ids\s*\|.*$/m;

export function cmdSetup({
	target,
	sourceRoot,
	sourceSpec,
	ref,
	noRtk,
	ids,
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

	const mode = resolveIds(root, ids);
	const opts = {
		root,
		src,
		manifest,
		sourceSpec,
		ref,
		noRtk,
		mode,
		home,
		pathEnv,
		selfAdopt,
	};
	// Local mode is fully offline: setup never reaches for the network unless ids come from it.
	if (mode !== "issue") return install(opts);
	return requireIssueAccess(root).then((repo) => install({ ...opts, repo }));
}

/**
 * The id mode is per repo and recorded in project.md. Switching it while work is open is
 * refused: those ids were minted under the old rule, and the other rule cannot reproduce them.
 */
function resolveIds(root, requested) {
	const current = idsMode(root) || "local";
	if (!requested) return current;
	const wanted = String(requested).trim().toLowerCase();
	if (!ID_MODES.has(wanted))
		die(`--ids must be local or issue, not ${requested}`);
	if (wanted === current) return current;
	const open = activeTasks(root).filter((t) => t.fm.status !== "DONE");
	if (open.length)
		die(
			`${open.length} task(s) are open under ids: ${current} (${open.map((t) => t.fm.id).join(", ")}) — close them before switching to ${wanted}`,
		);
	return wanted;
}

/**
 * Issue mode is checked once, eagerly, before anything is written: a credential, a repo, and
 * Issues enabled. Write access is proven by the first `task new`, which mints the issue before
 * it writes the file — a refusal there leaves no half-open task.
 */
async function requireIssueAccess(root) {
	const rows = prerequisites(root, { issue: true });
	const missing = rows.filter((p) => !p.ok);
	if (missing.length)
		die(
			`ids: issue needs:\n  ${missing.map((p) => `${p.name} — ${p.fix}`).join("\n  ")}`,
		);
	let repo;
	try {
		repo = await repoInfo(root);
	} catch (e) {
		die(`ids: issue — ${e.message}`);
	}
	if (repo.has_issues === false)
		die(
			`issues are disabled on ${repo.full_name || "this repository"} — enable them, or setup --ids local`,
		);
	const access = rows.find((p) => p.name === "GitHub access");
	return { ...repo, credential: access ? access.found.replace(/^via /, "") : "" };
}

/** Record the mode where `idsMode` reads it, without touching the rest of an authored file. */
function writeIdsMode(root, mode) {
	const file = abs(root, PROJECT);
	const text = readIf(file);
	if (text === null) return;
	if (IDS_ROW.test(text)) {
		const next = text.replace(IDS_ROW, `| ids | ${mode} |`);
		if (next !== text) write(file, next);
		return;
	}
	const section = tasksSection(mode);
	const footer = text.search(/^---\r?\n\r?\nGenerated /m);
	write(
		file,
		footer >= 0
			? `${text.slice(0, footer)}${section}\n${text.slice(footer)}`
			: `${text.trimEnd()}\n\n${section}`,
	);
}

function install({
	root,
	src,
	manifest,
	sourceSpec,
	ref,
	noRtk,
	mode,
	home,
	pathEnv,
	selfAdopt,
	repo,
}) {
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
		write(abs(root, PROJECT), projectMd(detectStack(root), today, mode));
		rows.push(["COPIED", PROJECT, "generated from the manifests"]);
	} else {
		kept++;
	}
	writeIdsMode(root, mode);

	const rtk = noRtk
		? ["SKIPPED", "rtk", "--no-rtk: setup did not install it"]
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
		`  ${copied} copied, ${kept} kept, template v${next.version}${next.ref ? ` at ${next.ref}` : ""}, ids: ${mode}\n`,
	);
	if (rows.length) table(rows);
	console.log(
		mode === "issue"
			? `\n  Task ids come from ${repo.full_name || "the GitHub issues"}${repo.credential ? ` (credential: ${repo.credential})` : ""}:` +
				"\n  `task new` mints the issue, `task publish` sends the approved plan,\n  `task close --sync` closes it with the final record."
			: "\n  Task ids are allocated here: the next number after the highest one on disk.\n  `setup --ids issue` switches to issue numbers (no task may be open).",
	);

	// Mandatory, so setup cannot call itself done without it: the loop's shell output goes
	// through rtk, and doctor's `prerequisites` row fails while it is absent.
	if (!rtkVersion(root)) {
		console.error(
			`\nagent-kit: rtk is a prerequisite — ${noRtk ? "--no-rtk skipped the install" : "the automatic install did not land"}.\n` +
				"  winget install --id rtk-ai.rtk -e   (or: brew install rtk)\n" +
				"  It must answer `rtk gain`; then re-run setup.\n",
		);
		return 1;
	}

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
		"  2. .agent-kit/project.md   confirm the detected commands and the `ids` row; add what the code cannot say",
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
