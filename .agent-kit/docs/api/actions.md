# actions — Server Actions

Every module under `src/app/actions/` begins `"use server"`. These are the shapes that matter
across a boundary; bodies belong in the source.

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

Every admin action starts with `requireAdmin()`; the rule is
[../../rules/api.md](../../rules/api.md) §5.
