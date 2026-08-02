"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { persistStorage, useStoreHydration } from "@/lib/stores/persistOptions";

export const DEFAULT_VOLUME = 0.8;

const clamp = (n: unknown) =>
  typeof n === "number" && Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : DEFAULT_VOLUME;

interface VolumeState {
  volume: number;
  setVolume: (value: number) => void;
}

const useStore = create<VolumeState>()(
  persist(
    (set) => ({
      volume: DEFAULT_VOLUME,
      setVolume: (value) => set({ volume: clamp(value) }),
    }),
    {
      name: "cinevo_radio_volume",
      storage: persistStorage,
      skipHydration: true,
      partialize: (s) => ({ volume: s.volume }),
      // A stored value out of range would silently break playback, so it's
      // clamped on the way in as well as out.
      merge: (persisted, current) => ({
        ...current,
        volume: clamp((persisted as Partial<VolumeState>)?.volume),
      }),
    }
  )
);

/** Playback volume, 0–1. Shared by the player bar and the audio element. */
export function useVolume(): number {
  useStoreHydration(useStore);
  return useStore((s) => s.volume);
}

export function setVolume(value: number) {
  useStore.getState().setVolume(value);
}
