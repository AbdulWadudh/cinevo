"use client";

import { useCallback, useEffect, useState } from "react";
import { getPublicProviders } from "@/app/actions/providers";
import {
  PROVIDERS_CACHE_KEY,
  PROVIDERS_CACHE_TTL_MS,
  PROVIDERS_CACHE_VERSION,
  type PlayerProvider,
  type ProvidersCache,
} from "@/lib/providers";

/** Read a still-valid (matching version, not past TTL) cache, or null. */
function readCache(): PlayerProvider[] | null {
  try {
    const raw = localStorage.getItem(PROVIDERS_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ProvidersCache;
    if (parsed.version !== PROVIDERS_CACHE_VERSION) return null;
    if (Date.now() - parsed.fetchedAt > PROVIDERS_CACHE_TTL_MS) return null;
    if (!Array.isArray(parsed.providers) || parsed.providers.length === 0) return null;
    return parsed.providers;
  } catch {
    return null;
  }
}

function writeCache(providers: PlayerProvider[]) {
  try {
    const payload: ProvidersCache = {
      version: PROVIDERS_CACHE_VERSION,
      fetchedAt: Date.now(),
      providers,
    };
    localStorage.setItem(PROVIDERS_CACHE_KEY, JSON.stringify(payload));
  } catch {
    /* storage full / unavailable — ignore, we'll just refetch next time */
  }
}

interface UseProviders {
  providers: PlayerProvider[];
  loading: boolean;
  /** True while a manual refresh (cache wipe → DB fetch) is in flight. */
  refreshing: boolean;
  /** Wipe the localStorage cache and re-fetch fresh providers from the DB. */
  refresh: () => Promise<void>;
}

/**
 * Loads the active providers once and caches them in localStorage (version + TTL).
 * Subsequent mounts read straight from the cache until it expires; `refresh()`
 * force-clears the cache and pulls a fresh copy from the database.
 */
export function useProviders(): UseProviders {
  const [providers, setProviders] = useState<PlayerProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchFromDb = useCallback(async () => {
    const fresh = await getPublicProviders();
    setProviders(fresh);
    writeCache(fresh);
    return fresh;
  }, []);

  useEffect(() => {
    const cached = readCache();
    if (cached) {
      setProviders(cached);
      setLoading(false);
      return;
    }
    fetchFromDb().finally(() => setLoading(false));
  }, [fetchFromDb]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      localStorage.removeItem(PROVIDERS_CACHE_KEY);
      await fetchFromDb();
    } finally {
      setRefreshing(false);
    }
  }, [fetchFromDb]);

  return { providers, loading, refreshing, refresh };
}
