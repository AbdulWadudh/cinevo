---
id: TASK-2
type: changed
date: 2026-10-28
summary: "Tighten Dossier, fold Console's Story into its rail, and fit Stage's player in one viewport over stills."
---

# TASK-2 — Tighten Dossier, fold Console's Story into its rail, and fit Stage's player in one viewport over stills.

**Task:** [TASK-2](../../tasks/archive/2026-10/2026-10-28-TASK-2-detail-layout-polish.md)
**Scope:** .agent-kit, .commandcode, README.md, components.json, package-lock.json, package.json, prisma, src

## What changed

Dossier's masthead is compact (page top 6.25rem, 4rem title, tighter columns). Console loses its Story tab; tagline, overview, genres and keywords sit under the name card and `?view=story` falls back to Cast/Episodes. Stage is a two-column hero over a full-height backdrop that cross-fades backdrop and TMDB stills every 7s; the Frames strip is gone and the player clears a 768px viewport.
