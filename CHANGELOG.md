# Changelog

All changes to the Cinevo project are documented chronologically below in a timeline manner, compiled from repository git commits and active development cycles.

---

## 📅 Timeline & Versions

### [1.2.0] - 2026-08-02 (Current Development Cycle)

#### Added

- **Premium Cinematic Intro Loaders:**
  - Replaced the generic card loader with full-screen, high-end intro screens in `StudioHubs.tsx` utilizing dynamic ambient background glows that match the chosen studio (Marvel = Red, DC = Sky Blue, HBO = Slate, Animation = Purple, Bollywood = Gold).
  - Added slow-pulsing background glows, concentric rotating rings (counter-clockwise outer solid line, clockwise inner dashed line), and a pulsing brand logo emblem in the center.
  - Implemented staggered text fade-ins and a smooth spring-based status bar filling.
- **Interactive Live Radio Portal:**
  - Created a brand-new, immersive `Radio` section (`/radio`) and integrated it into desktop navbar (`Nav.tsx`) and mobile overlay menu (`SiteMenu.tsx`).
  - Implemented database models `RadioCategory` and `RadioStation` in `schema.prisma`, across three migrations — `20260802000000_add_radio_categories_and_stations`, `20260802010000_add_radio_station_reporting` and `20260802020000_add_radio_station_active_flag`. All are idempotent, so they baseline a fresh database and also repair one that predates them.
  - Added a slug classifier (`src/lib/radio/categories.ts`) that sorts the upstream index into **Genres / Decades / Countries / Languages / Moods / More** and filters scraper noise (`lang_*`, `loca_*`, bare country codes, `re`, `na`, `aac`, …). This narrows 4,684 raw playlists to **1,284 browsable categories**.
  - **Lazy station hydration:** only the featured categories are pre-seeded; any other category pulls its playlist from upstream on first visit and caches it in Postgres (capped at 400 stations, deduped by stream URL). This makes every category playable without importing all ~1.1M upstream entries.
  - Rewrote `seed-radio.mts` to upsert categories instead of wiping them (a delete cascaded away every cached station) and to warn loudly when a featured slug is missing upstream.
  - Wrote typesafe server actions in `radio.ts` for categories, stations, cross-catalogue search, listener reporting, and admin moderation.
  - **Favourites** persist to `localStorage` via `useSyncExternalStore`, which also syncs them across open tabs.
  - **Client-side station cache** in `localStorage` with a 24-hour TTL, 20-category LRU cap, and quota-aware eviction.
  - **Broken-stream handling:** anyone can flag a station as not working; three reports auto-flag it, sorting it last and badging it. A stream that fails to open auto-advances to the next station (bounded at 8 consecutive skips), with autoplay-blocking distinguished from a genuinely dead stream.
  - **Admin moderation:** rename a station, repoint its stream URL, enable/disable it, clear a broken flag, or delete it — through an animated dialog backed by role-guarded server actions. Disabled stations stay in the catalogue but are filtered out of every listener-facing query.
  - **Radio Stations management panel** on `/profile` (admins only): searchable, filterable (All / Active / Disabled / Reported) and paginated over the whole cached catalogue, with per-row enable, flag, edit and delete.
  - **Three-band equaliser** (bass 120 Hz low-shelf, mid 1 kHz peaking, treble 4 kHz high-shelf) with six presets, driven by Web Audio biquad filters and custom vertical gain sliders. Because routing an element through an `AudioContext` requires a CORS-readable stream — and most icecast servers send no CORS headers — playback runs without `crossOrigin` by default and the EQ is opt-in: enabling it reconnects the stream in CORS mode and reverts cleanly if the station refuses. Disabling it rebuilds the audio element, since `createMediaElementSource` cannot be undone.
  - **Favourites are visually distinct** — rose accent stripe, tinted card, and a persistent filled heart beside the name.
  - Full-bleed docked player bar: edge to edge along the bottom with transport controls pinned to the true centre of the screen, independent of the flanking content widths. On phones it collapses to tidy rows with a full-width volume track.
  - **Keyboard shortcuts:** `Space` toggles play/pause — with nothing cued it starts whatever the priority chain below picks — and `←`/`→` step to the previous/next station. All three are suppressed inside text fields, so typing and caret movement are unaffected.
  - **App-shell layout:** the page is locked to the viewport, so the masthead, section tabs, category chips and list title are fixed furniture and the station grid owns the only scrollbar — no page-level scrollbar. The chip area is capped and scrollable, since some sections carry hundreds of categories.
  - **Infinite scroll:** the grid pages itself in via an `IntersectionObserver` rooted on the scroll container, pre-fetching 600px ahead, replacing the "Load more" button.
  - The player bar arrives with a station already cued and paused, chosen by priority: **last played → a random favourite → a random station from the current tab → a random station from anywhere**. Every fallback is random, so the page never opens on the same alphabetically-first entry twice. The last-played station is remembered in `localStorage` on each play. The whole choice happens after hydration — both the storage reads and `Math.random` would desync a server-rendered cue — and any interaction before it lands wins.
  - **Mobile layout:** search and the whole category rail collapse behind toggles on phones, where inline they left almost no room for the grid; picking a category or section closes the picker. The subtitle, equaliser glyph and shuffle label drop out at small widths.
  - **"Surprise me"** button plays a random station from whatever list is on screen — the selected category, your favourites, or the search results — never repeating the station already playing.
  - **"All stations"** tab browses every cached station as one cross-category list.
  - The station on air always reveals itself: shuffle, skip and auto-advance page it in if it sits past the rendered window, then scroll it to centre, and it carries a breathing halo so it's findable at a glance.
  - Playlist resolver API (`/api/radio/resolve`) unwraps `.pls` and `.m3u` wrappers server-side, since those are usually served without CORS headers and browsers can't follow them. See *Fixed* for the SSRF and HLS corrections made to it.
  - Built the UI on `motion/react` throughout — staggered grid and chip entrances, a `layoutId` section pill, spring hover/press feedback, an animated equaliser, and a spring-mounted player bar. Non-essential motion is gated behind `prefers-reduced-motion`.
  - Custom pointer- and keyboard-driven volume slider, replacing the native `<input type="range">`.
  - Added `npm run radio:seed`, `npm run radio:backfill` (applies the radio SQL and re-derives every category's group from the classifier) and `npm run typecheck`. The maintenance scripts run under Node's native type stripping, which is why `allowImportingTsExtensions` is now set in `tsconfig.json`.
- **Infinite Paginated Hub Grids:**
  - Extended initial brand and language hub queries in `page.tsx` to use the paginated `tmdb.fetchMediaPage` API helper, capturing and passing down the correct `totalPages` metadata.
  - Refactored `GenreSection.tsx` to support a generic `MediaSource` parameter and call `loadMediaPageAction(source, page)` server actions, enabling a fully paginated grid with "Load More" actions.
  - Dynamic-themed the hover state of the "Load More" button and its loader spinner to match the franchise accent color.
- **Fixed Floating Navigation Actions:**
  - Replaced the inline "Back to Home" button with a fixed, glassmorphic floating pill button hovering at `top-[76px] md:top-[96px]` and `left-6 md:left-12` (just below the fixed Nav bar).
  - Incorporated `bg-bg/80` and `backdrop-blur-md` to maintain legibility when poster cards scroll underneath.
- **Global Keyboard Hotkeys:**
  - Integrated keyboard hotkey bindings on `IframePlayer.tsx` for remote controllers and keyboards:
    - `F` / `f` — Toggle Fullscreen mode.
    - `T` / `t` — Open Trailer Modal.
    - `P` / `p` — Cycle playback providers (with Sonner toast feedback).
    - `S` / `s` — Cycle player sandbox adblock modes (Balanced -> Strict -> Off).
    - `Shift + ArrowRight` — Play next TV episode.
    - `Shift + ArrowLeft` — Play previous TV episode.
- **Watch Progress Synchronization:**
  - Created local caching (`watchStore.ts`) and visibility-aware play progress sniffing that auto-flushes progress to the database on unmount or tab hide.
  - Added fallback visibility-aware progress estimators when `postMessage` is blocked.

#### Changed

- **Persistent Scroll Theming:**
  - Replaced top-only linear gradients in `page.tsx` (Home) and watch `page.tsx` with solid, tinted base backgrounds (e.g. Marvel = `#0c0202`, DC = `#02060b`) overlayed with a top-down gradient, ensuring the franchise vibe persists across the entire scroll height of the page.
- **Animation Naming Alignment:**
  - Renamed the "Anime Portal" to **"Animation"** across `StudioHubs.tsx` and all browse pages to align correctly with the western animated movies returned by TMDB Genre ID 16.
- **Browsing Layout Spacing & Metadata Cleanups:**
  - Reduced empty space above the Back button by lowering padding on browse views from `pt-24` to `pt-18`.
  - Simplified repetitive subtitles (e.g. *"Popular releases in Bollywood Cinema"* -> *"Popular movies & TV shows"*).
  - Cleaned up redundant name headers (e.g. `MARVEL COLLECTION` -> `COLLECTION`).

#### Fixed

- **Radio — missing migration:** the `RadioCategory` / `RadioStation` tables had only ever been created with `prisma db push`, so no migration existed and a fresh deploy would have come up with no radio schema at all. Captured as idempotent SQL and reconciled into `_prisma_migrations`.
- **Radio — seed silently skipped a category:** the curated list used the slug `hip-hop`, but the upstream index uses underscores (`hip_hop`), so it matched nothing and 19 of 20 categories were seeded without any error. The seeder now warns loudly when a featured slug is absent upstream.
- **Radio — open SSRF in the playlist resolver:** `/api/radio/resolve` fetched any URL supplied by the client, making the deployment a proxy into its own network. It now rejects non-HTTP(S) schemes and loopback, private, link-local and carrier-grade-NAT hosts, and re-validates the URL it extracts from the playlist.
- **Radio — HLS streams broken by the resolver:** the `.m3u` check matched `.m3u8` by substring, so HLS playlists were unwrapped to a single variant/segment URL. `.m3u8` is now detected separately and passed through intact.
- **Radio — favourites refetched the entire category:** `favorites` sat in the station-loading effect's dependencies, so every heart click re-ran the server query for the whole category. Station lists are now cached per slug in state and `localStorage`.
- **Radio — favourites could be wiped on load:** the save effect fired on the first commit with an empty array, clobbering stored favourites before the load effect had read them. Both reads and writes now go through a `useSyncExternalStore` store, which also keeps tabs in sync.
- **Radio — `crossOrigin` broke non-CORS streams:** the audio element requested CORS unconditionally, which makes any station without `Access-Control-Allow-Origin` fail to load outright. Plain playback no longer sets it; the equaliser opts in per session and reverts if the station refuses.
- **Next.js Router Directives:**
  - Added `"use client";` to `StudioHubs.tsx` to fix server-side compilation errors when importing routers.
- **TMDb ISP Bypass:**
  - Switched TMDB API endpoint from `api.themoviedb.org` to `api.tmdb.org` to resolve local ISP blocking issues.
- **Next.js Image Loader Warning:**
  - Appended width query arguments to TMDb image requests to bypass Next.js optimization warning checks.

---

### [1.1.0] - 2026-06-20

#### Added

- **Custom Image Loader:** Bypassed Vercel Image Optimization limits by creating a custom loader that directly passes parameters to static CDNs (`17a255e`).
- **Cast Sections & TMDb Fetcher:** Created the `CastSection` component and defined casting types and data fetcher helper utilities (`5749ee5`).

---

### [1.0.0] - 2026-06-06

#### Added

- **3D Dome Gallery Page:** Integrated the interactive `3D DomeGallery` component and gallery page layout for trending media visualization (`38a8e67`, `f40e792`).

---

### [0.9.0] - 2026-06-03

#### Added

- **Modular Streaming Player Architecture:** Implemented dynamic provider selection and custom playback UI controls (`fb1818e`).
- **Responsive Navigation System:** Deployed the desktop navbar and mobile staggered menu overlay (`12a2b75`).
- **GSAP Staggered Menu Overlay:** Designed staggered navigation items with GSAP animations (`cc3e4e7`).
- **Reveal Navigation & Procedural Hologram Mystery Picks:** Created mystery card selection views with holographic reveal animations (`6c7ebbe`, `efb50ae`, `be194e2`, `32519ab`).
- **Provider Admin Panel:** Added the administrative view (`ProviderAdmin`) for managing streaming provider configurations (`ae06e40`).
- **Browse & Filter Systems:** Integrated media search with filtering options and TMDB API mappings (`bc17e9d`).
- **Profile page:** Added profile control views, cache reset, and resync options (`20529e0`).

---

### [0.8.0] - 2026-06-02

#### Added

- **Watch History Store & Push Notifications:** Created the local watch history store and a notification bell UI with Web Push support (`f5c1e44`).
- **Android TV Support & TWA Configuration:** Integrated spatial remote controller navigation (D-pad support) and Trusted Web Activity (TWA) configurations for Android app bundles (`6c546dd`, `6444c8d`, `ba74da4`, `4f10735`).
- **IframePlayer Controls & Provider Caching:** Deployed client-side provider caching with localStorage (`79ac6d6`, `a9194a1`, `f0612c8`).
- **Streaming Watch Page & Database Schema:** Configured watch pages with iframe player embeds and Supabase database schemas (`753cad7`).
- **Hero Carousel & TMDB Integration:** Built the dashboard hero section and media carousels with trailer play options (`04f8981`, `02801a3`).

---

### [0.7.0] - 2026-06-01

#### Added

- **PWA Push Notifications:** Implemented PWA settings, VAPID push notifications, and administrative dashboard layouts (`73fb4e6`).
