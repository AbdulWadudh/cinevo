---
id: TASK-6
parent: ""
lane: PLANNED
status: DONE
closed: 2026-10-28
created: 2026-10-28
baseline: e3077e25271623d11a32cd7b9877c4ee2e7f3a84
touches: ["src/components/dashboard/ContinueWatching.tsx", ".agent-kit/docs/API_SKELETON.md", ".agent-kit/docs/ARCH_MAP.md", "README.md", "package-lock.json", "package.json", "prisma/schema.prisma", "src/app/actions/site-theme.ts", "src/app/actions/tmdb-actions.ts", "src/app/layout.tsx", "src/app/watch/[type]/[id]/loading.tsx", "src/app/watch/[type]/[id]/page.tsx", "src/components/BackButton.tsx", "src/components/dashboard/GenreSection.tsx", "src/components/dashboard/MediaCarousel.tsx", "src/components/theme/ThemeStudio.tsx", "src/lib/theme/active.ts", "src/lib/theme/experiences.ts", "src/lib/theme/site.ts", "src/lib/theme/studio/cookie.ts", "src/lib/theme/studio/provider.tsx", "src/lib/theme/studio/types.ts", "src/lib/tmdb.ts", ".commandcode/taste/taste.md", "components.json", "prisma/migrations/20261028000000_add_detail_layout/migration.sql", "src/components/hover/PreviewPanel.tsx", "src/components/hover/TitleHoverCard.tsx", "src/components/hover/types.ts", "src/components/reactbits/BlurText.tsx", "src/components/reactbits/CountUp.tsx", "src/components/reactbits/GlareHover.tsx", "src/components/reactbits/SplitText.tsx", "src/components/reactbits/SpotlightCard.tsx", "src/components/reactbits/TiltedCard.tsx", "src/components/theme/DetailLayoutPicker.tsx", "src/components/watch/detail/ClassicLayout.tsx", "src/components/watch/detail/ConsoleLayout.module.css", "src/components/watch/detail/ConsoleLayout.tsx", "src/components/watch/detail/DetailActions.tsx", "src/components/watch/detail/DetailChrome.tsx", "src/components/watch/detail/DetailFacts.tsx", "src/components/watch/detail/DetailSkeleton.tsx", "src/components/watch/detail/DossierLayout.module.css", "src/components/watch/detail/DossierLayout.tsx", "src/components/watch/detail/format.ts", "src/components/watch/detail/index.ts", "src/components/watch/detail/SimilarTitles.tsx", "src/components/watch/detail/StageBackdrop.tsx", "src/components/watch/detail/StageLayout.module.css", "src/components/watch/detail/StageLayout.tsx", "src/components/watch/detail/types.ts", "src/lib/theme/detail-layouts.ts", "src/components/hover/useHoverPopover.ts", "src/components/hover/PersonHoverCard.tsx", "src/components/hover/PersonPreviewPanel.tsx", "src/components/watch/CastSection.tsx", "src/components/wishlist/WishlistHeart.tsx", "src/components/hover/Skeleton.tsx", "src/app/person/[id]/page.tsx"]
depends_on: [TASK-4]
type: changed
summary: "Cast and Known For cards get hover previews with carousels and skeletons; wishlist moves into the panel."
---
# TASK-6 — continue watching hover

## Scope (frozen once approved)

**Intent** — Owner, with a Continue Watching card: "the hover cards is not showing".

**In scope**
- Wrap each Continue Watching card in `TitleHoverCard` and mark the artwork `data-hover-media`.
- Build the `TMDBMedia` shape the preview expects from the stored `WatchEntry`; the existing `getTitlePreviewAction` fills the real overview, genres, certificate and cast.

