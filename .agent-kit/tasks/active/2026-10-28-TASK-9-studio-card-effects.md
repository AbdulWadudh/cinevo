---
id: TASK-9
parent: ""
lane: PLANNED
status: IN_PROGRESS
created: 2026-10-28
baseline: 4e2b5677be7f949e2d202e0cda297e6cefa06115
touches: ["src/components/reactbits/card-swap/types.ts", "src/components/reactbits/card-swap/constants.ts", "src/components/reactbits/card-swap/bounds.ts", "src/components/reactbits/card-swap/engine.ts", "src/components/reactbits/card-swap/CardSwap.tsx", "src/components/reactbits/card-swap/index.ts", "src/components/dashboard/MediaCarousel.tsx", "src/components/dashboard/HeroCarousel.tsx", "src/components/dashboard/SwapCard.tsx", "src/lib/theme/card-effects.ts", "src/components/theme/CardEffectPicker.tsx", "src/components/theme/HeroEffectPicker.tsx", "src/components/theme/ThemeStudio.tsx", "src/lib/theme/site.ts", "src/lib/theme/active.ts", "src/lib/theme/studio/cookie.ts", "src/lib/theme/studio/provider.tsx", "src/lib/theme/studio/types.ts", "src/app/actions/site-theme.ts", "src/app/layout.tsx", "prisma/schema.prisma", "prisma/migrations/20261028010000_add_card_effect/migration.sql", "prisma/migrations/20261028020000_add_hero_effect/migration.sql", "README.md", ".agent-kit/docs/API_SKELETON.md", ".agent-kit/docs/ARCH_MAP.md"]
depends_on: [TASK-4]
type: added
summary: "Two independent Studio options: an always-on eaten poster edge on home cards and the real CardSwap as the hero."
---
# TASK-9 — studio card effects

## Scope (frozen once approved)

**Intent** — Owner: "i want this effect as an options for the cards which cant be enable and disable via studio but the card should not move from its place it should have the effect of decay" and "the card swap as the home screen carosol with each details showing inside this cards and this should also be can be controll via studio" — the ReactBits Decay Card and Card Swap.

**In scope**
- Port the ReactBits CardSwap engine (spring exit/enter, bounce, parallax, hover spread, dim, fling drag, autoplay, click/arrow) into `card-swap/` modules split under the 12k ceiling; custom children, Hugeicons removed; no new dependency.
- Two independent settings persisted like `detailLayout`: `cardEffect` (`none | decay`) and `heroEffect` (`none | swap`), each with a trusted cookie (`ce`/`he`), a `SiteTheme` column, a migration, its own Studio picker and the published default.
- Decay is an **always-on eaten poster edge**: the main image's outer 14px is masked away and the same poster is revealed through an SVG-noise alpha mask, so the holes show the card surface. The image center, title, hover preview and controls are untouched, the card never moves, and the mask shifts with the cursor. No WebGL context.
- Swap is the **hero** presentation only: the hero slides are replaced by the real CardSwap deck inside a `max-w-6xl` container (not the full viewport). Each card reproduces the original slide — backdrop, inline trailer, badge, title, meta, overview, Play and Watch Trailer — landscape, with autoplay, pause on hover, drag, click and arrow keys. The home rows stay horizontal in every mode.
- Cinevo only; clone experiences keep their cards and hero.
- README and the two doc maps.

**Out of scope**
- Swap on the home rows, the details page, the browse/search grids or clone rows.
- A per-card setting.
- Removing the hero's original controls or trailer.
- New dependencies.

