"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, Film, Globe2, Layers, Loader2, Palette, RotateCcw, Sparkles, Type, Upload, X } from "lucide-react";
import { toast } from "sonner";
import {
  clearSiteTheme,
  getSiteThemeAdminState,
  publishSiteTheme,
  type SiteThemeAdminState,
} from "@/app/actions/site-theme";
import CardEffectPicker from "@/components/theme/CardEffectPicker";
import DetailLayoutPicker from "@/components/theme/DetailLayoutPicker";
import HeroEffectPicker from "@/components/theme/HeroEffectPicker";
import FontsourceBrowser from "@/components/theme/FontsourceBrowser";
import { ExperienceGrid } from "@/components/theme/ExperienceSwitcher";
import { accentDelta } from "@/lib/theme/accent";
import { getCardEffect, getHeroEffect } from "@/lib/theme/card-effects";
import { getDetailLayout } from "@/lib/theme/detail-layouts";
import { getExperience } from "@/lib/theme/experiences";
import {
  ELEVATION_PRESETS,
  RADIUS_OPTIONS,
  type CinevoTokens,
} from "@/lib/theme/presets";
import {
  FONT_OPTIONS,
  fontFamilyOf,
  fontsourceStack,
  loadFont,
  type FontsourceEntry,
} from "@/lib/theme/studio/fonts";
import { useTheme } from "@/lib/theme/studio/provider";

const COLOUR_ROWS: { key: keyof CinevoTokens; label: string }[] = [
  { key: "canvas", label: "App background" },
  { key: "surface", label: "Menus & sheets" },
  { key: "bgElevated", label: "Elevated surface" },
  { key: "card", label: "Cards" },
  { key: "border", label: "Borders" },
  { key: "primary", label: "Primary accent" },
  { key: "secondary", label: "Secondary" },
  { key: "accent", label: "Live accent" },
  { key: "textPrimary", label: "Primary text" },
  { key: "textSecondary", label: "Secondary text" },
  { key: "textMuted", label: "Muted text" },
];

const ACCENT_KEYS: (keyof CinevoTokens)[] = [
  "primary",
  "primaryHover",
  "accentStrong",
  "accentStrongHover",
  "accentRgb",
];

function Section({
  icon,
  title,
  children,
  delay = 0,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
  delay?: number;
}) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.section
      initial={reduceMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: "easeOut", delay }}
      className="flex flex-col gap-2.5"
    >
      <h3 className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.14em] text-muted">
        {icon}
        {title}
      </h3>
      {children}
    </motion.section>
  );
}

