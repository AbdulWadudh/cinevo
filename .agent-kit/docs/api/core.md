# core — config, data, auth and catalogue

Signatures only. Bodies belong in the source.

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
