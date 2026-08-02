"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useShallow } from "zustand/react/shallow";
import { persistStorage, useStoreHydration } from "@/lib/stores/persistOptions";

export interface EqSettings {
  enabled: boolean;
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

/** Gains are dB on the biquad filters — out-of-range values distort badly. */
const clampGain = (n: unknown) =>
  typeof n === "number" && Number.isFinite(n) ? Math.min(12, Math.max(-12, n)) : 0;

function sanitise(value: unknown): EqSettings {
  if (!value || typeof value !== "object") return DEFAULT_EQ;
  const p = value as Partial<EqSettings>;
  return {
    enabled: Boolean(p.enabled),
    bass: clampGain(p.bass),
    mid: clampGain(p.mid),
    treble: clampGain(p.treble),
    preset: typeof p.preset === "string" ? p.preset : "custom",
  };
}

interface EqState extends EqSettings {
  setEq: (next: EqSettings) => void;
}

const useStore = create<EqState>()(
  persist(
    (set) => ({
      ...DEFAULT_EQ,
      setEq: (next) => set(sanitise(next)),
    }),
    {
      name: "cinevo_radio_eq",
      storage: persistStorage,
      skipHydration: true,
      partialize: ({ enabled, bass, mid, treble, preset }) => ({
        enabled,
        bass,
        mid,
        treble,
        preset,
      }),
      merge: (persisted, current) => ({ ...current, ...sanitise(persisted) }),
    }
  )
);

/**
 * Equaliser settings.
 *
 * `useShallow` is load-bearing: the equaliser hook puts this object in effect
 * and callback dependency arrays, so a selector building a fresh object each
 * render would re-run the whole audio graph every render. It replaces the
 * raw-string memoisation the hand-rolled store used for the same reason.
 */
export function useEqSettings(): EqSettings {
  useStoreHydration(useStore);
  return useStore(
    useShallow((s) => ({
      enabled: s.enabled,
      bass: s.bass,
      mid: s.mid,
      treble: s.treble,
      preset: s.preset,
    }))
  );
}

export function setEqSettings(next: EqSettings) {
  useStore.getState().setEq(next);
}