export default function ThemeStudio() {
  const {
    theme,
    themes,
    tokens,
    experience,
    detailLayout,
    cardEffect,
    heroEffect,
    decayRing,
    cardDistance,
    customizations,
    hasCustomizations,
    isStudioOpen,
    closeStudio,
    setTheme,
    setCustomTokens,
    clearCustomTokens,
    resetTheme,
  } = useTheme<CinevoTokens>();
  const activeExperience = getExperience(experience);
  const reduceMotion = useReducedMotion();
  const [browseTarget, setBrowseTarget] = useState<"fontHeading" | "fontBody" | null>(null);
  const [siteAdmin, setSiteAdmin] = useState<SiteThemeAdminState | null>(null);
  const [siteBusy, setSiteBusy] = useState<"publish" | "clear" | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const wasOpen = useRef(false);

  // There is no dedicated trigger any more — the studio opens from the nav
  // shortcut or Profile → Appearance — so focus goes back to whichever
  // control the listener actually pressed.
  useEffect(() => {
    if (isStudioOpen && !wasOpen.current) {
      const active = document.activeElement;
      openerRef.current = active instanceof HTMLElement && active !== document.body ? active : null;
    } else if (!isStudioOpen && wasOpen.current) {
      openerRef.current?.focus();
      openerRef.current = null;
    }
    wasOpen.current = isStudioOpen;
  }, [isStudioOpen]);

  useEffect(() => {
    if (!isStudioOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeStudio();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;

      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    closeRef.current?.focus();

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isStudioOpen, closeStudio]);

  useEffect(() => {
    if (!isStudioOpen) return;
    let cancelled = false;

    getSiteThemeAdminState()
      .then((next) => {
        if (!cancelled) setSiteAdmin(next);
      })
      .catch(() => {
        if (!cancelled) {
          setSiteAdmin({ isAdmin: false, siteTheme: null, storageReady: false });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isStudioOpen]);

  const preset = themes.find((entry) => entry.id === theme) ?? themes[0];
  const publishedTheme = siteAdmin?.siteTheme ?? null;
  const publishedPreset = publishedTheme
    ? themes.find((entry) => entry.id === publishedTheme.themeId)
    : null;
  const publishedExperience = publishedTheme
    ? getExperience(publishedTheme.experience)
    : null;
  const publishedLayout = publishedTheme
    ? getDetailLayout(publishedTheme.detailLayout)
    : null;
  const publishedEffect = publishedTheme
    ? getCardEffect(publishedTheme.cardEffect)
    : null;
  const publishedHero = publishedTheme
    ? getHeroEffect(publishedTheme.heroEffect)
    : null;
  const publishedLabel = publishedTheme
    ? `${publishedExperience?.name ?? "Cinevo"} · ${publishedPreset?.name ?? publishedTheme.themeId} · ${publishedLayout?.name ?? "Classic"} · ${publishedEffect?.name ?? "Standard"} cards · ${publishedHero?.name ?? "Standard"} hero${publishedTheme.delta ? " with overrides" : ""}`
    : "Shipped Cinevo palette";

  const publishCurrentTheme = useCallback(async () => {
    if (siteBusy) return;
    setSiteBusy("publish");

    try {
      const result = await publishSiteTheme({ themeId: theme, experience, detailLayout, cardEffect, heroEffect, decayRing, cardDistance, delta: customizations });
      if (!result.success) {
        toast.error(result.error ?? "Couldn't publish the site theme");
        return;
      }

      setSiteAdmin((previous) =>
        previous ? { ...previous, siteTheme: result.siteTheme ?? null, storageReady: true } : previous,
      );
      toast.success("Site theme published", {
        description: "Visitors without a saved theme now get this one.",
      });
    } catch {
      toast.error("Couldn't publish the site theme");
    } finally {
      setSiteBusy(null);
    }
  }, [siteBusy, theme, experience, detailLayout, cardEffect, heroEffect, decayRing, cardDistance, customizations]);

  const resetPublishedTheme = useCallback(async () => {
    if (siteBusy) return;
    setSiteBusy("clear");

    try {
      const result = await clearSiteTheme();
      if (!result.success) {
        toast.error(result.error ?? "Couldn't reset the site theme");
        return;
      }

      setSiteAdmin((previous) =>
        previous ? { ...previous, siteTheme: null, storageReady: true } : previous,
      );
      toast.success("Site theme reset", {
        description: "Visitors without a saved theme now see the shipped palette.",
      });
    } catch {
      toast.error("Couldn't reset the site theme");
    } finally {
      setSiteBusy(null);
    }
  }, [siteBusy]);

  const setColour = useCallback(
    (key: keyof CinevoTokens, value: string) => {
      if (key === "primary") {
        const delta = accentDelta(value);
        if (delta) setCustomTokens(delta);
        return;
      }
      setCustomTokens({ [key]: value } as Partial<CinevoTokens>);
    },
    [setCustomTokens],
  );

  const resetColour = useCallback(
    (key: keyof CinevoTokens) => {
      clearCustomTokens(key === "primary" ? ACCENT_KEYS : [key]);
    },
    [clearCustomTokens],
  );

  const headingFamily = fontFamilyOf(tokens.fontHeading);
  const bodyFamily = fontFamilyOf(tokens.fontBody);
  const headingOption =
    FONT_OPTIONS.find((option) => option.family === headingFamily)?.id ?? "custom";
  const bodyOption =
    FONT_OPTIONS.find((option) => option.family === bodyFamily)?.id ?? "custom";
  const defaultHeadingOption =
    FONT_OPTIONS.find((option) => option.family === fontFamilyOf(preset.tokens.fontHeading))?.id ??
    FONT_OPTIONS[0].id;
  const defaultBodyOption =
    FONT_OPTIONS.find((option) => option.family === fontFamilyOf(preset.tokens.fontBody))?.id ??
    FONT_OPTIONS[1].id;

  const applyFont = useCallback(
    (key: "fontHeading" | "fontBody", optionId: string) => {
      if (optionId === "custom") return;
      const option = FONT_OPTIONS.find((entry) => entry.id === optionId);
      if (!option) return;
      loadFont(option.stack);
      setCustomTokens({ [key]: option.stack } as Partial<CinevoTokens>);
    },
    [setCustomTokens],
  );

  const endBrowse = useCallback((focusTarget: "fontHeading" | "fontBody") => {
    setBrowseTarget(null);
    window.setTimeout(() => {
      document.getElementById(`theme-${focusTarget}`)?.focus();
    }, 0);
  }, []);

  const applyBrowsedFont = useCallback(
    (entry: FontsourceEntry) => {
      if (!browseTarget) return;
      const stack = fontsourceStack(entry.family, entry.category);
      loadFont(stack);
      setCustomTokens({ [browseTarget]: stack } as Partial<CinevoTokens>);
      endBrowse(browseTarget);
    },
    [browseTarget, setCustomTokens, endBrowse],
  );

  const elevationId =
    ELEVATION_PRESETS.find((entry) => entry.tokens.elevation === tokens.elevation)?.id ?? "custom";

  return (
    <AnimatePresence>
      {isStudioOpen && (
        <>
          <motion.div
            key="theme-studio-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={closeStudio}
            className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            key="theme-studio-panel"
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="theme-studio-title"
            initial={reduceMotion ? false : { x: "100%" }}
            animate={{ x: 0 }}
            exit={reduceMotion ? undefined : { x: "100%" }}
            transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 320, damping: 34 }}
            className="fixed inset-y-0 right-0 z-[111] flex w-full max-w-md flex-col border-l border-border bg-bg-elevated shadow-2xl"
          >
            <header className="flex flex-none items-center justify-between gap-3 border-b border-border px-4 py-3.5">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="grid size-9 place-items-center rounded-lg bg-accent/12 text-accent">
                  <Palette className="size-4.5" />
                </span>
                <div className="min-w-0">
                  <h2 id="theme-studio-title" className="text-sm font-extrabold tracking-tight text-fg">
                    Theme Studio
                  </h2>
                  <p className="truncate text-[11px] text-muted">Palette, type and shape — live</p>
                </div>
              </div>
              <div className="flex flex-none items-center gap-1.5">
                <button
                  type="button"
                  onClick={resetTheme}
                  disabled={!hasCustomizations}
                  title="Reset every override"
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-border px-2.5 text-[11px] font-bold text-fg-secondary transition-colors enabled:cursor-pointer enabled:hover:border-accent/50 enabled:hover:text-fg disabled:opacity-40"
                >
                  <RotateCcw className="size-3.5" />
                  Reset
                </button>
                <button
                  ref={closeRef}
                  type="button"
                  onClick={closeStudio}
                  aria-label="Close theme studio"
                  className="grid size-11 cursor-pointer place-items-center rounded-lg border border-transparent text-fg-secondary transition-colors hover:border-border hover:bg-surface hover:text-fg"
                >
                  <X className="size-5" />
                </button>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4">
              <div className="flex flex-col gap-6 pb-10">
                <Section icon={<Sparkles className="size-3.5" />} title="Experience" delay={0.02}>
                  <ExperienceGrid compact scope="studio" />
                  <p className="text-[11px] leading-relaxed text-muted">
                    <strong className="text-fg-secondary">{activeExperience.name}</strong> is active.
                    Switching loads its shipped palette and chrome; the controls below then layer on
                    top.
                  </p>
                </Section>

                <Section icon={<Film className="size-3.5" />} title="Details page" delay={0.04}>
                  <DetailLayoutPicker />
                </Section>

                <Section icon={<Sparkles className="size-3.5" />} title="Card effect" delay={0.05}>
                  <CardEffectPicker />
                </Section>

                <Section icon={<Layers className="size-3.5" />} title="Hero carousel" delay={0.055}>
                  <HeroEffectPicker />
                </Section>

                <Section icon={<Palette className="size-3.5" />} title="Palette" delay={0.06}>
                  {/* The full studio library is longer than the sheet, so the
                      grid owns its own scrollbar and the controls below stay
                      reachable without scrolling past every preset. */}
                  <div className="grid max-h-64 grid-cols-2 gap-2 overflow-y-auto overscroll-contain pr-1">
                    {themes.map((entry) => {
                      const active = entry.id === theme;
                      return (
                        <button
                          key={entry.id}
                          type="button"
                          onClick={() => setTheme(entry.id)}
                          aria-pressed={active}
                          className={`relative flex flex-col gap-2 rounded-xl border p-2.5 text-left transition-colors ${
                            active ? "border-accent/70 bg-accent/10" : "border-border bg-surface/40 hover:border-border"
                          }`}
                        >
                          <span className="flex gap-1" aria-hidden="true">
                            {[entry.tokens.canvas, entry.tokens.surface, entry.tokens.primary].map(
                              (colour, index) => (
                                <span
                                  key={index}
                                  className="size-3.5 rounded-full ring-1 ring-white/10"
                                  style={{ backgroundColor: colour }}
                                />
                              ),
                            )}
                          </span>
                          <span className="text-xs font-bold text-fg">{entry.name}</span>
                          {active && (
                            <span className="absolute right-2 top-2 grid size-4 place-items-center rounded-full bg-accent-strong text-white">
                              <Check className="size-2.5" strokeWidth={3} />
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </Section>

                <Section icon={<Type className="size-3.5" />} title="Typography" delay={0.06}>
                  {browseTarget ? (
                    <FontsourceBrowser
                      label={browseTarget === "fontHeading" ? "headings" : "body text"}
                      onApply={applyBrowsedFont}
                      onClose={() => endBrowse(browseTarget)}
                    />
                  ) : (
                    <>
                      {(
                        [
                          {
                            key: "fontHeading",
                            label: "Headings",
                            current: headingOption,
                            fallback: defaultHeadingOption,
                          },
                          {
                            key: "fontBody",
                            label: "Body",
                            current: bodyOption,
                            fallback: defaultBodyOption,
                          },
                        ] as const
                      ).map((row) => (
                        <div
                          key={row.key}
                          className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface/40 px-3 py-2"
                        >
                          <label
                            htmlFor={`theme-${row.key}`}
                            className="text-xs font-bold text-fg-secondary"
                          >
                            {row.label}
                          </label>
                          <div className="flex items-center gap-1.5">
                            <select
                              id={`theme-${row.key}`}
                              value={row.current}
                              onChange={(event) => {
                                if (event.target.value === "browse") {
                                  setBrowseTarget(row.key);
                                  return;
                                }
                                applyFont(row.key, event.target.value);
                              }}
                              className="min-h-9 max-w-45 cursor-pointer rounded-lg border border-border bg-bg px-2 text-xs font-semibold text-fg outline-none focus:border-accent"
                            >
                              {row.current === "custom" && <option value="custom">Custom</option>}
                              {FONT_OPTIONS.map((option) => (
                                <option key={option.id} value={option.id}>
                                  {option.family}
                                </option>
                              ))}
                              <option value="browse">Browse Fontsource…</option>
                            </select>
                            <button
                              type="button"
                              onClick={() => clearCustomTokens([row.key])}
                              disabled={row.current === row.fallback}
                              aria-label={`Reset ${row.label.toLowerCase()} font`}
                              className="grid size-9 place-items-center rounded-lg text-muted transition-colors enabled:cursor-pointer enabled:hover:bg-surface enabled:hover:text-fg disabled:opacity-25"
                            >
                              <RotateCcw className="size-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </Section>

                <Section icon={<Palette className="size-3.5" />} title="Colours" delay={0.1}>
                  <div className="flex flex-col divide-y divide-border/60 overflow-hidden rounded-xl border border-border bg-surface/40">
                    {COLOUR_ROWS.map((row) => {
                      const value = tokens[row.key] ?? "";
                      const overridden = Boolean(preset.tokens[row.key] && value !== preset.tokens[row.key]);
                      return (
                        <div key={row.key} className="flex items-center gap-2.5 px-3 py-2">
                          <label
                            htmlFor={`theme-colour-${row.key}`}
                            className="flex-1 cursor-pointer text-xs font-semibold text-fg-secondary"
                          >
                            {row.label}
                          </label>
                          <span className="font-mono text-[10px] uppercase text-muted">{value}</span>
                          <span className="relative block size-8 shrink-0 overflow-hidden rounded-md border border-border">
                            <span
                              aria-hidden="true"
                              className="pointer-events-none absolute inset-0.5 rounded-sm"
                              style={{ backgroundColor: value }}
                            />
                            <input
                              id={`theme-colour-${row.key}`}
                              type="color"
                              value={value}
                              onChange={(event) => setColour(row.key, event.target.value)}
                              className="size-full cursor-pointer opacity-0"
                            />
                          </span>
                          <button
                            type="button"
                            onClick={() => resetColour(row.key)}
                            disabled={!overridden}
                            aria-label={`Reset ${row.label.toLowerCase()}`}
                            className="grid size-8 shrink-0 place-items-center rounded-md text-muted transition-colors enabled:cursor-pointer enabled:hover:bg-surface enabled:hover:text-fg disabled:opacity-25"
                          >
                            <RotateCcw className="size-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </Section>

                <Section icon={<Layers className="size-3.5" />} title="Corner radius" delay={0.14}>
                  <div className="grid grid-cols-3 gap-2">
                    {RADIUS_OPTIONS.map((option) => {
                      const active = tokens.radius === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setCustomTokens({ radius: option.value })}
                          aria-pressed={active}
                          className={`flex min-h-16 flex-col items-center justify-center gap-1.5 rounded-xl border text-[11px] font-bold transition-colors ${
                            active
                              ? "border-accent/60 bg-accent/10 text-fg"
                              : "border-border bg-surface/40 text-fg-secondary hover:border-border"
                          }`}
                        >
                          <span
                            aria-hidden="true"
                            className="size-5 border-2 border-current opacity-70"
                            style={{ borderRadius: option.value }}
                          />
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </Section>

                <Section icon={<Layers className="size-3.5" />} title="Elevation" delay={0.18}>
                  <div className="grid grid-cols-4 gap-2">
                    {ELEVATION_PRESETS.map((option) => {
                      const active = elevationId === option.id;
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => setCustomTokens(option.tokens)}
                          aria-pressed={active}
                          className={`flex min-h-16 flex-col items-center justify-center gap-2 rounded-xl border text-[11px] font-bold transition-colors ${
                            active
                              ? "border-accent/60 bg-accent/10 text-fg"
                              : "border-border bg-surface/40 text-fg-secondary hover:border-border"
                          }`}
                        >
                          <span
                            aria-hidden="true"
                            className="size-6 rounded-md bg-card ring-1 ring-border"
                            style={{ boxShadow: option.tokens.elevationLg }}
                          />
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </Section>

                {siteAdmin?.isAdmin && (
                  <Section icon={<Globe2 className="size-3.5" />} title="Site default" delay={0.22}>
                    <div className="rounded-xl border border-border bg-surface/40 p-3">
                      <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-muted">
                        Published
                      </p>
                      <p className="mt-1 text-xs font-bold text-fg">{publishedLabel}</p>
                      <p className="mt-1.5 text-[11px] leading-relaxed text-muted">
                        Shown to every visitor without a theme saved in their browser.
                        Publish the active experience, details layout, palette and overrides
                        above to replace it.
                      </p>

                      {!siteAdmin.storageReady && (
                        <p className="mt-2 rounded-lg border border-warning/30 bg-warning/10 px-2.5 py-2 text-[11px] leading-relaxed text-warning">
                          Theme storage is not set up yet. Apply the pending database migration
                          before publishing.
                        </p>
                      )}

                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={publishCurrentTheme}
                          disabled={siteBusy !== null}
                          className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-accent-strong bg-accent-strong px-3 text-[11px] font-bold text-white transition-colors enabled:cursor-pointer enabled:hover:bg-accent-strong-hover disabled:opacity-50"
                        >
                          {siteBusy === "publish" ? (
                            <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" />
                          ) : (
                            <Upload className="size-3.5" />
                          )}
                          Publish current
                        </button>
                        <button
                          type="button"
                          onClick={resetPublishedTheme}
                          disabled={!publishedTheme || siteBusy !== null}
                          className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-border px-3 text-[11px] font-bold text-fg-secondary transition-colors enabled:cursor-pointer enabled:hover:border-accent/50 enabled:hover:text-fg disabled:opacity-40"
                        >
                          {siteBusy === "clear" ? (
                            <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" />
                          ) : (
                            <RotateCcw className="size-3.5" />
                          )}
                          Use shipped default
                        </button>
                      </div>
                    </div>
                  </Section>
                )}

                <p className="text-[11px] leading-relaxed text-muted">
                  Saved in this browser and applied before first paint. Radius, type and colour
                  overrides are cleared when you switch palettes or experiences;{" "}
                  <strong>Reset</strong> returns to the active experience exactly as shipped. A
                  published site default outranks a personal cookie.
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
