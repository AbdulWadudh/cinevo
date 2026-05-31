# 🎬 Cinevo

A modern, cinematic movie & TV streaming front-end built with **Next.js 16**, **React 19**, and **TMDB**. Browse trending titles, explore genres and studio collections, watch via embeddable players, track progress, and build a wishlist.

> ⚠️ This project runs on a build of **Next.js 16.2.6** with breaking changes from older versions. See [`AGENTS.md`](./AGENTS.md) — before changing framework code, consult the bundled docs in `node_modules/next/dist/docs/`.

---

## ✨ Features

- **Cinematic hero banner** with inline muted trailer previews, click-through to details, and hover-to-pause rotation.
- **Dynamic rows** powered by TMDB: Trending, New Releases, Popular TV, Top Rated, plus **studio collections** (Marvel, DC) and **regional cinema** (Bollywood, Tollywood).
- **"See All" grid** on every row with **Load More** pagination.
- **Genre browse view** (`/?genre=…`) with a paginated poster grid (Movies + TV Shows).
- **Watch page** with a multi-source embed player (CineSrc / VidCore / LordFlix), sandbox toggle, season/episode selectors, cast, and a click-to-play trailer.
- **More Like This** recommendations scoped to the current title.
- **Search** (titles + people / filmographies), **Wishlist**, and **Continue Watching** progress — persisted to Postgres via Prisma.
- Responsive, dark, Tailwind CSS v4 design.

---

## 🧱 Tech Stack

| Area         | Tech                                            |
| ------------ | ----------------------------------------------- |
| Framework    | Next.js 16 (App Router, Server Actions)         |
| UI           | React 19, Tailwind CSS v4, lucide-react, motion |
| Data source  | The Movie Database (TMDB) REST API              |
| Database     | PostgreSQL via Prisma 7 (`@prisma/adapter-pg`)  |
| DB host      | Supabase (Postgres)                             |
| Language     | TypeScript                                      |

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
# TMDB — used by src/lib/tmdb.ts
TMDB_API_KEY=your_tmdb_v3_api_key
TMDB_ACCESS_TOKEN=your_tmdb_v4_read_access_token

# PostgreSQL connection string — used by Prisma (src/lib/db.ts)
DATABASE_URL=postgresql://user:password@host:5432/dbname?pgbouncer=true
DIRECT_URL=postgresql://user:password@host:5432/dbname

# Supabase Auth — used by the browser/server clients (src/lib/supabase/*)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_or_publishable_key
```

> **Google OAuth:** enable the Google provider in **Supabase → Authentication → Providers**, and add `https://your-project.supabase.co/auth/v1/callback` as an authorized redirect URI in your Google Cloud OAuth client. For local dev, add `http://localhost:3000/auth/callback` to **Authentication → URL Configuration → Redirect URLs**.

### 3. Set up the database

```bash
npx prisma generate          # generate the Prisma client
npx prisma migrate dev       # apply the schema (or: npx prisma db push)
```

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## 📜 Scripts

| Command         | Description                  |
| --------------- | ---------------------------- |
| `npm run dev`   | Start the development server |
| `npm run build` | Production build             |
| `npm run start` | Run the production build     |
| `npm run lint`  | Lint with ESLint             |

---

## 📁 Project Structure

```
src/
├─ app/
│  ├─ page.tsx                 # Home dashboard + genre browse view
│  ├─ watch/[type]/[id]/       # Watch / details page
│  ├─ wishlist/                # Wishlist page
│  └─ actions/                 # Server Actions (tmdb, progress, wishlist)
├─ components/
│  ├─ dashboard/               # HeroCarousel, MediaCarousel, GenreSection, …
│  ├─ player/IframePlayer.tsx  # Multi-source embed player
│  ├─ watch/                   # TrailerPlayer, CastSection, SeasonList, ShareButton
│  └─ wishlist/                # WishlistButton, WishlistGrid
└─ lib/
   ├─ tmdb.ts                  # TMDB API client
   ├─ db.ts                    # Prisma client (pg adapter)
   └─ sources.ts               # Embed-source name ↔ index mapping
prisma/
└─ schema.prisma               # Profile, WatchProgress, Wishlist models
```

---

## 🗄️ Data Models

- **Profile** — synced with the auth user ID; owns watch progress and wishlists.
- **WatchProgress** — per-title (and per season/episode for TV) playback position.
- **Wishlist** — saved titles with rating and release date.

---

## ⚠️ Notes

- The embed player streams from third-party sources for demonstration purposes. The **sandbox toggle** defaults ON for every source except VidCore.
- TMDB responses are cached for 1 hour via Next.js fetch revalidation.

---

## 📄 License

Private project — not licensed for redistribution.
