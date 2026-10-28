# Cinevo — Agent Entry Point

Cinevo is a cinematic streaming front-end (movies, TV, live radio) on Next.js 16 and Prisma.
Read this file once per session.

Cinevo is a premium app, not a catalogue: inline trailer previews, D-pad navigation for TV, a
live-radio wing with its own player, and a theme studio that repaints the site.

## Start here, in order

1. `.agent-kit/SKILL.md` — the work loop: classify, open, gate, verify, close, report. Follow its order.
2. `.agent-kit/project.md` — stack, commands, entry points, generated directories. Cite it; never restate it.
3. `.agent-kit/tasks/INDEX.md` — resume the active task, or open a new one.
4. `.agent-kit/rules/INDEX.md` — load only the rule files matching what you will touch.
5. `.agent-kit/docs/INDEX.md` — find where the logic lives before searching the tree.
6. `agent-kit start` and `.agent-kit/logs/INDEX.md` — what is in flight and what already shipped.
7. Any other directory you open has an `INDEX.md`: read that first, then the one file it names.

## Boundary protocol

**Always**
- Read before writing. Keep every edit inside the task's declared `touches`.
- Run `agent-kit verify` before and after edits; it is the quick suite. The full one runs at the
  baseline and at `task close`. Evidence goes in the task file; memory does not count.
- Take the smallest complete change: reuse what exists, delete before adding, no speculative abstraction.
- Update `README.md` when a change adds a user-facing feature, a script or a setup step. The
  change record is the change card `task close` writes; there is no separate changelog.

**Ask first**
- New dependency, schema or migration, public interface change.
- Anything under `.env`, `.env.example`, `.env.local` — the documented env surface.
- `android-twa/` signing material (`*.keystore`, `*.jks`, `android-signing-key-info.json`,
  `local.properties`): a lost or leaked key means the Play listing can never be updated.
- `releases/` and the committed `app-release-*.apk` / `*.aab` artifacts — release outputs.
- Deleting files, rewriting generated output, or anything irreversible.

**Never**
- Invent a path, a command or an export. If it is not in `project.md` or in the tree, it does not exist.
- Edit a generated directory (listed in `project.md`).
- Close a task with edits it does not record.
- Commit as the session. Git's configured identity is the author — never `-c user.name`, never
  `-c user.email`, never a name from the conversation — and no `Co-Authored-By`, "Generated with",
  or any other AI attribution in a commit, PR or changelog. It is `.agent-kit/rules/commits.md`.
- Hand the user a command to run. Execute it, then report the result in one or two lines. If this
  environment cannot execute it, say so and stop — never hand over a script, and never claim the
  step passed.

## Core rules

1. **Every admin action is gated.** `requireAdmin()` is the first statement and throws
   `Error("Forbidden")` otherwise; a new admin action copies the guard. Detail:
   `.agent-kit/rules/api.md` §5.
2. **Migrations are append-only.** A schema change is `schema.prisma` plus a new timestamped
   directory; the change file names it. Detail: `.agent-kit/rules/database.md` §1.
3. **The theme is resolved once per request.** `getActiveThemeState()` is the only reader of the
   theme cookie and the published row; a page takes the value. Detail:
   `.agent-kit/rules/theming.md` §1.
4. **Context discipline.** Every directory the kit owns carries an `INDEX.md`: read the index, then the one file it points at — never list a folder into context. Search narrowly; at most three source files at a time. History is read only when the user asks.
5. **One home per fact.** A rule lives in exactly one file; everywhere else cites it.
6. **Planning.** Anything beyond the QUICK lane (three files or fewer, reversible, no contract change) needs a task file in `.agent-kit/tasks/active/`, with the plan approved before the first edit.
7. **Subagents.** Every subagent prompt names the files to read and the deliverable. It never restates the plan.
8. **Shell output.** Prefix commands with `rtk` (`rtk git status`, `rtk npm test`); `rtk bypass <cmd>` when the full output is the evidence. Name the active task ID with any savings you report — the detail is in `.agent-kit/SKILL.md` §Shell output.

## Done means

