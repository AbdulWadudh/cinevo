---
id: TASK-5
parent: ""
lane: QUICK
status: DONE
closed: 2026-10-28
created: 2026-10-28
baseline: e3077e25271623d11a32cd7b9877c4ee2e7f3a84
touches: ["src/app/watch/[type]/[id]/loading.tsx", "src/components/watch/detail/DetailSkeleton.tsx", ".agent-kit/docs/API_SKELETON.md", ".agent-kit/docs/ARCH_MAP.md", "README.md", "package-lock.json", "package.json", "prisma/schema.prisma", "src/app/actions/site-theme.ts", "src/app/actions/tmdb-actions.ts", "src/app/layout.tsx", "src/app/watch/[type]/[id]/page.tsx", "src/components/BackButton.tsx", "src/components/dashboard/GenreSection.tsx", "src/components/dashboard/MediaCarousel.tsx", "src/components/theme/ThemeStudio.tsx", "src/lib/theme/active.ts", "src/lib/theme/experiences.ts", "src/lib/theme/site.ts", "src/lib/theme/studio/cookie.ts", "src/lib/theme/studio/provider.tsx", "src/lib/theme/studio/types.ts", "src/lib/tmdb.ts", ".commandcode/taste/taste.md", "components.json", "prisma/migrations/20261028000000_add_detail_layout/migration.sql", "src/components/hover/PreviewPanel.tsx", "src/components/hover/TitleHoverCard.tsx", "src/components/hover/types.ts", "src/components/reactbits/BlurText.tsx", "src/components/reactbits/CountUp.tsx", "src/components/reactbits/GlareHover.tsx", "src/components/reactbits/SplitText.tsx", "src/components/reactbits/SpotlightCard.tsx", "src/components/reactbits/TiltedCard.tsx", "src/components/theme/DetailLayoutPicker.tsx", "src/components/watch/detail/ClassicLayout.tsx", "src/components/watch/detail/ConsoleLayout.module.css", "src/components/watch/detail/ConsoleLayout.tsx", "src/components/watch/detail/DetailActions.tsx", "src/components/watch/detail/DetailChrome.tsx", "src/components/watch/detail/DetailFacts.tsx", "src/components/watch/detail/DossierLayout.module.css", "src/components/watch/detail/DossierLayout.tsx", "src/components/watch/detail/format.ts", "src/components/watch/detail/index.ts", "src/components/watch/detail/SimilarTitles.tsx", "src/components/watch/detail/StageBackdrop.tsx", "src/components/watch/detail/StageLayout.module.css", "src/components/watch/detail/StageLayout.tsx", "src/components/watch/detail/types.ts", "src/lib/theme/detail-layouts.ts"]
depends_on: []
type: fixed
summary: "Match the details-page loading skeleton to the active layout so the page no longer flashes a Classic-shaped placeholder."
---
# TASK-5 — detail loading skeleton

## Scope (frozen once approved)

**Intent** — Owner: "while details page is loading there is a default page skeletons load then the selected layout update fix this flash issue".

**In scope**
- `loading.tsx` reads `getActiveThemeState()` and renders a skeleton shaped like the layout the page will paint.
- One `DetailSkeleton` with a shape per layout — Classic, Stage, Dossier, Console — and a backdrop-hero shape for the clone experiences.

**Out of scope**
- Prefetching, streaming or data-fetch changes; the layouts themselves.
- Skeleton shapes below the first viewport (rows, cast, season list).

**Decisions**
- The skeleton covers only the first viewport: a longer placeholder flashes away (`loading.tsx` before this task showed a 70vh player plus a two-column metadata grid that matches no layout).
- `loading.tsx` may await the theme: `getActiveThemeState` is `cache`d per request (`src/lib/theme/active.ts:31`), so the page and fallback agree on layout.
- Breakpoints copy each layout's grid: Stage `StageLayout.module.css:44` (lg), Dossier `DossierLayout.module.css:42` (lg), Console `ConsoleLayout.module.css:10` (xl), plus the clone hero from `src/components/experience/DetailPage.tsx:121`.

## Plan

