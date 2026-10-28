# API and Type Skeleton

Signatures only. Bodies belong in the source, not here. This page exists so an agent can
learn the exported shape without reading three files to find one function.

Add a line when you add or change an export. Delete a line when the export goes away.

## Exports

### `src/config.ts`

```ts
export const site: {
  name: string; slug: string; tagline: string; title: string; titleTemplate: string;
  description: { short: string; long: string }; copyright: string;
  emails: { support: string; admin: string }; pushSubject: string;
  localEmailDomain: string; defaultUsername: string;
  logo: { mark: string; full: string };
};
export const STORAGE_PREFIX: string;
export function storageKey(name: string): string;
```

### `src/lib/db.ts`

```ts
export const db: PrismaClient; // pooled singleton, cached on globalThis outside production
```

### `src/lib/auth.ts`

```ts
export async function getCurrentUser(): Promise<User | null>;
export async function getOrCreateProfile(): Promise<Profile | null>;
export interface NavViewer { id: string; avatarUrl: string | null; initial: string; isAdmin: boolean }
export async function getNavViewer(): Promise<NavViewer | null>;
```

### `src/lib/supabase/server.ts`, `client.ts`

```ts
export async function createClient(): Promise<SupabaseClient>; // server: cookies() is awaited
```

### `src/lib/tmdb.ts`

```ts
export interface TMDBMedia { id: number; title?: string; name?: string; /* ... */ }
export interface TMDBDetails extends TMDBMedia { /* ... */ }
export type MediaSource = "movie" | "tv";
export interface DiscoverFilters { /* type, genre, year, rating, sort */ }
export const tmdb: {
  getTrending(type?: "all" | "movie" | "tv"): Promise<TMDBMedia[]>;
  getTopRated(type?: "movie" | "tv"): Promise<TMDBMedia[]>;
  // ... one method per catalogue read; every one returns [] rather than throwing
};
```

### `src/lib/providers.ts`

```ts
export type SandboxMode = "strict" | "balanced" | "off";
export const SANDBOX_MODES: SandboxMode[];
export function sandboxTokens(mode: SandboxMode): string | null;
export function normalizeSandboxMode(v: unknown): SandboxMode;
export interface PlayerProvider { id: string; key: string; name: string; movieUrl: string; tvUrl: string; /* ... */ }
export function buildEmbedUrl(
  provider: Pick<PlayerProvider, "movieUrl" | "tvUrl">,
  mediaId: string,
  mediaType: "movie" | "tv",
  season?: number,
  episode?: number,
  progress?: number,
): string;
export function providerIndexFromKey(providers: { key: string; isDefault?: boolean }[], key?: string): number;
export const DEFAULT_PROVIDERS: Omit<PlayerProvider, "id">[];
```

### `src/lib/watchStore.ts`

```ts
export interface WatchEntry {
  mediaId: string; mediaType: "movie" | "tv"; title: string; posterPath: string | null;
  season: number; episode: number; progress: number; duration: number;
  updatedAt: number; dirty: boolean;
}
export interface WatchMeta { mediaId: string; mediaType: "movie" | "tv"; title: string; posterPath?: string | null; season?: number; episode?: number }
export function entryKey(e: { mediaType: string; mediaId: string; season: number }): string;
export function touchWatch(m: WatchMeta): void;
export function updateWatchProgressLocal(m: WatchMeta, progress: number, duration: number): void;
export function removeEntries(keys: string[]): void;
export function clearAll(): void;
export function getDirty(): WatchEntry[];
export function markSynced(stamped: { key: string; updatedAt: number }[]): void;
export function mergeFromDb(rows: Array<Omit<WatchEntry, "dirty">>): void;
export function subscribe(listener: () => void): () => void;
export function getSnapshot(): WatchEntry[];
export function getServerSnapshot(): WatchEntry[];
export function useWatchHistory(): WatchEntry[];
```

### `src/lib/watchSyncClient.ts`

```ts
export async function flushWatch(): Promise<number>;
export async function pullWatch(): Promise<void>;
export async function fullSync(): Promise<void>;
```

### `src/lib/push.ts`, `pushClient.ts`, `episodeNotifications.ts`

