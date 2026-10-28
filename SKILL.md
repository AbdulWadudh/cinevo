---
name: agent-kit
description: The work loop in an agent-kit repo — classify, open a task, pass the plan gate, edit inside the declared write set, prove it with real exit codes, pass the result gate, close, report. Use when the user asks for a change, fix, or investigation in a repo with .agents/sync-manifest.json, or asks what is in flight.
---

# agent-kit — the work loop

One request in, one verified task out. This file is the order. `AGENTS.md` holds the
boundaries and this repo's facts; if it disagrees with this file, it wins.

## 1. Start of session

Read `AGENTS.md`, then `.agents/project.md`. Run `agent-kit start`: it prints the branch, the
declared commands and their tiers, what is in flight, the gate, the last evidence, and one next
action. `task show` opens the active task in full. Resume what is in flight before opening
anything new. Load only the rule files that match the files you will touch.

Every directory the kit owns has an `INDEX.md`. Open the index of the next directory you need,
then the one file it names; do not list a folder into context.

## Skills and tools, before you plan

List what the harness exposes — installed skills (its skill folder or plugin list), configured
MCP servers and their tools, and CLIs on `PATH` — then name the one that covers the task in the
plan. A skill that matches is part of the plan, not a preference: read it and follow it; several
fit, take the narrowest; none fits, say so and write the smallest step by hand. Use a configured
MCP server before a hand-written script that does the same, and an existing CLI or repo script
before a one-off. Re-check when the task changes shape. Installing a skill or wiring an MCP
server is the owner's yes — not a mid-task fix. The rule itself is
`.agents/rules/_behavior.md` §12.

`agent-kit harnesses` lists the coding agents installed on this machine — HOME config, PATH,
repo markers. The repo may show none of them. Say the list when you set up or report on a
repo, and wire `SKILL.md` for each harness that has a skill folder; the command prints those
paths. It is a report, not a gate.

## Browser access — use `agent-browser`

Reach for `agent-browser` only when the task needs the UI: clicking, forms, a session, a
rendered page, or building and checking one. No UI needed, plain `curl` or `fetch` is the
right tool. No Playwright, no headless driver of your own.

## Shell output — run it through rtk

`rtk` filters a command's output before you read it: same command, same exit code, less
context spent. Prefix the shell commands whose output you inspect:

| Instead of | Run |
|---|---|
| `git status`, `git diff`, `git log` | `rtk git status`, `rtk git diff`, `rtk git log` |
| `rg`, `find`, `ls`, `cat` | `rtk grep`, `rtk find`, `rtk ls`, `rtk read` |
| `npm test`, `cargo test`, `pytest` | `rtk npm test`, `rtk cargo test`, `rtk pytest` |

- `rtk bypass <cmd>` when the full text is the evidence: a stack trace you must read line by
  line, machine-readable output (`--porcelain`, `--json`), or a command the task must quote.
- File reads the edit needs go through the editor's Read tool, not `rtk read`: the filter
  trades bodies for signatures, which is wrong when you are editing the body.
- `verify` and `task close` run the declared commands themselves, unfiltered, so exit codes are
  untouched.

`rtk` history is machine-wide and has no task label. The task file is the reference: quote the
active task ID with any savings figure — `TASK-118 — rtk saved 82% across 14 commands` — and
the change file written at close carries the same ID. `rtk gain` is the source.

## 2. Classify

QUICK: at most three files, reversible, no public interface, schema, dependency or data
change. Everything else is PLANNED. When unsure, take PLANNED — the cost is a short plan, not
a rewrite.

## 3. Open

`task new <slug> --lane quick|planned`. It records the baseline run itself — a full one, so the
milestone rows are on record before you touch anything. Before the first edit, fill the task's
intent, scope and `touches` — the exact paths you will write. Keep it minimal: intent, scope,
the decisions a later session would re-open (each with its pointer), the plan, the proof and
the summary. If an explanation changes no later action, it is not recorded.

A task too big for one sitting splits into subtasks: `task new <slug> --lane quick|planned
--parent TASK-N` opens `TASK-N.M`, queues the main task, and records a quick baseline. One
subtask is in progress at a time. The main task stays QUEUED until its last subtask closes.
Do not use a subtask to dodge G1: the plan and the gate are the main task's.

## 4. G1 — plan approval (PLANNED only)

Put the plan in chat: the files, the steps, the risks, and the command that will prove it.
Wait for a yes. No edits before it.

## 5. Work