1. Add `src/components/watch/detail/DetailSkeleton.tsx`: pulse primitives and one shape per layout id; clone experiences get a backdrop-hero shape.
2. Make `loading.tsx` async and pick the shape from `themeState.experience` / `themeState.detailLayout`.

**Test plan** — command → expected; a new check also shows its failing run.
- `node .agent-kit/agent-kit.mjs verify --full` → build, typecheck, lint exit 0.
- `curl -s -H 'Cookie: k79_theme_state=…'` each layout on `/watch/tv/96677` → HTML carries `data-detail-skeleton="<layout>"` for that cookie.
- Browser: skeleton's shape matches the painted layout at 1264×800, no horizontal overflow at 390px, no console errors.

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
<!-- LOOP {"n":0,"fail":"","diff":"12bd33243cd37e27","plan":"60a98cca1c5b25d3"} -->
<!-- VERIFY:END -->

## Close-out

**Summary** — The watch route's loading fallback now reads the active theme and paints a skeleton shaped like the layout that follows: Classic's player-then-title, Stage's full-height hero with the copy beside the player, Dossier's masthead plus poster rail, Console's player/control grid, and a backdrop hero for the clone experiences. It covers only the first viewport, and each shape breaks where its layout's CSS does (1100/901/1101px), so navigation no longer shows one generic placeholder that jumps when the real page arrives.

**Docs updated** — none needed: the fallback is internal to the watch route; no documented surface changed.

**Follow-ups** — none

**Scope amended at close** — The tree still holds the uncommitted TASK-1 through TASK-4 edits (detail layouts, polish, Classic layout, hover preview) plus their task and change files and .commandcode/; TASK-5 wrote only loading.tsx and DetailSkeleton.tsx, and its temporary preview route was deleted before close.: `.agent-kit/docs/API_SKELETON.md`, `.agent-kit/docs/ARCH_MAP.md`, `README.md`, `package-lock.json`, `package.json`, `prisma/schema.prisma`, `src/app/actions/site-theme.ts`, `src/app/actions/tmdb-actions.ts`, `src/app/layout.tsx`, `src/app/watch/[type]/[id]/page.tsx`, `src/components/BackButton.tsx`, `src/components/dashboard/GenreSection.tsx`, `src/components/dashboard/MediaCarousel.tsx`, `src/components/theme/ThemeStudio.tsx`, `src/lib/theme/active.ts`, `src/lib/theme/experiences.ts`, `src/lib/theme/site.ts`, `src/lib/theme/studio/cookie.ts`, `src/lib/theme/studio/provider.tsx`, `src/lib/theme/studio/types.ts`, `src/lib/tmdb.ts`, `.commandcode/taste/taste.md`, `components.json`, `prisma/migrations/20261028000000_add_detail_layout/migration.sql`, `src/components/hover/PreviewPanel.tsx`, `src/components/hover/TitleHoverCard.tsx`, `src/components/hover/types.ts`, `src/components/reactbits/BlurText.tsx`, `src/components/reactbits/CountUp.tsx`, `src/components/reactbits/GlareHover.tsx`, `src/components/reactbits/SplitText.tsx`, `src/components/reactbits/SpotlightCard.tsx`, `src/components/reactbits/TiltedCard.tsx`, `src/components/theme/DetailLayoutPicker.tsx`, `src/components/watch/detail/ClassicLayout.tsx`, `src/components/watch/detail/ConsoleLayout.module.css`, `src/components/watch/detail/ConsoleLayout.tsx`, `src/components/watch/detail/DetailActions.tsx`, `src/components/watch/detail/DetailChrome.tsx`, `src/components/watch/detail/DetailFacts.tsx`, `src/components/watch/detail/DossierLayout.module.css`, `src/components/watch/detail/DossierLayout.tsx`, `src/components/watch/detail/format.ts`, `src/components/watch/detail/index.ts`, `src/components/watch/detail/SimilarTitles.tsx`, `src/components/watch/detail/StageBackdrop.tsx`, `src/components/watch/detail/StageLayout.module.css`, `src/components/watch/detail/StageLayout.tsx`, `src/components/watch/detail/types.ts`, `src/lib/theme/detail-layouts.ts`

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
- `src/app/watch/[type]/[id]/loading.tsx`
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
- `src/components/watch/detail/DetailSkeleton.tsx`
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
