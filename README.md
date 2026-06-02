# 🎬 Cinevo

A modern, cinematic movie & TV streaming front-end built with **Next.js 16**, **React 19**, and **TMDB**. Browse trending titles, explore genres and studio collections, watch via DB-managed embed providers, rate and track what you watch, get push notifications for new episodes, and install it as a PWA.

> ⚠️ This project runs on a build of **Next.js 16.2.6** with breaking changes from older versions. See [`AGENTS.md`](./AGENTS.md) — before changing framework code, consult the bundled docs in `node_modules/next/dist/docs/`.

---

## ✨ Features

### Browse & discover
- **Cinematic hero banner** with inline muted trailer previews, **Play** + **Watch Trailer** actions, and hover-to-pause rotation.
- **Dynamic rows** powered by TMDB: Trending, New Releases, Popular TV, Top Rated, plus **studio collections** (Marvel, DC) and **regional cinema** (Bollywood, Tollywood) — each with a **"See All"** grid and **Load More** paging.
- **Browse page** (`/browse`) with full filters — type, genre, year, min rating, sort — using fully-custom animated dropdowns (no native `<select>`).
- **Dedicated search** (`/search`) across titles **and people** (with filmographies).
- **"Because you watched …"** personalized row seeded from your latest watch.
- **Person pages** (`/person/[id]`) — bio, age, and known-for filmography.
- **Franchise / collection** rows on movie pages (`belongs_to_collection`).

### Watch
- **Multi-provider embed player** — providers are stored in the DB, cached in `localStorage` (version + TTL), with a per-title **last-used** default and an admin-set fallback default.
- **Per-provider sandbox** — sandbox is **OFF by default**; specific providers can be flagged sandbox-on in the DB/UI (the explicit exceptions).
- **Direct-load player** (no extra poster/play gate), season/episode dropdowns, compact mobile controls, icon-only **prev / next episode**, **report broken provider**, and a **refresh providers** control.
- **Trailer modal** (anywhere) showing the title, rating, release date + a **Play** button for the actual title.
- **Cast**, **More Like This**, and a click-to-play trailer in the sidebar.

### Personal
- **Watch history** (`/history`) — **local-first** (instant, works signed-out/offline), synced to Postgres every ~10 min + on tab hide, with cross-device merge and a manual **force-sync** button in the profile. Single / batch delete + clear-all.
- **Continue Watching** rail (one card per series).
- **Personal ratings** (1–10) and **Mark as watched** on every title.
- **Episode checkmarks + per-season progress** in the episode list.
- **Wishlist** with optimistic toggles.
- **Notification bell** — new / upcoming episodes for wishlisted shows, plus **opt-in Web Push** that fires even when the app is closed.

### Platform
- **PWA** — installable (manifest + service worker), standalone display, app icon & splash.
- **Web Push** — VAPID-based subscriptions, a daily cron endpoint that pushes new episodes.
- **Toasts** (sonner) themed to the app.
- **OpenGraph / Twitter** metadata (per-title share cards).
- **Error boundaries**, branded loaders/skeletons, and `next/image` optimization throughout.

### Admin (role = `admin`, in `/profile`)
- **Overview dashboard** — users, providers, reports, ratings, watch records, push devices; **promote/demote users** by email.
- **Provider CRUD** — manage embed providers (label, URLs, sandbox, enabled, default, order).
- **Provider reports** — triage user-reported broken providers (resolve / delete / clear).

---

## 🧱 Tech Stack

| Area         | Tech                                                          |
| ------------ | ------------------------------------------------------------- |
| Framework    | Next.js 16 (App Router, Server Actions)                       |
| UI           | React 19, Tailwind CSS v4, lucide-react, motion, sonner       |
| Data source  | The Movie Database (TMDB) REST API                            |
| Database     | PostgreSQL via Prisma 7 (`@prisma/adapter-pg`)                |
| Auth & host  | Supabase (Auth + Postgres)                                    |
| Push         | Web Push (VAPID) via `web-push`                               |
| Language     | TypeScript                                                    |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18.18+ (Node 20+ recommended)
- A **TMDB** account + API credentials — https://www.themoviedb.org/settings/api
- A **PostgreSQL** database (e.g. a Supabase project)

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Create a `.env` file in the project root:

```bash
# ── TMDB (src/lib/tmdb.ts) ──
TMDB_API_KEY=your_tmdb_v3_api_key
TMDB_ACCESS_TOKEN=your_tmdb_v4_read_access_token

# ── PostgreSQL (Prisma — src/lib/db.ts & prisma.config.ts) ──
DATABASE_URL=postgresql://user:password@host:5432/dbname?pgbouncer=true
DIRECT_URL=postgresql://user:password@host:5432/dbname

# ── Supabase Auth (src/lib/supabase/*) ──
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_or_publishable_key

# ── Public site URL — REQUIRED in production (OAuth redirects, OG metadata) ──
SITE_URL=https://your-domain.com

# ── Web Push (VAPID) — generate with: npx web-push generate-vapid-keys ──
VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_vapid_public_key   # same as VAPID_PUBLIC_KEY (baked at build time)
VAPID_SUBJECT=mailto:you@example.com

# ── Push notification cron auth (Vercel cron sends this as a Bearer token) ──
CRON_SECRET=a_long_random_secret
```

