---
id: TASK-4
parent: ""
lane: PLANNED
status: DONE
closed: 2026-10-28
created: 2026-10-28
baseline: e3077e25271623d11a32cd7b9877c4ee2e7f3a84
touches: ["src/components/hover/types.ts", "src/components/hover/PreviewPanel.tsx", "src/components/hover/TitleHoverCard.tsx", "src/app/actions/tmdb-actions.ts", "src/components/dashboard/MediaCarousel.tsx", "src/components/dashboard/GenreSection.tsx", "src/components/watch/detail/SimilarTitles.tsx", "src/lib/theme/experiences.ts", "README.md", ".agent-kit/docs/API_SKELETON.md", ".agent-kit/docs/ARCH_MAP.md", "package-lock.json", "package.json", "prisma/schema.prisma", "src/app/actions/site-theme.ts", "src/app/layout.tsx", "src/app/watch/[type]/[id]/page.tsx", "src/components/BackButton.tsx", "src/components/theme/ThemeStudio.tsx", "src/lib/theme/active.ts", "src/lib/theme/site.ts", "src/lib/theme/studio/cookie.ts", "src/lib/theme/studio/provider.tsx", "src/lib/theme/studio/types.ts", "src/lib/tmdb.ts", ".commandcode/taste/taste.md", "components.json", "prisma/migrations/20261028000000_add_detail_layout/migration.sql", "src/components/reactbits/BlurText.tsx", "src/components/reactbits/CountUp.tsx", "src/components/reactbits/GlareHover.tsx", "src/components/reactbits/SplitText.tsx", "src/components/reactbits/SpotlightCard.tsx", "src/components/reactbits/TiltedCard.tsx", "src/components/theme/DetailLayoutPicker.tsx", "src/components/watch/detail/ClassicLayout.tsx", "src/components/watch/detail/ConsoleLayout.module.css", "src/components/watch/detail/ConsoleLayout.tsx", "src/components/watch/detail/DetailActions.tsx", "src/components/watch/detail/DetailChrome.tsx", "src/components/watch/detail/DetailFacts.tsx", "src/components/watch/detail/DossierLayout.module.css", "src/components/watch/detail/DossierLayout.tsx", "src/components/watch/detail/format.ts", "src/components/watch/detail/index.ts", "src/components/watch/detail/StageBackdrop.tsx", "src/components/watch/detail/StageLayout.module.css", "src/components/watch/detail/StageLayout.tsx", "src/components/watch/detail/types.ts", "src/lib/theme/detail-layouts.ts"]
depends_on: [TASK-3]
type: added
summary: "Prime-style hover preview on poster cards: a spring pop-out panel with backdrop, meta, genres and cast portraits."
---
# TASK-4 — hover preview card

## Scope (frozen once approved)

**Intent** — Owner: "i want the on hover on the cards to show the details of the movie or series or the cast info with images in the hover-card component … similar to the actual PrimeVideo … smooth animation on hover like its popping out".

**In scope**
- One shared `TitleHoverCard`: delays ~450ms on a fine pointer, measures the artwork, and portals a spring-animated preview panel above the card.
- The panel shows backdrop with Play, title, score, year, certificate, runtime/seasons, genre chips, a three-line overview, and four cast portraits that link to `/person/[id]`, plus Trailer and More info actions.
- Extra data comes from a new `getTitlePreviewAction` (reuses the cached `tmdb.getDetails`), cached per title in the browser.
- Wired into Cinevo's poster cards: every `MediaCarousel` row, each `GenreSection` grid card, and `SimilarTitles` on the details page. Cinevo's `previewOnHover` flips on; other experiences keep their own settings.

**Out of scope**
- `TopTenRow`, `DailyFive`, `ContinueWatching`, the browse/search grids and clone-experience cards — their markup differs and they keep today's hover.
- Autoplaying a muted trailer inside the panel (the panel opens the existing trailer modal instead).
- Touch and TV/D-pad: the preview is fine-pointer only.