**Out of scope**
- Daily Five, the browse/search grids, studio hubs and clone cards (still TASK-4's out-of-scope list).
- The panel's own markup, data action and hover timing.

**Decisions**
- Watch entries store `posterPath` only (`src/lib/watchStore.ts:12`), so it is passed as both poster and backdrop; `PreviewPanel` falls back to the poster when no backdrop exists (`PreviewPanel.tsx:53`).
- No experience gate: `PersonalHub` renders only in Cinevo's home branch (`src/app/page.tsx:282`).

## Reopened 2026-10-28 — cast hover and card actions

**Why** — Owner: "it was adding the onhover detail card on every card its pending on the actor/cast cards i need that hover card with all the details and also in movie/series card add the wishlist icon in where play and trailer buttons are there just make it float to right and also you can remove the icons its showing on these card which will be inaccessable due to the hover card". The owner also directed this continue in the last task rather than open a new one.

**In scope**
- The shared hover mechanics move out of `TitleHoverCard` into `useHoverPopover`, unchanged in timing and clamping.
- A cast-card hover panel: portrait, name, role, department, birthday and age, place of birth, biography, four known-for posters and a profile link, fed by `getPersonPreviewAction` (`tmdb.getPerson` + `tmdb.getPersonCredits`, cached per person).
- `PreviewPanel` gains a right-floated wishlist toggle driven by the existing `WishlistProvider`.
- Inline cards stop showing what the panel carries: the heart, the centred Play/Trailer overlay, and ContinueWatching's Play and trash. MediaCarousel keeps them when `experience.cards.previewOnHover` is false.
- Touch keeps access: hearts and the history trash stay visible on coarse pointers; only `(hover: hover) and (pointer: fine) and (min-width: 900px)` hides them.
- The person page's Known For grid gets the same title hover card and icon treatment.
- Cast portraits use the theme's `--radius-card` token instead of a hard-coded circle, so a theme with a square or pill radius carries into the hover card.
- Portraits use `object-cover object-top`: the image fills the theme-radius frame with no letterbox bars, and the top edge is kept so the head is not cropped.
- The panel closes when focus leaves the card, the window blurs or the tab hides — not only on pointer leave or scroll.
- Opening and closing are animated: the close reverses the open (scale back toward the card origin) over 260ms instead of unmounting it in one frame.
- Both hover panels' rows are horizontal snap carousels with hover arrows: the title panel's Cast (up to 12 names) and the person panel's Known For (up to 12 titles). A scroll inside the panel does not dismiss it, and a panel-internal click does not reach the card row beneath.
- Repeated credits (same id and media type) are dropped before slicing, so a title that lists the person twice appears once in the person page grid and the Known For row.
- Both panels render content-shaped skeletons while the action is in flight: meta and genre bars, three overview lines, four cast circles, and the person's department, facts, bio and four poster slots.

**Out of scope**
- The See All grid, SearchClient, WishlistGrid and PersonalHub (no hover panel there).
- A remove-from-history action inside the panel; deletion stays on `/history`.

**Decisions**
- Reuse the portal and hit-test mechanics: rows clip overflow and the panel must survive the pointer reaching it (`src/components/hover/TitleHoverCard.tsx:96-150`).
- Hide card controls only where the panel opens, with the same fine-pointer-and-900px condition (`.agent-kit/rules/pointer-and-touch.md:1-5`).
- Known-for is the first twelve credits with a poster after the existing popularity sort (`src/lib/tmdb.ts:674-688`).

## Plan (reopened)

1. Extract `useHoverPopover` from `TitleHoverCard` with identical constants; `TitleHoverCard` consumes it.
2. Add `PersonPreview` types and `getPersonPreviewAction`; add the browser cache and request dedupe.
3. Build `PersonHoverCard` and `PersonPreviewPanel`; wrap each `CastSection` card, anchored on its portrait, passing the role.
4. Add the right-floated wishlist toggle to `PreviewPanel`.
5. Remove panel-duplicated inline controls from MediaCarousel (only when preview is on), GenreSection, SimilarTitles and ContinueWatching; keep coarse-pointer visibility.
6. Wrap the person page's Known For cards in `TitleHoverCard` and drop their inline Play overlay.
7. Add `Skeleton` and the loading state; each panel mirrors its final shapes while the action resolves.
8. Update `API_SKELETON.md`, `ARCH_MAP.md` and the README hover bullet; run the suite and a browser check.

**Test plan** — command → expected.
- `npm run typecheck` → exit 0.
- `npm run lint` → 0 errors; the 23 baseline warnings may not grow.
- `npm run build` → exit 0.
- Browser at 1264×800: hover a cast portrait → spring panel with portrait, role, birthday/age, place of birth, biography and four known-for posters; stays open when the pointer enters it.
- Browser: hover a title card → the heart sits at the right of the Play/Trailer row and toggles; the card underneath shows no inline heart or Play/Trailer overlay.
- Browser at 390px coarse: no panel; wishlist heart and ContinueWatching trash remain visible.
- Browser on `/person/<id>`: hovering a Known For poster opens the title panel.
- Browser with the network throttled: each panel shows skeleton bars where meta, genres, overview, cast or known-for will land, and no layout jump on resolve.
- `agent-kit verify --full` → build, typecheck, lint exit 0.

> The close-out below records the first close; this reopened scope supersedes its "controls are unchanged" sentence.

## Plan

1. Import `TitleHoverCard`, wrap the card, add `data-hover-media` on the artwork, and build the preview item from `WatchEntry`.

**Test plan** — command → expected; a new check also shows its failing run.
- Before the change: hover a Continue Watching card at 1264×800 → no `z-[90]` panel (observed: none).
- After: same hover → panel with title, Play, Trailer and cast; stays open crossing into it; scroll closes it.
- `node .agent-kit/agent-kit.mjs verify --full` → build, typecheck, lint exit 0.

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
<!-- LOOP {"n":0,"fail":"","diff":"6d925357475cc424","plan":"d3a6686563e7e647"} -->
<!-- VERIFY:END -->

## Close-out

**Summary** — Cast cards and the profile page's Known For grid now use the shared hover preview: actor biography, birthday, birthplace, known-for titles and a profile link. Both panels show match-shaped skeletons while the action resolves, and their Cast and Known For rows are snap carousels with hover arrows. Title cards move the wishlist toggle into the panel and drop the inline Play/Trailer/heart controls where the panel covers them, while coarse pointers keep them. The close reverses the open toward the card origin over 260ms, and focus loss, window blur or tab hide dismiss the panel.

**Docs updated** — README.md: the Hover previews bullet; API_SKELETON.md and ARCH_MAP.md: the hover module, the person action and the radius/rows behavior.

**Follow-ups** — none

**Scope amended at close** — The tree still holds the uncommitted TASK-1 through TASK-5 edits (detail layouts, polish, Classic layout, hover preview, layout-aware loading skeleton) plus their task and change files and .commandcode/; TASK-6 wrote only ContinueWatching.tsx.: `.agent-kit/docs/API_SKELETON.md`, `.agent-kit/docs/ARCH_MAP.md`, `README.md`, `package-lock.json`, `package.json`, `prisma/schema.prisma`, `src/app/actions/site-theme.ts`, `src/app/actions/tmdb-actions.ts`, `src/app/layout.tsx`, `src/app/watch/[type]/[id]/loading.tsx`, `src/app/watch/[type]/[id]/page.tsx`, `src/components/BackButton.tsx`, `src/components/dashboard/GenreSection.tsx`, `src/components/dashboard/MediaCarousel.tsx`, `src/components/theme/ThemeStudio.tsx`, `src/lib/theme/active.ts`, `src/lib/theme/experiences.ts`, `src/lib/theme/site.ts`, `src/lib/theme/studio/cookie.ts`, `src/lib/theme/studio/provider.tsx`, `src/lib/theme/studio/types.ts`, `src/lib/tmdb.ts`, `.commandcode/taste/taste.md`, `components.json`, `prisma/migrations/20261028000000_add_detail_layout/migration.sql`, `src/components/hover/PreviewPanel.tsx`, `src/components/hover/TitleHoverCard.tsx`, `src/components/hover/types.ts`, `src/components/reactbits/BlurText.tsx`, `src/components/reactbits/CountUp.tsx`, `src/components/reactbits/GlareHover.tsx`, `src/components/reactbits/SplitText.tsx`, `src/components/reactbits/SpotlightCard.tsx`, `src/components/reactbits/TiltedCard.tsx`, `src/components/theme/DetailLayoutPicker.tsx`, `src/components/watch/detail/ClassicLayout.tsx`, `src/components/watch/detail/ConsoleLayout.module.css`, `src/components/watch/detail/ConsoleLayout.tsx`, `src/components/watch/detail/DetailActions.tsx`, `src/components/watch/detail/DetailChrome.tsx`, `src/components/watch/detail/DetailFacts.tsx`, `src/components/watch/detail/DetailSkeleton.tsx`, `src/components/watch/detail/DossierLayout.module.css`, `src/components/watch/detail/DossierLayout.tsx`, `src/components/watch/detail/format.ts`, `src/components/watch/detail/index.ts`, `src/components/watch/detail/SimilarTitles.tsx`, `src/components/watch/detail/StageBackdrop.tsx`, `src/components/watch/detail/StageLayout.module.css`, `src/components/watch/detail/StageLayout.tsx`, `src/components/watch/detail/types.ts`, `src/lib/theme/detail-layouts.ts`

<!-- FILES:START -->
- `.agent-kit/docs/API_SKELETON.md`
- `.agent-kit/docs/ARCH_MAP.md`
- `.commandcode/taste/taste.md`
- `README.md`
- `components.json`
- `package-lock.json`
- `package.json`
- `prisma/migrations/20261028000000_add_detail_layout/migration.sql`
- `prisma/schema.prisma`
- `src/app/actions/site-theme.ts`
- `src/app/actions/tmdb-actions.ts`
- `src/app/layout.tsx`
- `src/app/person/[id]/page.tsx`
- `src/app/watch/[type]/[id]/loading.tsx`
- `src/app/watch/[type]/[id]/page.tsx`
- `src/components/BackButton.tsx`
- `src/components/dashboard/ContinueWatching.tsx`
- `src/components/dashboard/GenreSection.tsx`
- `src/components/dashboard/MediaCarousel.tsx`
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
- `src/components/theme/ThemeStudio.tsx`
- `src/components/watch/CastSection.tsx`
- `src/components/watch/detail/ClassicLayout.tsx`
- `src/components/watch/detail/ConsoleLayout.module.css`
- `src/components/watch/detail/ConsoleLayout.tsx`
- `src/components/watch/detail/DetailActions.tsx`
- `src/components/watch/detail/DetailChrome.tsx`
- `src/components/watch/detail/DetailFacts.tsx`
- `src/components/watch/detail/DetailSkeleton.tsx`
- `src/components/watch/detail/DossierLayout.module.css`
- `src/components/watch/detail/DossierLayout.tsx`
- `src/components/watch/detail/SimilarTitles.tsx`
- `src/components/watch/detail/StageBackdrop.tsx`
- `src/components/watch/detail/StageLayout.module.css`
- `src/components/watch/detail/StageLayout.tsx`
- `src/components/watch/detail/format.ts`
- `src/components/watch/detail/index.ts`
- `src/components/watch/detail/types.ts`
- `src/components/wishlist/WishlistHeart.tsx`
- `src/lib/theme/active.ts`
- `src/lib/theme/detail-layouts.ts`
- `src/lib/theme/experiences.ts`
- `src/lib/theme/site.ts`
- `src/lib/theme/studio/cookie.ts`
- `src/lib/theme/studio/provider.tsx`
- `src/lib/theme/studio/types.ts`
- `src/lib/tmdb.ts`
- `src/components/hover/PersonHoverCard.tsx`
- `src/components/hover/PersonPreviewPanel.tsx`
- `src/components/hover/Skeleton.tsx`
- `src/components/hover/useHoverPopover.ts`
<!-- FILES:END -->
