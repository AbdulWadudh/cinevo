---
id: TASK-3
parent: ""
lane: PLANNED
status: DONE
closed: 2026-10-28
created: 2026-10-28
baseline: e3077e25271623d11a32cd7b9877c4ee2e7f3a84
touches: ["src/lib/theme/detail-layouts.ts", "src/components/theme/DetailLayoutPicker.tsx", "src/components/watch/detail/ClassicLayout.tsx", "src/components/watch/detail/index.ts", "src/app/watch/[type]/[id]/page.tsx", "src/components/BackButton.tsx", "README.md", ".agent-kit/docs/API_SKELETON.md", ".agent-kit/docs/ARCH_MAP.md", "package-lock.json", "package.json", "prisma/schema.prisma", "src/app/actions/site-theme.ts", "src/app/layout.tsx", "src/components/theme/ThemeStudio.tsx", "src/lib/theme/active.ts", "src/lib/theme/site.ts", "src/lib/theme/studio/cookie.ts", "src/lib/theme/studio/provider.tsx", "src/lib/theme/studio/types.ts", "src/lib/tmdb.ts", ".commandcode/taste/taste.md", "components.json", "prisma/migrations/20261028000000_add_detail_layout/migration.sql", "src/components/reactbits/BlurText.tsx", "src/components/reactbits/CountUp.tsx", "src/components/reactbits/GlareHover.tsx", "src/components/reactbits/SplitText.tsx", "src/components/reactbits/SpotlightCard.tsx", "src/components/reactbits/TiltedCard.tsx", "src/components/watch/detail/ConsoleLayout.module.css", "src/components/watch/detail/ConsoleLayout.tsx", "src/components/watch/detail/DetailActions.tsx", "src/components/watch/detail/DetailChrome.tsx", "src/components/watch/detail/DetailFacts.tsx", "src/components/watch/detail/DossierLayout.module.css", "src/components/watch/detail/DossierLayout.tsx", "src/components/watch/detail/format.ts", "src/components/watch/detail/SimilarTitles.tsx", "src/components/watch/detail/StageBackdrop.tsx", "src/components/watch/detail/StageLayout.module.css", "src/components/watch/detail/StageLayout.tsx", "src/components/watch/detail/types.ts"]
depends_on: [TASK-1, TASK-2]
type: added
summary: "Restore the original Cinevo details page as a Classic layout and make it the shipped default; the Back pill returns home."
---
# TASK-3 — classic detail layout

## Scope (frozen once approved)

**Intent** — Owner: "stage is not by default layout its your new layout where is existing layout"; the Back pill "should go back to the home page rather then its going back the url".

**In scope**
- A fourth layout, Classic: the pre-TASK-1 Cinevo details page (player first, then title, meta, genres, overview, actions, seasons, cast, collection, More Like This), rebuilt from the HEAD markup on the shared detail module.
- Classic is the shipped default (`DEFAULT_DETAIL_LAYOUT_ID`), listed first in the studio picker.
- The details-page Back pill always routes to `/`, never `history.back()`.

**Out of scope**
- The published site-theme row and any saved per-browser choice: those still win over the shipped default until republished or re-picked.
- Stage, Dossier and Console visuals (TASK-2 behaviour is frozen).
- Clone experiences, schema and migrations.

**Decisions**
- Classic reproduces HEAD's `src/app/watch/[type]/[id]/page.tsx` markup (git `e3077e2`) rather than a re-interpretation: the owner called it "existing layout".
- It reuses the shared `detail` components (`DetailChrome`, `DetailActions`, `SimilarTitles`, `format`) so chrome, actions and the similar row stay in one place; only the page arrangement is classic's own.
- No CSS module: the original was Tailwind-only, and copying it keeps the rendered result identical.
- `BackButton` changes instead of the caller: its only user is `FloatingBackButton` on detail pages, and history-back is what the owner rejected.

## Plan

