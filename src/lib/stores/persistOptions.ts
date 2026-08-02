"use client";

import { useEffect } from "react";
import { createJSONStorage } from "zustand/middleware";
import { safeStorage } from "@/lib/safeStorage";

/**
 * Backs `persist` with {@link safeStorage} rather than `localStorage` directly.
 *
 * Some embedded WebViews throw on merely *reading* the `localStorage` property,
 * which would take the whole store down at module scope. `safeStorage` falls
 * back to an in-memory map, so a blocked browser loses persistence between
 * sessions instead of crashing.
 */
export const persistStorage = createJSONStorage(() => ({
  getItem: (name: string) => safeStorage.get(name),
  setItem: (name: string, value: string) => safeStorage.set(name, value),
  removeItem: (name: string) => safeStorage.remove(name),
}));

interface PersistApi {
  persist: {
    rehydrate: () => void | Promise<void>;
    hasHydrated: () => boolean;
  };
}

/**
 * Pulls a `skipHydration` store's stored value in after mount.
 *
 * Every store here is created with `skipHydration: true` so the first client
 * render matches what the server sent. Reading storage at module scope instead
 * would have the client render a persisted value against a server render that
 * had none — the "Text content does not match server-rendered HTML" hydration
 * error. This is the same contract `getServerSnapshot` gave the hand-rolled
 * stores these replaced.
 *
 * Idempotent: several components can call it, and only the first rehydrates.
 */
export function useStoreHydration(store: PersistApi) {
  useEffect(() => {
    if (!store.persist.hasHydrated()) void store.persist.rehydrate();
  }, [store]);
}
