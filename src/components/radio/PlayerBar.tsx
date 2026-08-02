"use client";

import React from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import {
  Play, Pause, Volume2, VolumeX, Heart, X, SkipBack, SkipForward, Loader2, AlertTriangle, Flag, Radio as RadioIcon,
} from "lucide-react";
import type { RadioStationData } from "@/app/actions/radio";
import type { PlaybackStatus } from "./useRadioPlayer";
import VolumeSlider from "./VolumeSlider";
import Equalizer from "./Equalizer";
import EqualizerPanel from "./EqualizerPanel";
import type { EqBand, EqPreset } from "./useRadioEqualizer";
import type { EqSettings } from "./eqStore";

interface PlayerBarProps {
  station: RadioStationData | null;
  status: PlaybackStatus;
  volume: number;
  isMuted: boolean;
  isFavorite: boolean;
  canSkip: boolean;
  onToggle: () => void;
  onPrev: () => void;
  onNext: () => void;
  onVolumeChange: (v: number) => void;
  onToggleMute: () => void;
  onToggleFavorite: () => void;
  onReport: () => void;
  onFocusStation: () => void;
  onClose: () => void;
  eq: EqSettings;
  eqSupported: boolean;
  eqPending: boolean;
  onEqToggle: (enabled: boolean) => void;
  onEqBand: (band: EqBand, value: number) => void;
  onEqPreset: (preset: EqPreset) => void;
}

