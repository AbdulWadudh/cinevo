"use client";

import { motion, useReducedMotion } from "motion/react";

interface EqualizerProps {
  active: boolean;
  /** Bar count — 4 for compact spots, 5+ for the player bar. */
  bars?: number;
  className?: string;
  barClassName?: string;
}

/**
 * Animated level meter shown while a station is playing.
 *
 * Deliberately not driven by the Web Audio API: most stations are cross-origin
 * without CORS headers, so an AnalyserNode would either be silent or taint the
 * stream. These are decorative bars on a fixed loop.
 */
export default function Equalizer({
  active,
  bars = 5,
  className = "",
  barClassName = "bg-purple-400",
}: EqualizerProps) {
  const reduceMotion = useReducedMotion();

  // Varied heights and offsets keep the loop from looking mechanical.
  const pattern = [
    { peak: 1, delay: 0 },
    { peak: 0.55, delay: 0.18 },
    { peak: 0.85, delay: 0.36 },
    { peak: 0.4, delay: 0.12 },
    { peak: 0.7, delay: 0.28 },
    { peak: 0.95, delay: 0.42 },
  ];

  return (
    <div
      className={`flex h-4 items-end gap-0.5 ${className}`}
      aria-hidden="true"
    >
      {Array.from({ length: bars }).map((_, i) => {
        const { peak, delay } = pattern[i % pattern.length];
        return (
          <motion.span
            key={i}
            className={`w-0.75 flex-none rounded-full ${barClassName}`}
            initial={false}
            animate={
              active && !reduceMotion
                ? { height: [`${peak * 25}%`, `${peak * 100}%`, `${peak * 35}%`] }
                : { height: active ? `${peak * 60}%` : "18%" }
            }
            transition={
              active && !reduceMotion
                ? { duration: 0.9, repeat: Infinity, ease: "easeInOut", delay }
                : { duration: 0.25 }
            }
          />
        );
      })}
    </div>
  );
}
