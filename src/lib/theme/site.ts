import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import {
  DEFAULT_DETAIL_LAYOUT_ID,
  isDetailLayoutId,
  type DetailLayoutId,
} from "./detail-layouts";
import { DEFAULT_EXPERIENCE_ID, EXPERIENCE_IDS } from "./experiences";
import { CUSTOMIZABLE_THEME_KEYS, themePresets } from "./presets";
import { sanitizeCssValue } from "./studio/sanitize";

export const SITE_THEME_ROW_ID = "active";

export type SiteThemeDelta = Record<string, string>;

export interface SiteThemeState {
  themeId: string;
  delta?: SiteThemeDelta;
  experience: string;
  detailLayout: DetailLayoutId;
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

  const { themeId, delta, experience, detailLayout } = input as {
    themeId?: unknown;
    delta?: unknown;
    experience?: unknown;
    detailLayout?: unknown;
  };
  if (typeof themeId !== "string" || !PRESET_IDS.has(themeId)) return null;

  const normalized: SiteThemeDelta = {};
  if (delta && typeof delta === "object" && !Array.isArray(delta)) {
    for (const [key, value] of Object.entries(delta)) {
      if (!CUSTOMIZABLE_KEYS.has(key) || typeof value !== "string") continue;
      const sanitized = sanitizeCssValue(value);
      if (sanitized) normalized[key] = sanitized;
    }
  }

  const normalizedExperience =
    typeof experience === "string" && EXPERIENCE_IDS.includes(experience as never)
      ? experience
      : DEFAULT_EXPERIENCE_ID;

  return {
    themeId,
    experience: normalizedExperience,
    detailLayout: isDetailLayoutId(detailLayout)
      ? detailLayout
      : DEFAULT_DETAIL_LAYOUT_ID,
    ...(Object.keys(normalized).length > 0 ? { delta: normalized } : {}),
  };
}

/** True when the migration that creates the singleton row has not run yet. */
export function isMissingSiteThemeTable(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2021";
}

/**
 * Last theme read successfully from the database. A transient pooler timeout
 * would otherwise drop every visitor back to the shipped palette for a request
 * or two, which read as the site theme "randomly" resetting.
 */
let lastKnownTheme: SiteThemeState | null = null;

export async function getSiteTheme(): Promise<SiteThemeState | null> {
  try {
    const row = await db.siteTheme.findUnique({ where: { id: SITE_THEME_ROW_ID } });
    lastKnownTheme = row
      ? normalizeSiteTheme({
          themeId: row.themeId,
          delta: row.delta,
          experience: row.experience,
          detailLayout: row.detailLayout,
        })
      : null;
    return lastKnownTheme;
  } catch (error) {
    if (!isMissingSiteThemeTable(error)) {
      console.error("[cinevo-theme] Could not read the published site theme", error);
    }
    // Renders must not fail, and a stale-but-real theme beats a flash of the
    // shipped palette. The next successful read replaces this value.
    return lastKnownTheme;
  }
}
