const name = "Cinevo";
const slug = "cinevo";
const emailDomain = "cinevo.app";
const copyrightYear = 2026;

export const site = {
  name,
  slug,

  /** Short marketing sub-text / tagline. */
  tagline: "Stream Movies & TV Shows",

  /** Full title, e.g. used as the default <title> and OpenGraph title. */
  title: `${name} — Stream Movies & TV Shows`,
  /** Next.js title template for nested pages, e.g. "Search · Cinevo". */
  titleTemplate: `%s · ${name}`,

  description: {
    short: "Premium, ad-suppressed streaming of movies and TV series.",
    long: "Experience premium, ad-free streaming of your favorite movies and TV series with restricted ad suppression sandboxing.",
  },

  copyright: `© ${copyrightYear} ${name}. All rights reserved.`,

  emails: {
    support: `support@${emailDomain}`,
    admin: `admin@${emailDomain}`,
  },
  /** `mailto:` subject for web-push (VAPID) — falls back to this when unset. */
  pushSubject: `mailto:admin@${emailDomain}`,

  /** Synthetic email domain for users an identity provider gives no email. */
  localEmailDomain: `${slug}.local`,
  /** Default display name when none is available. */
  defaultUsername: `${name} User`,

  /** Brand image assets (served from /public). */
  logo: {
    mark: "/logo.png",
    full: "/full_logo.png",
  },
} as const;

/**
 * Prefix for every app-owned localStorage key, e.g. "cinevo:".
 * Derived from `slug` so renaming the app namespaces its storage automatically.
 */
export const STORAGE_PREFIX = `${slug}:`;

/**
 * Build a namespaced localStorage key — `storageKey("genres:v1")`
 * → "cinevo:genres:v1". Use this instead of hardcoding the prefix so an
 * app rename never cascades into dozens of string literals.
 */
export function storageKey(name: string): string {
  return `${STORAGE_PREFIX}${name}`;
}
