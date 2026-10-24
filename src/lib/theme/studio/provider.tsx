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
  useState,
  type ReactNode,
} from "react";
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

function applyTokens(tokens: BaseTokens): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;

  for (const [key, value] of Object.entries(tokensToCssVars(tokens))) {
    root.style.setProperty(key, value);
  }

  // Radius is part of the preset schema but Cinevo's shape scale is fixed, so
  // the studio's --radius-* shims are deliberately not applied (they would
  // quietly resize every rounded-sm/md utility).
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
  initialState: { themeId: string; delta?: Partial<T> };
}) {
  const [themeId, setThemeId] = useState(initialState.themeId);
  const [delta, setDelta] = useState<Partial<T> | undefined>(initialState.delta);
  const [isStudioOpen, setStudioOpen] = useState(false);

  const activePreset = useMemo(
    () => themes.find((theme) => theme.id === themeId) ?? themes[0],
    [themes, themeId],
  );

  const tokens = useMemo(
    () => resolveActiveTokens(activePreset, delta),
    [activePreset, delta],
  );

  useEffect(() => {
    applyTokens(tokens);
    // A saved font is re-fetched on load; the two bundled faces are no-ops.
    loadFont(tokens.fontHeading);
    loadFont(tokens.fontBody);
  }, [tokens]);

  const persist = useCallback(
    (id: string, nextDelta?: Partial<T>) => {
      const payload: CompactCookiePayload<T> = { id, def: defaultTheme };
      if (nextDelta && Object.keys(nextDelta).length > 0) payload.d = nextDelta;
      writeCookie(payload);
    },
    [defaultTheme],
  );

  const setTheme = useCallback(
    (id: string) => {
      // A preset is a complete look: switching starts from its values rather
      // than carrying one palette's overrides onto another.
      setThemeId(id);
      setDelta(undefined);
      persist(id, undefined);
    },
    [persist],
  );

  const setCustomTokens = useCallback(
    (partial: Partial<T>) => {
      setDelta((previous) => {
        const next = { ...previous, ...partial };
        persist(themeId, next);
        return next;
      });
    },
    [persist, themeId],
  );

  const clearCustomTokens = useCallback(
    (keys: (keyof T)[]) => {
      setDelta((previous) => {
        if (!previous) return previous;
        const next = { ...previous };
        for (const key of keys) delete next[key];
        persist(themeId, Object.keys(next).length > 0 ? next : undefined);
        return Object.keys(next).length > 0 ? next : undefined;
      });
    },
    [persist, themeId],
  );

  const resetTheme = useCallback(() => {
    setDelta(undefined);
    persist(themeId, undefined);
  }, [persist, themeId]);

  const openStudio = useCallback(() => setStudioOpen(true), []);
  const closeStudio = useCallback(() => setStudioOpen(false), []);

  const value = useMemo<ThemeContextValue<T>>(
    () => ({
      theme: themeId,
      tokens,
      themes,
      customizations: delta,
      hasCustomizations: Boolean(delta && Object.keys(delta).length > 0),
      isStudioOpen,
      openStudio,
      closeStudio,
      setTheme,
      setCustomTokens,
      clearCustomTokens,
      resetTheme,
    }),
    [
      themeId,
      tokens,
      themes,
      delta,
      isStudioOpen,
      openStudio,
      closeStudio,
      setTheme,
      setCustomTokens,
      clearCustomTokens,
      resetTheme,
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
