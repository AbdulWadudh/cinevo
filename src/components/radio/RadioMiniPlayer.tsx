"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import {
  Play, Pause, Loader2, X, AlertTriangle, Radio as RadioIcon, Volume2, VolumeX,
} from "lucide-react";
import { useRadioPlayerContext } from "./RadioPlayerProvider";
import Equalizer from "./Equalizer";
import VolumeSlider from "./VolumeSlider";

/**
 * Floating play control shown on every page except `/radio`, which has the
 * full docked bar. Keeps the current station reachable once the listener has
 * navigated away, and links back to the radio page.
 */
export default function RadioMiniPlayer() {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const { player } = useRadioPlayerContext();

  const [hovered, setHovered] = useState(false);
  const [dragging, setDragging] = useState(false);

  // Dragging the slider often takes the pointer outside the pill, which would
  // otherwise collapse it mid-adjustment.
  useEffect(() => {
    if (!dragging) return;
    const release = () => setDragging(false);
    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", release);
    return () => {
      window.removeEventListener("pointerup", release);
      window.removeEventListener("pointercancel", release);
    };
  }, [dragging]);

  const station = player.current;
  // The radio page renders the full player; two would fight for the corner.
  const hidden = !station || pathname === "/radio";
  const expanded = hovered || dragging;

  const playing = player.status === "playing";
  const connecting = player.status === "connecting";
  const warn = player.status === "error" || player.status === "blocked";

  return (
    <AnimatePresence>
      {!hidden && (
        <motion.div
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.9 }}
          transition={{ type: "spring", stiffness: 340, damping: 30 }}
          className="fixed bottom-4 right-4 z-50 md:bottom-6 md:right-6"
          role="region"
          aria-label="Radio mini player"
        >
          <div
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            className="flex items-center gap-1 rounded-full border border-white/10 bg-bg-elevated/95 py-1.5 pl-2 pr-1.5 shadow-2xl shadow-black/60 backdrop-blur-xl"
          >
            {/* Tapping the body returns to the full player. */}
            <Link
              href="/radio"
              className="flex min-w-0 items-center gap-2 rounded-full pl-1 pr-1 transition-opacity hover:opacity-80"
              aria-label={`Back to radio — ${station.name}`}
            >
              <span
                className={`flex size-7 flex-none items-center justify-center rounded-full ${warn ? "bg-amber-500/15 text-amber-400" : "bg-purple-500/15 text-purple-300"
                  }`}
              >
                {warn ? (
                  <AlertTriangle className="size-3.5" />
                ) : playing ? (
                  <Equalizer active bars={4} className="h-3" barClassName="bg-current" />
                ) : (
                  <RadioIcon className="size-3.5" />
                )}
              </span>

              <span className="hidden min-w-0 sm:block">
                <span className="block max-w-40 truncate text-xs font-semibold text-white">
                  {station.name}
                </span>
                <span
                  className={`block text-[10px] uppercase tracking-wider ${warn ? "text-amber-400/80" : playing ? "text-purple-300" : "text-muted"
                    }`}
                >
                  {connecting ? "Connecting…" : playing ? "On air" : warn ? "Unavailable" : "Paused"}
                </span>
              </span>
            </Link>

            {/* Volume slides out on hover — pointer-only, since touch has no
                hover and the radio page is a tap away. */}
            <SlideIn open={expanded} width={100} onPointerDown={() => setDragging(true)}>
              <button
                type="button"
                onClick={player.toggleMute}
                tabIndex={expanded ? 0 : -1}
                aria-label={player.isMuted || player.volume === 0 ? "Unmute" : "Mute"}
                className="flex-none cursor-pointer text-fg-secondary transition-colors hover:text-white"
              >
                {player.isMuted || player.volume === 0 ? (
                  <VolumeX className="size-4" />
                ) : (
                  <Volume2 className="size-4" />
                )}
              </button>
              <div className="w-16 flex-none">
                <VolumeSlider
                  value={player.isMuted ? 0 : player.volume}
                  onChange={player.changeVolume}
                />
              </div>
            </SlideIn>

            <motion.button
              type="button"
              onClick={() => player.toggle()}
              aria-label={playing ? "Pause radio" : "Play radio"}
              whileHover={reduceMotion ? undefined : { scale: 1.08 }}
              whileTap={reduceMotion ? undefined : { scale: 0.9 }}
              transition={{ type: "spring", stiffness: 500, damping: 22 }}
              className="tv-focusable flex size-9 flex-none cursor-pointer items-center justify-center rounded-full bg-linear-to-br from-purple-500 to-fuchsia-600 text-white shadow-lg shadow-purple-900/50 outline-none"
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
                    <Play className="size-4 translate-x-px fill-white" />
                  )}
                </motion.span>
              </AnimatePresence>
            </motion.button>

            <motion.button
              type="button"
              onClick={player.stop}
              aria-label="Stop radio"
              whileHover={reduceMotion ? undefined : { scale: 1.15, rotate: 90 }}
              whileTap={reduceMotion ? undefined : { scale: 0.85 }}
              transition={{ type: "spring", stiffness: 400, damping: 22 }}
              className="tv-focusable flex size-6 flex-none cursor-pointer items-center justify-center rounded-full text-muted outline-none transition-colors hover:text-white"
            >
              <X className="size-3.5" />
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Collapsible slot for the hover-revealed controls. Animates to a fixed width
 * rather than `auto`, which springs can't interpolate.
 */
function SlideIn({
  open,
  width,
  onPointerDown,
  children,
}: {
  open: boolean;
  width: number;
  onPointerDown?: () => void;
  children: React.ReactNode;
}) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      initial={false}
      animate={{ width: open ? width : 0, opacity: open ? 1 : 0 }}
      transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 36 }}
      onPointerDown={onPointerDown}
      aria-hidden={!open}
      className="hidden items-center gap-1.5 overflow-hidden md:flex"
    >
      {children}
    </motion.div>
  );
}

