/** doctor/index.mjs — `doctor`: the fix pass, the check groups, the summary */
import fs from "node:fs";
import path from "node:path";
import { STATE, TEXT_EXT } from "../consts.mjs";
import { abs, expand, json, table } from "../io.mjs";
import { docsChecks } from "./docs.mjs";
import { gitChecks } from "./git.mjs";
import { historyChecks } from "./history.mjs";
import { installChecks } from "./install.mjs";
import { rulesChecks } from "./rules.mjs";
import { structureChecks } from "./structure.mjs";
import { taskChecks } from "./tasks.mjs";

export function cmdDoctor({ root, strict, fix, jsonOut }) {
	const base = path.resolve(root || process.cwd());
	const state = json(abs(base, STATE), {});
	const isTemplate = state.role === "template";
	const rows = [];
	const add = (status, name, detail = "") => rows.push([status, name, detail]);

	// --fix: mechanical repairs only. Anything needing judgement stays a failure.
	const fixed = [];
	if (fix) {
		for (const dir of [".agent-kit", ".github", ".opencode"]) {
			for (const rel of expand(base, dir)) {
				if (!TEXT_EXT.has(path.extname(rel))) continue;
				const p = abs(base, rel);
				const buf = fs.readFileSync(p);
				const s = buf.toString("utf8").replace(/^\uFEFF/, "");
				const t = s
					.replace(/\r\n/g, "\n")
					.replace(/[ \t]+$/gm, "")
					.replace(/\s*$/, "\n");
				if (t !== s) {
					fs.writeFileSync(p, t, "utf8");
					fixed.push(rel);
				}
			}
		}
	}

	const ctx = { base, add, state, isTemplate, strict, fix, fixed };
	structureChecks(ctx);
	gitChecks(ctx);
	installChecks(ctx);
	docsChecks(ctx);
	taskChecks(ctx);
	rulesChecks(ctx);
	historyChecks(ctx);

	const fails = rows.filter((r) => r[0] === "FAIL").length;
	const warns = rows.filter((r) => r[0] === "WARN").length;
	if (jsonOut) {
		console.log(
			JSON.stringify(
				{
					ok: fails === 0,
					strict: !!strict,
					fails,
					warns,
					rows: rows.map(([status, name, detail]) => ({
						status,
						name,
						detail: detail || "",
					})),
				},
				null,
				2,
			),
		);
		return fails === 0 ? 0 : 1;
	}
	console.log(`\nDoctor${strict ? " (strict)" : ""}: ${base}`);
	table(rows);
	console.log(
		`\n${fails === 0 ? "PASS" : "FAIL"} — ${fails} failure(s), ${warns} warning(s)\n`,
	);
	return fails === 0 ? 0 : 1;
}
