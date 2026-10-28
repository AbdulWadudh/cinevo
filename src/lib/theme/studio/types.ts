/**
 * Vendored from @k79/theme-studio v1.0.0 (MIT © Zenith Theme contributors).
 * https://github.com/AbdulWadudh/theme-studio
 *
 * Trimmed to what Cinevo needs: CSS custom-property token resolution, cookie
 * persistence, a zero-flash SSR style and on-demand font loading. The upstream
 * drawer is rebuilt as Cinevo's own floating panel; mode switching and tactile
 * physics are left out because every preset is dark-only and the shell owns
 * its own press feedback.
 */

export interface BaseTokens {
  canvas: string;
  surface: string;
  card: string;
  border: string;
  primary: string;
  secondary: string;
  accent: string;
  success: string;
  danger: string;
  warning?: string;
  textPrimary: string;
  textMuted: string;
  radius: string;
  fontHeading?: string;
  fontBody?: string;
  elevation?: string;
  elevationSm?: string;
  elevationLg?: string;
  elevationXl?: string;
  [key: string]: string | undefined;
}

export interface ThemeDefinition<T extends BaseTokens = BaseTokens> {
  id: string;
  name: string;
  description?: string;
  tokens: T;
}

export interface CompactCookiePayload<T extends BaseTokens = BaseTokens> {
  id: string;
  d?: Partial<T>;
  def?: string;
  /** Experience chrome id ("cinevo", "netflix", "disney-hotstar", "apple-tv"). */
  x?: string;
  /** Details page layout id ("stage", "dossier", "console"). */
  l?: string;
}

export interface ThemeContextValue<T extends BaseTokens = BaseTokens> {
  theme: string;
  tokens: T;
  themes: ThemeDefinition<T>[];
  /** Active structural experience. Studio edits layer on top of its tokens. */
  experience: string;
  /** Active details page layout. */
  detailLayout: string;
  /** The overrides layered on the active preset, if any. */
  customizations?: Partial<T>;
  hasCustomizations: boolean;
  isStudioOpen: boolean;
  openStudio: () => void;
  closeStudio: () => void;
  setTheme: (themeId: string) => void;
  /** Loads an experience's palette and chrome, clearing studio overrides. */
  setExperience: (experienceId: string) => void;
  setDetailLayout: (layoutId: string) => void;
  setCustomTokens: (tokens: Partial<T>) => void;
  clearCustomTokens: (keys: (keyof T)[]) => void;
  resetTheme: () => void;
  /** Applies an exact preset + experience + overrides in one persisted step. */
  applyThemeChoice: (choice: {
    themeId: string;
    experience?: string;
    delta?: Partial<T>;
  }) => void;
}
