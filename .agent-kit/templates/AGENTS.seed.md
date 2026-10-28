<!--
AGENTS SEED — copied to <repo>/AGENTS.md by agent-kit setup, then authored by you.
This file is never overwritten by `pull`. Uppercase PLACEHOLDER markers and
FILL comment markers are the work that `doctor --strict` refuses to call done.
-->

# <PROJECT NAME> — Agent Entry Point

You are working in <PROJECT NAME>. Read this file once per session, then follow it.

<!-- FILL:project-summary — one sentence: what this product does, and for whom. -->

## Start here, in order

1. `.agent-kit/SKILL.md` — the work loop: classify, open, gate, verify, close, report. Follow its order.
2. `.agent-kit/project.md` — stack, commands, entry points, generated directories. Cite it; never restate it.
3. `.agent-kit/tasks/INDEX.md` — resume the active task, or open a new one.
4. `.agent-kit/rules/INDEX.md` — load only the rule files matching what you will touch.
5. `.agent-kit/docs/INDEX.md` — find where the logic lives before searching the tree.
6. Any other directory you open has an `INDEX.md`: read that first, then the one file it names.

## Boundary protocol

**Always**
- Read before writing. Keep every edit inside the task's declared `touches`.
- Run `agent-kit verify` before and after edits; it is the quick suite. The full one runs at the
  baseline and at `task close`. Evidence goes in the task file; memory does not count.
- Take the smallest complete change: reuse what exists, delete before adding, no speculative abstraction.

**Ask first**
- New dependency, schema or migration, public interface change.
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

<!-- FILL:rules-1-4 — the constraints that are true only in this repo.
     Examples: component variants, theme tokens, data-flow boundaries,
     destructive-action confirms, tenancy or auth invariants. -->

5. **Context discipline.** Every directory the kit owns carries an `INDEX.md`: read the index, then the one file it points at — never list a folder into context. Search narrowly; read at most three source files at a time. History (`.agent-kit/tasks/archive/`, `.agent-kit/logs/MM-YYYY/`) is read only when the user asks; the indexes list the five newest entries for you.
6. **One home per fact.** A rule lives in exactly one file; everywhere else cites it.
7. **Planning.** Anything beyond the QUICK lane (three files or fewer, reversible, no contract change) needs a task file in `.agent-kit/tasks/active/`, with the plan approved before the first edit.
8. **Subagents.** Every subagent prompt names the files to read and the deliverable. It never restates the plan.
9. **Shell output.** Prefix commands with `rtk` (`rtk git status`, `rtk npm test`); `rtk bypass <cmd>` when the full output is the evidence. Name the active task ID with any savings you report — the detail is in `.agent-kit/SKILL.md` §Shell output.

## Done means

The quick suite and the full one are green (the full one is `verify --full`, which `task close`
runs itself), the task's evidence table holds real exit codes, `.agent-kit/tasks/INDEX.md` is
current, and `agent-kit doctor` reports no failures. Then `agent-kit task close`.

A task too big for one sitting splits into subtasks (`task new --parent TASK-N`). A subtask
closes on the quick suite: `task close` marks it DONE and keeps it in `active/`. The main
task's close is the milestone — it refuses while a subtask is open, runs the full suite, and
build failures are fixed right there before it closes; green, it archives the family
under one change file and one commit message.

---

<!-- MACHINERY: everything below is the kit. Keep it as written. -->
## Kit

`bun .agent-kit/agent-kit.mjs <command>` (fallback: `node .agent-kit/agent-kit.mjs <command>`)

| Command | Use |
|---|---|
| `doctor` | truth checks over docs, declarations and tasks; `--strict` also fails on unfilled markers; `--fix` repairs encoding only; `--json` for CI |
| `harnesses` | list the coding agents installed on this machine (HOME, PATH, repo) — the repo may show none; a report, not a gate |
| `start` | read-only session brief: branch, declared commands and their tiers, active tasks, the gate, last evidence, loop and stale state, and one next action |
| `task new <slug> --lane quick\|planned [--parent TASK-N]` | open a task **and record the baseline run**, a full one (`--no-baseline` to skip); `--parent` opens `TASK-N.M`, queues the main task, and records a quick baseline |
| `task show` | print the active task's scope, plan and evidence — the thing G1/G2 asks a human to read |
| `task block "<question>"` | park the in-progress task on an owner decision; it stops holding the slot and the question waits in the file |
| `task resume [<id>]` | continue a blocked task; pass the id when more than one is waiting |
| `task close` | a subtask runs the **quick** suite, is marked DONE and stays active for the main close; the main task refuses while a subtask is open, runs the **full** suite, scope-checks against git (its own write set plus every subtask's), records the inventory, archives the family, writes one change file under `.agent-kit/logs/MM-YYYY/`, and prints a ready commit message; `--pr` adds a PR body; `--amend "<why>"` accepts a declared breach and writes the reason into the plan; `--no-verify` only when the suite cannot run here |
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