**Decisions** — only choices a later session would otherwise re-open, each with the pointer it
rests on (`path:line`, a command's result, or the owner's words). No explanation.
- Two axes, not one: owner corrected "also its different option from the decay card effect". `cardEffect` is `none | decay`; `heroEffect` is `none | swap`; each persists on its own (`ce`/`he`, `SiteTheme.cardEffect`/`heroEffect`).
- Decay is the border, not the picture: owner "it will not effect image inside only border will have the decay effect". The main image is masked to a content box with a 14px inset; a duplicate poster shows through an SVG-noise alpha mask over that ring, so the holes reveal the card surface.
- Decay is always on: owner "the decay effect will always visible not just on hover". The ring is CSS masks on every card, not a WebGL layer, so no context cap and no mount-on-hover.
- The hover preview stays on in decay mode: owner "on hover it will show the hover card". The mask position follows the cursor; the card's hover lift is zeroed so it does not move.
- The registry CardSwap engine is ~30k characters, over the 12k ceiling; it is split into `types`, `constants`, `bounds`, `engine` and `CardSwap`, keeps the registry's spring/bounce/parallax/hoverSpread/dim, and takes custom children with Hugeicons removed.
- The hero deck fits a container: owner "the carosol card dont strech it make it fit to the some container". It measures a `max-w-6xl` wrapper (1104px at a 1264px viewport), not the section.
- The hero cards are the original slides: owner "it will be same as the orginal ... nothing else is change". Backdrop, inline trailer, badge, title, meta, overview, Play and Watch Trailer; `draggable={false}` on the link and image so the deck drag works.
- Reduced motion disables autoplay and the decay animation; the poster/fallback remains.

## Plan

1. Split the registry CardSwap into `types`, `constants`, `bounds`, `engine` and `CardSwap`; keep the spring/bounce/parallax/hoverSpread/dim/fling drag, custom children, no Hugeicons.
2. Build the decay ring in `MediaCarousel`: mask the main image to a 14px content box and show a duplicate poster through an SVG-noise alpha mask over the ring; always on, mask position follows the cursor, hover lift zeroed.
3. Add `card-effects.ts` with both axes, `CardEffectPicker`, `HeroEffectPicker` and the two Studio sections; thread `cardEffect`/`heroEffect` through the cookies, provider, active state, `site.ts`, `site-theme.ts`, `layout.tsx`, the schema and two migrations.
4. Integrate: `MediaCarousel` renders the ring on every card while leaving the preview on; `HeroCarousel` renders the real deck inside a `max-w-6xl` container in swap mode; `SwapCard` reproduces the original slide with the trailer and no native link drag.
5. Docs, typecheck, build and browser checks of both effects.

**Test plan** — command → expected; a new check also shows its failing run.
- `agent-kit verify --full` → build, typecheck and lint exit 0.
- Studio: Card effect None/Decay and Hero carousel Standard/Swap are independent, each persists across reload, and each publishes as the site default.
- Decay: every home poster carries the eaten edge at rest; the image center, title, wishlist and hover preview are unchanged; the card does not move; the mask position changes with the cursor; no canvas is added; reduced motion keeps it static.
- Swap: the hero becomes the real deck inside a ~1104px container at a 1264px viewport and the home rows stay horizontal; the front card shows the original slide/trailer; autoplay cycles; drag flings the front card and it springs/bounces back without navigating; click/arrow keys work; hover pauses; reduced motion stops autoplay.
- Touch: the deck drags; no hover-only controls are required.
- Browser console has no context-lost or React errors; `agent-kit doctor` passes.

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
<!-- LOOP {"n":0,"fail":"","diff":"4946e8f85fd662b4","plan":"1834336849998862"} -->
<!-- VERIFY:END -->

## Close-out

**Summary** — Two independent Studio axes now drive the home cards and the hero. Card effect adds an always-on, screen-blended decay border to the home rows, genre rail, Continue Watching, Daily Five, cast, More Like This and person Known For, with a 1–12px ring slider; Hero carousel swaps the hero banner for the ReactBits CardSwap deck (94% width, landscape, 50px stack distance, persisted Card-distance control). Both persist through the cookie and SiteTheme with migrations; the hero is full 100dvh and the mobile custom scrollbar is hidden.

**Docs updated** — README.md (Studio card effects); .agent-kit/docs/API_SKELETON.md (CardSwap and card-effects); .agent-kit/docs/ARCH_MAP.md (card-swap folder); .agent-kit/docs/CARD_SURFACES.md (the card inventory); .agent-kit/docs/INDEX.md (card surfaces row).

**Follow-ups** — none

<!-- FILES:START -->
<!-- FILES:END -->
