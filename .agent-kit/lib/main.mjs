/** main.mjs — argv parsing and dispatch: one map from a subcommand to the module that runs it */
import path from "node:path";
import { SCRIPT_ROOT } from "./consts.mjs";
import { cmdDoctor } from "./doctor/index.mjs";
import { cmdHarnesses } from "./env.mjs";
import { cmdTaskGuard } from "./guard.mjs";
import { die, read } from "./io.mjs";
import { cmdLearningsArchive } from "./learnings.mjs";
import { sourceFor } from "./manifest.mjs";
import { cmdRelease } from "./release.mjs";
import { cmdSelftest } from "./selftest/index.mjs";
import { cmdSetup } from "./setup.mjs";
import { cmdCheck, cmdPull } from "./sync.mjs";
import {
	cmdStart,
	cmdTaskBlock,
	cmdTaskClose,
	cmdTaskMigrate,
	cmdTaskNew,
	cmdTaskPublish,
	cmdTaskRenumber,
	cmdTaskResume,
	cmdTaskShow,
} from "./tasks/index.mjs";
import { cmdVerify } from "./verify/index.mjs";

export function main(argv) {
	const args = argv.slice(2);
	const cmd = args[0];
	const flag = (name) => args.includes(`--${name}`);
	const value = (name) => {
		const i = args.indexOf(`--${name}`);
		return i >= 0 ? args[i + 1] : undefined;
	};
	const positional = args
		.slice(1)
		.filter(
			(a, i, all) =>
				!a.startsWith("--") && !(all[i - 1] || "").startsWith("--"),
		);

	switch (cmd) {
		case "setup": {
			const target = path.resolve(positional[0] || process.cwd());
			const src = sourceFor(target, value("source"), value("ref")) || {
				root: SCRIPT_ROOT,
				spec: SCRIPT_ROOT,
			};
			return cmdSetup({
				target,
				sourceRoot: src.root,
				sourceSpec: src.spec,
				ref: src.ref,
				noRtk: flag("no-rtk"),
				ids: value("ids"),
			});
		}
		case "check": {
			const target = path.resolve(process.cwd());
			const src = sourceFor(target, value("source"), value("ref"));
			return cmdCheck({
				target,
				sourceRoot: src ? src.root : null,
				spec: src ? src.spec : null,
				jsonOut: flag("json"),
			});
		}
		case "pull": {
			const target = path.resolve(process.cwd());
			const src = sourceFor(target, value("source"), value("ref"));
			return cmdPull({
				target,
				sourceRoot: src ? src.root : null,
				spec: src ? src.spec : null,
				ref: src ? src.ref : null,
				force: flag("force"),
				seeds: flag("seeds"),
				dryRun: flag("dry-run"),
			});
		}
		case "doctor":
			return cmdDoctor({
				root: process.cwd(),
				strict: flag("strict"),
				fix: flag("fix"),
				jsonOut: flag("json"),
			});
		case "start":
			return cmdStart({ root: process.cwd() });
		case "verify":
			return cmdVerify({
				root: process.cwd(),
				baseline: flag("baseline"),
				full: flag("full") ? true : undefined,
			});
		case "harnesses":
			return cmdHarnesses({ root: process.cwd() });
		case "task": {
			const sub = args[1];
			if (sub === "new")
				return cmdTaskNew({
					root: process.cwd(),
					slug: args[2],
					lane: value("lane"),
					summary: value("summary"),
					intent: value("intent"),
					force: flag("force"),
					noBaseline: flag("no-baseline"),
					parent: value("parent"),
					from: value("from"),
				});
			if (sub === "show")
				return cmdTaskShow({ root: process.cwd(), id: value("id") });
			if (sub === "block")
				return cmdTaskBlock({
					root: process.cwd(),
					id: value("id"),
					question: positional.slice(1).join(" "),
				});
			if (sub === "resume")
				return cmdTaskResume({ root: process.cwd(), id: value("id") });
			if (sub === "close")
				return cmdTaskClose({
					root: process.cwd(),
					id: value("id"),
					amend: value("amend"),
					noVerify: flag("no-verify"),
					pr: flag("pr"),
					sync: flag("sync"),
				});
			if (sub === "publish")
				return cmdTaskPublish({ root: process.cwd(), id: value("id") });
			if (sub === "migrate")
				return cmdTaskMigrate({
					root: process.cwd(),
					dry: flag("dry-run"),
				});
			if (sub === "renumber")
				return cmdTaskRenumber({
					root: process.cwd(),
					oldId: args[2],
					newId: args[3],
					next: flag("next"),
					file: value("file"),
				});
			if (sub === "guard")
				return cmdTaskGuard({
					root: process.cwd(),
					message: value("message"),
				});
			return die(
				'usage: task new <slug> [--summary "<one clause>"] [--intent "<paragraph>"] [--parent TASK-N] [--from <issue>] | task show | task block "<question>" | task resume | task close [--id TASK-N] [--amend "<why>"] [--pr] [--sync] | task publish [--id TASK-N] | task migrate [--dry-run] | task renumber <TASK-N> <TASK-M>|--next [--file <name>] | task guard [--message <file>]',
			);
		}
		case "learnings": {
			if (args[1] !== "archive")
				return die("usage: learnings archive  (moves entries past the 30 cap)");
			return cmdLearningsArchive({ root: process.cwd() });
		}
		case "release":
			// `--tag <version>` puts the version after a flag, so positional[0] is empty there.
			return cmdRelease({
				root: process.cwd(),
				version: positional[0] || value("tag"),
				tag: flag("tag"),
			});
		case "selftest":
			return cmdSelftest(main);
		case "help":
		case undefined: {
			const text = read(
				path.join(SCRIPT_ROOT, ".agent-kit/agent-kit.mjs"),
			).split("\n");
			console.log(text.slice(2, text.indexOf(" */")).join("\n"));
			return 0;
		}
		default:
			return die(
				`unknown command: ${cmd} (setup|check|pull|doctor|start|verify|harnesses|task|learnings|release|selftest)`,
			);
	}
}
