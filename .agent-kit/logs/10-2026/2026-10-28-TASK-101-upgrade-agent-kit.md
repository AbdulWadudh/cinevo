---
id: TASK-101
type: changed
date: 2026-10-28
summary: "Upgrade the kit to v1.1.0, clear the lint errors, trim AGENTS.md and SKILL.md"
---

# TASK-101 — Upgrade the kit to v1.1.0, clear the lint errors, trim AGENTS.md and SKILL.md

**Task:** [TASK-101](../../tasks/archive/2026-10/2026-10-28-TASK-101-upgrade-agent-kit.md)
**Scope:** .agent-kit, AGENTS.md, src

## What changed

Upgraded the installed agent-kit to v1.1.0 and cleared the rows that upgrade
left red. The 24 pre-existing lint errors are gone via types on the TMDB payloads and
behaviour-preserving React fixes; `AGENTS.md` is cut from 17,585 to 8,800 characters with the
product rules moved into six domain files behind `rules/INDEX.md`; `SKILL.md` is trimmed under
its own 10,000-char cap; both githooks are executable.
