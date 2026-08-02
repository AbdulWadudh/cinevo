"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import type { RadioStationData } from "@/app/actions/radio";
import { radioStorage } from "./radioStorage";

/** Favourite stations, persisted to localStorage and synced across tabs. */
export function useRadioFavorites() {
  const favorites = useSyncExternalStore(
    radioStorage.subscribe,
    radioStorage.getFavoritesSnapshot,
    radioStorage.getFavoritesServerSnapshot
  );

  /** Membership set so cards don't scan the array on every render. */
  const favoriteIds = useMemo(() => new Set(favorites.map((f) => f.id)), [favorites]);

  const toggleFavorite = useCallback((station: RadioStationData) => {
    const current = radioStorage.getFavoritesSnapshot();
    const next = current.some((f) => f.id === station.id)
      ? current.filter((f) => f.id !== station.id)
      : [...current, { id: station.id, name: station.name, url: station.url, categorySlug: station.categorySlug }];
    radioStorage.writeFavorites(next);
  }, []);

  const isFavorite = useCallback((id: string) => favoriteIds.has(id), [favoriteIds]);

  return { favorites, favoriteIds, toggleFavorite, isFavorite };
}
