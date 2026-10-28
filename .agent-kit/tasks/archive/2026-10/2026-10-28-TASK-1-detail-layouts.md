---
id: TASK-1
parent: ""
lane: PLANNED
status: DONE
closed: 2026-10-28
created: 2026-10-28
baseline: e3077e25271623d11a32cd7b9877c4ee2e7f3a84
touches: [components.json, package.json, package-lock.json, prisma/schema.prisma, prisma/migrations/20261028000000_add_detail_layout/migration.sql, src/lib/tmdb.ts, src/lib/theme/detail-layouts.ts, src/lib/theme/studio/types.ts, src/lib/theme/studio/cookie.ts, src/lib/theme/studio/provider.tsx, src/lib/theme/active.ts, src/lib/theme/site.ts, src/app/actions/site-theme.ts, src/app/layout.tsx, src/components/theme/ThemeStudio.tsx, src/components/theme/DetailLayoutPicker.tsx, src/components/watch/detail/index.ts, src/components/watch/detail/types.ts, src/components/watch/detail/format.ts, src/components/watch/detail/DetailChrome.tsx, src/components/watch/detail/DetailActions.tsx, src/components/watch/detail/DetailFacts.tsx, src/components/watch/detail/SimilarTitles.tsx, src/components/watch/detail/StageLayout.tsx, src/components/watch/detail/StageLayout.module.css, src/components/watch/detail/DossierLayout.tsx, src/components/watch/detail/DossierLayout.module.css, src/components/watch/detail/ConsoleLayout.tsx, src/components/watch/detail/ConsoleLayout.module.css, src/components/reactbits/SplitText.tsx, src/components/reactbits/CountUp.tsx, src/components/reactbits/TiltedCard.tsx, src/components/reactbits/SpotlightCard.tsx, src/components/reactbits/BlurText.tsx, src/components/reactbits/GlareHover.tsx, src/app/watch/[type]/[id]/page.tsx, README.md, .agent-kit/docs/ARCH_MAP.md, .agent-kit/docs/API_SKELETON.md]
depends_on: []
type: changed  # added | changed | fixed | removed
summary: "Three switchable Cinevo details layouts — Stage, Dossier, Console — with a studio picker and a published default."
---
# TASK-1 — detail layouts

## Scope (frozen once approved)

**Intent** — "Enhance the details page with different layout which can be configurable via theme studio": replace the Cinevo details page with three complete overhauls — Stage, Dossier, Console — each switchable from Theme Studio, with an admin-published site default and a per-browser override.

**In scope**
- A third theme axis, `detailLayout`, resolved once per request in `getActiveThemeState()`: cookie field `l`, `SiteTheme.detailLayout`, one migration.
- Theme Studio: a "Details page" section with the three layouts; admin "Publish current" carries the layout; published label names it.
- Three Cinevo details layouts under `src/components/watch/detail/`, sharing one data contract and reusing `SeasonList`, `CastSection`, `CollectionRow`, `WishlistButton`, `DetailTrailerButton`, `WatchProviders`, `ShareButton`.
- Six ReactBits registry components — `SplitText`, `CountUp`, `TiltedCard`, `SpotlightCard`, `BlurText`, `GlareHover` — downloaded through the shadcn registry, then moved under `src/components/reactbits/` and retokenized.
- Richer TMDB data on the details page: `append_to_response=credits,keywords,external_ids,images,release_dates,content_ratings`, surfaced as certification, director/writers, vote count, production companies/countries, spoken languages, networks, budget/revenue, keywords, stills, and external links.
- README feature note and the two docs pages the change touches.

**Out of scope**
- The clone experience detail pages (`DetailPage.tsx` stays the Netflix / Disney+ Hotstar / Apple TV+ branch).
- The player's internals, watch progress and wishlist behaviour.
- Per-layout knobs beyond choosing the layout (backdrop motion, column ratio, density are follow-ups).
- A new animation library beyond the installed `motion` and `gsap`. `@gsap/react` is the only new package, required by the SplitText registry item.

