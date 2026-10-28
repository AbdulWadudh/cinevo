---
id: TASK-5
type: fixed
date: 2026-10-28
summary: "Match the details-page loading skeleton to the active layout so the page no longer flashes a Classic-shaped placeholder."
---

# TASK-5 — Match the details-page loading skeleton to the active layout so the page no longer flashes a Classic-shaped placeholder.

**Task:** [TASK-5](../../tasks/archive/2026-10/2026-10-28-TASK-5-detail-loading-skeleton.md)
**Scope:** .agent-kit, .commandcode, README.md, components.json, package-lock.json, package.json, prisma, src

## What changed

The watch route's loading fallback now reads the active theme and paints a skeleton shaped like the layout that follows: Classic's player-then-title, Stage's full-height hero with the copy beside the player, Dossier's masthead plus poster rail, Console's player/control grid, and a backdrop hero for the clone experiences. It covers only the first viewport, and each shape breaks where its layout's CSS does (1100/901/1101px), so navigation no longer shows one generic placeholder that jumps when the real page arrives.
