/** sync.mjs — `check` and `pull`: drift and update */
import fs from "node:fs";
import path from "node:path";
import { MANIFEST, STATE } from "./consts.mjs";
import { cmdDoctor } from "./doctor/index.mjs";
import {
	abs,
	copy,
	die,
	exists,
	expand,
	git,
	hashFile,
	json,
	read,
	readIf,
	run,
	table,
	write,
} from "./io.mjs";
import {
	isRemote,
	manifestOf,
	SEMVER,
	semverCmp,
	tagList,
} from "./manifest.mjs";

export function computeSync(targetRoot, sourceRoot) {
	const manifest = manifestOf(sourceRoot);
	if (!manifest) die(`no ${MANIFEST} in ${sourceRoot}`);
	const state = json(abs(targetRoot, STATE), {}) || {
		machinery: {},
		seeds: {},
	};
	const rows = [];

	for (const entry of manifest.machinery) {
		for (const rel of expand(sourceRoot, entry)) {
			const src = hashFile(abs(sourceRoot, rel));
			const tgt = hashFile(abs(targetRoot, rel));
			const base = state.machinery?.[rel];
			let status;
			if (tgt === null) status = "MISSING";
			else if (tgt === src) status = "CURRENT";
			else if (base && tgt === base) status = "UPGRADE";
			else status = "DRIFT";
			rows.push({ status, rel, src, tgt, base, entry });
		}
	}

	for (const [dest, seed] of Object.entries(manifest.seeds)) {
		const srcSeed = hashFile(abs(sourceRoot, seed));
		const tgt = hashFile(abs(targetRoot, dest));
		const base = state.seeds?.[dest];
		let status;
		if (tgt === null) status = "MISSING";
		// No recorded base means this destination is new to the kit (or predates the seed):
		// treat it as an upstream update so `pull --seeds` can install it explicitly.
		else if (srcSeed && srcSeed !== base) status = "SEED-UPDATED";
		else status = "CURRENT";
		rows.push({ status, rel: dest, seed, src: srcSeed, tgt, base });
	}

	for (const rel of manifest.prune) {
		if (exists(abs(targetRoot, rel))) rows.push({ status: "PRUNE", rel });
	}

	const version = manifest.version || 1;
	const mine = state.version || 0;
	rows.push({
		status: mine === version ? "CURRENT" : mine > version ? "AHEAD" : "BEHIND",
		rel: "template version",
		detail: `installed v${mine}, template v${version}`,
	});

	return { manifest, state, rows };
}

/**
 * The version row `check` adds: an install follows a tag, and "newer release exists" is a
 * different question from "a file changed". A working-tree source has no tags, so no row.
 */
export function releaseRow(state, latest) {
	if (!state.ref || !state.release) {
		return {
			status: "UNPINNED",
			rel: "release",
			detail: `tracks a branch - pull pins to ${latest}`,
		};
	}
	const cmp = semverCmp(state.release, latest);
	return {
		status: cmp < 0 ? "BEHIND" : cmp > 0 ? "AHEAD" : "CURRENT",
		rel: "release",
		detail:
			cmp < 0
				? `v${state.release} (${state.commit || "?"}) -> ${latest} - pull --ref ${latest}`
				: cmp > 0
					? `v${state.release} is ahead of every tag (${latest})`
					: `v${state.release} (${state.commit || "?"})`,
	};
}

export function cmdCheck({ target, sourceRoot, spec, jsonOut }) {
	const root = path.resolve(target || process.cwd());
	if (!sourceRoot) {
		console.log(
			'Not set up: no .agent-kit/template.json source recorded. Run "agent-kit setup . --source <path|url>".',
		);
		return 0;
	}
	if (root === path.resolve(sourceRoot)) {
		console.log("This is the template itself: nothing to compare.");
		return 0;
	}
	const { rows } = computeSync(root, sourceRoot);
	const state = json(abs(root, STATE), {});
	const specOf = spec || state.source || "";
	if (isRemote(specOf)) {
		const latest = tagList(root, specOf)[0];
		if (latest) rows.push(releaseRow(state, latest));
	}
	const bad = rows.filter((r) => !["CURRENT"].includes(r.status));
	if (jsonOut) {
		console.log(
			JSON.stringify(
				{
					ok: bad.length === 0,
					root,
					rows: rows.map(({ status, rel, detail }) => ({
						status,
						rel,
						detail: detail || "",
					})),
				},
				null,
				2,
			),
		);
		return bad.length === 0 ? 0 : 1;
	}
	console.log(`\nDrift check: ${root}`);
	table(rows.map((r) => [r.status, r.rel, r.detail || ""]));
	console.log(
		bad.length === 0
			? "\nIN SYNC\n"
			: `\n${bad.length} item(s) need attention. Run "agent-kit pull" (never writes over DRIFT without --force).\n`,
	);
	return bad.length === 0 ? 0 : 1;
}

