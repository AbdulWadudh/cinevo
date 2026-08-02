"use client";

import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore,
} from "react";
import type { RadioStationData } from "@/app/actions/radio";
import { useRadioPlayer } from "./useRadioPlayer";
import { useRadioEqualizer } from "./useRadioEqualizer";
import { radioStorage } from "./radioStorage";

type RadioPlayer = ReturnType<typeof useRadioPlayer>;
type RadioEqualizer = ReturnType<typeof useRadioEqualizer>;

interface RadioPlayerContextValue {
  player: RadioPlayer;
  eq: RadioEqualizer;
  /** The list prev/next step through. Set by the radio page as you browse. */
  setQueue: (stations: RadioStationData[]) => void;
  skip: (delta: 1 | -1) => void;
  canSkip: boolean;
}

const RadioPlayerContext = createContext<RadioPlayerContextValue | null>(null);

/**
 * Owns the single audio element for the whole app.
 *
 * It lives in the root layout rather than on `/radio` so playback survives
 * navigation — leave the radio page and the stream keeps going, with the mini
 * player as the only visible remnant. It also cues the last-played station on
 * a cold start, so the mini player is there before you have opened the radio
 * page at all.
 */
export default function RadioPlayerProvider({ children }: { children: React.ReactNode }) {
  const player = useRadioPlayer();
  const eq = useRadioEqualizer(player.audioRef, player.markElementTainted);

  /** Whatever list the radio page last showed; empty until it mounts. */
  const [queue, setQueueState] = useState<RadioStationData[]>([]);
  const cuedRef = useRef(false);

  const setQueue = useCallback((stations: RadioStationData[]) => {
    setQueueState(stations);
  }, []);

  /* Restore the last-played station, paused, on a cold start. */
  useEffect(() => {
    if (cuedRef.current) return;
    cuedRef.current = true;

    // localStorage is unreadable during the server render, so this waits for
    // the client. Nothing is connected — it just populates the player.
    const last = radioStorage.readLastStation();
    if (last) queueMicrotask(() => player.cue(last));
  }, [player]);

  /**
   * Prev/next need something to step through. The radio page supplies it
   * directly; away from that page — or after a reload — favourites stand in.
   * Read through the store so this stays reactive and SSR-safe rather than
   * touching localStorage during render.
   */
  const favorites = useSyncExternalStore(
    radioStorage.subscribe,
    radioStorage.getFavoritesSnapshot,
    radioStorage.getFavoritesServerSnapshot
  );

  const fallback = queue.length > 0 ? queue : favorites;
  const currentStation = player.current;

  const skip = useCallback(
    (delta: 1 | -1) => {
      // Last resort: the cached station list for whatever category is playing.
      const cached: RadioStationData[] =
        (currentStation?.categorySlug
          ? radioStorage.readStations(currentStation.categorySlug)
          : null) ?? [];
      const list: RadioStationData[] = fallback.length > 0 ? fallback : cached;

      if (list.length === 0) return;

      // Nothing playing, or playing something outside the list — start at its
      // top rather than doing nothing.
      const index = currentStation ? list.findIndex((s) => s.id === currentStation.id) : -1;
      if (index === -1) {
        void player.play(list[0]);
        return;
      }

      if (list.length < 2) return;
      void player.play(list[(index + delta + list.length) % list.length]);
    },
    [fallback, currentStation, player]
  );

  const canSkip = fallback.length > 1;

  const value = useMemo(
    () => ({ player, eq, setQueue, skip, canSkip }),
    [player, eq, setQueue, skip, canSkip]
  );

  return <RadioPlayerContext.Provider value={value}>{children}</RadioPlayerContext.Provider>;
}

export function useRadioPlayerContext(): RadioPlayerContextValue {
  const ctx = useContext(RadioPlayerContext);
  if (!ctx) {
    throw new Error("useRadioPlayerContext must be used inside <RadioPlayerProvider>");
  }
  return ctx;
}
