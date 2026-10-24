import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { CUSTOMIZABLE_THEME_KEYS, themePresets } from "./presets";
import { sanitizeCssValue } from "./studio/sanitize";

export const SITE_THEME_ROW_ID = "active";

export type SiteThemeDelta = Record<string, string>;

export interface SiteThemeState {
  themeId: string;
  delta?: SiteThemeDelta;
}

const PRESET_IDS = new Set(themePresets.map((preset) => preset.id));
const CUSTOMIZABLE_KEYS = new Set<string>(CUSTOMIZABLE_THEME_KEYS);

/**
 * Accepts only a shipped preset id and the same token keys the studio may
 * persist in a cookie. Values go through the cookie sanitizer, so a hand-edited
 * row cannot inject CSS declarations either.
 */
export function normalizeSiteTheme(input: unknown): SiteThemeState | null {
  if (!input || typeof input !== "object") return null;

  const { themeId, delta } = input as { themeId?: unknown; delta?: unknown };
  if (typeof themeId !== "string" || !PRESET_IDS.has(themeId)) return null;

  const normalized: SiteThemeDelta = {};
  if (delta && typeof delta === "object" && !Array.isArray(delta)) {
    for (const [key, value] of Object.entries(delta)) {
      if (!CUSTOMIZABLE_KEYS.has(key) || typeof value !== "string") continue;
      const sanitized = sanitizeCssValue(value);
      if (sanitized) normalized[key] = sanitized;
    }
  }

  return Object.keys(normalized).length > 0 ? { themeId, delta: normalized } : { themeId };
}

/** True when the migration that creates the singleton row has not run yet. */
export function isMissingSiteThemeTable(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2021";
}

export async function getSiteTheme(): Promise<SiteThemeState | null> {
  try {
    const row = await db.siteTheme.findUnique({ where: { id: SITE_THEME_ROW_ID } });
    return row ? normalizeSiteTheme({ themeId: row.themeId, delta: row.delta }) : null;
  } catch (error) {
    // Until the migration is applied the app must still boot on the shipped
    // palette rather than failing every render.
    if (!isMissingSiteThemeTable(error)) {
      console.error("[cinevo-theme] Could not read the published site theme", error);
    }
    return null;
  }
}
