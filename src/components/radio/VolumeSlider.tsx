"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";

interface VolumeSliderProps {
  value: number;
  onChange: (value: number) => void;
  /** Accent colour for the filled track, as a Tailwind class. */
  className?: string;
}

/**
 * Fully custom volume control — pointer drag plus arrow-key support, with no
 * native <input type="range"> so it can be themed and animated to match the
 * rest of the player.
 */
export default function VolumeSlider({ value, onChange, className = "" }: VolumeSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [hovered, setHovered] = useState(false);
  const reduceMotion = useReducedMotion();

  const setFromClientX = useCallback(
    (clientX: number) => {
      const track = trackRef.current;
      if (!track) return;
      const { left, width } = track.getBoundingClientRect();
      if (width === 0) return;
      onChange(Math.min(1, Math.max(0, (clientX - left) / width)));
    },
    [onChange]
  );

  // Drag continues outside the track, so the listeners live on the window.
  useEffect(() => {
    if (!dragging) return;

    const onMove = (e: PointerEvent) => setFromClientX(e.clientX);
    const onUp = () => setDragging(false);

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [dragging, setFromClientX]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const step = e.shiftKey ? 0.1 : 0.05;
      if (e.key === "ArrowRight" || e.key === "ArrowUp") {
        e.preventDefault();
        onChange(Math.min(1, value + step));
      } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
        e.preventDefault();
        onChange(Math.max(0, value - step));
      } else if (e.key === "Home") {
        e.preventDefault();
        onChange(0);
      } else if (e.key === "End") {
        e.preventDefault();
        onChange(1);
      }
    },
    [onChange, value]
  );

  const pct = `${Math.round(value * 100)}%`;
  const active = dragging || hovered;

  return (
    <div
      ref={trackRef}
      role="slider"
      tabIndex={0}
      aria-label="Volume"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value * 100)}
      aria-valuetext={`Volume ${Math.round(value * 100)} percent`}
      onKeyDown={onKeyDown}
      onPointerDown={(e) => {
        e.preventDefault();
        setDragging(true);
        setFromClientX(e.clientX);
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`group relative h-6 w-full cursor-pointer touch-none select-none outline-none ${className}`}
    >
      {/* Rail */}
      <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 overflow-hidden rounded-full bg-white/12">
        <motion.div
          className="h-full rounded-full bg-linear-to-r from-purple-500 to-fuchsia-400"
          animate={{ width: pct }}
          transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 38 }}
        />
      </div>

      {/* Thumb */}
      <motion.div
        className="pointer-events-none absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-lg shadow-purple-900/50 ring-2 ring-purple-500/60"
        animate={{
          left: pct,
          scale: reduceMotion ? 1 : active ? 1.25 : 0.85,
          opacity: active ? 1 : 0.9,
        }}
        transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 32 }}
      />
    </div>
  );
}
