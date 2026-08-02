"use client";

import type { RadioCategoryData, RadioStationData } from "@/app/actions/radio";

/**
 * localStorage-backed stores for radio preferences, exposed as external stores
 * so components can read them with `useSyncExternalStore`.
 *
 * Reading through an external store rather than an effect avoids the classic
 * bug in this area: a save effect firing on the first commit with empty state
 * and wiping the stored value before the load effect has run. It also keeps
 * two open tabs in sync via the `storage` event.
 */

const FAVORITES_KEY = "cinevo_radio_favorites";
const STATIONS_KEY = "cinevo_radio_stations";
const CATEGORIES_KEY = "cinevo_radio_categories";
const LAST_KEY = "cinevo_radio_last";

/** Stable identity for the server/initial snapshot — a new [] each call would loop. */
const EMPTY: RadioStationData[] = [];

type Listener = () => void;
const listeners = new Set<Listener>();

function emit() {
  for (const l of listeners) l();
}

function subscribe(listener: Listener) {
  listeners.add(listener);
  // Another tab changed the value. (`key === null` is a whole-store clear.)
  const onStorage = (e: StorageEvent) => {
    if (e.key === FAVORITES_KEY || e.key === null) {
      favoritesCache.raw = undefined;
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/* ── Favourites ────────────────────────────────────────────────────────── */

/**
 * getSnapshot must return a referentially stable value between changes, so the
 * parsed list is memoised against the raw string it came from.
 */
const favoritesCache: { raw?: string | null; parsed: RadioStationData[] } = {
  raw: undefined,
  parsed: EMPTY,
};

function parseFavorites(raw: string | null): RadioStationData[] {
  if (!raw) return EMPTY;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return EMPTY;
    const clean = parsed.filter(
      (s): s is RadioStationData =>
        Boolean(s) && typeof s.id === "string" && typeof s.url === "string" && typeof s.name === "string"
    );
    return clean.length > 0 ? clean : EMPTY;
  } catch {
    return EMPTY;
  }
}

function getFavoritesSnapshot(): RadioStationData[] {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(FAVORITES_KEY);
  } catch {
    return EMPTY;
  }
  if (raw !== favoritesCache.raw) {
    favoritesCache.raw = raw;
    favoritesCache.parsed = parseFavorites(raw);
  }
  return favoritesCache.parsed;
}

/** Server render has no storage; favourites appear after hydration. */
function getFavoritesServerSnapshot(): RadioStationData[] {
  return EMPTY;
}

function writeFavorites(next: RadioStationData[]) {
  const raw = JSON.stringify(next);
  try {
    localStorage.setItem(FAVORITES_KEY, raw);
  } catch (err) {
    console.error("Failed to save radio favorites:", err);
  }
  favoritesCache.raw = raw;
  favoritesCache.parsed = next.length > 0 ? next : EMPTY;
  emit();
}

// Volume and equaliser settings moved to Zustand stores — see `volumeStore.ts`
// and `eqStore.ts`. Favourites stay here: they carry a merge-on-sign-in policy
// against the server, which is not a plain preference.

/* ── Station cache ─────────────────────────────────────────────────────── */

/**
 * Stations per category, cached client-side so revisiting a category is
 * instant and doesn't hit the server again.
 *
 * Entries expire after a day, and the cache keeps only the most recently used
 * categories — a full 400-station list is ~50KB, and localStorage quotas are
 * small enough that an unbounded cache would eventually throw.
 */
const STATION_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_CACHED_CATEGORIES = 20;

interface StationCacheEntry {
  /** Last-used timestamp, for both expiry and LRU eviction. */
  t: number;
  d: RadioStationData[];
}

type StationCache = Record<string, StationCacheEntry>;

function readCache(): StationCache {
  try {
    const raw = localStorage.getItem(STATIONS_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return parsed as StationCache;
  } catch {
    return {};
  }
}

function persistCache(cache: StationCache) {
  // Evict expired entries, then the least recently used beyond the cap.
  const now = Date.now();
  const live = Object.entries(cache)
    .filter(([, e]) => e && Array.isArray(e.d) && now - e.t < STATION_TTL_MS)
    .sort((a, b) => b[1].t - a[1].t)
    .slice(0, MAX_CACHED_CATEGORIES);

  let next: StationCache = Object.fromEntries(live);

  // Quotas vary by browser; shed the oldest entries until the write fits.
  for (let attempt = 0; attempt < MAX_CACHED_CATEGORIES; attempt++) {
    try {
      localStorage.setItem(STATIONS_KEY, JSON.stringify(next));
      return;
    } catch {
      const keys = Object.keys(next);
      if (keys.length <= 1) {
        try {
          localStorage.removeItem(STATIONS_KEY);
        } catch {
          /* nothing more we can do */
        }
        return;
      }
      const oldest = keys.reduce((a, b) => (next[a].t <= next[b].t ? a : b));
      next = Object.fromEntries(Object.entries(next).filter(([k]) => k !== oldest));
    }
  }
}

function readStations(slug: string): RadioStationData[] | null {
  const cache = readCache();
  const entry = cache[slug];
  if (!entry || !Array.isArray(entry.d)) return null;
  if (Date.now() - entry.t >= STATION_TTL_MS) return null;
  return entry.d;
}

function writeStations(slug: string, data: RadioStationData[]) {
  const cache = readCache();
  cache[slug] = { t: Date.now(), d: data };
  persistCache(cache);
}

/** Drops a category's cache after an admin edit so the change is visible. */
function invalidateStations(slug: string) {
  const cache = readCache();
  if (!(slug in cache)) return;
  delete cache[slug];
  persistCache(cache);
}

function clearStations() {
  try {
    localStorage.removeItem(STATIONS_KEY);
  } catch {
    /* non-fatal */
  }
}

/* ── Category cache ────────────────────────────────────────────────────── */

/**
 * The browsable category index, cached client-side so the rail is there on
 * arrival and a page load doesn't re-read a table of several thousand rows.
 *
 * Versioned as well as timed: `group` and `name` are derived by the slug
 * classifier at query time, so a list cached by an older build could file
 * categories under sections that no longer exist. A version bump discards it.
 */
const CATEGORY_CACHE_VERSION = 1;
const CATEGORY_TTL_MS = 24 * 60 * 60 * 1000;

interface CategoryCacheEntry {
  v: number;
  t: number;
  d: RadioCategoryData[];
}

function readCategories(): RadioCategoryData[] | null {
  try {
    const raw = localStorage.getItem(CATEGORIES_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;

    const entry = parsed as Partial<CategoryCacheEntry>;
    if (entry.v !== CATEGORY_CACHE_VERSION || !Array.isArray(entry.d)) return null;
    if (typeof entry.t !== "number" || Date.now() - entry.t >= CATEGORY_TTL_MS) return null;
    return entry.d;
  } catch {
    return null;
  }
}

function writeCategories(data: RadioCategoryData[]) {
  // Never cache an empty list — a failed fetch would otherwise pin the rail
  // empty for a day.
  if (data.length === 0) return;
  try {
    const entry: CategoryCacheEntry = { v: CATEGORY_CACHE_VERSION, t: Date.now(), d: data };
    localStorage.setItem(CATEGORIES_KEY, JSON.stringify(entry));
  } catch {
    // Out of quota. The index is a nice-to-have, so drop it rather than
    // competing with the station cache for room.
    invalidateCategories();
  }
}

/** Drops the index after an admin change (new category, moved station counts). */
function invalidateCategories() {
  try {
    localStorage.removeItem(CATEGORIES_KEY);
  } catch {
    /* non-fatal */
  }
}

/* ── Last played station ───────────────────────────────────────────────── */

/**
 * The station most recently connected to, so a return visit resumes where the
 * listener left off. Written only on an actual play — cueing a station without
 * connecting doesn't count as having listened to it.
 */
function readLastStation(): RadioStationData | null {
  try {
    const raw = localStorage.getItem(LAST_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const s = parsed as Partial<RadioStationData>;
    if (typeof s.id !== "string" || typeof s.url !== "string" || typeof s.name !== "string") {
      return null;
    }
    return s as RadioStationData;
  } catch {
    return null;
  }
}

function writeLastStation(station: RadioStationData) {
  try {
    localStorage.setItem(
      LAST_KEY,
      JSON.stringify({
        id: station.id,
        name: station.name,
        url: station.url,
        categorySlug: station.categorySlug,
      })
    );
  } catch {
    /* non-fatal */
  }
}

export const radioStorage = {
  subscribe,
  getFavoritesSnapshot,
  getFavoritesServerSnapshot,
  writeFavorites,
  readLastStation,
  writeLastStation,
  readStations,
  writeStations,
  invalidateStations,
  clearStations,
  readCategories,
  writeCategories,
  invalidateCategories,
};
