"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { RadioStationData } from "@/app/actions/radio";
import { radioStorage } from "./radioStorage";

/**
 * `blocked` is autoplay refusal — a user-gesture problem, not a dead stream.
 * It is kept distinct from `error` so callers don't skip to the next station
 * when the browser simply wants a click first.
 */
export type PlaybackStatus = "idle" | "connecting" | "playing" | "paused" | "error" | "blocked";

/**
 * Single-element audio player for live streams.
 *
 * Live radio has no duration and no seeking, so this only tracks connection
 * state. Station switches are guarded by a request token: streams can take
 * seconds to open, and without it a slow resolve for an abandoned station
 * arrives late and hijacks whatever is playing now.
 */
export function useRadioPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const detachRef = useRef<(() => void) | null>(null);
  const requestRef = useRef(0);

  /**
   * Set once the equaliser has routed the element through an AudioContext.
   * `createMediaElementSource` is irreversible, so restoring plain playback
   * means throwing the element away and building a fresh one.
   */
  const needsFreshElementRef = useRef(false);

  // Nothing is cued during the server render: the opening station is chosen
  // randomly and from localStorage, neither of which survives hydration. The
  // client cues one immediately after mount (see RadioClient).
  const [current, setCurrent] = useState<RadioStationData | null>(null);
  const [status, setStatus] = useState<PlaybackStatus>("idle");
  const [isMuted, setIsMuted] = useState(false);

  // Read through the external store so the persisted value is available on the
  // first client render, with no load-then-setState round trip.
  const volume = useSyncExternalStore(
    radioStorage.subscribe,
    radioStorage.getVolumeSnapshot,
    radioStorage.getVolumeServerSnapshot
  );

  /**
   * Builds an audio element with all listeners attached. Volume is applied by
   * the effect below, which also runs on mount.
   */
  const buildElement = useCallback(() => {
    const audio = new Audio();
    audio.preload = "none";
    // Deliberately no crossOrigin: most icecast servers send no CORS headers,
    // and requesting it would make those streams fail to load outright. The
    // equaliser opts in when it needs a CORS-readable stream.

    const onPlaying = () => setStatus("playing");
    const onPause = () => setStatus((s) => (s === "error" ? s : "paused"));
    const onWaiting = () => setStatus("connecting");
    // Clearing src on pause/stop also fires `error`; ignore that case.
    const onError = () => {
      if (audio.getAttribute("src")) setStatus("error");
    };

    audio.addEventListener("playing", onPlaying);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("waiting", onWaiting);
    audio.addEventListener("stalled", onWaiting);
    audio.addEventListener("error", onError);

    const detach = () => {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      audio.removeEventListener("playing", onPlaying);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("waiting", onWaiting);
      audio.removeEventListener("stalled", onWaiting);
      audio.removeEventListener("error", onError);
    };

    audioRef.current = audio;
    detachRef.current = detach;
    return audio;
  }, []);

  useEffect(() => {
    buildElement();
    return () => {
      detachRef.current?.();
      audioRef.current = null;
      detachRef.current = null;
    };
  }, [buildElement]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = isMuted ? 0 : volume;
  }, [volume, isMuted]);

  const changeVolume = useCallback((next: number) => {
    const clamped = Math.min(1, Math.max(0, next));
    radioStorage.writeVolume(clamped);
    if (clamped > 0) setIsMuted(false);
  }, []);

  /**
   * Marks the element as tainted by the equaliser's AudioContext. The next
   * `play()` swaps in a clean element so non-CORS streams keep working.
   */
  const markElementTainted = useCallback(() => {
    needsFreshElementRef.current = true;
  }, []);

  const play = useCallback(
    async (station: RadioStationData) => {
      // Swap in a clean element if the equaliser captured the previous one.
      if (needsFreshElementRef.current) {
        detachRef.current?.();
        const fresh = buildElement();
        // The volume effect won't re-run for an imperative rebuild.
        fresh.volume = isMuted ? 0 : volume;
        needsFreshElementRef.current = false;
      }

      const audio = audioRef.current;
      if (!audio) return;

      const token = ++requestRef.current;
      setCurrent(station);
      setStatus("connecting");
      // Remembered here rather than on success: the listener chose it, and a
      // station that fails today may well be back tomorrow.
      radioStorage.writeLastStation(station);

      let target = station.url;
      try {
        const res = await fetch(`/api/radio/resolve?url=${encodeURIComponent(station.url)}`);
        if (res.ok) {
          const data: { resolvedUrl?: string } = await res.json();
          if (data.resolvedUrl) target = data.resolvedUrl;
        }
      } catch (err) {
        console.error("Failed to resolve station URL:", err);
      }

      // A newer station was selected while this one was resolving.
      if (token !== requestRef.current) return;

      try {
        audio.src = target;
        audio.load();
        await audio.play();
        if (token === requestRef.current) setStatus("playing");
      } catch (err) {
        if (token !== requestRef.current) return;
        const isAutoplayBlock = err instanceof DOMException && err.name === "NotAllowedError";
        console.error("Audio playback error:", err);
        setStatus(isAutoplayBlock ? "blocked" : "error");
      }
    },
    [buildElement, isMuted, volume]
  );

  const toggle = useCallback(
    (station?: RadioStationData) => {
      const audio = audioRef.current;
      if (!audio) return;

      const target = station ?? current;
      if (!target) return;

      // A different station — always start it fresh.
      if (!current || target.id !== current.id) {
        void play(target);
        return;
      }

      if (status === "playing" || status === "connecting") {
        // Pausing a live stream keeps a stale buffer; drop the source so the
        // next play reconnects to the live edge instead of resuming behind it.
        requestRef.current++;
        audio.pause();
        audio.removeAttribute("src");
        audio.load();
        setStatus("paused");
      } else {
        void play(target);
      }
    },
    [current, status, play]
  );

  /**
   * Stops playback but keeps the station cued. Unlike `toggle`, this never
   * starts anything — used when something else (a video) takes over the
   * speakers and the listener must opt back in deliberately.
   */
  const pause = useCallback(() => {
    const audio = audioRef.current;
    requestRef.current++;
    if (audio) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    }
    setStatus((s) => (s === "idle" ? s : "paused"));
  }, []);

  /**
   * Selects a station without connecting to it — the bar shows it, paused,
   * ready for the play button. Used to pre-load a favourite on arrival.
   */
  const cue = useCallback((station: RadioStationData) => {
    // Cancel any in-flight resolve so it can't overwrite this selection.
    requestRef.current++;
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    }
    setCurrent(station);
    setStatus("paused");
  }, []);

  const stop = useCallback(() => {
    const audio = audioRef.current;
    requestRef.current++;
    if (audio) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    }
    setCurrent(null);
    setStatus("idle");
  }, []);

  return {
    /** Exposed so the equaliser can attach a Web Audio graph to it. */
    audioRef,
    markElementTainted,
    current,
    status,
    isPlaying: status === "playing",
    isConnecting: status === "connecting",
    volume,
    isMuted,
    changeVolume,
    toggleMute: useCallback(() => setIsMuted((m) => !m), []),
    play,
    cue,
    pause,
    toggle,
    stop,
  };
}
