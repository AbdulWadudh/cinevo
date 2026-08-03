# Changelog

All changes to the Cinevo project are documented chronologically below in a timeline manner, compiled from repository git commits and active development cycles.

---

## 📅 Timeline & Versions

### [1.2.0] - 2026-08-02 (Current Development Cycle)

#### Added

- **User management panel** (`/profile` → Admin → **Users**, admins only), built on the same shell as the radio catalogue: search, filter tabs (All / Admins / Members), a list that owns its own scrollbar, and pagination at 20 a page.
  - Each row carries avatar, name, email, join date and an activity strip — watch records, wishlist entries, ratings, radio favourites and push devices — gathered in the same query through Prisma `_count`.
  - **Watch-history dialog** on every row: an animated modal listing what that user has watched, newest first — poster, title, season/episode, a progress bar reading the stored `progress`/`duration`, and how long ago they watched it, paginated at 20 with the list scrolling inside the dialog. `WatchProgress` denormalises title and poster path, so nothing has to be re-fetched from TMDB to render it. Closes on Escape or a backdrop click, and is keyed on the user so opening a different row refetches by remounting rather than syncing props into state.
  - Each entry is a link that **opens that title in a new tab** — `/watch/tv/{id}?season=&episode=` or `/watch/movie/{id}`, the same target the history page uses — leaving the dialog open so the admin keeps their place in the list. It's a real anchor rather than a click handler, so middle-click, open-in-new-window and the browser's own "open in private window" all work, with a play overlay and poster zoom on hover.
