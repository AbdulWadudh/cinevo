/**
 * Vendored from @k79/theme-studio v1.0.0 (MIT © Zenith Theme contributors).
 * Every value that reaches CSS is validated, so a tampered cookie cannot
 * inject declarations or break out of the custom-property assignment.
 */

const CSS_SAFE_VALUE_REGEX = /^([a-zA-Z0-9.,%#\s()'"_-]+)$/;

export function sanitizeCssValue(value: string | undefined): string {
  if (!value || typeof value !== "string") return "";
  const trimmed = value.trim();

  if (/expression|javascript:|behavior|url\(/i.test(trimmed) || /[;<>{}]/.test(trimmed)) {
    return "";
  }

  return CSS_SAFE_VALUE_REGEX.test(trimmed) ? trimmed : "";
}

export function safeMergeTokens<T extends Record<string, unknown>>(
  target: T,
  source?: Partial<T>,
): T {
  if (!source) return { ...target };
  const out: Record<string, unknown> = { ...target };

  for (const key of Object.keys(source)) {
    if (key === "__proto__" || key === "constructor" || key === "prototype") continue;
    const val = source[key];
    if (typeof val === "string") {
      const sanitized = sanitizeCssValue(val);
      if (sanitized) out[key] = sanitized;
    }
  }

  return out as T;
}