**Decisions** — only choices a later session would otherwise re-open, each with the pointer it
rests on (`path:line`, a command's result, or the owner's words). No explanation.
- Layout is a third axis beside palette and experience, not a fourth experience: the owner asked for it in Theme Studio, and `getActiveThemeState()` is the only theme reader (`theming.md` §1).
- Cinevo only: the owner chose "Cinevo only (Recommended)" so the clone detail pages keep their service-native design.
- Default layout `stage`: the owner picked "Published default + cookie"; Stage is the closest successor to the current Cinevo page.
- ReactBits are registry items, not a library: `components.json` configures the `@react-bits` namespace and `shadcn add` downloads the TS/TW source; its declared dependencies are installed (owner's correction, 2026-10-28). `gsap` is already installed; `@gsap/react` is the only addition.
- TMDB enrichment uses one `append_to_response` on the existing details call, not new requests: `credits,keywords,external_ids,images,release_dates,content_ratings`. The separate `tmdb.getCast()` call in the details page is dropped because `credits.cast` now arrives with the details (owner: "you can use whatever data you want from the tmdb").
- Certification is read from `release_dates` (movie) or `content_ratings` (TV), US region, falling back to `NR`; the clone layouts keep their existing hardcoded maturity strings.
- Console tabs are `?view=` links rendered on the server, so back/refresh work and no tab state hydrates.
- The current inline Cinevo page is deleted, not kept as a fourth layout.

## Plan

1. Add `src/lib/theme/detail-layouts.ts`: the three ids, labels, descriptions and `DEFAULT_DETAIL_LAYOUT_ID = "stage"`; add `detailLayout` to `CompactCookiePayload` as `l`, parse it in `cookie.ts`, and resolve it in `active.ts` (trusted cookie → published row → shipped default).
2. Schema and migration: `detailLayout String @default("stage")` on `SiteTheme`; new migration `20261028000000_add_detail_layout` with `ALTER TABLE "SiteTheme" ADD COLUMN IF NOT EXISTS "detailLayout" TEXT NOT NULL DEFAULT 'stage';`. Extend `site.ts` normalization and `publishSiteTheme`.
3. Thread the axis through `ThemeProvider` (`detailLayout` state, `setDetailLayout`, every `persist` call keeps the current layout), `layout.tsx` initial state, and a new `DetailLayoutPicker` section in `ThemeStudio` that calls `setDetailLayout` then `router.refresh()`.
4. TMDB: add the appended response types to `tmdb.ts` and pass `append_to_response=credits,keywords,external_ids,images,release_dates,content_ratings` in `getDetails`. Drop the separate `getCast` call in the watch page and read `details.credits.cast`.
5. Build `src/components/watch/detail/`: `types.ts` (one props contract), `format.ts` (year, date, duration, match, certification, money, keywords, URLs), `DetailActions.tsx`, `DetailFacts.tsx` and `SimilarTitles.tsx` (shared across the three), `index.ts`.
6. Create `components.json` with the `@react-bits` registry namespace, then add `SplitText-TS-TW`, `CountUp-TS-TW`, `TiltedCard-TS-TW`, `SpotlightCard-TS-TW`, `BlurText-TS-TW`, `GlareHover-TS-TW`. Move each to `src/components/reactbits/<Name>.tsx` and wire it to theme tokens and reduced motion.
7. Implement `StageLayout`, `DossierLayout`, `ConsoleLayout` with one CSS module each; reuse the existing seasons, cast, collection, wishlist, trailer, provider and share components. Stage adds a stills strip and director/writers line; Dossier adds the spec table, keywords and external links; Console adds keywords, collection and a richer More tab. Console tabs link to `?view=overview|episodes|cast|more`.
8. Replace the inline Cinevo markup in `watch/[type]/[id]/page.tsx` with a `detailLayout` switch over the three layouts; keep `Nav`, `FloatingBackButton`, `RadioAutoPause`, `TrackWatch`, the player children, and the clone-experience branch unchanged. Preserve the legacy `?theme=` page gradient and back-button accent.
9. Update `README.md` and the `ARCH_MAP.md` / `API_SKELETON.md` entries for the new folder, theme axis, TMDB shape and publish input.

**Test plan** — command → expected; a new check also shows its failing run.
- `node .agent-kit/agent-kit.mjs verify --full` → build, typecheck and lint exit 0.
- Registry install → the six files exist under `src/components/reactbits/`, and `@gsap/react` is the only package added.
- Browser, movie route and TV route: each of stage, dossier, console renders its sections; certification, director/writers, keywords and stills come from TMDB; the player mounts; studio switch survives a reload; console `?view=` survives back/refresh.
- Browser at 390px, 768px and 1280px: no horizontal overflow; Dossier poster column collapses on mobile; Console rail stacks.
- Reduced motion: SplitText, BlurText, CountUp, TiltedCard and GlareHover render without animation.
- Published default: only if the local database has the migration applied; otherwise record it as unverified and leave the admin publish check open.

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
<!-- LOOP {"n":0,"fail":"","diff":"35990603f308f724","plan":"68860e6b92698075"} -->
<!-- VERIFY:END -->

## Close-out

**Summary** — Replaced the Cinevo details page with three complete layouts — Stage, Dossier and Console — behind a third theme axis (`detailLayout`: trusted cookie `l` → `SiteTheme.detailLayout` → `stage`). Theme Studio gains a Details page picker and admins publish the layout with the palette. The three layouts share one props/format contract, reuse the existing player, season, cast and collection components, and surface the appended TMDB file (certificate, director/writers, budget/box office, networks, keywords, stills, IMDb link). Six ReactBits registry components were vendored under `src/components/reactbits/` and retokenized to the theme's CSS variables.

**Docs updated** — `README.md` (Watch bullet, Theme Studio bullet); `.agent-kit/docs/ARCH_MAP.md` (theme axis wording, new `watch/detail/` row, landing table); `.agent-kit/docs/API_SKELETON.md` (`getActiveThemeState().detailLayout`, `detail-layouts.ts` exports).

**Follow-ups** — The picker and "Publish current" were not clicked: they need an admin session, which this environment does not have. Persistence was verified by reading `provider.tsx:persist` and by loading each layout with the exact cookie that write produces (`{id,def,l}` against the published preset id) — SSR rendered the chosen layout with no mismatch banner. Re-test the two admin-only clicks on a signed-in admin session. Pre-existing `NavBar` hydration mismatch (present on every page, logged by React) is untouched by this task.

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
- `src/components/watch/detail/StageLayout.module.css`
- `src/components/watch/detail/StageLayout.tsx`
- `src/components/watch/detail/types.ts`
- `src/lib/theme/detail-layouts.ts`
<!-- FILES:END -->