**Decisions**
- Reuse the existing delayed-portal pattern from `MediaCarousel` (hit-test before closing, portal out of the scroll container) rather than a plain popover: rows clip their overflow and the panel must not vanish while the pointer reaches it.
- The panel is themed with site tokens and the display font, not Netflix's `#181818`, so it follows the active palette; Netflix's clone gets the richer panel but in its own colours.
- Data loads on first pointer-enter and is cached in a module map; the panel opens at the delay even while the fetch is in flight, showing the list item's own overview until the rest arrives.
- SimilarTitles stays a server component; the client wrapper takes serializable props and its `Link` children.

## Plan

1. `getTitlePreviewAction` + `TitlePreview` type: certification, genres, runtime/seasons and four cast members from `tmdb.getDetails`.
2. `hover/TitleHoverCard.tsx`: fine-pointer gate, 450ms open delay, pointer hit-test, scroll/resize dismissal, module-level cache, portal; `PreviewPanel.tsx`: backdrop, actions, meta, genres, overview, cast portraits, spring pop.
3. `MediaCarousel`: delete the inline Netflix panel and wrap the card; `GenreSection` and `SimilarTitles`: wrap their cards; mark the artwork with `data-hover-media`.
4. `experiences.ts`: Cinevo `previewOnHover: true`.
5. Browser-check the panel on home rows and More Like This, then `verify --full` and close.

**Test plan** — command → expected; a new check also shows its failing run.
- `node .agent-kit/agent-kit.mjs verify --full` → build, typecheck and lint exit 0.
- Home at 1264×800, hover a row card for ~1s → a panel appears above it, springing in, with backdrop, score, genres and cast images from `image.tmdb.org/t/p/w185`.
- Panel stays open while the pointer moves into it; clicking Play/Trailer/More info works; scrolling closes it.
- Details page → More Like This cards show the same panel.
- At 390px (or any coarse pointer) → no panel appears.

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
<!-- LOOP {"n":0,"fail":"","diff":"3326ba59480f7e99","plan":"f90500c68d1612a8"} -->
<!-- VERIFY:END -->

## Close-out

**Summary** — One shared `TitleHoverCard` now gives Cinevo's poster cards a Prime-style preview: after a 450ms rest on a fine pointer at 900px and up, a spring panel pops out of the card with the backdrop, score, synopsis, certificate, runtime or season count, genre chips and four cast portraits, plus Play, Trailer and More info. It reuses `getTitlePreviewAction` (cached per title), hit-tests the pointer before closing so reaching for the panel keeps it open, and dismisses on scroll, resize, pointer-down or leave. The old inline Netflix panel in `MediaCarousel` was replaced by it, and `GenreSection` and `SimilarTitles` were wrapped too; clones keep their own card behaviour.

**Docs updated** — README.md: a **Hover previews** bullet under Discover.

**Follow-ups** — none

