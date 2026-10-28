---
id: TASK-103
type: removed
date: 2026-10-28
summary: "Drop the parallel project changelog; agent-kit change cards are the only record."
---

# TASK-103 — Drop the parallel project changelog; agent-kit change cards are the only record.

**Task:** [TASK-103](../../tasks/archive/2026-10/2026-10-28-TASK-103-remove-project-changelog.md)
**Scope:** AGENTS.md, CHANGELOG.md, src

## What changed

Removed `CHANGELOG.md`; agent-kit already writes one change card per task under `.agent-kit/logs/MM-YYYY/`, and its own selftest states there is no accumulating changelog. The two `AGENTS.md` references were the only live consumers: the start-order step now points at `agent-kit start` and the logs index, and the always-update rule keeps only `README.md`.
