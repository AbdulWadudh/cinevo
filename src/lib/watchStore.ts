"use client";

import { useSyncExternalStore } from "react";

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

const KEY = "cinevo:watchHistory:v1";

export function entryKey(e: { mediaType: string; mediaId: string; season: number; episode: number }): string {
  return `${e.mediaType}:${e.mediaId}:${e.season}:${e.episode}`;
}

type StoreMap = Record<string, WatchEntry>;

let map: StoreMap | null = null;
let snapshot: WatchEntry[] = [];
const listeners = new Set<() => void>();

function ensure(): StoreMap {
  if (map) return map;
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(KEY) : null;
    map = raw ? (JSON.parse(raw) as StoreMap) : {};
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
  try { localStorage.setItem(KEY, JSON.stringify(map ?? {})); } catch { /* quota / unavailable */ }
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
  const key = entryKey({ mediaType: m.mediaType, mediaId: m.mediaId, season, episode });
  const existing = store[key];
  store[key] = {
    mediaId: m.mediaId,
    mediaType: m.mediaType,
    title: m.title,
    posterPath: m.posterPath ?? existing?.posterPath ?? null,
    season,
    episode,
    progress: existing?.progress ?? 0,
    duration: existing?.duration ?? 0,
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
