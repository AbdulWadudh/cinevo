"use client";

import { useEffect, useState } from "react";
import { safeStorage } from "@/lib/safeStorage";
import { getGenresAction } from "@/app/actions/tmdb-actions";
import type { TMDBGenre } from "@/lib/tmdb";
import type { SelectOption } from "@/components/ui/CustomSelect";
import { storageKey } from "@/config";

// The official TMDB genre lists rarely change, so we fetch them once and cache
// them in localStorage — the dropdowns in Browse/Search then read from the
// cache instead of hitting TMDB on every visit. Clearing the cache (see the
// sync button) forces a fresh fetch on the next read.

const KEY = storageKey("genres:v1");

export interface GenreCache {
  movie: TMDBGenre[];
  tv: TMDBGenre[];
}

const EMPTY: GenreCache = { movie: [], tv: [] };

function readCache(): GenreCache | null {
  try {
    const raw = safeStorage.get(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GenreCache;
    if (parsed?.movie?.length && parsed?.tv?.length) return parsed;
  } catch {
    /* fall through to refetch */
  }
  return null;
}

/** Drop the cached genre lists so the next load refetches from TMDB. */
export function clearGenresCache() {
  safeStorage.remove(KEY);
}

/** Load both genre lists, preferring the localStorage cache over a network call. */
export async function loadGenres(): Promise<GenreCache> {
  const cached = readCache();
  if (cached) return cached;

  const [movie, tv] = await Promise.all([
    getGenresAction("movie"),
    getGenresAction("tv"),
  ]);
  const cache: GenreCache = { movie: movie.data, tv: tv.data };
  // Only persist a complete pair — avoid caching a partial/failed fetch.
  if (cache.movie.length && cache.tv.length) {
    try { safeStorage.set(KEY, JSON.stringify(cache)); } catch { /* ignore */ }
  }
  return cache;
}

/** Convert a TMDB genre list to CustomSelect options with a leading "All genres". */
export function toGenreOptions(genres: TMDBGenre[]): SelectOption[] {
  return [
    { label: "All genres", value: "" },
    ...genres.map((g) => ({ label: g.name, value: String(g.id) })),
  ];
}

/**
 * React hook: returns the cached genre lists (movie + tv), loading them from
 * localStorage or TMDB on mount.
 */
export function useGenres(): GenreCache {
  const [genres, setGenres] = useState<GenreCache>(EMPTY);

  useEffect(() => {
    let active = true;
    loadGenres().then((g) => { if (active) setGenres(g); });
    return () => { active = false; };
  }, []);

  return genres;
}
