"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { persistStorage, useStoreHydration } from "@/lib/stores/persistOptions";
import { storageKey } from "@/config";
import { DEFAULT_EFFECT_KEY, getEffect } from "./effects";

// Which holo effect the Mystery reveal uses. An admin picks it in Profile and
// it applies to everyone on the device.

interface RevealEffectState {
  effectKey: string;
  setEffect: (key: string) => void;
}

const useStore = create<RevealEffectState>()(
  persist(
    (set) => ({
      effectKey: DEFAULT_EFFECT_KEY,
      // Validated on the way in, so an unknown key from an older build (or a
      // hand-edited storage value) falls back rather than rendering nothing.
      setEffect: (key) => set({ effectKey: getEffect(key).key }),
    }),
    {
      name: storageKey("revealEffect:v2"),
      storage: persistStorage,
      skipHydration: true,
      partialize: (s) => ({ effectKey: s.effectKey }),
      // Same guard on the way out — the stored key is only as trustworthy as
      // the build that wrote it.
      merge: (persisted, current) => ({
        ...current,
        effectKey: getEffect((persisted as Partial<RevealEffectState>)?.effectKey ?? "").key,
      }),
    }
  )
);

/** Reactive selected effect key (defaults to DEFAULT_EFFECT_KEY). */
export function useRevealEffect(): string {
  useStoreHydration(useStore);
  return useStore((s) => s.effectKey);
}

/** Callable from anywhere, including outside React. */
export function setRevealEffect(key: string) {
  useStore.getState().setEffect(key);
}
