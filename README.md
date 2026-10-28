# 🎬 Cinevo

**A cinema that fits in a browser tab.**

Cinevo is a streaming front-end for movies, TV and live radio — not a catalogue with links.
Trailers play inline on the hero, cards preview under the cursor, watch history follows you
between devices, the TV D-pad works, and a live-radio wing carries its own player. Two Studio
axes repaint the site: four clone experiences (Cinevo, Netflix, Disney+ Hotstar, Apple TV+) and
a theme/typography/radius panel.

## 🧱 Stack

| Area | Tech |
|---|---|
| Framework | Next.js 16.2 (App Router, Server Actions, Turbopack build), React 19 |
| Styling | Tailwind CSS v4, `motion`, lucide-react |
| Data | PostgreSQL via Prisma 7 (`prisma-client-js`, `@prisma/adapter-pg`) |
| Auth & host | Supabase Auth (`@supabase/ssr`) |
| Catalogue | The Movie Database (TMDB) |
| Radio | [`m3u-rest-api`](https://junguler.github.io/m3u-rest-api/api) index |
| Language | TypeScript (strict) |

## 🚀 Getting started

Prerequisites: **Node.js 20+** (the radio scripts need **22.6+** for TypeScript stripping), a
TMDB account, and a PostgreSQL database — a Supabase project works well.

```bash
npm install
cp .env.example .env        # fill in the values below
npx prisma generate
npx prisma migrate deploy
npm run radio:seed          # optional: seed the featured radio categories
npm run dev                 # http://localhost:3000
```

`/radio` stays empty until `radio:seed` runs; any other category hydrates from upstream the first
time it is opened. Set one user's `Profile.role` to `admin` by hand to unlock the admin panels in
`/profile` — the Users panel promotes everyone after that.

## 🔑 Environment

| Variable | Use |
|---|---|
| `DATABASE_URL` | pooled Postgres URL (Supabase transaction pooler, port 6543) |
| `DIRECT_URL` | session pooler; migrations only, run outside the app |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase auth; inlined into the client bundle |
| `TMDB_API_KEY`, `TMDB_ACCESS_TOKEN` | TMDB reads; required at build too (`/gallery` and `/reveal` prerender against TMDB) |
| `VAPID_PUBLIC_KEY`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | Web Push; generate with `npx web-push generate-vapid-keys` |
| `PUSH_CRON_SECRET` | bearer token the scheduled push job sends to `/api/push/run` |
| `SITE_URL` | public origin for OAuth and email redirects; falls back to forwarded headers when unset |

Two rules: **`NEXT_PUBLIC_*` values are baked in at build time**, so they must exist when the
image is built; **VAPID keys must stay stable**, because regenerating them invalidates every
existing push subscription. `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and `NEXT_PUBLIC_TMDB_API_KEY`
sit in `.env.example` but are not read by the app.

## 📜 Scripts

| Command | Description |
|---|---|
| `npm run dev` | development server on :3000 |
| `npm run build` | `prisma generate` then a production build |
| `npm run start` | serve the built output |
| `npm run lint` | ESLint 9 (flat config, `eslint-config-next`) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run radio:seed` | import the radio index and pre-warm the featured categories |
| `npm run radio:backfill` | re-derive every category's group from the seeded index |

## 🗺️ Routes

| Route | What it serves |
|---|---|
| `/` | home: hero, rows, Continue Watching, Daily Five, Your Cinevo |
| `/browse` | filter by type, genre, year, rating and sort |
| `/search` | titles and people |
| `/watch/[type]/[id]` | the player, cast, More Like This and the episode browser |
| `/person/[id]` | biography and known-for filmography |
| `/wishlist`, `/history` | saved titles and local-first watch history |
| `/gallery`, `/reveal` | 3D dome gallery and the Mystery Pack |
| `/radio` | the live-radio wing and its mini player |
| `/profile` | Your Cinevo hub, appearance, and the admin panels |
| `/login`, `/terms`, `/privacy` | auth and legal pages |
| `/api/health`, `/api/push/run`, `/api/radio/resolve` | route handlers |
| `/auth/callback` | Supabase OAuth callback |

## ✨ Features

**Browse** — cinematic hero with inline trailers and Play / Trailer; rows for Trending, New
Releases, Popular TV, Top Rated, studio collections and regional cinema, each with See All and
Load More; hover previews with backdrop, score, cast and wishlist actions, plus a second-level
cast preview; search, filters, "Because you watched…", Daily Five and a personal hub.

**Watch** — multi-provider player that remembers your source per title, season/episode pickers,
prev/next episode, broken-provider reports, hotkeys (`F` fullscreen, `T` trailer, `P` provider,
`S` sandbox, `Shift + ←/→` episodes), and four details layouts: Classic, Stage, Dossier and
Console.

**Radio** — 1,284 browsable categories across Genres, Decades, Countries, Languages and Moods;
optional three-band equaliser on real Web Audio biquads; favourites that sync to your account;
a mini player that follows you across the app; dead-stream skip and admin moderation.

**Personal** — local-first watch history that syncs across devices, Continue Watching, ratings,
Mark as watched, wishlist, and an episode-notification bell.

**Platform** — Switch to Experience (four structural clones, not recolours); Theme Studio with
palettes, colour tokens, fonts, radius, elevation, detail layout, card effect (a decayed accent
edge at rest) and hero carousel (standard or a CardSwap deck); PWA, Web Push, TV D-pad spatial
navigation, themed toasts and loaders, per-title share cards, and `prefers-reduced-motion` support.

**Admin** — overview dashboard, provider management, report triage, and radio catalogue
moderation.

## 🐳 Deploy

The [`Dockerfile`](./Dockerfile) builds a two-stage image on `output: "standalone"` and runs as
the unprivileged `node` user. Debian rather than Alpine, because Next's SWC binary,
`lightningcss` and `@tailwindcss/oxide` each ship a separate musl build.

```bash
docker compose up --build      # reads .env for build args and runtime env
curl localhost:3000/api/health
```

The image declares its own `HEALTHCHECK` against `/api/health`, so a Coolify Compose resource
needs no separate check. Give the build every variable marked *build* above: `ARG` lines receive
them from `docker build --build-arg`. Migrations are **not** applied on boot — the image has no
Prisma CLI, and concurrent containers racing `migrate deploy` is its own outage. Run
`npx prisma migrate deploy` against `DIRECT_URL` before deploying a schema change. Add your
domain as the Supabase Site URL and `https://your-domain/auth/callback` as a redirect URL, or
OAuth fails silently. Replace the `vercel.json` cron with a scheduled task running
`curl -fsS -H "Authorization: Bearer $PUSH_CRON_SECRET" http://localhost:3000/api/push/run`.

**The image installs with `npm install`, not `npm ci`, on purpose.** A lockfile generated on
Windows cannot satisfy `npm ci` on Linux: the wasm32 fallbacks of `@tailwindcss/oxide` and
`sharp` need a hoisted `@emnapi/core` and `@emnapi/runtime` that npm will not write from a
Windows host. To return to `npm ci`, regenerate the lockfile on Linux and commit that. Before
committing any regenerated lockfile, check the platform binaries survived:

```bash
node -e "const k=Object.keys(require('./package-lock.json').packages);console.log('linux:',k.filter(x=>/linux/.test(x)).length)"
```

Expect ~42, never 0. At 0, restore the previous lockfile rather than regenerating, so no resolved
version moves.

## ⚠️ Notes

- The embed player streams from third-party providers for demonstration purposes. A browser
  ad-blocker is recommended.
- Radio stations are public internet streams: they go down and come back without warning, hence
  the report button and the automatic skip.
- Watch history is local-first — it lives in your browser and syncs to the database in the
  background, so it works signed out.

## 📄 License

Private project — not licensed for redistribution.
