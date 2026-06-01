"use client";

import { getWatchProgressList, syncWatchProgress } from "@/app/actions/progress";
import { getDirty, markSynced, mergeFromDb, entryKey, type WatchEntry } from "@/lib/watchStore";

/** Push all dirty local entries to the DB; mark synced on success. */
export async function flushWatch(): Promise<number> {
  const dirty = getDirty();
  if (dirty.length === 0) return 0;
  const stamped = dirty.map((e) => ({ key: entryKey(e), updatedAt: e.updatedAt }));
  const res = await syncWatchProgress(
    dirty.map((e) => ({
      mediaId: e.mediaId,
      mediaType: e.mediaType,
      title: e.title,
      posterPath: e.posterPath ?? undefined,
      season: e.mediaType === "tv" ? e.season : undefined,
      episode: e.mediaType === "tv" ? e.episode : undefined,
      progress: e.progress,
      duration: e.duration,
    }))
  );
  if (res.success) {
    markSynced(stamped);
    return dirty.length;
  }
  return 0;
}

/** Pull the DB copy and merge it into the local store (last-write-wins). */
export async function pullWatch(): Promise<void> {
  const res = await getWatchProgressList();
  if (res.success && res.data) {
    const rows: Omit<WatchEntry, "dirty">[] = res.data.map((i: any) => ({
      mediaId: i.mediaId,
      mediaType: i.mediaType === "tv" ? "tv" : "movie",
      title: i.title,
      posterPath: i.posterPath ?? null,
      season: i.season ?? 0,
      episode: i.episode ?? 0,
      progress: i.progress ?? 0,
      duration: i.duration ?? 0,
      updatedAt: new Date(i.updatedAt).getTime(),
    }));
    mergeFromDb(rows);
  }
}

/** Full reconcile: merge DB → local, then push local → DB. */
export async function fullSync(): Promise<void> {
  await pullWatch();
  await flushWatch();
}
