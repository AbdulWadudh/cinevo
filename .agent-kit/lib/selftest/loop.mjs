/** selftest/loop.mjs — the loop guard, the milestone tier and stale evidence */
import { PROJECT } from "../consts.mjs";
import { abs, git, read, write } from "../io.mjs";
import {
	cmdStart,
	cmdTaskClose,
	cmdTaskNew,
	cmdTaskShow,
} from "../tasks/index.mjs";
import { cmdVerify } from "../verify/index.mjs";

export function loopScenarios(ctx) {
	const { tmp, assert, captured, quiet, fillTask, spoken, doctorRow } = ctx;
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
		counts.push(loopOf()?.n);
	}
	assert(
		counts.join(",") === "1,2,3",
		"the attempt count climbs while nothing changes",
	);
	assert(
		captured(() => cmdTaskShow({ root: tmp })).includes("Loop: 3/3"),
		"task show reports the loop state",
	);
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
	console.log(
		"\n23. the milestone tier keeps the slow build out of the inner loop",
	);
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
	fillTask(["src/stale.txt"], "prove stale evidence");
	write(abs(tmp, "src/stale.txt"), "one\n");
	assert(quiet(() => cmdVerify({ root: tmp })) === 0, "the first run is green");
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
}
