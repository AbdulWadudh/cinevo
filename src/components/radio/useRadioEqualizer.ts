"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useEqSettings, setEqSettings, type EqSettings } from "./eqStore";

export interface EqPreset {
  id: string;
  label: string;
  bass: number;
  mid: number;
  treble: number;
}

export const EQ_PRESETS: EqPreset[] = [
  { id: "flat", label: "Flat", bass: 0, mid: 0, treble: 0 },
  { id: "bass", label: "Bass Boost", bass: 8, mid: -1, treble: 1 },
  { id: "vocal", label: "Vocal", bass: -2, mid: 5, treble: 2 },
  { id: "treble", label: "Treble Boost", bass: -1, mid: 0, treble: 7 },
  { id: "warm", label: "Warm", bass: 5, mid: 2, treble: -3 },
  { id: "punch", label: "Punchy", bass: 6, mid: 3, treble: 4 },
];

export type EqBand = "bass" | "mid" | "treble";

/**
 * Three-band equaliser over the player's audio element, using Web Audio
 * biquad filters (low-shelf / peaking / high-shelf).
 *
 * The catch is CORS. Routing an element through an AudioContext requires the
 * stream to be CORS-readable, which most icecast servers are not — and setting
 * `crossOrigin` on a server that doesn't send the header makes the stream fail
 * to load at all. So playback runs without `crossOrigin` by default, and the
 * EQ is opt-in: enabling it reloads the current stream in CORS mode, and if
 * that fails the hook reverts and reports the station as unsupported.
 */
export function useRadioEqualizer(
  audioRef: React.RefObject<HTMLAudioElement | null>,
  /** Tells the player its element is captured and must be replaced next play. */
  markElementTainted: () => void
) {
  const settings = useEqSettings();

  const [unsupported, setUnsupported] = useState(false);
  const [pending, setPending] = useState(false);

  const ctxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const bandsRef = useRef<{ bass: BiquadFilterNode; mid: BiquadFilterNode; treble: BiquadFilterNode } | null>(null);

  const supported =
    !unsupported && (typeof window === "undefined" || typeof window.AudioContext === "function");

  /** Builds the graph on first use; safe to call repeatedly. */
  const ensureGraph = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || bandsRef.current) return bandsRef.current;

    try {
      const ctx = new AudioContext();
      // createMediaElementSource may only be called once per element.
      const source = ctx.createMediaElementSource(audio);

      const bass = ctx.createBiquadFilter();
      bass.type = "lowshelf";
      bass.frequency.value = 120;

      const mid = ctx.createBiquadFilter();
      mid.type = "peaking";
      mid.frequency.value = 1000;
      mid.Q.value = 0.9;

      const treble = ctx.createBiquadFilter();
      treble.type = "highshelf";
      treble.frequency.value = 4000;

      source.connect(bass);
      bass.connect(mid);
      mid.connect(treble);
      treble.connect(ctx.destination);

      ctxRef.current = ctx;
      sourceRef.current = source;
      bandsRef.current = { bass, mid, treble };
      // From here on this element can only ever output through the graph.
      markElementTainted();
      return bandsRef.current;
    } catch (err) {
      console.error("Failed to build equaliser graph:", err);
      setUnsupported(true);
      return null;
    }
  }, [audioRef, markElementTainted]);

  // Push gain changes into the filter nodes.
  useEffect(() => {
    const bands = bandsRef.current;
    if (!bands || !ctxRef.current) return;

    const now = ctxRef.current.currentTime;
    const gain = settings.enabled ? settings : { bass: 0, mid: 0, treble: 0 };
    // Ramp rather than jump, so adjusting a slider doesn't click.
    bands.bass.gain.setTargetAtTime(gain.bass, now, 0.02);
    bands.mid.gain.setTargetAtTime(gain.mid, now, 0.02);
    bands.treble.gain.setTargetAtTime(gain.treble, now, 0.02);
  }, [settings]);

  /** Writing to the store re-renders every consumer subscribed to it. */
  const persist = useCallback((next: EqSettings) => {
    setEqSettings(next);
  }, []);

  /**
   * Turning the EQ on requires the stream to be re-fetched in CORS mode.
   * Resolves false when the station can't support it.
   */
  const setEnabled = useCallback(
    async (enabled: boolean): Promise<boolean> => {
      const audio = audioRef.current;
      if (!audio) return false;

      if (!enabled) {
        // Tear the graph down. The element itself stays captured, so the
        // player swaps in a clean one on the next play — that's what restores
        // playback for stations that don't send CORS headers.
        const ctx = ctxRef.current;
        ctxRef.current = null;
        sourceRef.current = null;
        bandsRef.current = null;
        if (ctx && ctx.state !== "closed") void ctx.close().catch(() => {});
        persist({ ...settings, enabled: false });
        return true;
      }

      const src = audio.getAttribute("src");
      if (!src) {
        // Nothing playing — just remember the preference.
        persist({ ...settings, enabled: true });
        return true;
      }

      setPending(true);
      const wasPlaying = !audio.paused;
      const previousCors = audio.crossOrigin;

      const reload = () =>
        new Promise<boolean>((resolve) => {
          const onOk = () => {
            cleanup();
            resolve(true);
          };
          const onFail = () => {
            cleanup();
            resolve(false);
          };
          const cleanup = () => {
            clearTimeout(timer);
            audio.removeEventListener("canplay", onOk);
            audio.removeEventListener("playing", onOk);
            audio.removeEventListener("error", onFail);
          };
          const timer = setTimeout(onFail, 6000);

          audio.addEventListener("canplay", onOk);
          audio.addEventListener("playing", onOk);
          audio.addEventListener("error", onFail);

          audio.load();
          if (wasPlaying) void audio.play().catch(onFail);
        });

      audio.crossOrigin = "anonymous";
      const ok = await reload();

      if (!ok) {
        // Roll back to plain playback so the station keeps working.
        audio.crossOrigin = previousCors;
        audio.load();
        if (wasPlaying) void audio.play().catch(() => {});
        setPending(false);
        persist({ ...settings, enabled: false });
        return false;
      }

      const graph = ensureGraph();
      if (graph && ctxRef.current?.state === "suspended") {
        await ctxRef.current.resume().catch(() => {});
      }

      setPending(false);
      persist({ ...settings, enabled: true });
      return Boolean(graph);
    },
    [audioRef, ensureGraph, persist, settings]
  );

  const setBand = useCallback(
    (band: EqBand, value: number) => {
      const clamped = Math.min(12, Math.max(-12, value));
      persist({ ...settings, [band]: clamped, preset: "custom" });
    },
    [persist, settings]
  );

  const applyPreset = useCallback(
    (preset: EqPreset) => {
      persist({
        enabled: settings.enabled,
        bass: preset.bass,
        mid: preset.mid,
        treble: preset.treble,
        preset: preset.id,
      });
    },
    [persist, settings.enabled]
  );

  // Release the AudioContext with the component.
  useEffect(() => {
    return () => {
      const ctx = ctxRef.current;
      if (ctx && ctx.state !== "closed") void ctx.close().catch(() => {});
    };
  }, []);

  return { settings, supported, pending, setEnabled, setBand, applyPreset };
}
