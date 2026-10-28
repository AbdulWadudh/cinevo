---
id: TASK-102
type: fixed
date: 2026-10-28
summary: "Scope the dome container rule to the div the component now renders so /gallery is visible again."
---

# TASK-102 — Scope the dome container rule to the div the component now renders so /gallery is visible again.

**Task:** [TASK-102](../../tasks/archive/2026-10/2026-10-28-TASK-102-gallery-route-blank.md)
**Scope:** CHANGELOG.md, src

## What changed

Restored `/gallery`. TASK-101's accessibility pass changed `DomeGallery`'s `<main>` container to a `<div>` but left the CSS selector `main.sphere-main`, so the dome's absolute full-height box no longer applied and the stage collapsed to zero height. Scoped the rule to `.sphere-main`; the dome, drag, auto-rotate and holographic reveal are back, verified in the browser before and after.
