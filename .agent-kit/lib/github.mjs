/** github.mjs — the one REST path: credential, repo slug, issue calls */
import { git, run } from "./io.mjs";

/**
 * Credential order the owner set (2026-10-28): `gh` is preferred because it handles login,
 * refresh and revoke; an environment token is the fallback for machines and CI that cannot
 * install it. The token is returned, never printed: callers only ever see `source`.
 */
export function credential(root) {
	const gh = run("gh auth token", root, 20000);
	const token = gh.code === 0 ? gh.out.trim() : "";
	if (token && !/\s/.test(token)) return { token, source: "gh" };
	for (const name of ["GH_TOKEN", "GITHUB_TOKEN"])
		if (process.env[name]) return { token: process.env[name], source: name };
	return null;
}

/** `owner/repo` from `origin`, or CI's `GITHUB_REPOSITORY`. */
export function repoSlug(root) {
	const raw =
		git(root, ["remote", "get-url", "origin"]) ||
		process.env.GITHUB_REPOSITORY ||
		"";
	const path = raw
		.replace(/\.git$/, "")
		.replace(/^[a-z+]+:\/\//i, "")
		.replace(/^[^@/]*@/, "")
		.replace(/:/g, "/");
	const seg = path.split("/").filter(Boolean);
	return seg.length >= 2 ? `${seg.at(-2)}/${seg.at(-1)}` : null;
}

/** GHES sets its own base; the selftest stubs the same variable. */
export function apiBase() {
	return (process.env.GITHUB_API_URL || "https://api.github.com").replace(
		/\/+$/,
		"",
	);
}

function explain(status, text, path) {
	let detail = text.slice(0, 200);
	try {
		detail = JSON.parse(text).message || detail;
	} catch {
		// Not JSON: the body itself is the detail, already truncated.
	}
	const fix =
		status === 401 || status === 403
			? " — run `gh auth login` (recommended), or set GH_TOKEN to a fine-grained token with Issues read/write"
			: status === 404
				? " — check the repo name and that Issues is enabled (Settings > General)"
				: "";
	return `GitHub ${status} on ${path}: ${detail || "no message"}${fix}`;
}

/**
 * One request path for every call. It throws rather than exiting: `close --sync` runs after the
 * local close is already written, and must not take the process down with it.
 */
export async function api(root, path, { method = "GET", body } = {}) {
	if (typeof fetch !== "function")
		throw new Error("this runtime has no built-in fetch — Node 18+ or Bun is required");
	const cred = credential(root);
	if (!cred)
		throw new Error(
			"no GitHub credential — run `gh auth login` (recommended), or set GH_TOKEN",
		);
	const repo = repoSlug(root);
	if (!repo)
		throw new Error(
			"no GitHub remote — git remote add origin https://github.com/<owner>/<repo>",
		);
	const url = `${apiBase()}/repos/${repo}${path}`;
	const res = await fetch(url, {
		method,
		headers: {
			Authorization: `Bearer ${cred.token}`,
			Accept: "application/vnd.github+json",
			"X-GitHub-Api-Version": "2022-11-28",
			...(body ? { "Content-Type": "application/json" } : {}),
		},
		body: body ? JSON.stringify(body) : undefined,
		signal: AbortSignal.timeout(20000),
	});
	const text = await res.text();
	if (!res.ok) throw new Error(explain(res.status, text, path));
	return text ? JSON.parse(text) : {};
}

export const repoInfo = (root) => api(root, "");

/** Every issue, open or closed: `migrate` reads it as the record of which tasks already have one. */
export async function listIssues(root) {
	const all = [];
	for (let page = 1; ; page++) {
		const rows = await api(
			root,
			`/issues?state=all&per_page=100&page=${page}`,
		);
		if (!Array.isArray(rows) || rows.length === 0) return all;
		all.push(...rows);
		if (rows.length < 100) return all;
	}
}

export const mintIssue = (root, body) =>
	api(root, "/issues", { method: "POST", body });
export const fetchIssue = (root, n) => api(root, `/issues/${n}`);
export const patchIssue = (root, n, body) =>
	api(root, `/issues/${n}`, { method: "PATCH", body });
export const commentIssue = (root, n, body) =>
	api(root, `/issues/${n}/comments`, { method: "POST", body: { body } });
