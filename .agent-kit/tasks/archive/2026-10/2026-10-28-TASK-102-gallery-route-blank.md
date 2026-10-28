---
id: TASK-102
parent: ""
lane: QUICK
status: DONE
closed: 2026-10-28
created: 2026-10-28
baseline: eb1595191228f14c147ed646e6a34c9ba4918d43
touches: [src/components/reactbits/DomeGallery.css, CHANGELOG.md]
depends_on: []
type: fixed  # added | changed | fixed | removed
summary: "Scope the dome container rule to the div the component now renders so /gallery is visible again."
---
# TASK-102 — gallery route blank

## Scope (frozen once approved)

**Intent** — `/gallery` renders the nav over a blank black area instead of the trending dome. Fix it and explain why it broke.

**In scope**
- `src/components/reactbits/DomeGallery.css` — the container selector.

**Out of scope**
- The gallery page, `TrendingDome`, and `DomeGallery.jsx` behaviour.

**Decisions** — only choices a later session would otherwise re-open, each with the pointer it
rests on (`path:line`, a command's result, or the owner's words). No explanation.
- Root cause: `DomeGallery.css:24` targets `main.sphere-main`, but `DomeGallery.jsx:799` renders `<div className="sphere-main">` since TASK-101 replaced the `<main>` (duplicate landmark lint). `.sphere-main` gets no `position:absolute; inset:0`, collapses to 0 height, and the 3D stage has no box — verified in the browser DOM (`rootRect.height` 1145, `mainRect.height` 0).

## Plan

1. Change the selector from `main.sphere-main` to `.sphere-main` so it matches the element the component renders.

**Test plan** — command → expected; a new check also shows its failing run.
- Browser DOM on `/gallery` → `.sphere-main` height equals the viewport and tiles are visible (before: height 0, blank page).
- `agent-kit verify` → build, typecheck, lint exit 0.

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
<!-- LOOP {"n":0,"fail":"","diff":"478e6dc4b3e9e5e5","plan":"e5145beae5766ec4"} -->
<!-- VERIFY:END -->

## Close-out

**Summary** — Restored `/gallery`. TASK-101's accessibility pass changed `DomeGallery`'s `<main>` container to a `<div>` but left the CSS selector `main.sphere-main`, so the dome's absolute full-height box no longer applied and the stage collapsed to zero height. Scoped the rule to `.sphere-main`; the dome, drag, auto-rotate and holographic reveal are back, verified in the browser before and after.

**Docs updated** — `CHANGELOG.md` § Fixed: one entry naming the selector/container mismatch.

**Follow-ups** — none

<!-- FILES:START -->
- `CHANGELOG.md`
- `src/components/reactbits/DomeGallery.css`
<!-- FILES:END -->
