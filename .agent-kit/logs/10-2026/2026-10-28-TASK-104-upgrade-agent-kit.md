---
id: TASK-104
type: changed
date: 2026-10-28
summary: "Upgrade the kit to v1.3.0, hand-merging the rows the pull skips"
---

# TASK-104 — Upgrade the kit to v1.3.0, hand-merging the rows the pull skips

**Task:** [TASK-104](../../tasks/archive/2026-10/2026-10-28-TASK-104-upgrade-agent-kit.md)
**Scope:** .agent-kit, AGENTS.md

## What changed

Pulled agent-kit v1.3.0 over v1.1.0: 33 machinery rows written, the `.counter`
file pruned, and the six rows the pull skipped (`SKILL.md`, `rules/INDEX.md`, `AGENTS.md`,
`tasks/INDEX.md`, `logs/INDEX.md`) hand-merged so the Cinevo rules and both length caps survive.
The kit now derives the five newest closes in `start` instead of storing them, and writes two
files per close instead of four.
