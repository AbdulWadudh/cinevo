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

**Summary** — <!-- FILL:summary — one short paragraph: what the task did and why. Reused in the change card and the commit body. -->

**Docs updated** — <!-- FILL:docs-updated — or "none needed: <reason>" -->

**Follow-ups** — none

<!-- FILES:START -->
<!-- FILES:END -->