- **Preview mode on the watch page** (`?preview=1`): plays normally but records nothing, so looking at another user's title from the Users panel doesn't write it into the admin's own history. Both automatic writers are gated — `TrackWatch`, which logs the view on mount, and the player's progress sniffer, whose refs still track position (the resume and next-episode logic reads them) while the store never hears about it. The flag is carried through `IframePlayer`'s `buildUrl` and every `SeasonList` episode link, since changing episode or provider would otherwise silently drop back to recording. The explicit *mark as watched* button is deliberately left working — preview suppresses passive recording, not a decision to record. Browsers give web pages no way to open a genuine incognito window, so this is the in-app equivalent.
  - `relativeTime` moved out of `HistoryClient` into `src/lib/relativeTime.ts`, now shared with that dialog.
  - Per-user actions: **promote / demote**, **clear library** (watch history, wishlist, ratings, radio favourites, push subscriptions and the `SentPush` dedupe log — that last one deleted by hand, as it carries a `profileId` with no foreign key to `Profile` and so never cascades), and **delete profile**. Both destructive actions confirm inline in the row rather than through a dialog.
  - **Deleting a profile is not a ban.** The Supabase Auth user lives in a separate system that needs a service-role key this app doesn't hold, so the sign-in stays valid and `getOrCreateProfile` rebuilds an empty profile on the next visit. The confirmation toast says as much.
  - Changing your own role and deleting your own account are both refused server-side. Self-demotion is an instant lockout with no route back through the UI — and since it is the only way the admin count could reach zero, blocking it also guarantees at least one admin survives, so no separate "last admin" check is needed.
  - `setUserRole(email, role)` gave way to `setUserRoleAction(id, role)`, and the email-box *Manage roles* form was dropped from **Admin Overview** — the row actions supersede it. Overview is now purely its stat cards, with a staggered entrance.
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
  - **Favourites sync to the account.** A `RadioFavorite` table (migration `20260803010000_add_radio_favorites`) makes a signed-in listener's picks follow them between devices. It stays local-first: `localStorage` is always the render source via `useSyncExternalStore`, so the heart responds instantly, works signed out, and keeps open tabs in step. Signing in **merges** the two sides rather than letting either win — a server-wins policy would discard anything favourited while signed out, and a local-wins policy would wipe another device's list. Failed writes roll the local list back so the two can't drift.
  - **Recommended rail** (migration `20260803020000_add_radio_recommended`): admins star stations from the profile panel and they surface in their own tab on `/radio`, ordered by `recommendedOrder` with unordered picks falling to the end.
  - **Persistent mini player.** The audio element moved out of the radio page and into a `RadioPlayerProvider` in the root layout, so playback survives navigation instead of dying with the route. A floating pill on every other page carries the station, play/pause and stop, with mute and volume sliding out on hover. It restores the last-played station on a cold start, so it's there before you have opened `/radio` at all.
  - **Radio steps aside for video.** Opening a title pauses the radio rather than letting the two play over each other. The embed is a cross-origin iframe with no `play` event, so detection leans on the two signals that *are* observable: focus moving into the iframe (visible in the parent as a `blur` with an iframe as `document.activeElement`), and a progress `postMessage`, which providers only emit once playback has begun. It fires at most once per visit, so a manual resume sticks.
  - **Auto-hiding back pill on the watch page.** Fades out after two seconds of pointer stillness and returns on the next movement, like player chrome. Taken out of document flow, which also reclaimed the row of dead space above the player.
  - Station cards carry a **category chip**, so mixed lists (favourites, search, All stations) say where each station came from.
  - Admins can star a station straight from its card, not just from the profile panel.
  - Clicking the station name in the player bar **jumps the grid to it**, paging it in and scrolling it to centre — or saying which category to look in when it isn't in the current list.
  - On phones the player bar puts the station and the transport controls on one row, spread to opposite ends, instead of stacking them.
  - **Client-side station cache** in `localStorage` with a 24-hour TTL, 20-category LRU cap, and quota-aware eviction.
  - **Broken-stream handling:** anyone can flag a station as not working; three reports auto-flag it, sorting it last and badging it. A stream that fails to open auto-advances to the next station (bounded at 8 consecutive skips), with autoplay-blocking distinguished from a genuinely dead stream.
  - **Admin moderation:** rename a station, repoint its stream URL, enable/disable it, clear a broken flag, or delete it — through an animated dialog backed by role-guarded server actions. Disabled stations stay in the catalogue but are filtered out of every listener-facing query.
  - **Radio Stations management panel** on `/profile` (admins only): searchable, filterable (All / Active / Disabled / Reported) and paginated over the whole cached catalogue, with per-row enable, flag, edit and delete.
  - **Add a station by hand** from that panel, with a searchable category combobox that also offers to **create a category on the spot** when nothing fits. Hand-made categories are flagged `isCustom` (migration `20260803000000_add_radio_category_custom_flag`) so they bypass the browsability threshold — starting life with one station, they'd otherwise be filtered straight out of the listener UI. They're marked hydrated on creation too, since no upstream playlist backs them, and their station count is maintained locally.
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

- **Profile rebuilt as a settings workspace:**
  - Replaced the single `max-w-4xl` column — which stacked identity, stats, the account form, the sync controls, the reveal-effect preview, sign-out and all four admin panels into roughly six screens of scroll while leaving most of the viewport width empty — with a `max-w-7xl` two-pane layout: a sticky rail on the left, one section at a time in the pane beside it.
  - The rail carries identity (avatar, name, email, role chip, join month), the Wishlist / History stat tiles, and grouped section nav — **Account:** Profile, Appearance, Data & Sync; **Admin:** Overview, Radio, Providers (badged with the open report count). Sign out sits at the foot of the rail on desktop and below the pane on phones, so it is reachable from every section rather than only from the bottom of the page.
  - **Providers and Reports became one section.** They were two near-identical cards covering the same subject, and the rebuild would have made them two nav entries as well. `ProvidersPanel` now wraps both in the radio panel's layout: a header whose action follows the tab (*Add provider* / *Clear resolved*), a tab row where the pill slides between **Providers** and **Reports**, and a pane that owns its own scrollbar. Both lists were lifted into the panel, so switching tabs no longer discards a provider just added or a report just resolved and the header's count line stays live; `ProviderAdmin` exposes `openNew` through a ref so the header button can drive it while the editor state stays local to the pane.
  - The active section syncs to `?tab=` via `window.history.pushState`, so a section is linkable, survives a reload, and Back steps through the sections visited. An unknown or admin-only value falls back to the first section.
  - **Only the active section is mounted.** The four admin panels no longer all query on page load — `RadioStationAdmin` in particular fetches its catalogue page on mount. Switching sections scrolls back to the top, since panes differ a lot in height.
  - The nav is a real `tablist`: roving tabindex, arrow keys / Home / End move between sections, and the two renderings (vertical rail, horizontal chip rail) carry distinct `layoutId`s so they don't fight over one pill. The mobile rail scrolls the active chip to centre, which matters on a deep link into the last section.
  - New `PanelCard` and `SettingRow` primitives give the account panes the icon-chip header and card chrome the admin panels already used, so the whole page reads as one family. The admin panels lost their own `mt-6` / `mt-8` root margins — the workspace owns spacing now.
  - **Profile form runs a live preview** beside the fields: the avatar and display name update as you type, falling back to the initial when the URL is empty and saying so when the image fails to load. Email is shown read-only rather than being absent from the form.
  - **Reveal card effect** trades the dropdown for a grid of all 18 finishes laid out beside the live holo card; picking the one already active replays the flip. The pane splits at `xl` rather than `lg`, since next to a 288px rail the chip column is too narrow at `lg` for labels like *Trainer Full Art*.
  - Motion throughout — staggered rail entrance, a spring `layoutId` nav pill, cross-faded pane transitions, hover/press feedback on tiles, chips and the save button — all gated behind `prefers-reduced-motion`.
