---
id: TASK-1
type: changed
date: 2026-10-28
summary: "Three switchable Cinevo details layouts — Stage, Dossier, Console — with a studio picker and a published default."
---

# TASK-1 — Three switchable Cinevo details layouts — Stage, Dossier, Console — with a studio picker and a published default.

**Task:** [TASK-1](../../tasks/archive/2026-10/2026-10-28-TASK-1-detail-layouts.md)
**Scope:** .agent-kit, README.md, components.json, package-lock.json, package.json, prisma, src

## What changed

Replaced the Cinevo details page with three complete layouts — Stage, Dossier and Console — behind a third theme axis (`detailLayout`: trusted cookie `l` → `SiteTheme.detailLayout` → `stage`). Theme Studio gains a Details page picker and admins publish the layout with the palette. The three layouts share one props/format contract, reuse the existing player, season, cast and collection components, and surface the appended TMDB file (certificate, director/writers, budget/box office, networks, keywords, stills, IMDb link). Six ReactBits registry components were vendored under `src/components/reactbits/` and retokenized to the theme's CSS variables.
