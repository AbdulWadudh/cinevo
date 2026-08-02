# 🎬 Cinevo

A modern, cinematic movie & TV streaming front-end built with **Next.js 16**, **React 19**, and **TMDB**. Browse trending titles, explore genres and studio collections, watch via DB-managed embed providers, rate and track what you watch, get push notifications for new episodes, and install it as a PWA.

---

## ✨ Features

### 🍿 Browse & discover

- 🎞️ **Cinematic hero banner** with inline trailer previews and quick **Play** / **Watch Trailer** actions.
- 🔥 **Dynamic rows** — Trending, New Releases, Popular TV, Top Rated, studio collections (Marvel, DC) and regional cinema (Bollywood, Tollywood), each with **See All** + **Load More**.
- 🧭 **Browse page** with filters — type, genre, year, rating, and sort.
- 🔎 **Search** across titles *and* people.
- 💡 **"Because you watched…"** picks personalized to you.
- 👤 **Person pages** — bio, age, and known-for filmography.
- 🌐 **3D Dome Gallery** — spin through popular movies & shows in an interactive 3D sphere.
- 🎴 **Mystery Pack** — reveal random picks as movies or tv series, with genre / language / year / type filters, shuffle, and selectable foil effects.

### ▶️ Watch

- 📺 **Multi-provider player** with a remembered last-used default per title.
- 🎚️ Season / episode pickers, quick **prev / next episode**, and a **report broken provider** option.
- 🎬 **Trailer modal** anywhere, showing title, rating, and release date.
- 🎭 **Cast** and **More Like This** in the sidebar.

### ❤️ Personal

- 🕒 **Watch history** — instant and offline-friendly, synced across devices.
- ⏯️ **Continue Watching** rail, one card per series.
- ⭐ **Personal ratings** (1–10) and **Mark as watched** on every title.
- 🔖 **Wishlist** with instant toggles.
- 🔔 **Notification bell** for new & upcoming episodes of wishlisted shows.

### 📱 Platform

- 📲 **PWA** — installable, with app icon & splash screen.
- 🌐 **Web Push** — alerts that fire even when the app is closed.
- 🍞 **Themed toasts** and branded loaders / skeletons.
- 🔗 **Share cards** (OpenGraph / Twitter) per title.
- 📺 **TV & remote support** — spatial navigation with arrow keys / D-pad, Enter, and Back.
- 🧹 **Clear cache** control in your profile for a fresh start.

### 🛠️ Admin

- 📊 **Overview dashboard** — users, providers, reports, ratings, and devices.
- 🗂️ **Provider management** — add, edit, enable, and reorder providers.
- 🚩 **Report triage** — resolve user-reported broken providers.

---

## 🧱 Tech Stack

| Area        | Tech                                            |
| ----------- | ----------------------------------------------- |
| Framework   | Next.js 16 (App Router, Server Actions)         |
| UI          | React 19, Tailwind CSS v4, motion, lucide-react |
| Data source | The Movie Database (TMDB)                        |
| Database    | PostgreSQL via Prisma                            |
| Auth & host | Supabase                                         |
| Language    | TypeScript                                       |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 20+
- A **TMDB** account + API credentials
- A **PostgreSQL** database (e.g. a Supabase project)

### 1. Install

```bash
npm install
```

### 2. Configure environment

Copy [`.env.example`](./.env.example) to `.env` and fill in your database URL, Supabase keys, TMDB credentials, and Web Push (VAPID) keys.

```bash
cp .env.example .env
```

> VAPID keys must stay stable across deploys — regenerating them invalidates existing push subscriptions.

### 3. Set up the database

```bash
npx prisma generate
npx prisma db push
```

### 4. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

> Make a user an admin by setting their `Profile.role` to `admin` to unlock the admin sections in `/profile`.

---

## 📜 Scripts

| Command         | Description                  |
| --------------- | ---------------------------- |
| `npm run dev`   | Start the development server |
| `npm run build` | Production build             |
| `npm run start` | Run the production build     |
| `npm run lint`  | Lint with ESLint             |

---

## ⚠️ Notes

- The embed player streams from third-party providers for demonstration purposes. For the best experience, a browser ad-blocker (e.g. uBlock Origin) is recommended.
- Watch history is local-first — it lives in your browser and syncs to the database on a schedule.

---

## 📄 License

Private project — not licensed for redistribution.
