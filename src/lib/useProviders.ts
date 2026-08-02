"use client";

import { useCallback, useEffect } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useShallow } from "zustand/react/shallow";
import { getPublicProviders } from "@/app/actions/providers";
import { persistStorage, useStoreHydration } from "@/lib/stores/persistOptions";
import {
  PROVIDERS_CACHE_KEY,
  PROVIDERS_CACHE_TTL_MS,
  PROVIDERS_CACHE_VERSION,
  type PlayerProvider,
} from "@/lib/providers";

interface ProvidersState {
  providers: PlayerProvider[];
  /** When the list was last pulled from the DB — drives the TTL. */
  fetchedAt: number;
  loading: boolean;
  refreshing: boolean;
  load: () => Promise<void>;
  refresh: () => Promise<void>;
}

const isFresh = (fetchedAt: number, providers: PlayerProvider[]) =>
  providers.length > 0 && Date.now() - fetchedAt <= PROVIDERS_CACHE_TTL_MS;

/** Shared so two players mounting at once make one request, not two. */
let inFlight: Promise<void> | null = null;

const useStore = create<ProvidersState>()(
  persist(
    (set, get) => ({
      providers: [],
      fetchedAt: 0,
      loading: true,
      refreshing: false,

      /** No-op when a fresh list is already in hand — every player mounts this. */
      load: async () => {
        const { providers, fetchedAt } = get();
        if (isFresh(fetchedAt, providers)) {
          set({ loading: false });
          return;
        }
        if (inFlight) return inFlight;

        inFlight = (async () => {
          try {
            const fresh = await getPublicProviders();
            set({ providers: fresh, fetchedAt: Date.now(), loading: false });
          } finally {
            inFlight = null;
          }
        })();
        return inFlight;
      },

      refresh: async () => {
        set({ refreshing: true });
        try {
          const fresh = await getPublicProviders();
          set({ providers: fresh, fetchedAt: Date.now(), loading: false });
        } finally {
          set({ refreshing: false });
        }
      },
    }),
    {
      name: PROVIDERS_CACHE_KEY,
      storage: persistStorage,
      skipHydration: true,
      // `loading` and `refreshing` describe this session, not the cache.
      partialize: ({ providers, fetchedAt }) => ({ providers, fetchedAt }),
      // Bumped when the provider shape changes; a mismatch drops the cache.
      version: PROVIDERS_CACHE_VERSION,
    }
  )
);

/**
 * Wipes the cached provider list (e.g. after an admin edit) so the next player
 * load pulls fresh config from the DB. Safe to call outside React.
 */
export function clearProvidersCache() {
  useStore.setState({ providers: [], fetchedAt: 0 });
  void useStore.persist.clearStorage();
}

interface UseProviders {
  providers: PlayerProvider[];
  loading: boolean;
  /** True while a manual refresh (cache wipe → DB fetch) is in flight. */
  refreshing: boolean;
  /** Wipe the cache and re-fetch fresh providers from the DB. */
  refresh: () => Promise<void>;
}

/**
 * The active providers, cached in localStorage behind a version and a 24h TTL.
 *
 * State lives in one store rather than per-hook, so several players mounted at
 * once share a single list and a single fetch — the previous `useState` version
 * gave each caller its own copy and its own round trip.
 */
export function useProviders(): UseProviders {
  useStoreHydration(useStore);

  const { providers, loading, refreshing } = useStore(
    useShallow((s) => ({ providers: s.providers, loading: s.loading, refreshing: s.refreshing }))
  );

  // Mount-only, as before: `load` decides for itself whether the hydrated
  // cache is still fresh. `useStoreHydration` above declares its effect first,
  // so the cache is already in the store by the time this runs.
  useEffect(() => {
    void useStore.getState().load();
  }, []);

  const refresh = useCallback(async () => {
    await useStore.getState().refresh();
  }, []);

  return { providers, loading, refreshing, refresh };
}