```ts
export interface PushTarget { endpoint: string; keys: { p256dh: string; auth: string } }
export interface PushPayload { title: string; body: string; url?: string; icon?: string }
export async function sendPush(target: PushTarget, payload: PushPayload): Promise<"ok" | "gone" | "error">;

export type PushState = "unsupported" | "denied" | "subscribed" | "unsubscribed";
export function pushSupported(): boolean;
export async function getPushState(): Promise<PushState>;
export async function enablePush(): Promise<PushState>;
export async function disablePush(): Promise<PushState>;

export interface EpisodeNotification { /* kind, mediaId, season, episode, title, ... */ }
export async function computeEpisodeNotifications(profileId: string): Promise<EpisodeNotification[]>;
```

### `src/lib/theme/active.ts` — the theme answer for a request

```ts
export const getActiveThemeState: () => Promise<{
  themeId: string; experience: string; delta: Record<string, string>;
  detailLayout: DetailLayoutId; // cookie `l` → SiteTheme.detailLayout → "stage"
  published: { themeId: string; experience: string; delta: Record<string, string>; fingerprint: string } | null;
  showMismatch: boolean;
  // ... the resolved SSR state from studio/cookie
}>;
```

### `src/lib/theme/detail-layouts.ts`

```ts
export const DETAIL_LAYOUT_IDS: readonly ["stage", "dossier", "console"];
export type DetailLayoutId = (typeof DETAIL_LAYOUT_IDS)[number];
export const DEFAULT_DETAIL_LAYOUT_ID: DetailLayoutId;
export const DETAIL_LAYOUTS: { id: DetailLayoutId; name: string; description: string }[];
export function isDetailLayoutId(value: unknown): value is DetailLayoutId;
export function getDetailLayout(id: string | null | undefined): (typeof DETAIL_LAYOUTS)[number];
```

### `src/lib/theme/experiences.ts`, `presets.ts`, `site.ts`

```ts
export const EXPERIENCE_IDS: readonly ["cinevo", "netflix", "disney-hotstar", "apple-tv"];
export type ExperienceId = (typeof EXPERIENCE_IDS)[number];
export const DEFAULT_EXPERIENCE_ID: ExperienceId;
export function isExperienceId(value: unknown): value is ExperienceId;
export function getExperience(id: string | undefined | null): ExperienceDefinition;

export const DEFAULT_THEME_ID: string;
export const CUSTOMIZABLE_THEME_KEYS: readonly string[];
export const themePresets: ThemeDefinition<CinevoTokens>[];

export const SITE_THEME_ROW_ID = "active";
export function normalizeSiteTheme(input: unknown): SiteThemeState | null;
export function getSiteTheme(): Promise<SiteThemeState | null>;
export function isMissingSiteThemeTable(error: unknown): boolean;
```

### `src/lib/theme/studio/index.ts`

```ts
export { THEME_COOKIE, getSsrThemeState, parseThemeCookie, type SsrThemeState } from "./cookie";
export { ThemeProvider, useTheme } from "./provider";
export { ThemeStyle } from "./theme-style";
export { resolveActiveTokens, tokensToCssVars } from "./tokens";
export type { BaseTokens, CompactCookiePayload, ThemeContextValue, ThemeDefinition } from "./types";
```

### `src/lib/genres.ts`, `relativeTime.ts`, `imageLoader.ts`

```ts
export interface GenreCache { /* movie + tv genre lists, loading flag */ }
export function clearGenresCache(): void;
export async function loadGenres(): Promise<GenreCache>;
export function toGenreOptions(genres: TMDBGenre[]): SelectOption[];
export function useGenres(): GenreCache;

export function relativeTime(ms: number): string;

export default function cinevoImageLoader({ src, width }: ImageLoaderProps): string;
```

### `src/components/hover/` — the shared hover preview

