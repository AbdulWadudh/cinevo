"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { Check, Sparkles } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { toast } from "sonner";
import PanelCard from "@/components/profile/PanelCard";
import {
  EXPERIENCES,
  getExperience,
  type ExperienceId,
} from "@/lib/theme/experiences";
import { useTheme } from "@/lib/theme/studio/provider";

function ExperiencePreview({ id }: { id: ExperienceId }) {
  return (
    <div className="xp-preview" data-xp-preview={id} aria-hidden="true">
      <span className="xp-preview-nav">
        <i />
        <i />
        <i />
      </span>
      <span className="xp-preview-hero">
        <i className="xp-preview-kicker" />
        <i className="xp-preview-title" />
        <i className="xp-preview-actions">
          <b />
          <b />
        </i>
      </span>
      <span className="xp-preview-row">
        <i />
        <i />
        <i />
        <i />
      </span>
      <span className="xp-preview-glow" />
    </div>
  );
}

/**
 * The animated experience picker. Shared by Profile → Appearance (inside a
 * PanelCard) and the Theme Studio sheet (bare, inside a Section).
 */
export function ExperienceGrid({
  compact = false,
  scope = "experience",
}: {
  compact?: boolean;
  scope?: string;
}) {
  const { experience, setExperience } = useTheme();
  const reduceMotion = useReducedMotion();
  const router = useRouter();

  const choose = useCallback(
    (id: ExperienceId) => {
      if (id === experience) return;
      const next = getExperience(id);
      setExperience(id);
      // The experience also picks the server-rendered page shell (Top 10 vs
      // brand hub vs Apple originals), so refetch it with the new cookie.
      router.refresh();
      toast.success(`${next.name} experience on`, {
        description:
          id === "cinevo"
            ? "Back to the signature Cinevo look."
            : "Layout, palette, chrome and motion switched. Theme Studio edits still layer on top.",
      });
    },
    [experience, setExperience, router],
  );

  return (
    <div className={`grid gap-2.5 ${compact ? "grid-cols-2" : "grid-cols-2 xl:grid-cols-4"}`}>
      {EXPERIENCES.map((entry, index) => {
        const active = entry.id === experience;
        return (
          <motion.button
            key={entry.id}
            type="button"
            onClick={() => choose(entry.id)}
            aria-pressed={active}
            aria-label={`Switch to the ${entry.name} experience`}
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, ease: "easeOut", delay: index * 0.05 }}
            whileHover={reduceMotion ? undefined : { y: -3 }}
            whileTap={reduceMotion ? undefined : { scale: 0.98 }}
            className={`xp-choice group relative flex min-h-11 flex-col overflow-hidden rounded-xl border p-2.5 text-left transition-colors ${
              active
                ? "border-accent/60 bg-accent/10"
                : "border-white/8 bg-bg/40 hover:border-white/20"
            }`}
          >
            <ExperiencePreview id={entry.id} />

            <span className="mt-2.5 flex items-center gap-1.5">
              <span className="text-sm font-extrabold tracking-tight text-fg">{entry.name}</span>
              {entry.id === "cinevo" && (
                <span className="rounded-full border border-white/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-muted">
                  Default
                </span>
              )}
            </span>
            <span className="mt-0.5 block text-[11px] leading-snug text-muted">{entry.tagline}</span>

            {!compact && (
              <span className="mt-2 flex flex-wrap gap-1">
                {entry.signals.map((signal) => (
                  <span
                    key={signal}
                    className="rounded-full border border-white/8 bg-white/4 px-1.5 py-0.5 text-[9px] font-semibold text-fg-secondary"
                  >
                    {signal}
                  </span>
                ))}
              </span>
            )}

            {active && (
              <motion.span
                layoutId={`${scope}-active-check`}
                transition={
                  reduceMotion
                    ? { duration: 0 }
                    : { type: "spring", stiffness: 430, damping: 34 }
                }
                className="absolute right-2 top-2 z-10 grid size-5 place-items-center rounded-full bg-accent-strong text-white shadow-md"
              >
                <Check className="size-3" strokeWidth={3} />
              </motion.span>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}

export default function ExperienceSwitcher() {
  const { experience } = useTheme();
  const active = getExperience(experience);

  return (
    <PanelCard
      icon={<Sparkles className="size-4.5" />}
      title="Switch to Experience"
      subtitle="Layout, type and motion presets — with the studio still on top"
      tone="purple"
      action={
        <span className="rounded-full border border-accent/30 bg-accent/10 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-accent">
          {active.name}
        </span>
      }
    >
      <ExperienceGrid />
      <p className="mt-4 rounded-xl border border-white/6 bg-bg/40 px-3.5 py-3 text-[11px] leading-relaxed text-muted">
        An experience swaps the base palette, typography, corner shape, nav, hero, card geometry,
        home layout and motion. Palette, colour, type, radius and elevation edits in Theme Studio
        still layer on top; switching experience starts from its shipped look so the first paint
        stays faithful. A published site default applies only while you have no saved theme of your
        own.
      </p>
    </PanelCard>
  );
}