1. `detail-layouts.ts`: add `"classic"` to `DETAIL_LAYOUT_IDS` and as the first `DETAIL_LAYOUTS` entry (name "Classic"), set `DEFAULT_DETAIL_LAYOUT_ID = "classic"`; `getDetailLayout` already falls back to the first entry.
2. `ClassicLayout.tsx` (new, server component): `DetailChrome`, full-width `IframePlayer` section, then title/meta/genres/overview/`DetailActions`, `SeasonList`, `CastSection`, collection row and `SimilarTitles` — the HEAD arrangement.
3. `index.ts` export; watch page `LAYOUT_COMPONENTS` gains `classic`; `DetailLayoutPicker` maps classic to a `Rows3` icon.
4. `BackButton.tsx`: `goBack` becomes `router.push(fallback)`; `FloatingBackButton` already passes `/`.
5. Browser-check all four layouts, then `verify --full` and close.

**Test plan** — command → expected; a new check also shows its failing run.
- `node .agent-kit/agent-kit.mjs verify --full` → build, typecheck and lint exit 0.
- `/watch/tv/96677` with no saved layout cookie → Classic renders (player above title, More Like This row); picker lists Classic first and it is marked active.
- Theme Studio → each of Classic/Stage/Dossier/Console still renders after a pick.
- Click Back on a detail page after navigating from home → lands on `/`, not the previous entry.

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
<!-- LOOP {"n":0,"fail":"","diff":"4cb49628101fc020","plan":"82998b657e01746d"} -->
<!-- VERIFY:END -->

## Close-out

**Summary** — The original Cinevo details page returns as the Classic layout: full-width player, then title, meta, genres, overview, actions, seasons, cast, collection and More Like This, rebuilt from HEAD's markup on the shared detail module. Classic is now the shipped default and listed first in the studio picker; the Back pill routes to `/` instead of history.

**Docs updated** — `README.md`: the details-layouts bullet now lists Classic and names it the shipped default.

**Follow-ups** — none

**Scope amended at close** — TASK-1 and TASK-2 edits are still uncommitted in the same tree, so the scope diff lists them; TASK-3 wrote only its seven touches.: `.agent-kit/docs/API_SKELETON.md`, `.agent-kit/docs/ARCH_MAP.md`, `package-lock.json`, `package.json`, `prisma/schema.prisma`, `src/app/actions/site-theme.ts`, `src/app/layout.tsx`, `src/components/theme/ThemeStudio.tsx`, `src/lib/theme/active.ts`, `src/lib/theme/site.ts`, `src/lib/theme/studio/cookie.ts`, `src/lib/theme/studio/provider.tsx`, `src/lib/theme/studio/types.ts`, `src/lib/tmdb.ts`, `.commandcode/taste/taste.md`, `components.json`, `prisma/migrations/20261028000000_add_detail_layout/migration.sql`, `src/components/reactbits/BlurText.tsx`, `src/components/reactbits/CountUp.tsx`, `src/components/reactbits/GlareHover.tsx`, `src/components/reactbits/SplitText.tsx`, `src/components/reactbits/SpotlightCard.tsx`, `src/components/reactbits/TiltedCard.tsx`, `src/components/watch/detail/ConsoleLayout.module.css`, `src/components/watch/detail/ConsoleLayout.tsx`, `src/components/watch/detail/DetailActions.tsx`, `src/components/watch/detail/DetailChrome.tsx`, `src/components/watch/detail/DetailFacts.tsx`, `src/components/watch/detail/DossierLayout.module.css`, `src/components/watch/detail/DossierLayout.tsx`, `src/components/watch/detail/format.ts`, `src/components/watch/detail/SimilarTitles.tsx`, `src/components/watch/detail/StageBackdrop.tsx`, `src/components/watch/detail/StageLayout.module.css`, `src/components/watch/detail/StageLayout.tsx`, `src/components/watch/detail/types.ts`

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
- `src/components/BackButton.tsx`
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
