---
id: TASK-2
parent: ""
lane: PLANNED
status: DONE
closed: 2026-10-28
created: 2026-10-28
baseline: e3077e25271623d11a32cd7b9877c4ee2e7f3a84
touches: ["src/components/watch/detail/StageLayout.tsx", "src/components/watch/detail/StageLayout.module.css", "src/components/watch/detail/StageBackdrop.tsx", "src/components/watch/detail/DossierLayout.module.css", "src/components/watch/detail/ConsoleLayout.tsx", "src/components/watch/detail/ConsoleLayout.module.css", ".agent-kit/docs/API_SKELETON.md", ".agent-kit/docs/ARCH_MAP.md", "README.md", "package-lock.json", "package.json", "prisma/schema.prisma", "src/app/actions/site-theme.ts", "src/app/layout.tsx", "src/app/watch/[type]/[id]/page.tsx", "src/components/theme/ThemeStudio.tsx", "src/lib/theme/active.ts", "src/lib/theme/site.ts", "src/lib/theme/studio/cookie.ts", "src/lib/theme/studio/provider.tsx", "src/lib/theme/studio/types.ts", "src/lib/tmdb.ts", ".commandcode/taste/taste.md", "components.json", "prisma/migrations/20261028000000_add_detail_layout/migration.sql", "src/components/reactbits/BlurText.tsx", "src/components/reactbits/CountUp.tsx", "src/components/reactbits/GlareHover.tsx", "src/components/reactbits/SplitText.tsx", "src/components/reactbits/SpotlightCard.tsx", "src/components/reactbits/TiltedCard.tsx", "src/components/theme/DetailLayoutPicker.tsx", "src/components/watch/detail/DetailActions.tsx", "src/components/watch/detail/DetailChrome.tsx", "src/components/watch/detail/DetailFacts.tsx", "src/components/watch/detail/DossierLayout.tsx", "src/components/watch/detail/format.ts", "src/components/watch/detail/index.ts", "src/components/watch/detail/SimilarTitles.tsx", "src/components/watch/detail/types.ts", "src/lib/theme/detail-layouts.ts"]
depends_on: [TASK-1]
type: changed
summary: "Tighten Dossier, fold Console's Story into its rail, and fit Stage's player in one viewport over stills."
---
# TASK-2 — detail layout polish

## Scope (frozen once approved)

**Intent** — Owner's notes on the shipped layouts: "in dossier this is taking too much space"; "in console you can eliminate the story tab by move its content below the name card on the right"; "in stage you can adjust the player to be shown full rather i need to scroll to view the whole player"; plus "how can i go to the cinevo default layout?".

**In scope**
- Dossier: less vertical space before the poster — tighter page top, masthead, title size and column gap.
- Console: no Story tab; tagline, overview, genres and keywords move into the right rail under the name card. Movie tabs become Cast · Facts · More; TV tabs become Episodes · Cast · Facts · More.
- Stage: two-column hero on desktop — copy left, large 16:9 player right — so the whole player is inside the first viewport. Stacks to today's centered order below 1100px.
- Stage: the frames strip goes; the hero backdrop becomes a full-height cross-fading slideshow of the backdrop plus TMDB stills.
- The answer to the default-layout question is documented in the close report, not shipped as a new control.

**Out of scope**
- The theme axis, cookie codec, studio picker or publish path (TASK-1 behaviour is unchanged).
- Player internals, season browser, cast and collection components.
- Clone-experience detail pages.
- A one-click "reset to site default" control; the picker's Stage entry is the shipped default.

**Decisions**
- Stage goes two columns, not player-first: the owner chose "Two-column hero (Recommended)" on 2026-10-28.
- Hero backdrop spans the full hero height (`min-height: 100svh`) and cycles the backdrop plus stills every 7s with a 1.2s opacity fade; the owner asked for "the backdrop can take the full hight with fading effect … rather you can slide show it in the backdrop". The Frames strip is deleted, not hidden. Reduced motion freezes it on the first image.
- Console story copy sits under the card in the right rail, not inside the card: owner's words, "below the name card on the right"; the card keeps name, stats and actions only.
- The Story tab is removed rather than renamed, and `?view=story` falls back to the first tab (`cast` for movies, `episodes` for TV) so old links still land on content.
- Dossier keeps its editorial masthead; only spacing and type scale change (owner: "taking too much space").
- Cinevo's default layout is Stage (`DEFAULT_DETAIL_LAYOUT_ID` in `src/lib/theme/detail-layouts.ts:5`), reachable from Theme Studio → Details page and Profile → Appearance.

## Plan

