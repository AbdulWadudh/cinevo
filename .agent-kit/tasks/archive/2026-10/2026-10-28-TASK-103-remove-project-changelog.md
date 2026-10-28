---
id: TASK-103
parent: ""
lane: QUICK
status: DONE
closed: 2026-10-28
created: 2026-10-28
baseline: eb1595191228f14c147ed646e6a34c9ba4918d43
touches: ["CHANGELOG.md", "AGENTS.md", "src/components/reactbits/DomeGallery.css"]
depends_on: []
type: removed  # added | changed | fixed | removed
summary: "Drop the parallel project changelog; agent-kit change cards are the only record."
---
# TASK-103 — remove project changelog

## Scope (frozen once approved)

**Intent** — Remove `CHANGELOG.md`; agent-kit already tracks shippable work as one change card per task under `.agent-kit/logs/MM-YYYY/`.

**In scope**
- Delete `CHANGELOG.md`.
- Remove its two references from `AGENTS.md` (the start-order step and the always-update rule).

**Out of scope**
- The kit's own change cards, release notes, and archived task records.

**Decisions** — only choices a later session would otherwise re-open, each with the pointer it
rests on (`path:line`, a command's result, or the owner's words). No explanation.
- The kit already treats the change card as the changelog: `.agent-kit/lib/changelog.mjs:11` ("There is no second ledger — this file *is* the changelog entry"), and its selftest asserts no accumulating changelog (`.agent-kit/lib/selftest/release.mjs:28`). `AGENTS.md` was the only remaining consumer.

## Plan

1. Delete `CHANGELOG.md`.
2. Drop the two `AGENTS.md` lines and renumber the start-order list.

**Test plan** — command → expected; a new check also shows its failing run.
- `rg -n CHANGELOG` (excluding `.agent-kit/tasks`, `.agent-kit/logs`) → no live references.
- `agent-kit verify` → typecheck and lint exit 0.

## Baseline (before the change)

<!-- BASELINE:START -->
| Action | Command | Scope | Expected | Observed | Exit |
|---|---|---|---|---|---|
| build | `npm run build` | full | exit 0 | exit 0 | 0 |
| typecheck | `npm run typecheck` | full | exit 0 | exit 0 | 0 |
| lint | `npm run lint` | full | exit 0 | exit 0 | 0 |
<!-- BASELINE:END -->

## Verification

<!-- VERIFY:START -->
| Action | Command | Scope | Expected | Observed | Exit |
|---|---|---|---|---|---|
| build | `npm run build` | full | exit 0 | exit 0 | 0 |
| typecheck | `npm run typecheck` | full | exit 0 | exit 0 | 0 |
| lint | `npm run lint` | full | exit 0 | exit 0 | 0 |
<!-- LOOP {"n":0,"fail":"","diff":"3c109a8fd1a93753","plan":"86e381eb50ce8593"} -->
<!-- VERIFY:END -->

## Close-out

**Summary** — Removed `CHANGELOG.md`; agent-kit already writes one change card per task under `.agent-kit/logs/MM-YYYY/`, and its own selftest states there is no accumulating changelog. The two `AGENTS.md` references were the only live consumers: the start-order step now points at `agent-kit start` and the logs index, and the always-update rule keeps only `README.md`.

**Docs updated** — `AGENTS.md`: start order and boundary protocol.

**Follow-ups** — none

**Scope amended at close** — DomeGallery.css is TASK-102's closed-but-uncommitted change; TASK-103 wrote only the CHANGELOG.md deletion and AGENTS.md.: `src/components/reactbits/DomeGallery.css`

<!-- FILES:START -->
- `AGENTS.md`
- `CHANGELOG.md`
- `src/components/reactbits/DomeGallery.css`
<!-- FILES:END -->
