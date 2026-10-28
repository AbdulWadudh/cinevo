/** selftest/index.mjs — `selftest`: one fixture, the gate scenarios, one summary */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { TASKS } from "../consts.mjs";
import { cmdDoctor } from "../doctor/index.mjs";
import { abs, read, write } from "../io.mjs";
import { installScenarios, copyScenario, syncScenarios } from "./install.mjs";
import { scopeScenarios, redRunScenario } from "./tasks.mjs";
import { rulesScenarios, learningsScenario, routerScenarios } from "./rules.mjs";
import { changeLogScenario, releaseScenarios, tagScenarios } from "./release.mjs";
import { inventoryScenario, blockScenarios, collisionScenario } from "./state.mjs";
import { pointersScenario, identityScenario, machineScenarios, setupPointerScenario, hookScenario, budgetScenario } from "./surface.mjs";
import { loopScenarios } from "./loop.mjs";
import { familyScenarios } from "./family.mjs";

export function cmdSelftest(dispatch) {
	const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "agent-kit-test-"));
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
			files.find((f) => /^status: IN_PROGRESS$/m.test(read(abs(dir, f)))) ||
				files[0],
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
	const doctorRow = (name) =>
		JSON.parse(captured(() => cmdDoctor({ root: tmp, jsonOut: true }))).rows.find(
			(r) => r.name === name,
		);
	const ctx = {
		tmp,
		dispatch,
		assert,
		captured,
		quiet,
		fillTask,
		spoken,
		doctorRow,
		shared: {},
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

		installScenarios(ctx);
		scopeScenarios(ctx);
		copyScenario(ctx);
		rulesScenarios(ctx);
		redRunScenario(ctx);
		syncScenarios(ctx);
		changeLogScenario(ctx);
		inventoryScenario(ctx);
		pointersScenario(ctx);
		identityScenario(ctx);
		learningsScenario(ctx);
		machineScenarios(ctx);
		routerScenarios(ctx);
		loopScenarios(ctx);
		blockScenarios(ctx);
		familyScenarios(ctx);
		releaseScenarios(ctx);
		collisionScenario(ctx);
		setupPointerScenario(ctx);
		hookScenario(ctx);
		budgetScenario(ctx);
		tagScenarios(ctx);
	} finally {
		fs.rmSync(tmp, { recursive: true, force: true });
		if (ctx.shared.junkDir)
			fs.rmSync(ctx.shared.junkDir, { recursive: true, force: true });
	}

	console.log(
		failures.length
			? `\nSELFTEST FAILED (${failures.length})\n`
			: "\nSELFTEST PASSED\n",
	);
	return failures.length ? 1 : 0;
}
