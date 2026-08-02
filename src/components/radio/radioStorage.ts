"use client";

import type { RadioStationData } from "@/app/actions/radio";

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
const VOLUME_KEY = "cinevo_radio_volume";
const STATIONS_KEY = "cinevo_radio_stations";
const EQ_KEY = "cinevo_radio_eq";
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
  // Another tab changed the value.
  const onStorage = (e: StorageEvent) => {
    if (e.key === FAVORITES_KEY || e.key === VOLUME_KEY || e.key === null) {
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

/* ── Volume ────────────────────────────────────────────────────────────── */

const DEFAULT_VOLUME = 0.8;

function getVolumeSnapshot(): number {
  try {
    const raw = localStorage.getItem(VOLUME_KEY);
    if (raw === null) return DEFAULT_VOLUME;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? Math.min(1, Math.max(0, parsed)) : DEFAULT_VOLUME;
  } catch {
    return DEFAULT_VOLUME;
  }
}

function getVolumeServerSnapshot(): number {
  return DEFAULT_VOLUME;
}

function writeVolume(value: number) {
  try {
    localStorage.setItem(VOLUME_KEY, String(value));
  } catch {
    /* non-fatal — volume just won't persist */
  }
  emit();
}

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

/* ── Equaliser settings ────────────────────────────────────────────────── */

export interface EqSettings {
  enabled: boolean;
  /** Gain in dB per band, -12…+12. */
  bass: number;
  mid: number;
  treble: number;
  preset: string;
}

export const DEFAULT_EQ: EqSettings = {
  enabled: false,
  bass: 0,
  mid: 0,
  treble: 0,
  preset: "flat",
};

function parseEq(raw: string | null): EqSettings {
  if (!raw) return DEFAULT_EQ;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return DEFAULT_EQ;
    const p = parsed as Partial<EqSettings>;
    const clamp = (n: unknown) =>
      typeof n === "number" && Number.isFinite(n) ? Math.min(12, Math.max(-12, n)) : 0;
    return {
      enabled: Boolean(p.enabled),
      bass: clamp(p.bass),
      mid: clamp(p.mid),
      treble: clamp(p.treble),
      preset: typeof p.preset === "string" ? p.preset : "custom",
    };
  } catch {
    return DEFAULT_EQ;
  }
}

/** Memoised against the raw string so getSnapshot stays referentially stable. */
const eqCache: { raw?: string | null; parsed: EqSettings } = { raw: undefined, parsed: DEFAULT_EQ };

function getEqSnapshot(): EqSettings {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(EQ_KEY);
  } catch {
    return DEFAULT_EQ;
  }
  if (raw !== eqCache.raw) {
    eqCache.raw = raw;
    eqCache.parsed = parseEq(raw);
  }
  return eqCache.parsed;
}

function getEqServerSnapshot(): EqSettings {
  return DEFAULT_EQ;
}

function writeEq(settings: EqSettings) {
  const raw = JSON.stringify(settings);
  try {
    localStorage.setItem(EQ_KEY, raw);
  } catch {
    /* non-fatal */
  }
  eqCache.raw = raw;
  eqCache.parsed = settings;
  emit();
}

export const radioStorage = {
  subscribe,
  getEqSnapshot,
  getEqServerSnapshot,
  writeEq,
  getFavoritesSnapshot,
  getFavoritesServerSnapshot,
  writeFavorites,
  getVolumeSnapshot,
  getVolumeServerSnapshot,
  writeVolume,
  readLastStation,
  writeLastStation,
  readStations,
  writeStations,
  invalidateStations,
  clearStations,
  DEFAULT_VOLUME,
};
