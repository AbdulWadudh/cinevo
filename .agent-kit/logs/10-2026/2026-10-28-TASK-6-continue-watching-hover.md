---
id: TASK-6
type: changed
date: 2026-10-28
summary: "Cast and Known For cards get hover previews with carousels and skeletons; wishlist moves into the panel."
---

# TASK-6 — Cast and Known For cards get hover previews with carousels and skeletons; wishlist moves into the panel.

**Task:** [TASK-6](../../tasks/archive/2026-10/2026-10-28-TASK-6-continue-watching-hover.md)
**Scope:** .agent-kit, .commandcode, README.md, components.json, package-lock.json, package.json, prisma, src

## What changed

Cast cards and the profile page's Known For grid now use the shared hover preview: actor biography, birthday, birthplace, known-for titles and a profile link. Both panels show match-shaped skeletons while the action resolves, and their Cast and Known For rows are snap carousels with hover arrows. Title cards move the wishlist toggle into the panel and drop the inline Play/Trailer/heart controls where the panel covers them, while coarse pointers keep them. The close reverses the open toward the card origin over 260ms, and focus loss, window blur or tab hide dismiss the panel.
