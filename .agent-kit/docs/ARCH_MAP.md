# Module Responsibility Map

One row per directory that exists. An invented layer is worse than a missing one.

| Path | Responsibility | Pure or side-effect | Import rules |
|---|---|---|---|
| `src/config.ts` | brand constants, storage-key namespacing | pure | imported by anything; imports nothing |
| `src/proxy.ts` | Next.js 16 request interceptor: refreshes the Supabase session on matched paths | side-effect (I/O) | imports `src/lib/supabase/middleware.ts` only |
| `src/app/` | routes: layouts, pages, Server Action modules, route handlers | side-effect (I/O) | imports `src/lib/` and `src/components/` |
| `src/app/actions/` | `"use server"` mutations and queries called from client components | side-effect (I/O) | imports `src/lib/db.ts`, `src/lib/auth.ts`, `src/lib/tmdb.ts` |
| `src/app/api/` | HTTP route handlers: health, push cron, radio resolve | side-effect (I/O) | imports `src/lib/` only |
| `src/components/` | client UI, grouped by feature (dashboard, watch, radio, admin, theme, tv, reactbits) | mixed; client components | imports `src/lib/`, `src/config.ts` |
| `src/components/hover/` | the shared hover preview: open delay, portal, pointer hit-test, title and person panels | mixed; client components | imports `src/lib/tmdb.ts` types and `src/app/actions/` |
| `src/lib/` | domain logic, integrations, client stores | mixed | never imports `src/app/` or `src/components/` |
| `src/lib/supabase/` | Supabase client factories for browser, server and the session refresher | side-effect (I/O) | imported by auth and the proxy |
| `src/lib/theme/` | theme, experience and detail-layout resolution: presets, cookie codec, tokens, provider | mixed; `active.ts` is the server entry | imported by the root layout and pages |
| `src/lib/theme/studio/` | Theme Studio: cookie parse/validate, token → CSS vars, provider, server style tag | mixed | re-exported through `src/lib/theme/studio/index.ts` |
| `src/components/reactbits/card-swap/` | the ReactBits CardSwap deck: slot layout, spring/bounce, drag, parallax, hover spread, autoplay | client | takes custom children; CSS vars from the theme |
| `src/lib/theme/card-effects.ts` | the two independent card-effect axes (`cardEffect`, `heroEffect`) and the decay-ring bounds | shared | imported by the theme, Studio and home cards |
| `src/components/media/DecayBorder.tsx` | the reusable decay border: accent ring + SVG-noise mask, 10fps drift, pointer shift | client | render inside a relative rounded media container; per-surface list in [CARD_SURFACES.md](CARD_SURFACES.md) |
| `src/components/watch/detail/` | the three Cinevo details layouts plus the one props/format contract they share | client components | imports `src/components/watch/`, `src/components/reactbits/`, `src/lib/tmdb.ts` types |
| `src/lib/radio/` | the radio category taxonomy distilled from the upstream index | pure | imported by radio actions and UI |
| `src/lib/stores/` | tiny cross-component stores (persistence options) | mixed | imported by components |
| `src/data/` | static data shipped with the app (currently `src/data/radio/`) | pure | imported by `src/lib/radio/` |
| `prisma/` | schema and append-only migrations | side-effect (schema) | never imported at runtime; the client is generated |
| `prisma/seed/` | maintenance scripts run by hand under Node type stripping | side-effect (I/O) | import `@prisma/client`; not part of the build |
| `public/` | static assets, service worker, icons | n/a | served by path, never imported |
| `android-twa/` | Bubblewrap Android wrapper around the deployed site | n/a | no JS imports; built by Gradle |
| `scripts/` | kit machinery only (`agent-kit.mjs`) | side-effect | never imported by app code |

## Boundaries

- **Pure** modules take values and return values. No I/O, no clock, no randomness, no network.
- **Side-effect** modules own one kind of I/O. A module that owns two kinds is two modules.
- A boundary that is not written here does not exist; do not invent a layer while editing.

## What this repo actually enforces

- **`src/lib/` never reaches up.** Nothing under `src/lib/` imports from `src/app/` or
  `src/components/`. Domain code that needs something from a route is passed it as an
  argument.
- **One Prisma client.** `src/lib/db.ts` is the only place a `PrismaClient` is constructed;
  it is cached on `globalThis` outside production so hot reload does not open a pool per edit.
- **One theme resolution per request.** `getActiveThemeState()` is `react`'s `cache`d, so a
  request reads the published theme row once no matter how many callers ask.
- **Feature folders over flat directories.** `src/components/` groups by feature
  (`dashboard/`, `watch/`, `radio/`, `admin/`, `theme/`); a component used by two features
  moves up, never gets copied.

## Where a change usually lands

| You are changing | It lives in |
|---|---|
| a page's layout or data | `src/app/<route>/page.tsx` |
| a mutation called from the browser | `src/app/actions/<domain>.ts` |
| TMDB fetch or shape | `src/lib/tmdb.ts` |
| watch progress persistence | `src/lib/watchStore.ts` + `src/lib/watchSyncClient.ts` + `src/app/actions/progress.ts` |
| a provider embed URL | `src/lib/providers.ts` |
| theme, experience, tokens or detail layout | `src/lib/theme/` |
| a Cinevo details layout | `src/components/watch/detail/` (selection in `src/lib/theme/detail-layouts.ts`) |
| a table or column | `prisma/schema.prisma` + a new migration |
| admin capability | `src/app/actions/admin.ts` (and its `requireAdmin` guard) |