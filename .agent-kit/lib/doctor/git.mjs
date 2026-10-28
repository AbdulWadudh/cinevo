/** doctor/git.mjs — hooks and commit identity */
import { abs, exists, git } from "../io.mjs";

export function gitChecks({ base, add }) {
	if (exists(abs(base, ".git"))) {
		const wired =
			git(base, ["config", "core.hooksPath"]) === ".agent-kit/githooks";
		add(
			wired ? "PASS" : "WARN",
			"commit guard",
			wired
				? "wired to .agent-kit/githooks (scope + message)"
				: "optional: git config core.hooksPath .agent-kit/githooks (task close checks anyway)",
		);

		// Windows ignores the execute bit; a clone on Linux or macOS does not, and git skips a
		// hook it cannot execute. Read the mode from the index, not the filesystem.
		const hookFiles = [
			".agent-kit/githooks/pre-commit",
			".agent-kit/githooks/commit-msg",
		];
		const notExec = hookFiles.filter((rel) => {
			const entry = (git(base, ["ls-files", "-s", "--", rel]) || "").trim();
			return entry && !entry.startsWith("100755");
		});
		add(
			notExec.length ? (wired ? "FAIL" : "WARN") : "PASS",
			"hook mode",
			notExec.length
				? `${notExec.join(", ")} — git update-index --chmod=+x ${notExec.join(" ")}`
				: "",
		);

		// Commits belong to the owner: no session identity, no AI trailer. A second human
		// author is a WARN, not a FAIL — only the trailer is never acceptable.
		const history = git(base, ["log", "--format=%an <%ae>%x00%B%x1e"]) || "";
		const commits = history
			.split("\x1e")
			.filter((c) => c.trim())
			.map((c) => {
				const [who, ...rest] = c.split("\x00");
				return { who: who.trim(), body: rest.join("\x00") };
			});
		const attributed = commits.filter((c) =>
			/(^|\n)co-authored-by:[ \t]*\S|(^|\n)generated with |noreply@anthropic\.com|🤖/i.test(
				c.body,
			),
		);
		const identity = git(base, ["config", "user.email"]);
		const foreign = identity
			? [...new Set(commits.map((c) => c.who))].filter(
					(w) => !w.toLowerCase().includes(identity.toLowerCase()),
				)
			: [];
		add(
			attributed.length ? "FAIL" : foreign.length ? "WARN" : "PASS",
			"commit identity",
			attributed.length
				? `${attributed.length} commit(s) carry AI attribution`
				: foreign.length
					? `not ${identity}: ${foreign.join(", ")}`
					: identity || "no identity configured",
		);
	}
}
