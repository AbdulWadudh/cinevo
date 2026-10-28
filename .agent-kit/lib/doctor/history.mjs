/** doctor/history.mjs — completeness and release notes */
import fs from "node:fs";
import path from "node:path";
import { LOG_DIR, TASKS } from "../consts.mjs";
import {
	abs,
	exists,
	expand,
	frontMatter,
	git,
	isDir,
	read,
} from "../io.mjs";
import { CHILD_ID } from "../taskfile.mjs";

export function historyChecks({ base, add }) {
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

	// 7b. a release note is named for its version and says so on the first line, so a note
	// cannot be filed under the wrong tag. A repo that never cuts a release has no folder.
	const releaseDir = abs(base, ".agent-kit/releases");
	const releaseFiles = isDir(releaseDir)
		? fs.readdirSync(releaseDir).filter((f) => f.endsWith(".md"))
		: [];
	const misnamed = releaseFiles.filter((f) => {
		const first = (
			read(path.join(releaseDir, f)).split(/\r?\n/)[0] || ""
		).trim();
		return first !== `# Release ${f.replace(/\.md$/, "")}`;
	});
	add(
		misnamed.length ? "FAIL" : "PASS",
		"release notes",
		misnamed.length
			? `${misnamed.join(", ")} — first line must be "# Release v<version>" matching the filename`
			: releaseFiles.length
				? `${releaseFiles.length} release(s)`
				: "none yet",
	);

	// A note without a tag cannot be installed: `setup --ref` and `pull --ref` clone tags. WARN,
	// because a release is briefly untagged between cutting the note and tagging it.
	if (releaseFiles.length && exists(abs(base, ".git"))) {
		const untagged = releaseFiles
			.map((f) => f.replace(/\.md$/, ""))
			.filter((v) => !git(base, ["tag", "-l", v]));
		add(
			untagged.length ? "WARN" : "PASS",
			"release tags",
			untagged.length
				? `${untagged.join(", ")} has no tag — not installable; run agent-kit release --tag ${untagged[0]}`
				: `${releaseFiles.length} release(s) tagged`,
		);
	}
}
