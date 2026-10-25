"use client";

import { useCallback, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Palette } from "lucide-react";
import { getExperience } from "@/lib/theme/experiences";
import { writeSkipFingerprint } from "@/lib/theme/mismatch";
import { useTheme } from "@/lib/theme/studio/provider";

export interface PublishedThemeChoice {
  themeId: string;
  experience: string;
  delta?: Record<string, string>;
  /** Identifies this exact published revision for the Skip cookie. */
  fingerprint: string;
}

/**
 * Shown when the browser's saved theme no longer matches the published site
 * theme. Switch adopts the published one; Skip silences the notice until the
 * admin publishes a different revision.
 */
export default function ThemeMismatchNotice({
  published,
}: {
  published: PublishedThemeChoice;
}) {
  const { themes, applyThemeChoice } = useTheme();
  const [visible, setVisible] = useState(true);
  const reduceMotion = useReducedMotion();

  const preset = themes.find((theme) => theme.id === published.themeId);
  const experience = getExperience(published.experience);
  const label = `${experience.name} · ${preset?.name ?? published.themeId}`;

  const switchToPublished = useCallback(() => {
    applyThemeChoice({
      themeId: published.themeId,
      experience: published.experience,
      delta: published.delta as Record<string, string> | undefined,
    });
    setVisible(false);
  }, [applyThemeChoice, published]);

  const skipPublished = useCallback(() => {
    writeSkipFingerprint(published.fingerprint);
    setVisible(false);
  }, [published.fingerprint]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.section
          role="status"
          aria-label="Theme notification"
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -14, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -14, scale: 0.98 }}
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
          className="fixed inset-x-4 top-20 z-50 mx-auto flex max-w-2xl flex-col gap-3 rounded-2xl border border-border bg-bg-elevated/95 p-4 shadow-2xl shadow-black/60 backdrop-blur-xl sm:flex-row sm:items-center sm:gap-4"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent/12 text-accent">
            <Palette className="size-4" />
          </span>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-fg">Your theme differs from the site theme</p>
            <p className="mt-0.5 text-xs leading-relaxed text-fg-secondary">
              The site is now using <span className="font-semibold text-fg">{label}</span>. Switch
              to it, or skip until the site theme changes again.
            </p>
          </div>

          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={switchToPublished}
              className="min-h-11 flex-1 cursor-pointer rounded-xl bg-accent-strong px-4 text-xs font-bold text-white transition-colors hover:bg-accent-strong-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:scale-[0.98] sm:flex-none"
            >
              Switch
            </button>
            <button
              type="button"
              onClick={skipPublished}
              className="min-h-11 flex-1 cursor-pointer rounded-xl border border-border px-4 text-xs font-semibold text-fg-secondary transition-colors hover:bg-white/6 hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:scale-[0.98] sm:flex-none"
            >
              Skip
            </button>
          </div>
        </motion.section>
      )}
    </AnimatePresence>
  );
}
