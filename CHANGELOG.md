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
