# 🎬 Cinevo

**A cinema that fits in a browser tab.**

Cinevo is a streaming front-end that behaves like a premium app rather than a
catalogue with links. Trailers play inline on the hero. Cards lift under the
cursor. Rows stagger in as you scroll. Your history follows you between devices,
your remote's D-pad works on the TV in the lounge, and when you run out of things
to watch there's a wall of live radio from ninety-odd countries.

Built with **Next.js 16**, **React 19**, **Prisma** and **TMDB**.

---

## ✨ What's inside

### 🍿 Browse & discover

- 🎞️ **Cinematic hero** with inline trailer previews and instant **Play** / **Trailer** actions.
- 🔥 **Dynamic rows** — Trending, New Releases, Popular TV, Top Rated, studio collections (Marvel, DC) and regional cinema (Bollywood, Tollywood), each with **See All** and **Load More**.
- 🧭 **Browse** with filters for type, genre, year, rating and sort order.
- 🔎 **Search** across titles *and* people.
- 💡 **"Because you watched…"** — picks that follow your history.
- 👤 **Person pages** with bio, age and known-for filmography.
- 🌐 **3D Dome Gallery** — spin through popular titles on an interactive sphere.
- 🎴 **Mystery Pack** — reveal random picks with filters, shuffle and selectable foil effects.

### ▶️ Watch

- 📺 **Multi-provider player** that remembers your preferred source per title.
- 🎚️ Season / episode pickers, **prev / next episode**, and a one-tap **report broken provider**.
- ⌨️ **Hotkeys** — `F` fullscreen, `T` trailer, `P` cycle provider, `S` cycle sandbox mode, `Shift + ← / →` for episodes.
- 🎭 **Cast** and **More Like This** alongside the player.

### 📻 Live Radio

The newest wing of the building, and the one with the most machinery behind it.

- 🌍 **1,284 browsable categories**, distilled from a 4,684-entry upstream index and sorted into **Genres · Decades · Countries · Languages · Moods**.
- 🎛️ **Three-band equaliser** — bass, mid and treble with six presets, running on real Web Audio biquad filters.
- ❤️ **Favourites** that persist locally and sync across open tabs, with their own tinted treatment in the grid.
- 🔀 **Surprise me** — a random station from whatever list you're looking at.
- 💀 **Dead-stream handling** — flag a station as broken, and a stream that fails to open steps automatically to the next one.
- ⌨️ `Space` to play/pause, `← / →` to change station.
- 🛠️ **Admin moderation** — rename, repoint, disable or delete any station from your profile.

### ❤️ Personal

- 🕒 **Watch history** — local-first, offline-friendly, synced across devices.
- ⏯️ **Continue Watching**, one card per series.
- ⭐ **Ratings** (1–10) and **Mark as watched** on every title.
- 🔖 **Wishlist** with instant toggles.
- 🔔 **Notification bell** for new and upcoming episodes of shows you follow.

### 📱 Platform

- 📲 **PWA** — installable, with app icon and splash screen.
- 🌐 **Web Push** — alerts that arrive with the app closed.
- 📺 **TV & remote** — spatial navigation via arrow keys / D-pad, Enter and Back.
- 🍞 Themed toasts, branded loaders and skeletons.
- 🔗 Per-title **share cards** (OpenGraph / Twitter).
- ♿ Non-essential motion respects `prefers-reduced-motion` throughout.

### 🛠️ Admin

- 📊 **Overview dashboard** — users, providers, reports, ratings, devices.
- 🗂️ **Provider management** — add, edit, enable, reorder.
- 🚩 **Report triage** for user-reported broken providers.
- 📻 **Radio catalogue** — search, filter and moderate the whole station list.

---

## 🏗️ A few things worth knowing

Some of the more opinionated decisions, and why they went that way.

**Radio hydrates itself.** The upstream index lists 4,684 playlists holding
roughly **1.1 million** station entries between them — far too many to import.
Only the featured categories are seeded. Open any other one and its playlist is
fetched from upstream on the spot, deduplicated by stream URL, capped at 400
stations and written to Postgres. Every category is playable; the database only
grows into the parts people actually use.