- **Zustand adopted for preference state** (first slice; `zustand@5.0.14`). The four thinnest hand-rolled `useSyncExternalStore` stores — reveal effect, radio volume, radio equaliser and the player provider list — became `persist` stores, replacing the subscribe/emit/snapshot-memoisation plumbing that each had re-implemented.
  - Every store uses `skipHydration` plus a shared `useStoreHydration` helper that rehydrates in an effect. Reading storage at module scope would have the client's first render disagree with the server's, which is Next's *"Text content does not match server-rendered HTML"* — the same contract the old `getServerSnapshot` functions provided.
  - `persist` is backed by `safeStorage` rather than `localStorage` directly, so the WebViews that throw on merely reading the `localStorage` property still fall back to an in-memory map instead of taking the store down at module scope.
  - `useShallow` on the equaliser selector is load-bearing: `useRadioEqualizer` puts the settings object in effect and callback dependencies, so a selector building a fresh object per render would rebuild the audio graph every render. It replaces the raw-string memoisation the old store used for exactly that reason.
  - `useProviders` gained a real fix in the move: it used to hold `useState` per caller, so two mounted players kept separate copies and each made its own request. One shared store now serves both, with an in-flight guard so simultaneous mounts make one request. Its 24-hour TTL is kept as a `fetchedAt` field, since `persist` has no TTL of its own.
  - **Deliberately left alone:** the radio station and category caches (they need TTL, LRU and quota-aware eviction, none of which `persist` offers) and `watchStore` (its dirty-tracking and merge-on-sign-in policy is the hard part, and Zustand does not address it). Radio favourites also stay put — they carry a server merge policy rather than being a plain preference.
  - Stored volume, equaliser and reveal-effect values reset once on first load: `persist` wraps state in `{ state, version }`, which the previous raw formats don't match.
- **Radio category index moved to `localStorage`:** `/radio` is `force-dynamic`, so every load re-read the entire `RadioCategory` table — with a correlated `_count` of each category's stations — and did it **twice**, because `getFeaturedCategoriesAction` called `getRadioCategoriesAction` internally just to pick ~20 featured slugs out of the result. The index is the same list for every visitor and changes only when an admin edits the catalogue, so the client now serves it from `localStorage` and only a miss reaches the database. The cache carries a version alongside its 24-hour TTL: `group` and `name` are derived by the slug classifier at query time, so a list cached by an older build could file categories under sections that no longer exist.
  - The featured list is derived client-side from `FEATURED_SLUGS` — a plain constant — so the second query is gone, and `getFeaturedCategoriesAction` with it.
  - The server still paints the first featured category's stations so the grid is never empty on arrival. That slug is a constant too, so it needs no category query either. Net: two full-table reads per load down to none on a warm cache.
  - Adding a station (which may also create a category) or deleting one invalidates the cached index and that category's station list, so a new category appears in the rail straight away rather than after the TTL.
