/** selftest/migrate.mjs — backfilling issues for tasks that predate issue ids */
import { abs, read, write } from "../io.mjs";
import { cmdTaskClose, cmdTaskMigrate, cmdTaskNew } from "../tasks/index.mjs";
import { activeTasks } from "../taskfile.mjs";
import { fixture, stubFetch } from "./ids.mjs";

/**
 * A repo that used local ids first keeps them, so `migrate` opens the issue each task never got:
 * closed, titled with the id, carrying the paragraph its close already wrote. The issue list is
 * the record, so a second run adds nothing.
 */
export async function migrateScenarios(ctx) {
	const { assert } = ctx;
	console.log("\n38. an archived task gets the issue it never had, once");
	const issues = [];
	const spy = stubFetch((call) => {
		const slug = call.url
			.replace(/^https:\/\/[^/]+/, "")
			.replace(/\?.*$/, "");
		const repo = "/repos/selftest/fixture";
		if (call.method === "POST" && slug === `${repo}/issues`) {
			const row = {
				number: issues.length + 1,
				title: call.body.title,
				body: call.body.body,
				state: "open",
			};
			issues.push(row);
			return { status: 201, body: row };
		}
		if (call.method === "GET" && slug === `${repo}/issues`)
			return { status: 200, body: issues.map((i) => ({ ...i })) };
		if (call.method === "PATCH" && slug.startsWith(`${repo}/issues/`)) {
			const hit = issues.find(
				(i) => i.number === Number(slug.split("/").at(-1)),
			);
			if (hit) Object.assign(hit, call.body);
			return { status: 200, body: hit || {} };
		}
		return { status: 404, body: { message: `unexpected ${slug}` } };
	});
	const saved = {
		url: process.env.GITHUB_API_URL,
		token: process.env.GH_TOKEN,
	};
	process.env.GITHUB_API_URL = "https://api.selftest";
	process.env.GH_TOKEN = "selftest-token";
	try {
		const { dir } = await fixture(ctx, "ids-migrate");
		assert(
			(await ctx.quietAsync(() =>
				cmdTaskNew({
					root: dir,
					slug: "closed-slice",
					lane: "quick",
					noBaseline: true,
				}),
			)) === 0,
			"the fixture opens a task to close",
		);
		const task = activeTasks(dir)[0];
		write(
			task.path,
			read(task.path)
				.replace(/touches: \[\]/, 'touches: ["src/migrated.txt"]')
				.replace(
					/^summary: .*$/m,
					'summary: "The fixture closed one task, and this is its title"',
				)
				.replace(
					/\*\*Summary\*\*\s*—\s*<!--\s*FILL:summary[\s\S]*?-->/,
					"**Summary** — The fixture closed one task, and this paragraph is what the issue carries.",
				)
				.replace(/<!--\s*FILL:[\s\S]*?-->/g, "filled by selftest"),
		);
		write(abs(dir, "src/migrated.txt"), "migrated\n");
		assert(
			(await ctx.quietAsync(() =>
				cmdTaskClose({ root: dir, id: task.fm.id }),
			)) === 0,
			"the close archives it and writes the card",
		);

		const callsBefore = spy.calls.length;
		const dry = await ctx.spokenAsync(() =>
			cmdTaskMigrate({ root: dir, dry: true }),
		);
		assert(
			dry.code === 0 && spy.calls.length === callsBefore,
			"a dry run sends nothing",
		);
		assert(
			dry.out.includes(`${task.fm.id} — The fixture closed one task`),
			"the dry run shows the title it would use",
		);

		assert(
			(await ctx.quietAsync(() => cmdTaskMigrate({ root: dir }))) === 0,
			"migrate exits 0",
		);
		assert(issues.length === 1, "one archived task, one issue");
		assert(
			issues[0].title ===
				`${task.fm.id} — The fixture closed one task, and this is its title`,
			"the title is the id and the card's summary",
		);
		assert(
			issues[0].state === "closed" && issues[0].state_reason === "completed",
			"the issue is created closed",
		);
		assert(
			issues[0].body.includes("this paragraph is what the issue carries"),
			"the body quotes the card's paragraph",
		);
		assert(
			issues[0].body.includes("Archived plan:"),
			"the body points at the archived plan",
		);

		const again = await ctx.spokenAsync(() => cmdTaskMigrate({ root: dir }));
		assert(
			again.code === 0 && issues.length === 1 && again.out.includes("already"),
			"a second run adds nothing: the issue list is the record",
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

export function prerequisiteScenarios(ctx) {
	const { assert, doctorRow } = ctx;
	console.log("\n37. a missing prerequisite fails the row");
	const saved = process.env.PATH;
	process.env.PATH = "";
	try {
		assert(
			doctorRow("prerequisites").status === "FAIL",
			"doctor fails while a tool every task needs is missing",
		);
	} finally {
		process.env.PATH = saved;
	}
	assert(
		doctorRow("prerequisites").status === "PASS",
		"the row clears once the tools are back",
	);
}
