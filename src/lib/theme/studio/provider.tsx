"use client";

/**
 * Vendored from @k79/theme-studio v1.0.0 (MIT © Zenith Theme contributors).
 * Dark-only, Cinevo-specific: persists the chosen preset and any accent delta
 * in a compact cookie, then mirrors the resolved tokens onto <html>.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { getExperience, isExperienceId } from "../experiences";
import {
  DEFAULT_DETAIL_LAYOUT_ID,
  isDetailLayoutId,
  type DetailLayoutId,
} from "../detail-layouts";
import { THEME_COOKIE } from "./cookie";
import { loadFont } from "./fonts";
import { resolveActiveTokens, tokensToCssVars } from "./tokens";
import type { BaseTokens, CompactCookiePayload, ThemeContextValue, ThemeDefinition } from "./types";

const ThemeContext = createContext<ThemeContextValue<BaseTokens> | null>(null);

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

function writeCookie(payload: CompactCookiePayload): void {
  if (typeof document === "undefined") return;
  const value = encodeURIComponent(JSON.stringify(payload));
  let cookie = `${THEME_COOKIE}=${value}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
  if (window.location.protocol === "https:") cookie += "; Secure";
  document.cookie = cookie;
}

function applyTokens(tokens: BaseTokens, experience: string): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;

  for (const [key, value] of Object.entries(tokensToCssVars(tokens))) {
    root.style.setProperty(key, value);
  }

  root.dataset.experience = experience;
}

export function ThemeProvider<T extends BaseTokens>({
  children,
  themes,
  defaultTheme,
  initialState,
}: {
  children: ReactNode;
  themes: ThemeDefinition<T>[];
  defaultTheme: string;
  initialState: { themeId: string; delta?: Partial<T>; experience?: string; detailLayout?: string };
}) {
  const [themeId, setThemeId] = useState(initialState.themeId);
  const [delta, setDelta] = useState<Partial<T> | undefined>(initialState.delta);
  const [experience, setExperienceId] = useState(
    isExperienceId(initialState.experience) ? initialState.experience : "cinevo",
  );
  const [detailLayout, setDetailLayoutId] = useState<DetailLayoutId>(
    isDetailLayoutId(initialState.detailLayout)
      ? initialState.detailLayout
      : DEFAULT_DETAIL_LAYOUT_ID,
  );
  const [isStudioOpen, setStudioOpen] = useState(false);

  const activePreset = useMemo(
    () => themes.find((theme) => theme.id === themeId) ?? themes[0],
    [themes, themeId],
  );

  const tokens = useMemo(
    () => resolveActiveTokens(activePreset, delta),
    [activePreset, delta],
  );

  // The head script already painted these exact tokens onto <html>, so only
  // later changes (studio previews, experience switches) need applying here.
  const paintedByHead = useRef(false);
  useEffect(() => {
    if (paintedByHead.current) applyTokens(tokens, experience);
    paintedByHead.current = true;
    // A saved font is re-fetched on load; bundled and platform faces are no-ops.
    loadFont(tokens.fontHeading);
    loadFont(tokens.fontBody);
  }, [tokens, experience]);

  const persist = useCallback(
    (
      id: string,
      nextDelta: Partial<T> | undefined,
      nextExperience: string,
      nextLayout: string,
    ) => {
      const payload: CompactCookiePayload<T> = { id, def: defaultTheme };
      if (nextDelta && Object.keys(nextDelta).length > 0) payload.d = nextDelta;
      if (nextExperience && nextExperience !== "cinevo") payload.x = nextExperience;
      if (isDetailLayoutId(nextLayout)) payload.l = nextLayout;
      writeCookie(payload);
    },
    [defaultTheme],
  );

  const setTheme = useCallback(
    (id: string) => {
      // A preset is a complete look: switching starts from its values rather
      // than carrying one palette's overrides onto another. The experience
      // chrome stays put so studio palettes can retint Netflix/Disney+/Apple.
      setThemeId(id);
      setDelta(undefined);
      persist(id, undefined, experience, detailLayout);
    },
    [persist, experience, detailLayout],
  );

  const setExperience = useCallback(
    (id: string) => {
      const next = getExperience(id);
      // An experience is a complete shipped look: load its signature palette
      // and clear overrides so the first paint is the faithful one. Studio
      // edits made afterwards still layer on top.
      setExperienceId(next.id);
      setThemeId(next.paletteId);
      setDelta(undefined);
      persist(next.paletteId, undefined, next.id, detailLayout);
    },
    [persist, detailLayout],
  );

  const setDetailLayout = useCallback(
    (id: string) => {
      if (!isDetailLayoutId(id) || id === detailLayout) return;
      setDetailLayoutId(id);
      persist(themeId, delta, experience, id);
    },
    [persist, themeId, delta, experience, detailLayout],
  );

  const setCustomTokens = useCallback(
    (partial: Partial<T>) => {
      setDelta((previous) => {
        const next = { ...previous, ...partial };
        persist(themeId, next, experience, detailLayout);
        return next;
      });
    },
    [persist, themeId, experience, detailLayout],
  );

  const clearCustomTokens = useCallback(
    (keys: (keyof T)[]) => {
      setDelta((previous) => {
        if (!previous) return previous;
        const next = { ...previous };
        for (const key of keys) delete next[key];
        persist(themeId, Object.keys(next).length > 0 ? next : undefined, experience, detailLayout);
        return Object.keys(next).length > 0 ? next : undefined;
      });
    },
    [persist, themeId, experience, detailLayout],
  );

  const resetTheme = useCallback(() => {
    setDelta(undefined);
    persist(themeId, undefined, experience, detailLayout);
  }, [persist, themeId, experience, detailLayout]);

  const applyThemeChoice = useCallback(
    (choice: { themeId: string; experience?: string; delta?: Partial<T> }) => {
      // All three parts move together, so this can't persist a half-switched
      // theme the way chaining setExperience + setTheme would.
      if (!themes.some((theme) => theme.id === choice.themeId)) return;

      const nextExperience = isExperienceId(choice.experience)
        ? choice.experience
        : experience;
      const nextDelta =
        choice.delta && Object.keys(choice.delta).length > 0 ? choice.delta : undefined;

      setThemeId(choice.themeId);
      setExperienceId(nextExperience);
      setDelta(nextDelta);
      persist(choice.themeId, nextDelta, nextExperience, detailLayout);
    },
    [persist, experience, themes, detailLayout],
  );

  const openStudio = useCallback(() => setStudioOpen(true), []);
  const closeStudio = useCallback(() => setStudioOpen(false), []);

  const value = useMemo<ThemeContextValue<T>>(
    () => ({
      theme: themeId,
      tokens,
      themes,
      experience,
      detailLayout,
      customizations: delta,
      hasCustomizations: Boolean(delta && Object.keys(delta).length > 0),
      isStudioOpen,
      openStudio,
      closeStudio,
      setTheme,
      setExperience,
      setDetailLayout,
      setCustomTokens,
      clearCustomTokens,
      resetTheme,
      applyThemeChoice,
    }),
    [
      themeId,
      tokens,
      themes,
      experience,
      detailLayout,
      delta,
      isStudioOpen,
      openStudio,
      closeStudio,
      setTheme,
      setExperience,
      setDetailLayout,
      setCustomTokens,
      clearCustomTokens,
      resetTheme,
      applyThemeChoice,
    ],
  );

  return (
    <ThemeContext.Provider value={value as unknown as ThemeContextValue<BaseTokens>}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme<T extends BaseTokens = BaseTokens>(): ThemeContextValue<T> {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("[cinevo-theme] useTheme must be used within <ThemeProvider>");
  }
  return context as unknown as ThemeContextValue<T>;
}