- **Persistent Scroll Theming:**
  - Replaced top-only linear gradients in `page.tsx` (Home) and watch `page.tsx` with solid, tinted base backgrounds (e.g. Marvel = `#0c0202`, DC = `#02060b`) overlayed with a top-down gradient, ensuring the franchise vibe persists across the entire scroll height of the page.
- **Animation Naming Alignment:**
  - Renamed the "Anime Portal" to **"Animation"** across `StudioHubs.tsx` and all browse pages to align correctly with the western animated movies returned by TMDB Genre ID 16.
- **Browsing Layout Spacing & Metadata Cleanups:**
  - Reduced empty space above the Back button by lowering padding on browse views from `pt-24` to `pt-18`.
  - Simplified repetitive subtitles (e.g. *"Popular releases in Bollywood Cinema"* -> *"Popular movies & TV shows"*).
  - Cleaned up redundant name headers (e.g. `MARVEL COLLECTION` -> `COLLECTION`).

#### Fixed

- **Accessibility audit — Lighthouse 100.** A pass over every issue the audit raised on the home page, plus the same defect wherever else it occurred:
  - **White text on the brand red failed AA.** `#e53e4f` under white is 4.1:1, so *Play Now* and every other filled accent button was below the 4.5:1 floor. Rather than repaint the brand, the palette now separates the two jobs: `--color-accent` stays `#e53e4f` for text, borders and glows on the dark background (4.9:1, where the bright red is needed), and a new `--color-accent-strong` (`#d02f43`, 5.0:1) with `--color-accent-strong-hover` (`#db3346`, 4.6:1) backs every solid accent fill. One value can't do both — anything dark enough for white text on top is too dark to read as text on `--color-bg`. Swept across 30 components so all solid red in the UI stays one colour.
  - **`--color-muted` was 4.0:1** (`#6e6e88`) — under AA for the small metadata it carries (card year/type lines, the footer, timestamps). Now `#8888a4`: 5.8:1 on `--color-bg` and 4.9:1 on `--color-surface-hover`, still clearly a step below `--color-fg-secondary`.
  - **`--color-blue` was blue-500** (`#3b82f6`, 3.7:1 under the white *New* badge text) → blue-600 `#2563eb` at 5.2:1. It backs only that badge, so the change is contained.
  - **`aria-hidden` over live controls.** The radio mini player's hover-revealed volume slot and the mobile `StaggeredMenu` panel both marked themselves `aria-hidden` while closed, hiding them from screen readers but leaving the mute button, volume slider and eight nav links in the tab order — focus would land on controls that aren't announced. Both use `inert` now, which removes them from the tab order and the accessibility tree together. The mini player's manual `tabIndex` juggling on the mute button went with it.
  - **Carousel dots were 6×6px** — a quarter of the 24px minimum target, and too close to the banner link behind them. The visible dot is unchanged; the button around it is now 28×44px. Labels went from `Slide 1` to `Go to slide 1 of 6`, with `aria-current` on the active one.
  - **The nav's wishlist heart was an unnamed link** — icon-only with no text. `FocusableLink` grew an `ariaLabel` prop (`FocusableButton` already had one) and passes it through.
  - **No `main` landmark.** The root layout now wraps `children` in `<main id="main-content">`. Six components carried their own `<main>` — the watch page and its loading skeleton, wishlist, privacy, terms, `RadioClient` and `DomeGallery` — which would have made two landmarks on those routes; all are plain containers now.
  - **An empty `<h2>` on the home page.** `BrowseSection` renders `MediaCarousel` with `title=""` because the page above it already owns the *Explore Categories* heading, and the carousel rendered the empty heading element anyway. `title` is optional now and the heading is only emitted when there is one; a new `label` prop names the row via `aria-label` instead. The *See All* control was a `<span onClick>` — unreachable by keyboard — and is now a real `<button>` carrying the row's name.
  - The hero's full-banner click layer duplicated *Play Now*'s destination for anyone tabbing through. It's `tabIndex={-1}` and `aria-hidden` now — a pointer convenience, announced once rather than twice.