> **VAPID keys must stay stable** across deploys — regenerating them invalidates every existing push subscription. `NEXT_PUBLIC_VAPID_PUBLIC_KEY` is inlined at **build time**, so set it before building.

> **Google OAuth:** enable the Google provider in **Supabase → Authentication → Providers**, add `https://your-project.supabase.co/auth/v1/callback` as an authorized redirect URI in Google Cloud, and add `http://localhost:3000/auth/callback` (and your prod callback) under **Authentication → URL Configuration → Redirect URLs**.

### 3. Set up the database

```bash
npx prisma generate     # generate the Prisma client
npx prisma db push      # sync the schema to your database
```

Provider rows seed automatically on first load (from `DEFAULT_PROVIDERS`).

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

> Make a user an admin by setting `Profile.role = 'admin'` (e.g. in the Supabase table editor) to unlock the admin sections in `/profile`.

---

## 📜 Scripts

| Command         | Description                                  |
| --------------- | -------------------------------------------- |
| `npm run dev`   | Start the development server                 |
| `npm run build` | `prisma generate` + production build         |
| `npm run start` | Run the production build                     |
| `npm run lint`  | Lint with ESLint                             |

---

## 🔔 Web Push & Cron

- Users opt in via the **notification bell → "Enable push alerts"** (requires HTTPS or `localhost`).
- The endpoint **`/api/push/run`** computes new-episode notifications for subscribed users and sends pushes (deduped via `SentPush`). It's protected by `CRON_SECRET` (accepts `Authorization: Bearer <secret>` or `?secret=`).
- [`vercel.json`](./vercel.json) schedules it daily; Vercel cron sends the `CRON_SECRET` automatically.

---

## 📁 Project Structure

```
src/
├─ app/
│  ├─ page.tsx                 # Home dashboard + genre browse view
│  ├─ browse/                  # Filtered discover grid
│  ├─ search/                  # Dedicated search page
│  ├─ history/                 # Watch history (local-first)
│  ├─ person/[id]/             # Person profile + filmography
│  ├─ watch/[type]/[id]/       # Watch / details page
│  ├─ wishlist/ · profile/     # Wishlist & account (admin sections)
│  ├─ manifest.ts              # PWA web app manifest
│  ├─ error.tsx · global-error.tsx · not-found.tsx
│  ├─ api/push/run/            # Web Push cron endpoint
│  └─ actions/                 # Server Actions (tmdb, progress, wishlist,
│                              #   providers, ratings, reports, push,
│                              #   notifications, admin, auth)
├─ components/
│  ├─ dashboard/               # HeroCarousel, MediaCarousel, GenreSection, …
│  ├─ player/IframePlayer.tsx  # DB-driven multi-provider embed player
│  ├─ watch/                   # TrackWatch, WatchSync, WatchActions, SeasonList, …
│  ├─ admin/                   # ProviderAdmin, ProviderReportsAdmin, AdminDashboard
│  ├─ browse/ · search/ · history/
│  ├─ ui/                      # CustomSelect, Toaster, Loader
│  ├─ NotificationBell · TrailerProvider · PwaRegister
│  └─ wishlist/
└─ lib/
   ├─ tmdb.ts                  # TMDB API client
   ├─ db.ts                    # Prisma client (pg adapter)
   ├─ providers.ts             # Provider types, URL templating, localStorage cache
   ├─ watchStore.ts            # Local-first watch store (useSyncExternalStore)
   ├─ watchSyncClient.ts       # DB ↔ local sync helpers
   ├─ episodeNotifications.ts  # Shared new-episode computation
   ├─ push.ts · pushClient.ts  # Web Push (server / client)
   └─ supabase/                # SSR + browser Supabase clients
prisma/
└─ schema.prisma
public/
└─ sw.js                       # Service worker (push + notification clicks)
```

---

## 🗄️ Data Models

- **Profile** — synced with the Supabase auth user ID; `role` of `user`/`admin`; owns the relations below.
- **Provider** — embeddable video provider (key, label, movie/tv URL templates with `{id}`/`{season}`/`{episode}`/`{progress}` placeholders, `sandboxMode` (`strict`/`balanced`/`off`), `enabled`, `isDefault`, `sortOrder`).
- **WatchProgress** — per-title (and per season/episode for TV) watch record.
- **Wishlist** — saved titles with rating + release date.
- **Rating** — personal 1–10 rating per title.
- **ProviderReport** — user-submitted "provider not working" reports for admin triage.
- **PushSubscription** — a browser Web Push subscription per device.
- **SentPush** — dedupe log so an episode is pushed to a user at most once.

---

## ⚠️ Notes

- The embed player streams from third-party providers for demonstration purposes. Each provider has a **sandbox mode** (`balanced` default / `strict` / `off`): `balanced` and `strict` block pop-up & redirect ads via the iframe `sandbox` attribute (no `allow-popups`/`allow-top-navigation`), while `off` removes the sandbox for providers that refuse to run sandboxed. Viewers can also cycle the mode per-session from the player. For full ad-blocking, a browser ad-blocker (e.g. uBlock Origin) is still the most effective option.
- TMDB responses are cached for 1 hour via Next.js fetch revalidation.
- Watch history is **local-first**: it lives in `localStorage` and syncs to the DB on a schedule — exact second-by-second playback position is not tracked (the providers are cross-origin iframes).

---

## 📄 License

Private project — not licensed for redistribution.
