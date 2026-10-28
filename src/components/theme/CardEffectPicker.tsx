"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { Check, Sparkles, Square } from "lucide-react";
import { toast } from "sonner";
import {
  CARD_EFFECTS,
  DECAY_RING_MAX,
  DECAY_RING_MIN,
  getCardEffect,
  type CardEffectId,
} from "@/lib/theme/card-effects";
import { useTheme } from "@/lib/theme/studio/provider";

const EFFECT_ICONS: Record<CardEffectId, typeof Sparkles> = {
  none: Square,
  decay: Sparkles,
};

export default function CardEffectPicker() {
  const { cardEffect, setCardEffect, decayRing, setDecayRing } = useTheme();
  const router = useRouter();

  const choose = useCallback(
    (id: CardEffectId) => {
      if (id === cardEffect) return;
      const next = getCardEffect(id);
      setCardEffect(id);
      router.refresh();
      toast.success(`${next.name} cards on`, {
        description: "The home rows reload with the new card treatment.",
      });
    },
    [cardEffect, setCardEffect, router],
  );

  return (
    <div className="flex flex-col gap-2">
      {CARD_EFFECTS.map((effect) => {
        const active = effect.id === cardEffect;
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
      {cardEffect === "decay" && (
        <div className="rounded-xl border border-border bg-surface/40 px-3 py-2.5">
          <div className="flex items-center justify-between text-[10px] font-extrabold uppercase tracking-[0.18em] text-muted">
            <span>Ring size</span>
            <span className="text-fg">{decayRing}px</span>
          </div>
          <input
            type="range"
            min={DECAY_RING_MIN}
            max={DECAY_RING_MAX}
            step={1}
            value={decayRing}
            onChange={(event) => setDecayRing(Number(event.target.value))}
            aria-label="Decay ring thickness"
            className="mt-2 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-border accent-[var(--accent)]"
          />
        </div>
      )}
      <p className="text-[11px] leading-relaxed text-muted">
        The effect applies to Cinevo&apos;s home rows. Admins can make the current one the
        site default under <strong className="text-fg-secondary">Site default</strong>.
      </p>
    </div>
  );
}