- **The home page downloaded 17.5MB of images to show one banner.** Lighthouse performance on a production build is now **99 desktop / 84 mobile**, with the page's total weight down to ~3.7MB. Four separate faults, each real rather than benchmark-shaped:
  - **`imageLoader.ts` capped out at `w780`.** Its TMDb bucket list ended there, so any request above it fell through to `original` — the studio's full-resolution master, 1–2.5MB a piece. The hero asks for `sizes="100vw"`, i.e. 1080/1920/2048/3840, so *every* backdrop fetched a master. Added the `w1280` backdrop bucket and made it the ceiling: above `w1280` TMDb offers nothing but `original`, and 1280px behind the hero's `brightness-[0.55]` and two gradients is indistinguishable at a tenth of the bytes.
  - **All six hero slides mounted at once.** They stack at `inset-0`, so every one counted as in-viewport and downloaded immediately — 9.8MB of backdrops, five of them for slides nobody had reached. Only the visible slide's backdrop mounts now; both neighbours (either direction, so the cross-fade always has a target) mount once the first has painted, so they can't compete with the LCP image for bandwidth. Unlocking is driven by the active image's `onLoad` **and** its `onError`, so a dead image can't strand the carousel with nothing to fade to.
  - **The LCP image had no priority hint.** `priority` on its own only emits the `<link rel=preload>`; an explicit `fetchPriority="high"` puts the hint on the tag so the fetch outranks the poster rows queued behind it. Lighthouse's LCP-discovery checklist is now fully green. Also added `preconnect` + `dns-prefetch` for `image.tmdb.org`, which every poster and backdrop comes from.
  - **Six `requestAnimationFrame` auto-pan loops ran permanently**, one per `MediaCarousel`, writing `scrollLeft` every frame for rows nobody could see. Each row's loop is now gated on an `IntersectionObserver`, so only on-screen rows animate.
  - `full_logo.png` (187KB → 41KB) and `logo.png` (73KB → 15KB) re-encoded as palette PNGs. Same files, same format, so the OG/metadata and manifest references are untouched.
  - **Measure against `next build && next start`.** A `next dev` server serves unminified bundles plus the HMR client and scores roughly 20–40 points lower; the numbers above are meaningless if taken from the dev port.
- **Vercel functions ran 15,000km from their own database.** `vercel.json` set no `regions`, so every server render executed in the `iad1` default (Washington) while Supabase lives in `aws-1-ap-southeast-1` (Singapore) — each Prisma query crossed the Pacific and back before a byte of HTML was sent, which the deployed site showed as ~800ms of document request latency (`x-vercel-id: bom1::iad1`). Pinned to `sin1` so the function sits with the database.
  - Still outstanding: `/` is served `Cache-Control: private, no-store` with `x-vercel-cache: MISS` on every hit, because the page reads `searchParams` to handle its `?genre=` / `?company=` / `?language=` browse mode, and reading them opts the whole route out of prerendering. Moving that branch to its own route would let the home page prerender with ISR and be served from the edge.
- **The hero trailer loaded YouTube before anyone asked for a video** — Lighthouse best practices 96 → 100. The banner autoplayed an embed on every visit, and the embed sets a `TESTCOOKIESENABLED` cookie the moment it loads, which Chrome logs as a cookie issue. It was the *only* remaining failure on the page: blocking the embed left Chrome's Issues panel empty.
  - The backdrop still paints immediately; the iframe now mounts on the visitor's first `pointermove`, `pointerdown`, `touchstart` or `keydown` and fades up over it. Notably **not** on `scroll` — restored scroll positions and tooling fire that with nobody present. YouTube's player is off the critical path as a result, so the page no longer pays ~1MB of third-party script for a banner most visitors scroll past.
  - All three embeds (hero banner, trailer modal, watch-page player) moved to `youtube-nocookie.com`, and the hero's is additionally `credentialless`, giving it an ephemeral, empty cookie jar. Muted looping playback needs neither cookies nor a session. Both were kept as defence in depth — measured on their own, neither stops the cookie, because it is set inside YouTube's own document.
  - `sandbox` without `allow-same-origin` does stop the cookie, but YouTube refuses to play in an opaque origin and the banner goes black. Not used.
