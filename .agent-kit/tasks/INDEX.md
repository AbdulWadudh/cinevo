# Task Index and Routing

**Why** — the task file is the only state a session trusts, and the lane decides which gates
apply. This index is the one routing table.

**Load it when** — a session starts, or before opening, resuming or closing a task. Then open
the one task it names; not the folders.

## Routing

1. **Start with `agent-kit start`.** It prints the branch, the commands and their tiers, what
   is in flight, the gate, the last evidence, and one next action — reading it replaces
   guessing where the session stopped.
2. **Check Active** below. If a task is in progress, open it and resume from its last recorded
   step. Do not start a second one. A `BLOCKED` task does not hold the slot: its question waits
   in the file until `agent-kit task resume` (the owner has answered), and only then is it the
   session's work again.
3. **Otherwise open a task:** `agent-kit task new <slug> --lane quick|planned`. A task too
   large for one sitting splits: add `--parent TASK-N` and it opens `TASK-N.M` (see Subtasks).
4. **Looking for what is next?** Read `BACKLOG.md` — parked candidates, not tasks. A row
   becomes work only when the owner picks it, and then it is deleted.
5. **Never work from memory.** The task file is the state; if a fact is not in it, it did not
   happen.

## Subtasks

A subtask is the same task file with a dotted id and a `parent:` line. The main task is QUEUED
while one of its subtasks is in progress; only one subtask runs at a time. A subtask closes on
the quick suite and stays DONE in `active/`; closing the last one puts the main task back in
progress.

The main close is the milestone: it refuses while a subtask is open, runs the full suite —
build included — and errors found there are fixed at that moment, not deferred. Green,
the family archives together under the main id: one change file, one commit message, and the
write set is the main task's files plus every subtask's.

## Lanes

| | QUICK | PLANNED |
|---|---|---|
| **Eligible when** | three files or fewer, one domain, reversible with `git revert`, no contract change | everything else |
| **G1 — plan** | record intent in the task and proceed | **halt** for approval before the first edit |
| **G2 — result** | `task close` runs the full suite and closes (a subtask closes on the quick suite, lint included; its main task runs build) | **halt** for approval after the suite, before close |
| **Typical** | typo, doc fix, one-file bug, a test | feature, refactor, schema, interface change |

## Gates

- **G1** and **G2** are the only two halts. A halt means: stop, present, wait. Not "proceed
  and note it".
- **Always halt, in every lane:** a destructive or irreversible action, a new dependency, a
  schema or migration change, deleting files outside the declared write set, or a red
  verification baseline.
- A rejection returns to the plan. An unapproved plan never reaches an edit.
- An out-of-scope commit, or a message with no task and summary, is reported by the
  `.agent-kit/githooks/` hooks in clones that opted into them (`git config core.hooksPath .agent-kit/githooks`).
  Same rule, earlier warning — not a second rule.

## Backlog

`BACKLOG.md` lists what the owner parked: `later`, `not-now`, `not-important`. A row has no
lane and no write set; `task new` plus deleting the row is the only promotion. `doctor` checks
the vocabulary, the IDs and the cells, so a malformed row fails before it wastes a session.

## Active

<!-- ACTIVE:START -->
_Nothing in flight._
<!-- ACTIVE:END -->

## Recent

<!-- RECENT:START -->
- `2026-10-28` [TASK-103](archive/2026-10/2026-10-28-TASK-103-remove-project-changelog.md) — Drop the parallel project changelog; agent-kit change cards are the only record.
- `2026-10-28` [TASK-102](archive/2026-10/2026-10-28-TASK-102-gallery-route-blank.md) — Scope the dome container rule to the div the component now renders so /gallery is visible again.
- `2026-10-28` [TASK-101](archive/2026-10/2026-10-28-TASK-101-upgrade-agent-kit.md) — Upgrade the kit to v1.1.0, clear the lint errors, trim AGENTS.md and SKILL.md
<!-- RECENT:END -->

## History

Closed tasks move to `.agent-kit/tasks/archive/YYYY-MM/`, and each leaves one change file in
`.agent-kit/logs/MM-YYYY/`. A DONE subtask waits in `active/` until its main task closes, then
archives with it under the main task's single change file. The five newest of both are listed
above and in the logs index; open anything older only when the user asks about it.