Both suites are green (`task close` runs the full one), the evidence table holds real exit
codes, `.agent-kit/tasks/INDEX.md` is current, and `agent-kit doctor` reports no failures. Then
`agent-kit task close`.

A task too big for one sitting splits into subtasks (`task new --parent TASK-N`): a subtask
closes on the quick suite and stays DONE in `active/`; the main close refuses while one is open,
runs the full suite, fixes a red build there, then archives the family under one change file and
one commit message.

---

<!-- MACHINERY: everything below is the kit. Keep it as written. -->
## Kit

`bun .agent-kit/agent-kit.mjs <command>` (fallback: `node .agent-kit/agent-kit.mjs <command>`)

| Command | Use |
|---|---|
| `doctor` | truth checks over docs, declarations and tasks; `--strict` also fails on unfilled markers; `--fix` repairs encoding only; `--json` for CI |
| `harnesses` | list the coding agents installed on this machine (HOME, PATH, repo) — the repo may show none; a report, not a gate |
| `start` | read-only session brief: branch, declared commands and their tiers, the five newest closes, active tasks, the gate, last evidence, loop and stale state, and one next action |
| `task new <slug> --lane quick\|planned [--parent TASK-N] [--from <issue>]` | open a task **and record the baseline run**, a full one (`--no-baseline` to skip); `--parent` opens `TASK-N.M`, queues the main task, and records a quick baseline; in `ids: issue` it also mints the issue and takes its number, and `--from` imports an existing issue instead |
| `task show` | print the active task's scope, plan and evidence — the thing G1/G2 asks a human to read |
| `task publish [--id TASK-N]` | issue ids only: send the task's approved plan to its issue (the front matter stays in the repo) |
| `task renumber <old> <new> \| <old> --next [--file <name>]` | local ids only: move an id after a collision, rewriting the file name, a parent's children and every `depends_on`; `--file` picks one of two same-id files |
| `task block "<question>"` | park the in-progress task on an owner decision; it stops holding the slot and the question waits in the file |
| `task resume [<id>]` | continue a blocked task; pass the id when more than one is waiting |
| `task close` | a subtask runs the **quick** suite, is marked DONE and stays active for the main close; the main task refuses while a subtask is open, runs the **full** suite, scope-checks against git (its own write set plus every subtask's), records the inventory, archives the family, writes one change file under `.agent-kit/logs/MM-YYYY/`, and prints a ready commit message; `--pr` adds a PR body; `--amend "<why>"` accepts a declared breach and writes the reason into the plan; `--no-verify` only when the suite cannot run here; `--sync` (issue ids) closes the issue with the final record and comments the change card's path, after the local close is written |
| `release <version>` | write `.agent-kit/releases/<version>.md` from the change files no earlier release claims; `release --tag <version>` creates the annotated tag whose message is that note |
| `verify` | the inner loop: runs the `always` rows and writes the evidence table; `--full` adds the `milestone` rows, which the baseline and `task close` already run; at three identical red runs it refuses until the Plan changes |
| `task guard [--message <file>]` | the hooks: `pre-commit` refuses a commit outside the declared write set (silent when no task is open); `commit-msg` warns — never blocks — on a subject that is not `type (TASK-ID): summary` or a body with no summary. **Opt-in per clone** via `git config core.hooksPath .agent-kit/githooks` |
| `learnings archive` | move entries past the 30 cap into `.agent-kit/learnings/archive/`; the live list is the part a session reads |
| `check` / `pull --dry-run` / `pull [--ref <tag>]` | the release tag this repo tracks and whether a newer one exists, plus drift against it; `pull` never overwrites a locally modified file without `--force` |

The owner is not expected to type any of this. The agent runs `task new` and `task close`, and
`task close` is where the write set is checked — that check always runs. The hooks are a
per-clone extra that warns earlier; they are off unless someone opts in, because it is git
config and a shared repo must not rewrite a teammate's git behaviour on install.

`.agent-kit/SKILL.md` is the work loop; this file is the contract it runs under. A harness with its own
skill folder gets a pointer to that one file, never a copy that drifts.
