"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { Check, Layers, Square } from "lucide-react";
import { toast } from "sonner";
import {
  CARD_DISTANCE_MAX,
  CARD_DISTANCE_MIN,
  HERO_EFFECTS,
  getHeroEffect,
  type HeroEffectId,
} from "@/lib/theme/card-effects";
import { useTheme } from "@/lib/theme/studio/provider";

const EFFECT_ICONS: Record<HeroEffectId, typeof Square> = {
  none: Square,
  swap: Layers,
};

export default function HeroEffectPicker() {
  const { heroEffect, setHeroEffect, cardDistance, setCardDistance } = useTheme();
  const router = useRouter();

  const choose = useCallback(
    (id: HeroEffectId) => {
      if (id === heroEffect) return;
      const next = getHeroEffect(id);
      setHeroEffect(id);
      router.refresh();
      toast.success(`${next.name} hero on`, {
        description: "The hero reloads with the new carousel treatment.",
      });
    },
    [heroEffect, setHeroEffect, router],
  );

  return (
    <div className="flex flex-col gap-2">
      {HERO_EFFECTS.map((effect) => {
        const active = effect.id === heroEffect;
        const Icon = EFFECT_ICONS[effect.id];
        return (
          <button
            key={effect.id}
            type="button"
            onClick={() => choose(effect.id)}
            aria-pressed={active}
            className={`relative flex min-h-17 items-center gap-3 rounded-xl border p-3 text-left transition-colors ${
              active
                ? "border-accent/60 bg-accent/10"
                : "border-border bg-surface/40 hover:border-accent/40"
            }`}
          >
            <span
              className={`grid size-10 shrink-0 place-items-center rounded-lg border ${
                active
                  ? "border-accent/40 bg-accent/12 text-accent"
                  : "border-border bg-bg/40 text-fg-secondary"
              }`}
              aria-hidden="true"
            >
              <Icon className="size-4.5" />
            </span>
            <span className="min-w-0">
              <span className="block text-xs font-extrabold text-fg">{effect.name}</span>
              <span className="mt-0.5 block text-[11px] leading-snug text-muted">
                {effect.description}
              </span>
            </span>
            {active && (
              <span className="absolute right-2 top-2 grid size-4 place-items-center rounded-full bg-accent-strong text-white">
                <Check className="size-2.5" strokeWidth={3} />
              </span>
            )}
          </button>
        );
      })}
      {heroEffect === "swap" && (
        <div className="mt-1 rounded-xl border border-border bg-surface/40 px-3 py-2.5">
          <div className="flex items-center justify-between text-[10px] font-extrabold uppercase tracking-[0.18em] text-muted">
            <span>Card distance</span>
            <span className="text-fg">{cardDistance}px</span>
          </div>
          <input
            type="range"
            min={CARD_DISTANCE_MIN}
            max={CARD_DISTANCE_MAX}
            step={1}
            value={cardDistance}
            onChange={(event) => setCardDistance(Number(event.target.value))}
            className="mt-2 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-border accent-[var(--accent)]"
            aria-label="Card swap distance"
          />
        </div>
      )}
      <p className="text-[11px] leading-relaxed text-muted">
        The hero effect applies to Cinevo&apos;s banner and is independent of the card
        effect. Admins can make it the site default under{" "}
        <strong className="text-fg-secondary">Site default</strong>.
      </p>
    </div>
  );
}