export function cmdPull({
	target,
	sourceRoot,
	spec,
	ref,
	force,
	seeds,
	dryRun,
}) {
	const root = path.resolve(target || process.cwd());
	if (!sourceRoot)
		die(
			"not set up: no provenance in .agent-kit/template.json. Run setup --source <path|url> first.",
		);
	const { manifest, state, rows } = computeSync(root, sourceRoot);
	if (rows.some((r) => r.status === "AHEAD"))
		die(
			"installed version is ahead of the template; refusing to rewind (reconcile by hand)",
		);

	if (dryRun) {
		const planned = rows.filter((r) =>
			["UPGRADE", "MISSING", "DRIFT", "PRUNE", "SEED-UPDATED"].includes(
				r.status,
			),
		);
		console.log(
			`\nDry run: ${planned.length} row(s) would change. Nothing was written.\n`,
		);
		for (const r of planned) {
			const skip =
				r.status === "DRIFT" && !force
					? " (skipped: locally modified, needs --force)"
					: "";
			const skipSeed =
				r.status === "SEED-UPDATED" && !seeds
					? " (skipped: needs --seeds)"
					: "";
			console.log(`${r.status.padEnd(12)} ${r.rel}${skip}${skipSeed}`);
			if (r.status === "PRUNE") continue;
			const from = abs(sourceRoot, r.seed || r.rel);
			const to = abs(root, r.rel);
			if (!exists(to)) {
				console.log(
					`             would create, ${readIf(from) === null ? "no source" : `${read(from).split(/\r?\n/).length} lines`}`,
				);
				continue;
			}
			const d = run(
				`git --no-pager diff --no-index --unified=1 -- "${to}" "${from}"`,
				root,
			);
			const lines = d.out.trim().split(/\r?\n/).filter(Boolean);
			console.log(
				lines.length
					? lines
							.slice(0, 24)
							.map((l) => `             ${l}`)
							.join("\n")
					: "             would change (binary or no textual diff)",
			);
		}
		console.log("");
		return 0;
	}

	const applied = [];
	for (const r of rows) {
		if (r.status === "DRIFT" && !force) continue;
		if (
			r.status === "UPGRADE" ||
			(r.status === "DRIFT" && force) ||
			r.status === "MISSING"
		) {
			if (r.rel === "template version") continue;
			copy(abs(sourceRoot, r.seed || r.rel), abs(root, r.rel));
			applied.push(["WROTE", r.rel, ""]);
			continue;
		}
		if (r.status === "PRUNE") {
			fs.rmSync(abs(root, r.rel), { recursive: true, force: true });
			applied.push(["PRUNED", r.rel, ""]);
			continue;
		}
		if (r.status === "SEED-UPDATED" && seeds) {
			copy(abs(sourceRoot, r.seed), abs(root, r.rel));
			applied.push([
				"REPLACED SEED",
				r.rel,
				"your authored copy was overwritten (--seeds)",
			]);
		}
	}

	const specOf = spec || state.source || "";
	const pin = isRemote(specOf) ? ref || state.ref || "" : "";
	const next = {
		role: "target",
		source: state.source || sourceRoot,
		ref: pin,
		release: SEMVER.test(pin) ? pin.replace(/^v/i, "") : state.release || "",
		commit: pin ? git(sourceRoot, ["rev-parse", "--short", "HEAD"]) || "" : "",
		version: manifest.version || 1,
		installed_at: state.installed_at || new Date().toISOString().slice(0, 10),
		last_pull: new Date().toISOString().slice(0, 10),
		machinery: {},
		seeds: {},
	};
	for (const entry of manifest.machinery) {
		for (const rel of expand(sourceRoot, entry)) {
			const h = hashFile(abs(root, rel));
			if (h) next.machinery[rel] = h;
		}
	}
	for (const [dest, seed] of Object.entries(manifest.seeds)) {
		const h = hashFile(abs(sourceRoot, seed));
		if (h) next.seeds[dest] = h;
	}
	write(abs(root, STATE), `${JSON.stringify(next, null, 2)}\n`);

	console.log(`\nPull v${next.version}: ${applied.length} change(s)`);
	if (pin)
		console.log(
			`Pinned ${pin}${state.ref ? (state.ref === pin ? " (unchanged)" : ` (was ${state.ref})`) : " (was tracking a branch)"}`,
		);
	if (applied.length) table(applied);
	const skipped = rows.filter((r) => r.status === "DRIFT" && !force);
	if (skipped.length) {
		console.log("\nLeft alone (locally modified, use --force to overwrite):");
		for (const r of skipped) console.log(`  ${r.rel}`);
	}
	const seedDrift = rows.filter((r) => r.status === "SEED-UPDATED" && !seeds);
	if (seedDrift.length) {
		console.log("\nUpstream seed changed since install (your copy was kept):");
		for (const r of seedDrift) console.log(`  ${r.rel}  <- ${r.seed}`);
	}
	console.log("");
	return cmdDoctor({ root, strict: false });
}
