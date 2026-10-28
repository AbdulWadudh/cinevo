/** selftest/release.mjs — the change log is a folder of dated files */
import fs from "node:fs";
import { LOG_DIR, MANIFEST, STATE } from "../consts.mjs";
import { cmdDoctor } from "../doctor/index.mjs";
import { abs, exists, expand, frontMatter, git, read, run, write } from "../io.mjs";
import { sourceFor } from "../manifest.mjs";
import { cmdRelease } from "../release.mjs";
import { cmdSetup } from "../setup.mjs";
import { cmdCheck } from "../sync.mjs";

export function changeLogScenario(ctx) {
	const { tmp, assert, quiet } = ctx;
	console.log(
		"\n13. the change log is a folder of dated files, not a release ledger",
	);
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
}

export function releaseScenarios(ctx) {
	const { tmp, assert, quiet, doctorRow } = ctx;
	console.log("\n28. a release collects the change files no release claims");
	const card = expand(tmp, LOG_DIR).find(
		(rel) => rel.includes("TASK-101") && rel.endsWith(".md"),
	);
	write(abs(tmp, card), `${read(abs(tmp, card))}\n`);
	git(tmp, ["add", "-A", LOG_DIR]);
	git(tmp, [
		"-c",
		"user.email=t@t",
		"-c",
		"user.name=t",
		"commit",
		"-m",
		"close TASK-101",
	]);
	const sha = (git(tmp, ["rev-parse", "--short", "HEAD"]) || "").trim();
	assert(!!card && sha.length >= 7, "the card is committed before the note is cut");
	const priorRepo = process.env.GITHUB_REPOSITORY;
	process.env.GITHUB_REPOSITORY = "example/fixture";
	const releaseCode = quiet(() =>
		cmdRelease({ root: tmp, version: "v0.1.0" }),
	);
	if (priorRepo === undefined) delete process.env.GITHUB_REPOSITORY;
	else process.env.GITHUB_REPOSITORY = priorRepo;
	assert(releaseCode === 0, "release writes the version file");
	const releaseRel = ".agent-kit/releases/v0.1.0.md";
	assert(
		exists(abs(tmp, releaseRel)),
		".agent-kit/releases/v0.1.0.md exists",
	);
	const releaseText = read(abs(tmp, releaseRel));
	assert(
		releaseText.split(/\r?\n/)[0] === "# Release v0.1.0",
		"the first line names the version",
	);
	assert(
		releaseText.includes("### Changed") &&
			new RegExp(
				`\\*\\*fixture change\\*\\* \\(\\[TASK-101\\]\\(https://github\\.com/example/fixture/blob/v0\\.1\\.0/\\.agent-kit/tasks/archive/[^)]+\\) · ${sha}\\)`,
			).test(releaseText) &&
			releaseText.includes(
				"The fixture changed one file, and the change file says so.",
			) &&
			!releaseText.includes("- fixture change (TASK-101)") &&
			!releaseText.includes("Touched Modules"),
		"the note quotes the card's paragraph under a bold title that links its task and names its commit",
	);
	assert(
		new RegExp(
			`^- \\[TASK-101\\]\\(https://github\\.com/example/fixture/blob/v0\\.1\\.0/\\.agent-kit/tasks/archive/[^)]+\\)$`,
			"m",
		).test(releaseText),
		"the released block links the task to its archived file",
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
}

export function tagScenarios(ctx) {
	const { tmp, assert, captured, quiet, doctorRow, shared, dispatch } = ctx;
	console.log(
		"\n33. an install pins a release tag and ignores unreleased commits",
	);
	const work = abs(shared.junkDir, "tag-src");
	const bare = abs(shared.junkDir, "tag-src.git");
	const t33 = abs(shared.junkDir, "tag-target");
	fs.mkdirSync(work, { recursive: true });
	fs.mkdirSync(t33, { recursive: true });
	write(
		abs(work, MANIFEST),
		`${JSON.stringify({ version: 1, machinery: ["kit.md"], seeds: {}, prune: [], owned: [] }, null, 2)}\n`,
	);
	write(abs(work, "kit.md"), "one\n");
	git(work, ["init", "-q"]);
	git(work, ["add", "."]);
	git(work, ["commit", "-qm", "v1"]);
	git(work, ["tag", "v1.0.0"]);
	run(`git clone --bare -q "${work}" "${bare}"`, shared.junkDir);

	const first = sourceFor(t33, bare);
	assert(
		first.ref === "v1.0.0",
		"a fresh install resolves the newest tag, not the branch",
	);
	quiet(() =>
		cmdSetup({
			target: t33,
			sourceRoot: first.root,
			sourceSpec: bare,
			ref: first.ref,
			noRtk: true,
			home: abs(t33, "no-home"),
			pathEnv: "",
		}),
	);
	const state33 = JSON.parse(read(abs(t33, STATE)));
	assert(
		state33.ref === "v1.0.0" && state33.release === "1.0.0",
		"template.json records the tag and its version",
	);

	// Upstream moves on without a release.
	write(abs(work, "kit.md"), "two\n");
	git(work, ["commit", "-qam", "unreleased"]);
	run(
		`git -C "${work}" push -q "${bare}" HEAD:refs/heads/main --tags`,
		shared.junkDir,
	);
	assert(
		quiet(() =>
			cmdCheck({
				target: t33,
				sourceRoot: sourceFor(t33).root,
				spec: bare,
			}),
		) === 0,
		"an unreleased commit on the branch is not an upgrade",
	);

	// The tag is what makes it installable.
	git(work, ["tag", "v1.0.1"]);
	run(`git -C "${work}" push -q "${bare}" --tags`, shared.junkDir);
	const behind = captured(() =>
		cmdCheck({ target: t33, sourceRoot: sourceFor(t33).root, spec: bare }),
	);
	assert(
		behind.includes("BEHIND") && behind.includes("v1.0.1"),
		"a newer tag is named with the command that moves to it",
	);

	// Through `main`, so a flag the CLI forgets to pass is a failing scenario, not a silent no-op.
	const cwd0 = process.cwd();
	try {
		process.chdir(t33);
		quiet(() => dispatch(["node", "agent-kit", "pull", "--ref", "v1.0.1"]));
	} finally {
		process.chdir(cwd0);
	}
	assert(
		read(abs(t33, "kit.md")).trim() === "two",
		"pull --ref takes the tagged content",
	);
	assert(
		JSON.parse(read(abs(t33, STATE))).release === "1.0.1",
		"the pin moves with the pull",
	);
	assert(
		quiet(() =>
			cmdCheck({ target: t33, sourceRoot: sourceFor(t33).root, spec: bare }),
		) === 0,
		"check is green at the new tag",
	);
	console.log("\n34. a release note without its tag is reported");
	assert(
		exists(abs(tmp, ".agent-kit/releases/v0.1.0.md")),
		"scenario 28 left a release note to check",
	);
	assert(
		doctorRow("release tags").status === "WARN",
		"a note no tag points at warns, because it cannot be installed",
	);
	git(tmp, ["add", ".agent-kit/releases/v0.1.0.md"]);
	git(tmp, ["commit", "-q", "-m", "docs: release v0.1.0"]);
	// Through `main`, so the flag that carries the version is part of what is tested.
	const cwd34 = process.cwd();
	try {
		process.chdir(tmp);
		quiet(() =>
			dispatch(["node", "agent-kit", "release", "--tag", "v0.1.0"]),
		);
	} finally {
		process.chdir(cwd34);
	}
	assert(
		git(tmp, ["tag", "-l", "v0.1.0"]) === "v0.1.0",
		"release --tag makes the tag through the CLI",
	);
	assert(
		(git(tmp, ["tag", "-l", "-n99", "v0.1.0"]) || "").includes(
			"Release v0.1.0",
		),
		"the tag message keeps the note's heading, not just its body",
	);
	assert(
		doctorRow("release tags").status === "PASS",
		"the tag clears the row, so it can fail and can pass",
	);
	git(tmp, ["tag", "-d", "v0.1.0"]);
	assert(
		frontMatter('---\nsummary: "a \\"b\\" c"\n---\n').summary === 'a "b" c',
		"a quoted summary loses its YAML escapes, so a release note reads clean",
	);
}
