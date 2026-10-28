# theme — the per-request answer and the studio module

Signatures only. Bodies belong in the source.

### `src/lib/theme/active.ts` — the theme answer for a request

```ts
export const getActiveThemeState: () => Promise<{
  themeId: string; experience: string; delta: Record<string, string>;
  detailLayout: DetailLayoutId; // cookie `l` → SiteTheme.detailLayout → "stage"
  published: { themeId: string; experience: string; delta: Record<string, string>; fingerprint: string } | null;
  showMismatch: boolean;
  // ... the resolved SSR state from studio/cookie
}>;
```

### `src/lib/theme/detail-layouts.ts`

```ts
export const DETAIL_LAYOUT_IDS: readonly ["stage", "dossier", "console"];
export type DetailLayoutId = (typeof DETAIL_LAYOUT_IDS)[number];
export const DEFAULT_DETAIL_LAYOUT_ID: DetailLayoutId;
export const DETAIL_LAYOUTS: { id: DetailLayoutId; name: string; description: string }[];
export function isDetailLayoutId(value: unknown): value is DetailLayoutId;
export function getDetailLayout(id: string | null | undefined): (typeof DETAIL_LAYOUTS)[number];
```

### `src/lib/theme/experiences.ts`, `presets.ts`, `site.ts`

```ts
export const EXPERIENCE_IDS: readonly ["cinevo", "netflix", "disney-hotstar", "apple-tv"];
export type ExperienceId = (typeof EXPERIENCE_IDS)[number];
export const DEFAULT_EXPERIENCE_ID: ExperienceId;
export function isExperienceId(value: unknown): value is ExperienceId;
export function getExperience(id: string | undefined | null): ExperienceDefinition;

export const DEFAULT_THEME_ID: string;
export const CUSTOMIZABLE_THEME_KEYS: readonly string[];
export const themePresets: ThemeDefinition<CinevoTokens>[];

export const SITE_THEME_ROW_ID = "active";
export function normalizeSiteTheme(input: unknown): SiteThemeState | null;
export function getSiteTheme(): Promise<SiteThemeState | null>;
export function isMissingSiteThemeTable(error: unknown): boolean;
```

### `src/lib/theme/studio/index.ts`

```ts
export { THEME_COOKIE, getSsrThemeState, parseThemeCookie, type SsrThemeState } from "./cookie";
export { ThemeProvider, useTheme } from "./provider";
export { ThemeStyle } from "./theme-style";
export { resolveActiveTokens, tokensToCssVars } from "./tokens";
export type { BaseTokens, CompactCookiePayload, ThemeContextValue, ThemeDefinition } from "./types";
```