**Scope amended at close** — The tree still holds the uncommitted TASK-1, TASK-2 and TASK-3 edits (detail layouts, polish, Classic layout) plus their task and change files and .commandcode/; TASK-4 wrote only the nine files in its touches.: `.agent-kit/docs/API_SKELETON.md`, `.agent-kit/docs/ARCH_MAP.md`, `package-lock.json`, `package.json`, `prisma/schema.prisma`, `src/app/actions/site-theme.ts`, `src/app/layout.tsx`, `src/app/watch/[type]/[id]/page.tsx`, `src/components/BackButton.tsx`, `src/components/theme/ThemeStudio.tsx`, `src/lib/theme/active.ts`, `src/lib/theme/site.ts`, `src/lib/theme/studio/cookie.ts`, `src/lib/theme/studio/provider.tsx`, `src/lib/theme/studio/types.ts`, `src/lib/tmdb.ts`, `.commandcode/taste/taste.md`, `components.json`, `prisma/migrations/20261028000000_add_detail_layout/migration.sql`, `src/components/reactbits/BlurText.tsx`, `src/components/reactbits/CountUp.tsx`, `src/components/reactbits/GlareHover.tsx`, `src/components/reactbits/SplitText.tsx`, `src/components/reactbits/SpotlightCard.tsx`, `src/components/reactbits/TiltedCard.tsx`, `src/components/theme/DetailLayoutPicker.tsx`, `src/components/watch/detail/ClassicLayout.tsx`, `src/components/watch/detail/ConsoleLayout.module.css`, `src/components/watch/detail/ConsoleLayout.tsx`, `src/components/watch/detail/DetailActions.tsx`, `src/components/watch/detail/DetailChrome.tsx`, `src/components/watch/detail/DetailFacts.tsx`, `src/components/watch/detail/DossierLayout.module.css`, `src/components/watch/detail/DossierLayout.tsx`, `src/components/watch/detail/format.ts`, `src/components/watch/detail/index.ts`, `src/components/watch/detail/StageBackdrop.tsx`, `src/components/watch/detail/StageLayout.module.css`, `src/components/watch/detail/StageLayout.tsx`, `src/components/watch/detail/types.ts`, `src/lib/theme/detail-layouts.ts`

<!-- FILES:START -->
- `.agent-kit/docs/API_SKELETON.md`
- `.agent-kit/docs/ARCH_MAP.md`
- `README.md`
- `package-lock.json`
- `package.json`
- `prisma/schema.prisma`
- `src/app/actions/site-theme.ts`
- `src/app/actions/tmdb-actions.ts`
- `src/app/layout.tsx`
- `src/app/watch/[type]/[id]/page.tsx`
- `src/components/BackButton.tsx`
- `src/components/dashboard/GenreSection.tsx`
- `src/components/dashboard/MediaCarousel.tsx`
- `src/components/theme/ThemeStudio.tsx`
- `src/lib/theme/active.ts`
- `src/lib/theme/experiences.ts`
- `src/lib/theme/site.ts`
- `src/lib/theme/studio/cookie.ts`
- `src/lib/theme/studio/provider.tsx`
- `src/lib/theme/studio/types.ts`
- `src/lib/tmdb.ts`
- `.commandcode/taste/taste.md`
- `components.json`
- `prisma/migrations/20261028000000_add_detail_layout/migration.sql`
- `src/components/hover/PreviewPanel.tsx`
- `src/components/hover/TitleHoverCard.tsx`
- `src/components/hover/types.ts`
- `src/components/reactbits/BlurText.tsx`
- `src/components/reactbits/CountUp.tsx`
- `src/components/reactbits/GlareHover.tsx`
- `src/components/reactbits/SplitText.tsx`
- `src/components/reactbits/SpotlightCard.tsx`
- `src/components/reactbits/TiltedCard.tsx`
- `src/components/theme/DetailLayoutPicker.tsx`
- `src/components/watch/detail/ClassicLayout.tsx`
- `src/components/watch/detail/ConsoleLayout.module.css`
- `src/components/watch/detail/ConsoleLayout.tsx`
- `src/components/watch/detail/DetailActions.tsx`
- `src/components/watch/detail/DetailChrome.tsx`
- `src/components/watch/detail/DetailFacts.tsx`
- `src/components/watch/detail/DossierLayout.module.css`
- `src/components/watch/detail/DossierLayout.tsx`
- `src/components/watch/detail/format.ts`
- `src/components/watch/detail/index.ts`
- `src/components/watch/detail/SimilarTitles.tsx`
- `src/components/watch/detail/StageBackdrop.tsx`
- `src/components/watch/detail/StageLayout.module.css`
- `src/components/watch/detail/StageLayout.tsx`
- `src/components/watch/detail/types.ts`
- `src/lib/theme/detail-layouts.ts`
<!-- FILES:END -->