1. `StageLayout.tsx` / `.module.css`: wrap kicker → actions in a `.copy` column and keep the player beside it in a two-column `.inner` grid at ≥1100px (`minmax(0,1fr) minmax(0,1.9fr)`, centered, max-width 92rem); below 1100px keep the current stacked, centered order. Hero min-height `100svh`, top padding trimmed so the player's bottom edge clears a 768px viewport. Overview left-aligned at desktop.
2. `StageBackdrop.tsx` (new client component): render one `next/image` layer per gallery entry (backdrop first, then stills from `TMDB`), cross-fade on a 7s interval, `priority` only on the first; no timer when there is one image or reduced motion is set. Delete the Frames section from `StageLayout`.
3. `ConsoleLayout.tsx` / `.module.css`: drop the `story` tab from both tab sets, default `active` to `tabs[0].id`, wrap the control card and a new story block in a right-hand `.rail`, and portal the story markup (tagline, overview, genres, keywords) there; widen the rail to 25rem and size the story copy for a narrow column.
4. `DossierLayout.module.css`: page top `7.5rem → 6.25rem`, title clamp `4.75rem → 4rem`, masthead `padding-bottom 1.5 → 1rem`, tagline `0.9 → 0.55rem`, columns `padding-top 2.5 → 1.75rem`.
5. Verify in the browser at 1568×800 and 1366×768 (player fully visible on Stage, backdrop cycling), 1280 and 390 for all three; then `verify --full` and close.

**Test plan** — command → expected; a new check also shows its failing run.
- `node .agent-kit/agent-kit.mjs verify --full` → build, typecheck and lint exit 0.
- Stage at 1366×768 and 1568×800 → the player's bottom edge is above the fold; copy stays centered in its column; below 1100px the old stack returns.
- Stage backdrop → fills the hero height, cross-fades to a still after ~7s, no "Frames" heading remains; with reduced motion it stays on the first image.
- Console → tabs show Cast/Facts/More (movie) and Episodes/Cast/Facts/More (TV); `?view=story` renders the Cast panel (movie); story copy sits under the name card; no horizontal overflow at 390.
- Dossier at 1568 → poster starts at least ~60px higher than before; no clipping.

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
<!-- LOOP {"n":0,"fail":"","diff":"81eb17241b752d73","plan":"fc83f87ca2a9cb85"} -->
<!-- VERIFY:END -->

## Close-out

**Summary** — Dossier's masthead is compact (page top 6.25rem, 4rem title, tighter columns). Console loses its Story tab; tagline, overview, genres and keywords sit under the name card and `?view=story` falls back to Cast/Episodes. Stage is a two-column hero over a full-height backdrop that cross-fades backdrop and TMDB stills every 7s; the Frames strip is gone and the player clears a 768px viewport.

**Docs updated** — none needed: no public interface, command or setup step changed; README's three-layout bullet still holds.

**Follow-ups** — none

**Scope amended at close** — TASK-1's edits are still uncommitted in the same tree, so the scope diff lists them; TASK-2 wrote only its six touches. .commandcode/ belongs to another tool.: `.agent-kit/docs/API_SKELETON.md`, `.agent-kit/docs/ARCH_MAP.md`, `README.md`, `package-lock.json`, `package.json`, `prisma/schema.prisma`, `src/app/actions/site-theme.ts`, `src/app/layout.tsx`, `src/app/watch/[type]/[id]/page.tsx`, `src/components/theme/ThemeStudio.tsx`, `src/lib/theme/active.ts`, `src/lib/theme/site.ts`, `src/lib/theme/studio/cookie.ts`, `src/lib/theme/studio/provider.tsx`, `src/lib/theme/studio/types.ts`, `src/lib/tmdb.ts`, `.commandcode/taste/taste.md`, `components.json`, `prisma/migrations/20261028000000_add_detail_layout/migration.sql`, `src/components/reactbits/BlurText.tsx`, `src/components/reactbits/CountUp.tsx`, `src/components/reactbits/GlareHover.tsx`, `src/components/reactbits/SplitText.tsx`, `src/components/reactbits/SpotlightCard.tsx`, `src/components/reactbits/TiltedCard.tsx`, `src/components/theme/DetailLayoutPicker.tsx`, `src/components/watch/detail/DetailActions.tsx`, `src/components/watch/detail/DetailChrome.tsx`, `src/components/watch/detail/DetailFacts.tsx`, `src/components/watch/detail/DossierLayout.tsx`, `src/components/watch/detail/format.ts`, `src/components/watch/detail/index.ts`, `src/components/watch/detail/SimilarTitles.tsx`, `src/components/watch/detail/types.ts`, `src/lib/theme/detail-layouts.ts`

<!-- FILES:START -->
- `.agent-kit/docs/API_SKELETON.md`
- `.agent-kit/docs/ARCH_MAP.md`
- `README.md`
- `package-lock.json`
- `package.json`
- `prisma/schema.prisma`
- `src/app/actions/site-theme.ts`
- `src/app/layout.tsx`
- `src/app/watch/[type]/[id]/page.tsx`
- `src/components/theme/ThemeStudio.tsx`
- `src/lib/theme/active.ts`
- `src/lib/theme/site.ts`
- `src/lib/theme/studio/cookie.ts`
- `src/lib/theme/studio/provider.tsx`
- `src/lib/theme/studio/types.ts`
- `src/lib/tmdb.ts`
- `.commandcode/taste/taste.md`
- `components.json`
- `prisma/migrations/20261028000000_add_detail_layout/migration.sql`
- `src/components/reactbits/BlurText.tsx`
- `src/components/reactbits/CountUp.tsx`
- `src/components/reactbits/GlareHover.tsx`
- `src/components/reactbits/SplitText.tsx`
- `src/components/reactbits/SpotlightCard.tsx`
- `src/components/reactbits/TiltedCard.tsx`
- `src/components/theme/DetailLayoutPicker.tsx`
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
