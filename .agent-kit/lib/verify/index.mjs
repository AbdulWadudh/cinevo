/** verify/index.mjs — `verify`: run the declared suite, record the evidence, guard the loop */
import path from "node:path";
import { LOOP_LIMIT, PROJECT, TASKS } from "../consts.mjs";
import {
	abs,
	block,
	frontMatter,
	read,
	readIf,
	run,
	sectionRows,
	write,
} from "../io.mjs";
import { activeTasks } from "../taskfile.mjs";
import {
	evidenceDetail,
	hashText,
	loopState,
	mergeEvidence,
	planText,
	productHash,
} from "./evidence.mjs";

export function cmdVerify({ root, baseline, full }) {
	const base = path.resolve(root || process.cwd());
	const declared = sectionRows(readIf(abs(base, PROJECT)) || "");
	const all = declared.filter(([a]) =>
		["build", "typecheck", "lint", "test"].includes(a),
	);
	// A bare `--baseline` still means the full suite; only the caller can ask for a quick one.
	const fullRun = full === undefined ? !!baseline : !!full;
	const runnable = fullRun
		? all
		: all.filter(([, , when]) => when === "always");
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
			: mergeEvidence(
					all.map(([action]) => action),
					before,
					evidence,
				);
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
