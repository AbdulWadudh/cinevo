---
id: TASK-9
type: added
date: 2026-10-28
summary: "Two independent Studio options: an always-on eaten poster edge on home cards and the real CardSwap as the hero."
---

# TASK-9 — Two independent Studio options: an always-on eaten poster edge on home cards and the real CardSwap as the hero.

**Task:** [TASK-9](../../tasks/archive/2026-10/2026-10-28-TASK-9-studio-card-effects.md)
**Scope:** .agent-kit, .commandcode, README.md, prisma, src

## What changed

Two independent Studio axes now drive the home cards and the hero. Card effect adds an always-on, screen-blended decay border to the home rows, genre rail, Continue Watching, Daily Five, cast, More Like This and person Known For, with a 1–12px ring slider; Hero carousel swaps the hero banner for the ReactBits CardSwap deck (94% width, landscape, 50px stack distance, persisted Card-distance control). Both persist through the cookie and SiteTheme with migrations; the hero is full 100dvh and the mobile custom scrollbar is hidden.
