# Task Index and Routing

**Why** — the task file is the only state a session trusts, and the lane decides which gates
apply. This index is the one routing table.

**Load it when** — a session starts, or before opening, resuming or closing a task. Then open
the one task it names; not the folders.

## Routing

1. **Start with `agent-kit start`.** It prints the branch, the commands and their tiers, the
   five newest closes, what is in flight, the gate, the last evidence, and one next action —
   reading it replaces guessing where the session stopped.
2. **Check Active** below. If a task is in progress, open it and resume from its last recorded
   step. Do not start a second task: a request that arrives now is its subtask (see Subtasks).
   A `BLOCKED` task does not hold the slot: its question waits in the file until
   `agent-kit task resume` (the owner has answered), and only then is it the session's work
   again.
3. **Otherwise open a task:** `agent-kit task new <slug> --lane quick|planned`. A request that
   arrives while a task is open, or work too large for one sitting, becomes a subtask: add
   `--parent TASK-N` and it opens `TASK-N.M` (see Subtasks).
4. **Looking for what is next?** Read `BACKLOG.md` — parked candidates, not tasks. A row
   becomes work only when the owner picks it, and then it is deleted.
5. **Never work from memory.** The task file is the state; if a fact is not in it, it did not
   happen.

## Task ids

The id source is one row in `.agent-kit/project.md` (`| ids | local |`), written by
`setup --ids`. Never invent an id: `task new` asks the allocator.

- **`local`** — the next number after the highest one on disk (`tasks/active/`, `tasks/archive/`
  and the change cards), floor `TASK-100`. Fully offline. Two branches that took the same
  number collide at merge; `task renumber TASK-N --next` moves the one that lost and rewrites
  its file name, its children and every `depends_on`.
- **`issue`** — the id is the GitHub issue number: `task new` mints the issue, `--summary` is its
  title and `--intent` its body, `--from <n>` imports one a teammate opened, `task publish` sends
  the approved plan at G1, and `task close --sync` closes the issue with the final record. No
  other path touches the network. A mint that lands on a number an archived task already carries
  refuses and names both.
- **Backfill** — `task migrate` opens one closed issue per archived task, titled `TASK-N — summary`
  and carrying the card's paragraph, so a repo that ran on local ids first shows its history on
  GitHub. Titles starting with an id are the match: a second run adds nothing.

`doctor`'s `task ids` and `task ids unique` rows check the mode, and one id per file and card.

## Subtasks

A request that arrives while a task is open becomes its subtask, not a new task; only a separate
delivery — another domain, its own dependency or contract, or more than one sitting — earns a
new task. A subtask is the same task file with a dotted id and a `parent:` line. The main task is
QUEUED while one of its subtasks is in progress; only one subtask runs at a time. A subtask
closes on the quick suite and stays DONE in `active/`; closing the last one puts the main task
back in progress.

The main close is the milestone: it refuses while a subtask is open, runs the full suite —
build included — and errors found there are fixed at that moment, not deferred. Green,
the family archives together under the main id: one change file, and the write set is the main
task's files plus every subtask's.

### Queue

A later request lands in the task's `## Queue` as `queued`: it does not open a new task. Work it
as a subtask (`task new --parent TASK-N`), set the row `in progress` with that `TASK-N.M` id,
and `done` when the subtask closes. A row that will not be worked is `dropped`, or moved to
`BACKLOG.md`; `task close` refuses while a row is `queued` or `in progress`.

Only a separate delivery — another domain, its own dependency or contract, or more than one
sitting — may be a new task. Put that choice to the owner with both options and a
recommendation; the default is the subtask.

## Lanes

| | QUICK | PLANNED |
|---|---|---|
| **Eligible when** | reversible with `git revert`, one domain, no contract change | everything else |
| **G1 — plan** | record intent in the task and proceed | **halt** for approval before the first edit |
| **G2 — result** | `task close` runs the full suite and closes (a subtask closes on the quick suite, lint included; its main task runs build) | **halt** for approval after the suite, before close |
| **Typical** | typo, doc fix, a small bug fix, a test | feature, refactor, schema, interface change |

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

## History

Closed tasks move to `.agent-kit/tasks/archive/YYYY-MM/`, and each leaves one change file in
`.agent-kit/logs/MM-YYYY/`. A DONE subtask waits in `active/` until its main task closes, then
archives with it under the main task's single change file. `agent-kit start` prints the five
newest closes; open anything older only when the user asks about it.
