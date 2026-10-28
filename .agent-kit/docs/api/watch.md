# watch — history, sync and push

Signatures only. Bodies belong in the source.

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
