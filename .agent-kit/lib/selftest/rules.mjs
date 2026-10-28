/** selftest/rules.mjs — vague advice is not a rule; --fix repairs encoding only */
import fs from "node:fs";
import { SCRIPT_ROOT, TASKS } from "../consts.mjs";
import { cmdDoctor } from "../doctor/index.mjs";
import { abs, exists, expand, read, write } from "../io.mjs";
import { cmdLearningsArchive } from "../learnings.mjs";

export function rulesScenarios(ctx) {
	const { tmp, assert, quiet } = ctx;
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
		`\uFEFF${read(docP).replace(/\r\n/g, "\n").replace(/\n/g, "\r\n")}`,
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
}

export function learningsScenario(ctx) {
	const { tmp, assert, quiet } = ctx;
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
	const archivedFiles = expand(tmp, ".agent-kit/learnings/archive").filter(
		(r) => r.endsWith(".md"),
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
}

export function routerScenarios(ctx) {
	const { tmp, assert, doctorRow } = ctx;
	console.log("\n20. the rules router and the folder agree");
	// Scenario 16 leaves a red doctor on purpose, so assert the row, not the exit code.
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
	backlog(["| `B-01` | `later` | retry the upload | `src/index.ts:1` |  |"]);
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
	write(
		backlogP,
		read(abs(SCRIPT_ROOT, ".agent-kit/templates/backlog.seed.md")),
	);
}
