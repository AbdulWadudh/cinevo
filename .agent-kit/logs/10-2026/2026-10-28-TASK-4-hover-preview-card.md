---
id: TASK-4
type: added
date: 2026-10-28
summary: "Prime-style hover preview on poster cards: a spring pop-out panel with backdrop, meta, genres and cast portraits."
---

# TASK-4 — Prime-style hover preview on poster cards: a spring pop-out panel with backdrop, meta, genres and cast portraits.

**Task:** [TASK-4](../../tasks/archive/2026-10/2026-10-28-TASK-4-hover-preview-card.md)
**Scope:** .agent-kit, .commandcode, README.md, components.json, package-lock.json, package.json, prisma, src

## What changed

One shared `TitleHoverCard` now gives Cinevo's poster cards a Prime-style preview: after a 450ms rest on a fine pointer at 900px and up, a spring panel pops out of the card with the backdrop, score, synopsis, certificate, runtime or season count, genre chips and four cast portraits, plus Play, Trailer and More info. It reuses `getTitlePreviewAction` (cached per title), hit-tests the pointer before closing so reaching for the panel keeps it open, and dismisses on scroll, resize, pointer-down or leave. The old inline Netflix panel in `MediaCarousel` was replaced by it, and `GenreSection` and `SimilarTitles` were wrapped too; clones keep their own card behaviour.