The smallest complete change, inside `touches`. Reuse what exists; delete before adding. Need
a file you did not declare? Say why, amend `touches` first. Never widen silently.

## 6. Prove it

`verify` mid-flight: it runs the `always` rows and holds the `milestone` ones for the baseline,
`verify --full` and `task close`. So the inner loop stays short and the slow build is still on
record before the task can close. Real exit codes go in the evidence table, each row with its
scope. If `task show` says `Evidence: STALE`, the task's files moved after the green run —
verify again before quoting it. Compare against the baseline: a red that was already red is not
progress, and a green you did not cause is not a fix. Three identical red runs over the same
files make `verify` refuse — and `task close` with it — until the Plan says what the next
attempt changes; `task show` prints `Loop: n/3`.

A subtask's quick suite is its whole close: test, typecheck and lint, but not build. Build is
not skipped, only moved — it runs at the main task's close, over the family's union of files.

## 7. G2 — result approval (PLANNED only)

Report what changed and the evidence, in the user's words. Wait for a yes, then close.

## 8. Close

`task close` runs the full suite, refuses a red result, checks the diff against `touches`,
inventories the files, archives the plan and writes the change file (`.agents/logs/MM-YYYY/`).
The card is the completion record: a `**Task:**` link to the archived plan, `**Scope:**`, then
`## What changed` with the close-out paragraph. No date (the front matter has it), no file list
(the task's `FILES` block has it); the plan, evidence and follow-ups stay in the task the link
points at.
It prints the commit message already in the hook's shape — subject and body — so closing and
committing do not drift apart. `--pr` also prints a PR body built from the change file and the
evidence. `--amend "<why>"` accepts a declared breach and writes the reason into the plan —
only with the user's reason, never as a way past a red suite.

A subtask closes differently: `task close` runs the quick suite (lint included), marks it DONE
and leaves it in `active/`, and prints its own commit message. It writes no change file and
archives nothing. The last subtask close puts the main task back in progress.

The main task's close is the milestone. It refuses while a subtask is open, then runs the full
suite, build included. A red build stops the close with its rows recorded: fix those errors
now, in this task, and close again; the suite re-runs. Green, the main task and its DONE
subtasks archive together, the change file is one, the write set is the main task's files plus
every subtask's, and the commit message is under the main id.

Before committing, read `.agents/rules/commits.md` — the split, subject, body and staging.

`agent-kit release <version>` rolls every card no earlier release claims into
`releases/vX.Y.Z.md` — `# Release vX.Y.Z`, the date, then `### Added`, `### Changed`,
`### Fixed` and `### Removed`, one line per task. It writes the file and prints the
`gh release create --notes-file` line; running git stays with the owner. Stage those files, never
the tree; `.githooks/commit-msg` warns when the shape misses and never blocks.

## 9. Report

One short message: what changed, what proved it, what is still open. Name the task ID. If rtk
ran, put its figure under the same ID (`TASK-118 — rtk 82% over 14 commands`). Then stop — no
follow-up suggestions unless asked.

## When the loop bends

- **Suite already red at open.** Record it, say so, keep the baseline. Do not "fix" it in this
  task unless that is the task.
- **The user changes the ask mid-flight.** Rewrite the scope section, keep the old text, and
  take a fresh G1 if it is PLANNED.
- **The owner states a rule.** It is a task: find the home, write it so a diff can be judged,
  add its row in `.agents/rules/INDEX.md`, and check it. The steps are in
  `.agents/templates/INDEX.md`; a rule that stays in chat does not exist.
- **You cannot run the suite.** Say so and stop. Never close on an empty evidence table.
- **You need an owner decision you cannot make.** `task block "<the question>"`. It stops being
  the task in progress, the question waits in the file, and `start` shows it until the owner
  answers; then `task resume` and continue. Do not guess and do not sit idle in the chat.
- **You find work you will not do now.** Park it in `.agents/tasks/BACKLOG.md` with a status,
  the `path:line` and a next step. Do not leave it only in the report or a comment, and do not
  open a task for it. Picking it up later means `task new`, then delete the row.
- **The change outgrows QUICK.** Stop, reopen it as PLANNED, take the gate.

## Not yours

- Installing or upgrading the kit, or a skill the owner has not approved. That is a one-time
  setup step and a chat decision.
- Editing machinery (`scripts/`, `.agents/templates/`, the manifest) to make a gate pass.
  `pull --force` takes it back, and the gate was the point.
