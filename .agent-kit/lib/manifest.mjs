/** manifest.mjs — sync manifest, source resolution and release tags */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { MANIFEST, STATE } from "./consts.mjs";
import { abs, die, isDir, json, run } from "./io.mjs";

// ---------------------------------------------------------------- manifest

export function manifestOf(root) {
	const m = json(abs(root, MANIFEST));
	if (!m) return null;
	m.machinery = m.machinery || [];
	m.seeds = m.seeds || {};
	m.prune = m.prune || [];
	m.owned = m.owned || [];
	return m;
}

export function sourceFor(root, override, refOverride) {
	const state = json(abs(root, STATE));
	const spec = override || state?.source;
	if (!spec) return null;
	// A pinned install compares against the tag it chose; a fresh or unpinned one takes the
	// newest release, so an install never lands on unreleased commits by default.
	const ref = isRemote(spec)
		? refOverride ||
			(!override ? state?.ref : null) ||
			tagList(root, spec)[0] ||
			null
		: null;
	return resolveSpec(root, spec, ref);
}

/** A spec git can clone. A plain path is a working tree, where HEAD is the truth. */
export function isRemote(spec) {
	return (
		/^(https?:\/\/|git@|ssh:\/\/|file:\/\/)/.test(spec) || spec.endsWith(".git")
	);
}

export const SEMVER = /^v?(\d+)\.(\d+)\.(\d+)$/;

export function semverCmp(a, b) {
	const x = String(a).match(SEMVER);
	const y = String(b).match(SEMVER);
	if (!x || !y) return 0;
	for (let i = 1; i <= 3; i++) if (+x[i] !== +y[i]) return +x[i] - +y[i];
	return 0;
}

/** The release tags a source exposes, newest first. Empty means it has no releases yet. */
export function tagList(root, spec) {
	const r = isRemote(spec)
		? run(`git ls-remote --tags --refs "${spec}"`, root)
		: run(`git -C "${path.resolve(root, spec)}" tag --list`, root);
	if (r.code !== 0) return [];
	return [
		...new Set(
			r.out
				.split(/\r?\n/)
				.map((l) => l.trim().split(/\s+/).pop().split("/").pop())
				.filter((t) => SEMVER.test(t)),
		),
	].sort((a, b) => semverCmp(b, a));
}

export function resolveSpec(root, spec, ref) {
	if (!isRemote(spec)) {
		const p = path.resolve(root, spec);
		if (!isDir(p)) die(`source not found: ${p}`);
		return { root: p, spec, ref: null, temp: false };
	}
	const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "agent-kit-"));
	const pin = ref ? ` --branch "${ref}"` : "";
	const r = run(`git clone --depth 1${pin} "${spec}" "${tmp}"`, root);
	if (r.code !== 0) die(`git clone failed for ${spec}\n${r.out}`);
	return { root: tmp, spec, ref: ref || null, temp: true };
}
