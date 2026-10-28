---
id: TASK-3
type: added
date: 2026-10-28
summary: "Restore the original Cinevo details page as a Classic layout and make it the shipped default; the Back pill returns home."
---

# TASK-3 — Restore the original Cinevo details page as a Classic layout and make it the shipped default; the Back pill returns home.

**Task:** [TASK-3](../../tasks/archive/2026-10/2026-10-28-TASK-3-classic-detail-layout.md)
**Scope:** .agent-kit, .commandcode, README.md, components.json, package-lock.json, package.json, prisma, src

## What changed

The original Cinevo details page returns as the Classic layout: full-width player, then title, meta, genres, overview, actions, seasons, cast, collection and More Like This, rebuilt from HEAD's markup on the shared detail module. Classic is now the shipped default and listed first in the studio picker; the Back pill routes to `/` instead of history.