export default function PlayerBar({
  station,
  status,
  volume,
  isMuted,
  isFavorite,
  canSkip,
  onToggle,
  onPrev,
  onNext,
  onVolumeChange,
  onToggleMute,
  onToggleFavorite,
  onReport,
  onFocusStation,
  onClose,
  eq,
  eqSupported,
  eqPending,
  onEqToggle,
  onEqBand,
  onEqPreset,
}: PlayerBarProps) {
  const reduceMotion = useReducedMotion();

  const playing = status === "playing";
  const connecting = status === "connecting";
  const errored = status === "error";
  const blocked = status === "blocked";
  const warn = errored || blocked;

  return (
    <AnimatePresence>
      {station && (
        <motion.div
          initial={reduceMotion ? { opacity: 0 } : { y: 120, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={reduceMotion ? { opacity: 0 } : { y: 120, opacity: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 34 }}
          className="fixed inset-x-0 bottom-0 z-50"
          role="region"
          aria-label="Radio player"
        >
          {/* Full-bleed dock: edge to edge, opaque, nothing showing around it.
              No overflow-hidden here — the equaliser popover opens upward and
              would be clipped by it. */}
          <div className="relative border-t border-white/10 bg-bg-elevated shadow-[0_-8px_32px_rgba(0,0,0,0.5)]">
            {/* Ambient glow that breathes while on air. */}
            <motion.div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 -z-10 bg-linear-to-r from-purple-600/15 via-fuchsia-600/8 to-transparent"
              animate={playing && !reduceMotion ? { opacity: [0.45, 0.9, 0.45] } : { opacity: 0.35 }}
              transition={playing ? { duration: 3.5, repeat: Infinity, ease: "easeInOut" } : { duration: 0.3 }}
            />

            {/* Indeterminate connecting bar. */}
            <AnimatePresence>
              {connecting && (
                <motion.div
                  className="absolute inset-x-0 top-0 h-0.5 overflow-hidden"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <motion.div
                    className="h-full w-1/3 bg-linear-to-r from-transparent via-purple-400 to-transparent"
                    animate={reduceMotion ? undefined : { x: ["-100%", "300%"] }}
                    transition={{ duration: 1.1, repeat: Infinity, ease: "linear" }}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <div className="relative flex flex-col gap-2 px-4 py-2.5 md:flex-row md:items-center md:gap-6 md:px-8 md:py-3">
              {/* On phones the identity and transport share one row, pushed to
                  opposite ends. `md:contents` dissolves this wrapper from md up
                  so the desktop three-column layout — and the absolutely
                  centred transport — behave exactly as before. */}
              <div className="flex items-center justify-between gap-3 md:contents">
                {/* Identity — doubles as a jump-to-station control. */}
                <button
                  type="button"
                  onClick={onFocusStation}
                  aria-label={`Show ${station.name} in the list`}
                  title="Show in list"
                  className="tv-focusable flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-xl text-left outline-none transition-opacity hover:opacity-80 md:max-w-[32%]">
                  <motion.div
                    className={`flex size-11 flex-none items-center justify-center rounded-xl border ${
                      warn
                        ? "border-amber-500/30 bg-amber-950/40 text-amber-400"
                        : "border-purple-500/25 bg-purple-950/40 text-purple-300"
                    }`}
                    animate={playing && !reduceMotion ? { scale: [1, 1.07, 1] } : { scale: 1 }}
                    transition={playing ? { duration: 2, repeat: Infinity, ease: "easeInOut" } : { duration: 0.2 }}
                  >
                    {warn ? <AlertTriangle className="size-5" /> : <RadioIcon className="size-5" />}
                  </motion.div>

                  <div className="min-w-0 flex-1">
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.h4
                        key={station.id}
                        initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
                        transition={{ duration: 0.2 }}
                        className="truncate text-sm font-semibold text-white"
                      >
                        {station.name}
                      </motion.h4>
                    </AnimatePresence>
                    <div className="mt-0.5 flex items-center gap-2">
                      {playing && <Equalizer active bars={4} className="h-3" barClassName="bg-purple-400" />}
                      <p
                        className={`truncate text-xs ${
                          warn ? "text-amber-400/90" : playing ? "text-purple-200" : "text-fg-secondary"
                        }`}
                      >
                        {blocked
                          ? "Press play to start — your browser blocked autoplay"
                          : errored
                            ? "Stream unavailable — skipping to the next station"
                            : connecting
                              ? "Connecting…"
                              : playing
                                ? "On air"
                                : "Paused"}
                      </p>
                    </div>
                  </div>
                </button>

                {/* Transport — taken out of flow on desktop and pinned to the
                    centre of the bar, so unequal flank widths can't shift it. */}
                <div className="flex flex-none items-center justify-center gap-2 md:absolute md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2">
                  <TransportButton onClick={onPrev} disabled={!canSkip} label="Previous station">
                    <SkipBack className="size-4" />
                  </TransportButton>

                  <motion.button
                    type="button"
                    onClick={onToggle}
                    aria-label={playing ? "Pause" : "Play"}
                    whileHover={reduceMotion ? undefined : { scale: 1.08 }}
                    whileTap={reduceMotion ? undefined : { scale: 0.9 }}
                    transition={{ type: "spring", stiffness: 500, damping: 22 }}
                    className="tv-focusable flex size-11 cursor-pointer items-center justify-center rounded-full bg-linear-to-br from-purple-500 to-fuchsia-600 text-white shadow-lg shadow-purple-900/50 outline-none"
                  >
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.span
                        key={connecting ? "load" : playing ? "pause" : "play"}
                        initial={reduceMotion ? false : { scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={reduceMotion ? undefined : { scale: 0.5, opacity: 0 }}
                        transition={{ duration: 0.14 }}
                        className="flex items-center justify-center"
                      >
                        {connecting ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : playing ? (
                          <Pause className="size-4 fill-white" />
                        ) : (
                          <Play className="size-4 translate-x-0.5 fill-white" />
                        )}
                      </motion.span>
                    </AnimatePresence>
                  </motion.button>

                  <TransportButton onClick={onNext} disabled={!canSkip} label="Next station">
                    <SkipForward className="size-4" />
                  </TransportButton>
                </div>
              </div>

              {/* Volume + actions. On phones this is a full-width row of its
                  own, spread edge to edge; on desktop it hugs the right. */}
              <div className="flex w-full items-center gap-3 md:ml-auto md:w-auto md:max-w-[36%] md:flex-1 md:justify-end">
                <motion.button
                  type="button"
                  onClick={onToggleMute}
                  aria-label={isMuted || volume === 0 ? "Unmute" : "Mute"}
                  whileHover={reduceMotion ? undefined : { scale: 1.12 }}
                  whileTap={reduceMotion ? undefined : { scale: 0.88 }}
                  className="tv-focusable flex-none cursor-pointer text-fg-secondary outline-none transition-colors hover:text-white"
                >
                  {isMuted || volume === 0 ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
                </motion.button>

                {/* Fills the phone row; fixed and compact from md up, where it
                    shouldn't eat the whole flank. */}
                <div className="min-w-0 flex-1 md:w-24 md:flex-none">
                  <VolumeSlider value={isMuted ? 0 : volume} onChange={onVolumeChange} />
                </div>

                <EqualizerPanel
                  settings={eq}
                  supported={eqSupported}
                  pending={eqPending}
                  onToggleEnabled={onEqToggle}
                  onBandChange={onEqBand}
                  onPreset={onEqPreset}
                />

                <motion.button
                  type="button"
                  onClick={onReport}
                  aria-label="Report this station as not working"
                  title="Report not working"
                  whileHover={reduceMotion ? undefined : { scale: 1.15 }}
                  whileTap={reduceMotion ? undefined : { scale: 0.85 }}
                  transition={{ type: "spring", stiffness: 500, damping: 18 }}
                  className="tv-focusable flex-none cursor-pointer outline-none"
                >
                  <Flag
                    className={`size-4.5 transition-colors ${
                      station.isBroken ? "fill-amber-500/25 text-amber-400" : "text-fg-secondary hover:text-amber-400"
                    }`}
                  />
                </motion.button>

                <motion.button
                  type="button"
                  onClick={onToggleFavorite}
                  aria-label={isFavorite ? "Remove from favourites" : "Add to favourites"}
                  aria-pressed={isFavorite}
                  whileHover={reduceMotion ? undefined : { scale: 1.15 }}
                  whileTap={reduceMotion ? undefined : { scale: 0.85 }}
                  transition={{ type: "spring", stiffness: 500, damping: 18 }}
                  className="tv-focusable flex-none cursor-pointer outline-none"
                >
                  <Heart
                    className={`size-5 transition-colors ${
                      isFavorite ? "fill-pink-500 text-pink-500" : "text-fg-secondary hover:text-pink-400"
                    }`}
                  />
                </motion.button>

                <motion.button
                  type="button"
                  onClick={onClose}
                  aria-label="Close player"
                  whileHover={reduceMotion ? undefined : { scale: 1.15, rotate: 90 }}
                  whileTap={reduceMotion ? undefined : { scale: 0.85 }}
                  transition={{ type: "spring", stiffness: 400, damping: 22 }}
                  className="tv-focusable flex-none cursor-pointer text-fg-secondary outline-none transition-colors hover:text-white"
                >
                  <X className="size-4.5" />
                </motion.button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function TransportButton({
  onClick,
  disabled,
  label,
  children,
}: {
  onClick: () => void;
  disabled: boolean;
  label: string;
  children: React.ReactNode;
}) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      whileHover={reduceMotion || disabled ? undefined : { scale: 1.12 }}
      whileTap={reduceMotion || disabled ? undefined : { scale: 0.88 }}
      className="tv-focusable flex size-8 cursor-pointer items-center justify-center rounded-lg text-fg-secondary outline-none transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
    >
      {children}
    </motion.button>
  );
}
