# Review the kit

Run when the process itself is the friction: a rule that keeps costing a session, a gate that
fires on work it should not, a step everyone skips. The subject is the kit, not the product — a
fix that needs product code is a different task, and this one declares `touches` only on
`.agent-kit/`.

## What counts as evidence

No feeling, no "this feels heavy". The kit already records its own cost:

| Signal | Where | What it means |
|---|---|---|
| the same rule bit twice | two change files in `.agent-kit/logs/MM-YYYY/` | not a one-off |
| `Loop: n/3` | archived tasks | the same red three times: the rule did not help |
| `--amend` or a widened `touches` | archived tasks | the scope rule guessed wrong |
| a task reopened PLANNED | archived tasks | it was classified too small |
| the same `doctor` row failing | several change files | the gate is mispriced |
| `Learning` promoted twice | `.agent-kit/rules/learnings.md` | the fact is in the wrong file |
| `rtk gain` low | `rtk gain` | the commands are too loud |

One occurrence is an anecdote. Two, with a citation each, is a bottleneck. Say the two
`path:line`s and the unit it cost: characters read, commands run, retries, or a blocked task.

## Then decide, by what the fix touches

A **repo-owned** file — `.agent-kit/project.md`, `.agent-kit/docs/`, a domain rule,
`learnings.md`, `BACKLOG.md`, `AGENTS.md` rules for this repo: apply it now, in this task, and
log it. The owner reads about it in the report.

**Machinery** — `.agent-kit/agent-kit.mjs`, `.agent-kit/lib/`, `SKILL.md`, `rules/_behavior.md`, `commits.md`,
`releases.md`, the seeds, `prompts/`, the manifest:

- in the template repo: apply it if it is small — three files or fewer, no new command, no gate
  made softer — otherwise propose it and stop.
- in an installed repo: propose it. Editing machinery there loses to `pull --force`, and `check`
  reports the drift. Write the `BACKLOG.md` row with the evidence, say the one line in the
  report, and let the owner decide between upstream and drift.

A change that makes a gate softer is never small.

## Apply, log, report

Run it as a task like any other: the baseline records the cost before, the change file states
the evidence and the fix, and the close runs the suite. A self-upgrade is not exempt from the
loop it is upgrading.

In the report, one line per change: what it was, the evidence, what it now does. The owner should
be able to disagree with the diagnosis without reading the diff.

## Do not

- Improve the process in the middle of a product task. Finish, park it in `BACKLOG.md`, then run
  this.
- Add a rule to stop a symptom. Delete or fix the rule that caused it.
- Count a bottleneck you cannot cite. It goes in `BACKLOG.md` as a row with a next step, not in
  a change.