```ts
export function useHoverPopover(options: {
  enabled?: boolean; minWidth?: number; maxWidth?: number; widthFactor?: number;
  headerRatio?: number; estimatedBody: number; onOpen?: () => void;
}): HoverPopoverState;

export interface HoverPopoverLayout { width: number; left: number; top: number; originX: number; originY: number }
export interface HoverPopoverState {
  hostRef: RefObject<HTMLDivElement | null>; panelRef: RefObject<HTMLDivElement | null>;
  layout: HoverPopoverLayout | null;
  schedule(): void; closeSoon(event?: React.PointerEvent): void;
  keepOpen(event?: React.PointerEvent): void; dismiss(): void;
}

export interface TitlePreview { overview: string; genres: string[]; certification: string; runtime: string; cast: PreviewCastMember[] }
export interface PersonPreview {
  biography: string; birthday: string | null; deathday: string | null;
  placeOfBirth: string | null; knownForDepartment: string | null; knownFor: PersonKnownFor[];
}

export default function TitleHoverCard(props: {
  item: TMDBMedia; mediaType: "movie" | "tv"; href: string;
  enabled?: boolean; className?: string; children: ReactNode;
}): ReactNode;

export default function PersonHoverCard(props: {
  personId: number; name: string; character?: string; profilePath: string | null;
  enabled?: boolean; className?: string; children: ReactNode;
}): ReactNode;

export default function Skeleton(props: { className?: string }): ReactNode;
```

### Server Actions (`src/app/actions/`)

Every module begins `"use server"`. The shapes that matter across a boundary:

```ts
// admin.ts, providers.ts, radio.ts — the same guard repeated per module
async function requireAdmin(): Promise<Profile>; // throws Error("Forbidden") when role !== "admin"

// wishlist.ts
export interface WishlistItemInput { mediaId: string; mediaType: "movie" | "tv"; title: string; posterPath?: string; rating?: number; releaseDate?: string }
export async function toggleWishlist(item: WishlistItemInput): Promise<{ success: boolean; requiresAuth?: boolean }>;

// progress.ts
export interface WatchProgressInput { /* mediaId, mediaType, season, episode, progress, duration */ }
export async function syncWatchProgress(/* entries */): Promise</* synced keys */>;
export async function getWatchProgressList(): Promise</* rows */>;

// tmdb-actions.ts — the hover previews
export async function getTitlePreviewAction(mediaId: string, mediaType: "movie" | "tv"): Promise<{ success: boolean; data: TitlePreview | null }>;
export async function getPersonPreviewAction(personId: string): Promise<{ success: boolean; data: PersonPreview | null }>;
```

## Card effects and the hero deck

```ts
// src/lib/theme/card-effects.ts
export const CARD_EFFECT_IDS = ["none", "decay"] as const;
export type CardEffectId = (typeof CARD_EFFECT_IDS)[number];
export const HERO_EFFECT_IDS = ["none", "swap"] as const;
export type HeroEffectId = (typeof HERO_EFFECT_IDS)[number];
export const DECAY_RING_MIN = 1;
export const DECAY_RING_MAX = 12;
export const DEFAULT_DECAY_RING = 2;
export function isCardEffectId(value: unknown): value is CardEffectId;
export function isHeroEffectId(value: unknown): value is HeroEffectId;
export function isDecayRing(value: unknown): value is number;
export function clampDecayRing(value: unknown): number;

// src/components/reactbits/card-swap/index.ts
export default function CardSwap(props: CardSwapProps): ReactNode;
export interface CardSwapHandle { next(): void; prev(): void }
export interface CardSwapProps {
  width?: number; height?: number; cardDistance?: number; verticalDistance?: number;
  depth?: number; skewAmount?: number; visibleCards?: number; delay?: number;
  autoplay?: boolean; pauseOnHover?: boolean; draggable?: boolean; speed?: number;
  bounce?: number; parallax?: number; hoverSpread?: number; dim?: number;
  cardRadius?: number; intro?: boolean; theme?: "dark" | "light";
  onCardClick?: (index: number) => void; onChange?: (index: number) => void;
  className?: string; children?: ReactNode;
}
```

## Types shared across boundaries

- **`MediaSource`** (`"movie" | "tv"`) — `src/lib/tmdb.ts` defines it; providers, watch
  store, wishlist and progress all key on it.
- **`WatchEntry` / `WatchMeta`** — the client store's shape, mirrored by the
  `WatchProgress` Prisma model and by `src/app/actions/progress.ts`. A field added here
  needs the same field on the other two.
- **`SandboxMode`** — player-only, but it travels through a provider record and a
  localStorage key, so renaming it is a migration.
- **`ExperienceId`** — the clone identity; `src/lib/theme/active.ts` and every page
  composition branch on it.
- **`SiteThemeState`** — the published-default row, read by `getActiveThemeState()` and
  written by `src/app/actions/site-theme.ts`.

## Removed

Nothing yet. When a public export is removed, note it here for one release, then delete the
note.