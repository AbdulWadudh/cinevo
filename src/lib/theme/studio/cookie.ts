/**
 * Vendored from @k79/theme-studio v1.0.0 (MIT © Zenith Theme contributors).
 * Dark-only: Cinevo's presets intentionally have no light variant.
 */

import { resolveActiveTokens } from "./tokens";
import type { BaseTokens, CompactCookiePayload, ThemeDefinition } from "./types";

export const THEME_COOKIE = "k79_theme_state";

export interface SsrThemeState<T extends BaseTokens = BaseTokens> {
  themeId: string;
  delta?: Partial<T>;
  activeTokens: T;
}

export function parseThemeCookie<T extends BaseTokens = BaseTokens>(
  rawValue: string | undefined | null,
  fallbackThemeId: string,
): CompactCookiePayload<T> {
  if (!rawValue) return { id: fallbackThemeId };

  try {
    const parsed = JSON.parse(decodeURIComponent(rawValue.trim()));
    if (!parsed || typeof parsed !== "object") return { id: fallbackThemeId };
    return {
      id: typeof parsed.id === "string" && parsed.id ? parsed.id : fallbackThemeId,
      d: parsed.d && typeof parsed.d === "object" ? parsed.d : undefined,
      def: typeof parsed.def === "string" ? parsed.def : undefined,
    };
  } catch {
    return { id: fallbackThemeId };
  }
}

/**
 * Cookies are per-host, not per-port. Any other theme-studio app running on
 * localhost shares this cookie name, and its payload can carry a `canvas` that
 * paints Cinevo yellow. A cookie is only trusted when it names a preset we
 * ship *and* declares this app's default family; our own writer always sets
 * `def`, so a foreign payload cannot satisfy both by accident.
 */
export function isTrustedThemeCookie<T extends BaseTokens>(
  cookiePayload: CompactCookiePayload<T>,
  themes: ThemeDefinition<T>[],
  fallbackThemeId: string,
): boolean {
  return (
    cookiePayload.def === fallbackThemeId &&
    themes.some((candidate) => candidate.id === cookiePayload.id)
  );
}

export function getSsrThemeState<T extends BaseTokens>(
  cookiePayload: CompactCookiePayload<T>,
  themes: ThemeDefinition<T>[],
  fallbackThemeId: string,
  customizableKeys: readonly string[] = [],
): SsrThemeState<T> {
  const matched = themes.find((candidate) => candidate.id === cookiePayload.id);
  const theme =
    matched ?? themes.find((candidate) => candidate.id === fallbackThemeId) ?? themes[0];

  const trusted = isTrustedThemeCookie(cookiePayload, themes, fallbackThemeId);
  const delta = trusted ? pickAllowedKeys(cookiePayload.d, customizableKeys) : undefined;

  return {
    themeId: theme.id,
    delta,
    activeTokens: resolveActiveTokens(theme, delta),
  };
}

function pickAllowedKeys<T extends BaseTokens>(
  delta: Partial<T> | undefined,
  allowedKeys: readonly string[],
): Partial<T> | undefined {
  if (!delta || allowedKeys.length === 0) return undefined;

  const allowed = new Set(allowedKeys);
  const filtered: Record<string, string> = {};
  for (const [key, value] of Object.entries(delta)) {
    if (!allowed.has(key)) continue;
    if (typeof value !== "string" || value.length === 0) continue;
    filtered[key] = value;
  }

  return Object.keys(filtered).length > 0 ? (filtered as Partial<T>) : undefined;
}
