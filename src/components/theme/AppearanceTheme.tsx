"use client";

import { useCallback } from "react";
import { Check, Palette, RotateCcw, SlidersHorizontal } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import PanelCard from "@/components/profile/PanelCard";
import { accentDelta } from "@/lib/theme/accent";
import { useTheme } from "@/lib/theme/studio/provider";
import type { CinevoTokens } from "@/lib/theme/presets";

const ACCENT_KEYS: (keyof CinevoTokens)[] = [
  "primary",
  "primaryHover",
  "accentStrong",
  "accentStrongHover",
  "accentRgb",
];

export default function AppearanceTheme() {
  const { theme, themes, tokens, setTheme, setCustomTokens, clearCustomTokens, openStudio } =
    useTheme<CinevoTokens>();
  const reduceMotion = useReducedMotion();
  const activePreset = themes.find((preset) => preset.id === theme) ?? themes[0];
  const accentOverridden = tokens.primary !== activePreset.tokens.primary;

  const onAccentChange = useCallback(
    (value: string) => {
      const delta = accentDelta(value);
      if (delta) setCustomTokens(delta);
    },
    [setCustomTokens],
  );

  return (
    <PanelCard
      icon={<Palette className="size-4.5" />}
      title="Theme"
      subtitle="Pick a palette for the whole app — saved in this browser"
      action={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openStudio}
            className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-bold text-fg-secondary transition-colors hover:border-accent/50 hover:text-fg"
          >
            <SlidersHorizontal className="size-3.5" />
            Full studio
          </button>
          {accentOverridden ? (
            <button
              type="button"
              onClick={() => clearCustomTokens(ACCENT_KEYS)}
              className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-lg border border-white/10 px-3 text-xs font-bold text-fg-secondary transition-colors hover:border-white/25 hover:text-fg"
            >
              <RotateCcw className="size-3.5" />
              Reset accent
            </button>
          ) : null}
        </div>
      }
    >
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {themes.map((preset, index) => {
          const active = preset.id === theme;
          return (
            <motion.button
              key={preset.id}
              type="button"
              onClick={() => setTheme(preset.id)}
              aria-pressed={active}
              initial={reduceMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: "easeOut", delay: index * 0.04 }}
              whileHover={reduceMotion ? undefined : { y: -2 }}
              whileTap={reduceMotion ? undefined : { scale: 0.97 }}
              className={`group relative min-h-24 cursor-pointer overflow-hidden rounded-xl border p-3 text-left transition-colors ${
                active
                  ? "border-accent/60 bg-accent/10"
                  : "border-white/8 bg-bg/40 hover:border-white/20"
              }`}
            >
              <span className="flex gap-1" aria-hidden="true">
                {[preset.tokens.canvas, preset.tokens.surface, preset.tokens.primary].map((color, swatch) => (
                  <span
                    key={swatch}
                    className="size-4 rounded-full ring-1 ring-white/10"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </span>
              <span className="mt-3 block text-sm font-bold text-fg">{preset.name}</span>
              <span className="mt-0.5 block text-[11px] leading-snug text-muted">
                {preset.description}
              </span>
              {active && (
                <motion.span
                  layoutId="theme-active-check"
                  transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 34 }}
                  className="absolute right-2.5 top-2.5 grid size-5 place-items-center rounded-full bg-accent-strong text-white"
                >
                  <Check className="size-3" strokeWidth={3} />
                </motion.span>
              )}
            </motion.button>
          );
        })}
      </div>

      <div className="mt-5 flex flex-col gap-3 rounded-xl border border-white/6 bg-bg/40 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-fg">Accent colour</h3>
          <p className="mt-0.5 text-xs leading-relaxed text-muted">
            Recolours buttons, links, highlights and glows. Solid fills darken automatically so
            white labels stay legible.
          </p>
        </div>
        <div className="flex flex-none items-center gap-3">
          <span className="font-mono text-xs uppercase text-muted">{tokens.primary}</span>
          <label className="relative block size-11 cursor-pointer overflow-hidden rounded-lg border border-white/15 transition-transform hover:scale-105 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent">
            <span className="sr-only">Accent colour</span>
            {/* The swatch covers the native swatch chrome; the input keeps the picker. */}
            <span
              className="pointer-events-none absolute inset-1 rounded-md"
              style={{ backgroundColor: tokens.primary }}
              aria-hidden="true"
            />
            <input
              type="color"
              value={tokens.primary}
              onChange={(event) => onAccentChange(event.target.value)}
              className="size-full cursor-pointer opacity-0"
            />
          </label>
        </div>
      </div>
    </PanelCard>
  );
}
