/** selftest/issue.mjs — ids from GitHub: the mint, the import, the publish and the sync */
import { abs, exists, read, write } from "../io.mjs";
import { cmdTaskClose, cmdTaskNew, cmdTaskPublish } from "../tasks/index.mjs";
import { activeTasks, idsMode } from "../taskfile.mjs";
import { cli, fixture, row, stubFetch } from "./ids.mjs";

export async function issueIdScenarios(ctx) {
	const { assert } = ctx;
	console.log(
		"\n36. issue ids: the number comes from GitHub, and nothing else does",
	);
	let number = 501;
	let fail = false;
	const spy = stubFetch((call) => {
		if (fail) return { status: 401, body: { message: "Bad credentials" } };
		const slug = call.url.replace(/^https:\/\/[^/]+/, "");
		const repo = "/repos/selftest/fixture";
		if (call.method === "GET" && slug === repo)
			return {
				status: 200,
				body: { full_name: "selftest/fixture", has_issues: true },
			};
		if (call.method === "POST" && slug === `${repo}/issues`)
			return { status: 201, body: { number: number++ } };
		if (call.method === "GET" && slug === `${repo}/issues/131`)
			return {
				status: 200,
				body: {
					number: 131,
					title: "Import me",
					body: "A collaborator opened this.\n\nMore detail below.",
				},
			};
		if (call.method === "PATCH" && slug.startsWith(`${repo}/issues/`))
			return { status: 200, body: { number: Number(slug.split("/").at(-1)) } };
		if (call.method === "POST" && slug.endsWith("/comments"))
			return { status: 201, body: { id: 1 } };
		return { status: 404, body: { message: `unexpected call ${slug}` } };
	});
	const saved = {
		url: process.env.GITHUB_API_URL,
		token: process.env.GH_TOKEN,
	};
	process.env.GITHUB_API_URL = "https://api.selftest";
	process.env.GH_TOKEN = "selftest-token";
	try {
		const { dir, code } = await fixture(ctx, "ids-issue", { ids: "issue" });
		assert(code === 0, "setup exits 0 in issue mode");
		assert(idsMode(dir) === "issue", "setup records ids: issue");
		assert(
			spy.calls.some(
				(c) => c.method === "GET" && c.url.endsWith("/repos/selftest/fixture"),
			),
			"setup validates the repo once, before it writes",
		);

		fail = true;
		const refused = await ctx.spokenAsync(() =>
			cmdTaskNew({
				root: dir,
				slug: "nope",
				lane: "quick",
				noBaseline: true,
				summary: "a refused mint",
			}),
		);
		assert(refused.code === 1, "a refused mint returns 1");
		assert(
			refused.out.includes("401") &&
				!refused.out.includes("selftest-token"),
			"the failure is reported and the token is not",
		);
		assert(
			activeTasks(dir).length === 0,
			"a refused mint writes no task file",
		);
		fail = false;

		const postCount = () => spy.calls.filter((c) => c.method === "POST").length;
		const posts = postCount();
		const missing = await ctx.spokenAsync(() =>
			cmdTaskNew({ root: dir, slug: "no-title", lane: "quick", noBaseline: true }),
		);
		assert(
			missing.code === 1 &&
				missing.out.includes("--summary") &&
				postCount() === posts &&
				activeTasks(dir).length === 0,
			"a mint without --summary refuses before any request",
		);

		assert(
			(await ctx.quietAsync(() =>
				cmdTaskNew({
					root: dir,
					slug: "issue-task",
					lane: "quick",
					noBaseline: true,
					summary: "Detail layouts overlap at 1024px",
					intent:
						"At 1024px the detail column overlaps the sidebar; keep the two apart.",
				}),
			)) === 0,
			"task new mints the issue",
		);
		const minted = activeTasks(dir)[0];
		assert(minted.fm.id === "TASK-501", "the issue number is the task id");
		const mintCall = spy.calls
			.filter(
				(c) =>
					c.method === "POST" &&
					c.body &&
					typeof c.body === "object" &&
					"title" in c.body,
			)
			.at(-1);
		assert(
			mintCall?.body?.title === "Detail layouts overlap at 1024px" &&
				mintCall.body.body ===
					"At 1024px the detail column overlaps the sidebar; keep the two apart." &&
				!/agent-kit/.test(mintCall.body.body),
			"the mint is titled by the summary and described by the intent",
		);
		assert(
			minted.fm.summary === "Detail layouts overlap at 1024px" &&
				minted.text.includes("the detail column overlaps the sidebar"),
			"the same summary and intent land in the task file",
		);

		assert(
			(await ctx.quietAsync(() =>
				cmdTaskNew({
					root: dir,
					slug: "from-issue",
					from: "131",
					lane: "quick",
					noBaseline: true,
					force: true,
				}),
			)) === 0,
			"task new --from imports an issue a collaborator opened",
		);
		const imported = activeTasks(dir).find((t) => t.fm.id === "TASK-131");
		assert(!!imported, "the issue number is the id, not a second number");
		assert(
			imported.text.includes("A collaborator opened this."),
			"the issue's first paragraph seeds the intent",
		);

		write(
			minted.path,
			read(minted.path).replace(
				/^summary: .*$/m,
				'summary: "Overlap fixed at 1024px"',
			),
		);
		assert(
			(await ctx.quietAsync(() =>
				cmdTaskPublish({ root: dir, id: "TASK-501" }),
			)) === 0,
			"task publish sends the task file",
		);
		const published = spy.calls
			.filter((c) => c.method === "PATCH" && c.url.endsWith("/issues/501"))
			.at(-1);
		assert(
			published?.body?.title === "Overlap fixed at 1024px" &&
				published.body.body.includes("Published from") &&
				!published.body.body.includes("touches:"),
			"the plan and the sharpened title travel; the front matter stays in the repo",
		);

		// The sync runs after the local close is written: a failure reports, and the close stands.
		write(
			minted.path,
			read(minted.path)
				.replace(/touches: \[\]/, 'touches: ["src/index.ts"]')
				.replace(
					/^summary: .*$/m,
					'summary: "prove a failed sync keeps the close"',
				)
				.replace(/<!--\s*FILL:[\s\S]*?-->/g, "filled by selftest"),
		);
		fail = true;
		assert(
			(await ctx.quietAsync(() =>
				cmdTaskClose({ root: dir, id: "TASK-501", sync: true }),
			)) === 1,
			"a failed sync reports 1",
		);
		assert(
			!activeTasks(dir).some((t) => t.fm.id === "TASK-501"),
			"the local close stands when the sync fails",
		);
		fail = false;

		write(
			imported.path,
			read(imported.path)
				.replace(/touches: \[\]/, 'touches: ["src/synced.txt"]')
				.replace(
					/^summary: .*$/m,
					'summary: "prove the close syncs the issue"',
				)
				.replace(/<!--\s*FILL:[\s\S]*?-->/g, "filled by selftest"),
		);
		write(abs(dir, "src/synced.txt"), "synced\n");
		assert(
			(await ctx.quietAsync(() =>
				cmdTaskClose({ root: dir, id: "TASK-131", sync: true }),
			)) === 0,
			"task close --sync closes the task and the issue",
		);
		const closedIssue = spy.calls
			.filter((c) => c.method === "PATCH" && c.url.endsWith("/issues/131"))
			.at(-1);
		assert(
			closedIssue?.body?.state === "closed" &&
				closedIssue.body.title === "prove the close syncs the issue" &&
				closedIssue.body.body.includes("**Summary**"),
			"the final record and its title travel with the close",
		);
		const cardPath = spy.calls
			.filter(
				(c) => c.method === "POST" && c.url.endsWith("/issues/131/comments"),
			)
			.at(-1)
			?.body?.body?.match(/Change card: `([^`]+)`/)?.[1];
		assert(
			!!cardPath && exists(abs(dir, cardPath)),
			"the issue gets the change card the close wrote",
		);
		assert(
			row(ctx, dir, "task ids unique").status === "PASS",
			"a task file and its change card are not a duplicate",
		);

		const renumber = cli(dir, "task renumber TASK-101 TASK-900");
		assert(
			renumber.code === 1 && renumber.out.includes("ids: issue"),
			"renumber refuses a repo whose ids belong to issues",
		);

		// A repo that ran on local ids first can reach a number its history already carries.
		number = 131;
		const clash = await ctx.spokenAsync(() =>
			cmdTaskNew({
				root: dir,
				slug: "reused-number",
				summary: "a number the history already carries",
				lane: "quick",
				noBaseline: true,
			}),
		);
		assert(
			clash.code === 1 &&
				clash.out.includes("TASK-131") &&
				clash.out.includes("not reused"),
			"a mint that lands on a used id refuses and names both",
		);
		assert(
			activeTasks(dir).length === 0,
			"the refused mint leaves no task file",
		);
	} finally {
		spy.restore();
		for (const [name, value] of [
			["GITHUB_API_URL", saved.url],
			["GH_TOKEN", saved.token],
		]) {
			if (value === undefined) delete process.env[name];
			else process.env[name] = value;
		}
	}
}
