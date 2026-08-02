"use client";

import React, { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Sparkles } from "lucide-react";
import PanelCard from "@/components/profile/PanelCard";
import HoloCard, { type RevealItem } from "./HoloCard";
import { CARD_EFFECTS } from "./effects";
import { useRevealEffect, setRevealEffect } from "./revealEffectStore";

// A sample title to demo the effect against (TMDB poster).
const DEMO_ITEM: RevealItem = {
  id: 157336,
  mediaType: "movie",
  title: "Interstellar",
  poster: "/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
  rating: 8.4,
  year: "2014",
};

const SPRING = { type: "spring", stiffness: 420, damping: 34 } as const;

/** Admin demo: pick the holo effect used by the Mystery reveal and preview it live. */
export default function EffectPlayground() {
  const effectKey = useRevealEffect();
  const reduceMotion = useReducedMotion();
  // Local nonce to replay the reveal flip each time the effect is picked.
  const [nonce, setNonce] = useState(0);

  const onChange = (key: string) => {
    setRevealEffect(key);
    setNonce((n) => n + 1);
  };

  return (
    <PanelCard
      icon={<Sparkles className="size-4.5" />}
      title="Reveal card effect"
      subtitle="The holographic finish used when a Mystery card flips"
    >
      {/* Splits at xl, not lg — beside a 288px rail the chip column would be too
          narrow at lg for labels like "Trainer Full Art". */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_19rem] xl:gap-8">
        <div>
          <p className="text-xs leading-relaxed text-muted">
            Pick a finish, then hover or drag the card to see the shine. Picking the current
            one replays the flip. Saved for everyone on this device.
          </p>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {CARD_EFFECTS.map((effect, i) => {
              const active = effect.key === effectKey;
              return (
                <motion.button
                  key={effect.key}
                  type="button"
                  onClick={() => onChange(effect.key)}
                  aria-pressed={active}
                  initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, ease: "easeOut", delay: reduceMotion ? 0 : i * 0.02 }}
                  whileHover={reduceMotion ? undefined : { y: -2 }}
                  whileTap={reduceMotion ? undefined : { scale: 0.96 }}
                  className={`relative cursor-pointer rounded-lg border px-3 py-2.5 text-xs font-semibold transition-colors ${
                    active
                      ? "border-transparent text-white"
                      : "border-white/6 bg-white/4 text-fg-secondary hover:text-white"
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="effect-chip"
                      transition={reduceMotion ? { duration: 0 } : SPRING}
                      className="absolute inset-0 rounded-lg border border-accent/40 bg-accent/15"
                    />
                  )}
                  <span className="relative block truncate">{effect.label}</span>
                </motion.button>
              );
            })}
          </div>
        </div>

        <div className="flex justify-center perspective-[1800px] xl:justify-end">
          <HoloCard key={`${effectKey}-${nonce}`} item={DEMO_ITEM} effectKey={effectKey} demo />
        </div>
      </div>
    </PanelCard>
  );
}
