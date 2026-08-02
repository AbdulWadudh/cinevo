"use client";

import { useSyncExternalStore } from "react";
import { safeStorage } from "@/lib/safeStorage";
import { storageKey } from "@/config";

// Local-first watch store. All reads/writes hit localStorage immediately (so
// Continue Watching / History are instant and work offline / signed-out). A
// background syncer (see WatchSync) flushes "dirty" entries to the DB every
// 10 minutes + on tab hide, and merges the DB copy in on load for cross-device.

export interface WatchEntry {
  mediaId: string;
  mediaType: "movie" | "tv";
  title: string;
  posterPath: string | null;
  season: number;   // 0 for movies
  episode: number;  // 0 for movies
  progress: number;  // seconds
  duration: number;  // seconds (0 when unknown)
  updatedAt: number; // epoch ms (client clock — used for last-write-wins)
  dirty: boolean;    // true when it still needs to be pushed to the DB
}

export interface WatchMeta {
  mediaId: string;
  mediaType: "movie" | "tv";
  title: string;
  posterPath?: string | null;
  season?: number;
  episode?: number;
}

const KEY = storageKey("watchHistory:v1");

// Identity is one record PER SEASON (movies use season 0). Episode is not part
// of the key — watching a new episode updates the season's record in place.
export function entryKey(e: { mediaType: string; mediaId: string; season: number }): string {
  return `${e.mediaType}:${e.mediaId}:${e.season}`;
}

type StoreMap = Record<string, WatchEntry>;

let map: StoreMap | null = null;
let snapshot: WatchEntry[] = [];
const listeners = new Set<() => void>();

// Re-key a persisted map to the current entryKey format and collapse any
// collisions (newest updatedAt wins). Migrates older per-episode keys
// (mediaType:mediaId:season:episode) into per-season records in place.
function normalize(raw: StoreMap): StoreMap {
  const out: StoreMap = {};
  let changed = false;
  for (const [oldKey, entry] of Object.entries(raw)) {
    if (!entry || !entry.mediaType || !entry.mediaId) { changed = true; continue; }
    const season = entry.season ?? 0;
    const key = entryKey({ mediaType: entry.mediaType, mediaId: entry.mediaId, season });
    if (key !== oldKey) changed = true;
    const existing = out[key];
    if (!existing) {
      out[key] = { ...entry, season, episode: entry.episode ?? 0 };
    } else {
      changed = true; // collapsing a duplicate
      if (entry.updatedAt > existing.updatedAt) {
        out[key] = { ...entry, season, episode: entry.episode ?? 0 };
      }
    }
  }
  if (changed) {
    try { safeStorage.set(KEY, JSON.stringify(out)); } catch { /* ignore */ }
  }
  return out;
}

function ensure(): StoreMap {
  if (map) return map;
  try {
    const raw = safeStorage.get(KEY);
    map = normalize(raw ? (JSON.parse(raw) as StoreMap) : {});
  } catch {
    map = {};
  }
  recompute();
  return map;
}

function recompute() {
  snapshot = Object.values(map ?? {}).sort((a, b) => b.updatedAt - a.updatedAt);
}

function commit() {
  recompute();
  safeStorage.set(KEY, JSON.stringify(map ?? {}));
  listeners.forEach((l) => l());
}

const norm = (m: WatchMeta) => ({
  season: m.mediaType === "tv" ? (m.season ?? 1) : 0,
  episode: m.mediaType === "tv" ? (m.episode ?? 1) : 0,
});

/** Mark a title as opened/just-watched without lowering known progress. */
export function touchWatch(m: WatchMeta) {
  const store = ensure();
  const { season, episode } = norm(m);
  const key = entryKey({ mediaType: m.mediaType, mediaId: m.mediaId, season });
  const existing = store[key];
  // Preserve progress only when re-opening the same episode; a different
  // episode of the same season starts fresh (it overwrites the season record).
  const sameEpisode = existing?.episode === episode;
  store[key] = {
    mediaId: m.mediaId,
    mediaType: m.mediaType,
    title: m.title,
    posterPath: m.posterPath ?? existing?.posterPath ?? null,
    season,
    episode,
    progress: sameEpisode ? existing!.progress : 0,
    duration: sameEpisode ? existing!.duration : 0,
    updatedAt: Date.now(),
    dirty: true,
  };
  commit();
}

/** Update watch progress with specific progress and duration values. */
export function updateWatchProgressLocal(m: WatchMeta, progress: number, duration: number) {
  const store = ensure();
  const { season, episode } = norm(m);
  const key = entryKey({ mediaType: m.mediaType, mediaId: m.mediaId, season });
  const existing = store[key];
  store[key] = {
    mediaId: m.mediaId,
    mediaType: m.mediaType,
    title: m.title,
    posterPath: m.posterPath ?? existing?.posterPath ?? null,
    season,
    episode,
    progress,
    duration,
    updatedAt: Date.now(),
    dirty: true,
  };
  commit();
}

export function removeEntries(keys: string[]) {
  const store = ensure();
  let changed = false;
  for (const k of keys) if (store[k]) { delete store[k]; changed = true; }
  if (changed) commit();
}

export function clearAll() {
  map = {};
  commit();
}

/** Entries that still need a DB push, paired with their current timestamp. */
export function getDirty(): WatchEntry[] {
  return Object.values(ensure()).filter((e) => e.dirty);
}

/** Mark entries synced — but only if untouched since the flush snapshot. */
export function markSynced(stamped: { key: string; updatedAt: number }[]) {
  const store = ensure();
  let changed = false;
  for (const { key, updatedAt } of stamped) {
    const e = store[key];
    if (e && e.dirty && e.updatedAt === updatedAt) { e.dirty = false; changed = true; }
  }
  if (changed) commit();
}

/** Merge the DB copy in (last-write-wins). Newer DB rows overwrite local. */
export function mergeFromDb(rows: Array<Omit<WatchEntry, "dirty">>) {
  const store = ensure();
  let changed = false;
  for (const row of rows) {
    const key = entryKey(row);
    const local = store[key];
    if (!local || row.updatedAt > local.updatedAt) {
      store[key] = { ...row, dirty: false };
      changed = true;
    }
  }
  if (changed) commit();
}

/* ── useSyncExternalStore wiring ── */
export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
export function getSnapshot(): WatchEntry[] {
  ensure();
  return snapshot;
}

const EMPTY: WatchEntry[] = [];

export function getServerSnapshot(): WatchEntry[] {
  return EMPTY;
}

/** Reactive, newest-first list of all local watch entries. */
export function useWatchHistory(): WatchEntry[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