- **Reset & resync never cleared the radio caches:** it sweeps `localStorage` keys prefixed `cinevo:`, but radio stores its station lists — and now its category index — under `cinevo_radio_*`, so neither was touched and a reset left them in place for up to a day. Both are cleared now. Favourites are deliberately spared, being user data rather than cache.
- **Radio — un-starring left the station sitting on the Recommended rail:** the star cleared but the card stayed. `handleToggleRecommended` invalidated the cached rail and dropped it from state so the tab would refetch — but `patchStation` writes every list it touches back to `localStorage` *during* the state update, i.e. after the synchronous invalidation, so it re-seeded the key that had just been cleared and the load effect read the stale copy straight back in. The rail is now derived from the flag rather than trusted as fetched: un-starring drops the card and decrements the tab badge immediately, with no refetch and no loading flash. Only starring evicts and rebuilds, since `recommendedOrder` is the server's to decide.
- **Admin panels grew the page instead of scrolling themselves:** the radio catalogue renders 25 rows a page (~1,800px), the provider list every provider configured, and the report queue up to 200 at once — so the pagination controls, the *Add Provider* button and everything below each panel were pushed off-screen while the page took the scrollbar. All three lists now own a capped, `overscroll-contain`ed scroll area with the panel header, search, filters and pagination staying put. The station list resets to its top when page, filter or query changes, and the provider editor scrolls itself into view when a row low in the list is expanded — it would otherwise open below the fold of its own container. Generalised into the new *Scroll Containment* section of `AGENTS.md`.
- **Radio — missing migration:** the `RadioCategory` / `RadioStation` tables had only ever been created with `prisma db push`, so no migration existed and a fresh deploy would have come up with no radio schema at all. Captured as idempotent SQL and reconciled into `_prisma_migrations`.
- **Radio — seed silently skipped a category:** the curated list used the slug `hip-hop`, but the upstream index uses underscores (`hip_hop`), so it matched nothing and 19 of 20 categories were seeded without any error. The seeder now warns loudly when a featured slug is absent upstream.
- **Radio — open SSRF in the playlist resolver:** `/api/radio/resolve` fetched any URL supplied by the client, making the deployment a proxy into its own network. It now rejects non-HTTP(S) schemes and loopback, private, link-local and carrier-grade-NAT hosts, and re-validates the URL it extracts from the playlist.
- **Radio — HLS streams broken by the resolver:** the `.m3u` check matched `.m3u8` by substring, so HLS playlists were unwrapped to a single variant/segment URL. `.m3u8` is now detected separately and passed through intact.
- **Radio — favourites refetched the entire category:** `favorites` sat in the station-loading effect's dependencies, so every heart click re-ran the server query for the whole category. Station lists are now cached per slug in state and `localStorage`.
- **Radio — favourites could be wiped on load:** the save effect fired on the first commit with an empty array, clobbering stored favourites before the load effect had read them. Both reads and writes now go through a `useSyncExternalStore` store, which also keeps tabs in sync.
- **Radio — station actions were unreachable on touch:** the whole action row sat behind `opacity-0 group-hover:opacity-100`, so on a phone — where hover doesn't exist — favouriting, reporting and every admin action were simply unavailable. Each breakpoint now gets one presentation of the actions and only one: **pointer (`md`+)** reveals the icon row on hover, keeping the overflow menu for the two entries that need a written label (Edit, Delete — so it disappears entirely for non-admins); **touch (`<md`)** shows a single always-visible menu carrying every action, with taller rows and larger targets. See the new *Hover Interactions & Touch* rules in `AGENTS.md`.
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
