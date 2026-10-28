/** doctor/install.mjs — manifest integrity, module coverage, the source ceiling */
import path from "node:path";
import { abs, covers, expand, normGlob, read } from "../io.mjs";
import { manifestOf } from "../manifest.mjs";

export function installChecks({ base, add, state, isTemplate }) {
	if (!isTemplate) {
		const manifest = manifestOf(base) || {
			owned: [],
			machinery: [],
			seeds: {},
		};
		const conflict = manifest.owned.filter(
			(o) =>
				manifest.machinery.some(
					(m) =>
						path.extname(m) === "" &&
						(normGlob(o) === normGlob(m) ||
							normGlob(o).startsWith(`${normGlob(m)}/`)),
				) || Object.keys(manifest.seeds).includes(o),
		);
		// The install surface is `.agent-kit/`, plus the two entry points a harness must find at
		// a fixed root path.
		const outside = [
			...manifest.machinery,
			...Object.keys(manifest.seeds),
			...manifest.owned,
		].filter((p) => {
			const n = normGlob(p);
			return (
				n !== "agents.md" && n !== "claude.md" && !n.startsWith(".agent-kit/")
			);
		});
		add(
			conflict.length || outside.length ? "FAIL" : "PASS",
			"manifest integrity",
			[...conflict, ...outside.map((p) => `${p} outside .agent-kit`)].join(
				", ",
			),
		);
		if (!state.source)
			add("WARN", "provenance", "no .agent-kit/template.json source recorded");
	}

	// Every .mjs the kit ships must be covered by the manifest: a module outside it never reaches
	// an install, where the entry imports it and dies on the first command. The same pass counts
	// lines: a module past the cap has stopped being readable, so it splits by area.
	const machinery = manifestOf(base)?.machinery || [];
	const shipped = expand(base, ".agent-kit").filter((rel) => rel.endsWith(".mjs"));
	const uncovered = shipped.filter(
		(rel) => !machinery.some((m) => covers(m, rel)),
	);
	add(
		uncovered.length ? "FAIL" : "PASS",
		"kit modules covered",
		uncovered.slice(0, 4).join(", "),
	);
	const longFiles = shipped
		.map((rel) => [rel, read(abs(base, rel)).replace(/\n$/, "").split("\n").length])
		.filter(([, n]) => n > 300)
		.map(([rel, n]) => `${rel} ${n}`);
	add(
		longFiles.length ? "FAIL" : "PASS",
		"source ceiling",
		longFiles.slice(0, 4).join(", "),
	);
}
