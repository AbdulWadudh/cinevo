"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { SlidersHorizontal, Loader2, RotateCcw } from "lucide-react";
import { EQ_PRESETS, type EqBand, type EqPreset } from "./useRadioEqualizer";
import type { EqSettings } from "./eqStore";

interface EqualizerPanelProps {
  settings: EqSettings;
  supported: boolean;
  pending: boolean;
  onToggleEnabled: (enabled: boolean) => void;
  onBandChange: (band: EqBand, value: number) => void;
  onPreset: (preset: EqPreset) => void;
}

const BANDS: { id: EqBand; label: string; hint: string }[] = [
  { id: "bass", label: "Bass", hint: "120 Hz" },
  { id: "mid", label: "Mid", hint: "1 kHz" },
  { id: "treble", label: "Treble", hint: "4 kHz" },
];

/** Popover with a 3-band EQ and presets, opened from the player bar. */
export default function EqualizerPanel({
  settings,
  supported,
  pending,
  onToggleEnabled,
  onBandChange,
  onPreset,
}: EqualizerPanelProps) {
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const active = settings.enabled && (settings.bass !== 0 || settings.mid !== 0 || settings.treble !== 0);

  return (
    <div className="relative flex-none" ref={wrapRef}>
      <motion.button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Equaliser"
        aria-expanded={open}
        title="Equaliser"
        whileHover={reduceMotion ? undefined : { scale: 1.15 }}
        whileTap={reduceMotion ? undefined : { scale: 0.85 }}
        transition={{ type: "spring", stiffness: 500, damping: 18 }}
        className={`tv-focusable relative cursor-pointer outline-none transition-colors ${
          active ? "text-purple-300" : "text-fg-secondary hover:text-white"
        }`}
      >
        <SlidersHorizontal className="size-4.5" />
        {active && (
          <motion.span
            layoutId={reduceMotion ? undefined : "eq-active-dot"}
            className="absolute -right-0.5 -top-0.5 size-1.5 rounded-full bg-purple-400"
          />
        )}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 420, damping: 30 }}
            className="absolute bottom-full right-0 z-50 mb-3 w-72 origin-bottom-right overflow-hidden rounded-2xl border border-white/10 bg-bg-elevated/97 p-4 shadow-2xl shadow-black/70 backdrop-blur-xl"
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <h4 className="font-display text-sm font-bold text-white">Equaliser</h4>
              <ToggleSwitch
                checked={settings.enabled}
                disabled={!supported || pending}
                onChange={onToggleEnabled}
              />
            </div>

            {!supported ? (
              <p className="text-xs text-amber-400/90">
                Your browser doesn&apos;t support Web Audio processing.
              </p>
            ) : (
              <>
                {pending && (
                  <p className="mb-3 flex items-center gap-1.5 text-xs text-purple-300">
                    <Loader2 className="size-3 animate-spin" />
                    Reconnecting the stream…
                  </p>
                )}

                {/* Band sliders */}
                <div
                  className={`flex items-end justify-between gap-3 transition-opacity ${
                    settings.enabled ? "" : "pointer-events-none opacity-40"
                  }`}
                >
                  {BANDS.map((band) => (
                    <BandSlider
                      key={band.id}
                      label={band.label}
                      hint={band.hint}
                      value={settings[band.id]}
                      onChange={(v) => onBandChange(band.id, v)}
                    />
                  ))}
                </div>

                {/* Presets */}
                <div className="mt-4 border-t border-white/6 pt-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted">
                      Presets
                    </span>
                    <button
                      type="button"
                      onClick={() => onPreset(EQ_PRESETS[0])}
                      className="flex cursor-pointer items-center gap-1 text-[10px] font-semibold text-muted transition-colors hover:text-white"
                    >
                      <RotateCcw className="size-2.5" /> Reset
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {EQ_PRESETS.map((preset) => {
                      const isActive = settings.preset === preset.id;
                      return (
                        <motion.button
                          key={preset.id}
                          type="button"
                          onClick={() => onPreset(preset)}
                          whileHover={reduceMotion ? undefined : { scale: 1.05, y: -1 }}
                          whileTap={reduceMotion ? undefined : { scale: 0.94 }}
                          transition={{ type: "spring", stiffness: 460, damping: 28 }}
                          className={`cursor-pointer rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                            isActive
                              ? "border-purple-400/60 bg-purple-500/25 text-white"
                              : "border-white/8 bg-surface/60 text-fg-secondary hover:text-white"
                          }`}
                        >
                          {preset.label}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                <p className="mt-3 text-[10px] leading-relaxed text-muted">
                  Some stations don&apos;t allow audio processing; the EQ will switch itself off
                  for those.
                </p>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Vertical gain slider, custom-built (no native range input). */
function BandSlider({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: number;
  onChange: (v: number) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const reduceMotion = useReducedMotion();

  const setFromClientY = useCallback(
    (clientY: number) => {
      const track = trackRef.current;
      if (!track) return;
      const { top, height } = track.getBoundingClientRect();
      if (height === 0) return;
      const ratio = 1 - Math.min(1, Math.max(0, (clientY - top) / height));
      onChange(Math.round((ratio * 24 - 12) * 2) / 2);
    },
    [onChange]
  );

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: PointerEvent) => setFromClientY(e.clientY);
    const onUp = () => setDragging(false);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [dragging, setFromClientY]);

  // 0 dB sits at the vertical midpoint.
  const pct = ((value + 12) / 24) * 100;
  const isBoost = value > 0;

  return (
    <div className="flex flex-1 flex-col items-center gap-1.5">
      <span className={`text-[11px] font-bold tabular-nums ${value === 0 ? "text-muted" : "text-purple-300"}`}>
        {value > 0 ? `+${value}` : value}
      </span>

      <div
        ref={trackRef}
        role="slider"
        tabIndex={0}
        aria-label={`${label} gain`}
        aria-valuemin={-12}
        aria-valuemax={12}
        aria-valuenow={value}
        aria-valuetext={`${value} decibels`}
        onPointerDown={(e) => {
          e.preventDefault();
          setDragging(true);
          setFromClientY(e.clientY);
        }}
        onKeyDown={(e) => {
          const step = e.shiftKey ? 2 : 0.5;
          if (e.key === "ArrowUp") {
            e.preventDefault();
            onChange(Math.min(12, value + step));
          } else if (e.key === "ArrowDown") {
            e.preventDefault();
            onChange(Math.max(-12, value - step));
          }
        }}
        className="relative h-24 w-7 cursor-pointer touch-none select-none rounded-full bg-white/8 outline-none"
      >
        {/* Centre reference line */}
        <span className="absolute inset-x-1 top-1/2 h-px -translate-y-1/2 bg-white/15" />

        {/* Fill from centre toward the current gain */}
        <motion.span
          className={`absolute inset-x-1.5 rounded-full ${
            isBoost ? "bg-linear-to-t from-purple-500 to-fuchsia-400" : "bg-linear-to-b from-sky-500 to-cyan-400"
          }`}
          animate={{
            top: isBoost ? `${100 - pct}%` : "50%",
            bottom: isBoost ? "50%" : `${pct}%`,
          }}
          transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 36 }}
        />

        {/* Thumb */}
        <motion.span
          className="absolute left-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-lg ring-2 ring-purple-500/50"
          animate={{ top: `${100 - pct}%`, scale: dragging ? 1.2 : 1 }}
          transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 32 }}
        />
      </div>

      <div className="text-center">
        <span className="block text-[10px] font-semibold text-fg-secondary">{label}</span>
        <span className="block text-[9px] text-muted">{hint}</span>
      </div>
    </div>
  );
}

function ToggleSwitch({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label="Enable equaliser"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-5 w-9 flex-none cursor-pointer rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        checked ? "bg-purple-500" : "bg-white/15"
      }`}
    >
      <motion.span
        className="absolute top-0.5 size-4 rounded-full bg-white shadow"
        animate={{ left: checked ? 18 : 2 }}
        transition={{ type: "spring", stiffness: 500, damping: 32 }}
      />
    </button>
  );
}