**The upstream index is not a menu.** Alongside real categories it carries
scraper artefacts (`re`, `na`, `aac`), internal tag namespaces (`lang_en`,
`loca_us`) and catch-alls. A classifier buckets every slug and filters the noise,
which is how 4,684 raw entries become 1,284 worth showing.

**The equaliser is opt-in for a reason.** Routing an audio element through an
`AudioContext` requires a CORS-readable stream, and most icecast servers send no
CORS headers at all — requesting it would stop those stations loading. So
playback runs without `crossOrigin`, and switching the EQ on reconnects the
stream in CORS mode, reverting cleanly if the station refuses. Switching it off
rebuilds the element, because `createMediaElementSource` cannot be undone.

**The playlist resolver is a guarded hop.** Many stations point at a `.pls` or
`.m3u` wrapper that browsers can't follow and that is served without CORS, so
`/api/radio/resolve` unwraps it server-side. Because the URL comes from the
client, it refuses non-HTTP(S) schemes and loopback, private, link-local and
CGNAT hosts, then re-validates whatever it extracts. `.m3u8` is passed through
untouched — that's HLS, and unwrapping it would hand the player a single segment.

**History is local-first.** Progress is written to the browser immediately and
flushed to the database on a schedule, on unmount and on tab hide, so a dropped
connection never costs you your place.

---

## 🧱 Tech stack

| Area        | Tech                                                                |
| ----------- | ------------------------------------------------------------------- |
| Framework   | Next.js 16 (App Router, Server Actions)                             |
| UI          | React 19, Tailwind CSS v4, motion, lucide-react                     |
| Data source | The Movie Database (TMDB)                                           |
| Radio       | [`m3u-rest-api`](https://junguler.github.io/m3u-rest-api/api) index |
| Database    | PostgreSQL via Prisma 7                                             |
| Auth & host | Supabase                                                            |
| Language    | TypeScript                                                          |

---

## 🚀 Getting started

### Prerequisites

- **Node.js 20+** to run the app.
  The radio maintenance scripts use Node's native TypeScript stripping and need **22.6+**.
- A **TMDB** account with API credentials.
- A **PostgreSQL** database (a Supabase project works well).

### 1. Install

```bash
npm install
```

### 2. Configure environment

Copy [`.env.example`](./.env.example) to `.env` and fill in your database URL,
Supabase keys, TMDB credentials and Web Push (VAPID) keys.

```bash
cp .env.example .env
```

> ⚠️ VAPID keys must stay stable across deploys — regenerating them invalidates
> every existing push subscription.

### 3. Set up the database

```bash
npx prisma generate
npx prisma migrate deploy
```

### 4. Fill the radio catalogue *(optional)*

Imports every playlist from the upstream index and pre-warms the featured
categories. Skip it and `/radio` stays empty until you run it.

```bash
npm run radio:seed
```

### 5. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

> 🔑 Set a user's `Profile.role` to `admin` to unlock the admin sections in `/profile`.

---

## 📜 Scripts

| Command                  | Description                                              |
| ------------------------ | -------------------------------------------------------- |
| `npm run dev`            | Start the development server                             |
| `npm run build`          | Production build                                         |
| `npm run start`          | Run the production build                                 |
| `npm run lint`           | Lint with ESLint                                         |
| `npm run typecheck`      | Type-check without emitting                              |
| `npm run radio:seed`     | Import the radio index and pre-warm featured categories  |
| `npm run radio:backfill` | Apply the radio SQL and re-derive every category's group |

---

## ⚠️ Notes

- The embed player streams from third-party providers for demonstration
  purposes. A browser ad-blocker (e.g. uBlock Origin) is recommended.
- Radio stations are public internet streams. They go down, move and come back
  without warning — hence the report button and the automatic skip.
- Watch history is local-first: it lives in your browser and syncs to the
  database on a schedule.

---

## 📄 License

Private project — not licensed for redistribution.
