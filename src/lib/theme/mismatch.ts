import { CUSTOMIZABLE_THEME_KEYS } from "./presets";

/** Cookie holding the published-theme fingerprint a visitor chose to ignore. */
export const THEME_SKIP_COOKIE = "cinevo_theme_skip";

const SKIP_MAX_AGE = 60 * 60 * 24 * 365;
const CUSTOMIZABLE = new Set<string>(CUSTOMIZABLE_THEME_KEYS);

export interface ThemeChoice {
  themeId: string;
  experience: string;
  delta?: Record<string, string>;
}

/** Drops anything a theme cookie or a stale row could not legitimately carry. */
export function normalizeThemeDelta(delta: unknown): Record<string, string> | undefined {
  if (!delta || typeof delta !== "object" || Array.isArray(delta)) return undefined;
  const normalized: Record<string, string> = {};
  for (const [key, value] of Object.entries(delta)) {
    if (!CUSTOMIZABLE.has(key) || typeof value !== "string") continue;
    normalized[key] = value;
  }
  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

function deltasMatch(
  a?: Record<string, string>,
  b?: Record<string, string>,
): boolean {
  const aKeys = Object.keys(a ?? {});
  const bKeys = Object.keys(b ?? {});
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every((key) => a?.[key] === b?.[key]);
}

export function themeChoicesMatch(a: ThemeChoice, b: ThemeChoice): boolean {
  return (
    a.themeId === b.themeId &&
    a.experience === b.experience &&
    deltasMatch(a.delta, b.delta)
  );
}

/** Stable id for one published revision, so Skip only outlives that revision. */
export function themeFingerprint(choice: ThemeChoice): string {
  const delta = choice.delta
    ? Object.keys(choice.delta)
        .sort()
        .map((key) => `${key}:${choice.delta?.[key]}`)
        .join(";")
    : "";
  const canonical = `${choice.themeId}|${choice.experience}|${delta}`;

  let hash = 0x811c9dc5;
  for (let index = 0; index < canonical.length; index += 1) {
    hash ^= canonical.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16);
}

export function readSkipFingerprint(value: string | undefined): string | null {
  return value && /^[0-9a-f]{1,8}$/i.test(value) ? value.toLowerCase() : null;
}

export function writeSkipFingerprint(fingerprint: string): void {
  if (typeof document === "undefined") return;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${THEME_SKIP_COOKIE}=${fingerprint}; path=/; max-age=${SKIP_MAX_AGE}; SameSite=Lax${secure}`;
}
