---
id: {{ID}}
parent: ""
lane: {{LANE}}
status: IN_PROGRESS
created: {{DATE}}
baseline: {{BASELINE}}
touches: []
depends_on: []
type: changed  # added | changed | fixed | removed
summary: ""
---
# {{ID}} — {{TITLE}}

## Scope (frozen once approved)

**Intent** — <!-- FILL:intent — one or two sentences: what the owner asked, in their words. -->

**In scope**
- <!-- FILL:in-scope -->

**Out of scope**
- <!-- FILL:out-of-scope -->

**Decisions** — only choices a later session would otherwise re-open, each with the pointer it
rests on (`path:line`, a command's result, or the owner's words). No explanation.
- <!-- FILL:decision -->

## Queue — requests that arrive while this task is open

Append each request here instead of opening a new task. A row is `queued`, becomes `in progress`
with its `TASK-N.M` id when work starts, and ends `done` or `dropped`.

| # | Request | Status | Subtask |
|---|---|---|---|

## Plan

1. <!-- FILL:step -->

**Test plan** — command → expected; a new check also shows its failing run.
- <!-- FILL:test -->

## Baseline (before the change)

<!-- BASELINE:START -->
<!-- BASELINE:END -->

## Verification

<!-- VERIFY:START -->
| Action | Command | Scope | Expected | Observed | Exit |
|---|---|---|---|---|---|
| — | not run | — | — | — | — |
<!-- VERIFY:END -->

## Close-out

**Summary** — <!-- FILL:summary — one short paragraph: what the task did and why. The detail lives here; the front-matter summary is only the 140-character title. Reused in the closing commit's body. -->

**Docs updated** — <!-- FILL:docs-updated — or "none needed: <reason>" -->

**Follow-ups** — none

<!-- FILES:START -->
<!-- FILES:END -->
