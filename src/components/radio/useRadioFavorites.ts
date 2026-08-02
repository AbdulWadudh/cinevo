"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import {
  mergeRadioFavoritesAction,
  toggleRadioFavoriteAction,
  type RadioStationData,
} from "@/app/actions/radio";
import { radioStorage } from "./radioStorage";

/**
 * Favourite stations, local-first with server sync.
 *
 * localStorage is always the render source, so the UI is instant and works
 * signed out. For a signed-in listener the database is authoritative: on mount
 * the two sides are merged (union, so nothing is lost either way) and the
 * result written back locally, then every toggle is mirrored to the server.
 */
export function useRadioFavorites(isSignedIn: boolean) {
  const favorites = useSyncExternalStore(
    radioStorage.subscribe,
    radioStorage.getFavoritesSnapshot,
    radioStorage.getFavoritesServerSnapshot
  );

  const [syncing, setSyncing] = useState(false);
  const mergedRef = useRef(false);

  /* Reconcile once per mount, after hydration. */
  useEffect(() => {
    if (!isSignedIn || mergedRef.current) return;
    mergedRef.current = true;

    let cancelled = false;
    setSyncing(true);

    const local = radioStorage.getFavoritesSnapshot();
    mergeRadioFavoritesAction(local.map((f) => f.id))
      .then((res) => {
        if (cancelled || !res.success || res.requiresAuth) return;
        // The server's list is the merged truth — mirror it locally.
        radioStorage.writeFavorites(res.data);
      })
      .catch((err) => console.error("Radio favourites sync failed:", err))
      .finally(() => {
        if (!cancelled) setSyncing(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isSignedIn]);

  /** Membership set so cards don't scan the array on every render. */
  const favoriteIds = useMemo(() => new Set(favorites.map((f) => f.id)), [favorites]);

  const toggleFavorite = useCallback(
    (station: RadioStationData) => {
      const current = radioStorage.getFavoritesSnapshot();
      const wasFavorite = current.some((f) => f.id === station.id);

      // Write locally first: the heart must respond instantly, and this is the
      // only store signed-out visitors have.
      const next = wasFavorite
        ? current.filter((f) => f.id !== station.id)
        : [
            ...current,
            {
              id: station.id,
              name: station.name,
              url: station.url,
              categorySlug: station.categorySlug,
            },
          ];
      radioStorage.writeFavorites(next);

      if (!isSignedIn) return;

      void toggleRadioFavoriteAction(station.id).then((res) => {
        if (res.success || res.requiresAuth) return;
        // The server rejected it — put the local list back so the two don't
        // silently drift apart.
        console.error("Failed to persist radio favourite:", res.error);
        radioStorage.writeFavorites(current);
      });
    },
    [isSignedIn]
  );

  const isFavorite = useCallback((id: string) => favoriteIds.has(id), [favoriteIds]);

  return { favorites, favoriteIds, toggleFavorite, isFavorite, syncing };
}
