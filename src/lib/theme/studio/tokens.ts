/**
 * Vendored from @k79/theme-studio v1.0.0 (MIT © Zenith Theme contributors).
 * camelCase token names become kebab-case custom properties:
 * accentStrong → --accent-strong, textPrimary → --text-primary.
 */

import { safeMergeTokens, sanitizeCssValue } from "./sanitize";
import type { BaseTokens, ThemeDefinition } from "./types";

export function tokensToCssVars(
  tokens: Record<string, string | undefined>,
): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const [key, val] of Object.entries(tokens)) {
    if (!val) continue;
    const sanitized = sanitizeCssValue(val);
    if (!sanitized) continue;
    const cssVarKey = `--${key.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase()}`;
    vars[cssVarKey] = sanitized;
  }

  if (tokens.radius && !vars["--radius-card"]) {
    vars["--radius-card"] = sanitizeCssValue(tokens.radius) || tokens.radius;
  }

  return vars;
}

export function tokensToCssString(tokens: Record<string, string | undefined>): string {
  return Object.entries(tokensToCssVars(tokens))
    .map(([key, value]) => `${key}:${value};`)
    .join("");
}

export function resolveActiveTokens<T extends BaseTokens>(
  preset: ThemeDefinition<T>,
  delta?: Partial<T>,
): T {
  return delta ? safeMergeTokens({ ...preset.tokens }, delta) : { ...preset.tokens };
}
