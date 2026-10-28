/**
 * Cinevo's "Switch to Experience" presets.
 *
 * An experience is more than a palette: it selects a signature token set and
 * a structural chrome (nav, hero, card geometry, motion). Theme Studio edits
 * layer on top of the selected experience, so the base look stays faithful
 * until someone deliberately customizes it.
 */

export const EXPERIENCE_IDS = ["cinevo", "netflix", "disney-hotstar", "apple-tv"] as const;

export type ExperienceId = (typeof EXPERIENCE_IDS)[number];

export const DEFAULT_EXPERIENCE_ID: ExperienceId = "cinevo";

export type ExperienceWordmark = "cinevo" | "netflix" | "disney" | "apple";

export interface ExperienceDefinition {
  id: ExperienceId;
  name: string;
  /** Text used by the typographic wordmark in the nav and switcher. */
  brand: string;
  tagline: string;
  description: string;
  /** Shipped palette this experience starts from. */
  paletteId: string;
  wordmark: ExperienceWordmark;
  /** Primary navigation, in the order the real service uses. */
  nav: { label: string; href: string }[];
  hero: {
    badge: string;
    primary: string;
    secondary: string;
    align: "left" | "center";
    /** Auto-rotate interval in ms. */
    interval: number;
    /** Cross-fade duration in ms. */
    fade: number;
  };
  cards: {
    orientation: "portrait" | "landscape";
    /** Tailwind width classes for a row card. */
    width: string;
    showCaption: boolean;
    /** Show the title over the artwork on hover instead of below the card. */
    overlayTitle: boolean;
    /** Delayed hover preview that expands the card into an info panel. */
    previewOnHover: boolean;
    hover: { y: number; scale: number };
  };
  seeAll: string;
  motion: {
    fast: number;
    base: number;
    slow: number;
    spring: { stiffness: number; damping: number };
  };
  signals: string[];
}

export const EXPERIENCES: ExperienceDefinition[] = [
  {
    id: "cinevo",
    name: "Cinevo",
    brand: "Cinevo",
    tagline: "The signature cinema",
    description:
      "The shipped Cinevo look: crimson accents, portrait posters and spring-driven rows.",
    paletteId: "cinevo",
    wordmark: "cinevo",
    nav: [
      { label: "Home", href: "/" },
      { label: "Browse", href: "/browse" },
      { label: "Gallery", href: "/gallery" },
      { label: "Mystery", href: "/reveal" },
      { label: "Radio", href: "/radio" },
      { label: "Wishlist", href: "/wishlist" },
      { label: "History", href: "/history" },
    ],
    hero: {
      badge: "Trending Now",
      primary: "Play Now",
      secondary: "Watch Trailer",
      align: "left",
      interval: 7000,
      fade: 450,
    },
    cards: {
      orientation: "portrait",
      width: "w-35 sm:w-45",
      showCaption: true,
      overlayTitle: false,
      previewOnHover: true,
      hover: { y: -6, scale: 1.02 },
    },
    seeAll: "See All",
    motion: {
      fast: 160,
      base: 280,
      slow: 480,
      spring: { stiffness: 400, damping: 25 },
    },
    signals: ["Crimson", "Portrait posters", "Spring rows"],
  },
  {
    id: "netflix",
    name: "Netflix",
    brand: "NETFLIX",
    tagline: "Big red, bigger rows",
    description:
      "Pure black billboard, Netflix red, landscape rows and sharp four-pixel corners.",
    paletteId: "netflix",
    wordmark: "netflix",
    nav: [
      { label: "Home", href: "/" },
      { label: "Browse", href: "/browse" },
      { label: "New & Popular", href: "/search" },
      { label: "My List", href: "/wishlist" },
      { label: "Radio", href: "/radio" },
    ],
    hero: {
      badge: "Top 10 in your area today",
      primary: "Play",
      secondary: "More Info",
      align: "left",
      interval: 8000,
      fade: 700,
    },
    cards: {
      orientation: "landscape",
      width: "w-56 sm:w-72",
      showCaption: false,
      overlayTitle: true,
      previewOnHover: true,
      hover: { y: -4, scale: 1.04 },
    },
    seeAll: "Explore All",
    motion: {
      fast: 140,
      base: 240,
      slow: 420,
      spring: { stiffness: 460, damping: 32 },
    },
    signals: ["Billboard hero", "Landscape rows", "Top 10"],
  },
  {
    id: "disney-hotstar",
    name: "Disney+ Hotstar",
    brand: "disney+ hotstar",
    tagline: "Stream the universe",
    description:
      "Deep navy canvas, electric blue action, rounded tiles and a content-hub rhythm.",
    paletteId: "disney-hotstar",
    wordmark: "disney",
    nav: [
      { label: "Home", href: "/" },
      { label: "Search", href: "/search" },
      { label: "Watchlist", href: "/wishlist" },
      { label: "Movies", href: "/browse" },
      { label: "Series", href: "/browse" },
      { label: "Brands", href: "/#brands" },
    ],
    hero: {
      badge: "New on Cinevo",
      primary: "Play",
      secondary: "Trailer",
      align: "left",
      interval: 6500,
      fade: 600,
    },
    cards: {
      orientation: "portrait",
      width: "w-33 sm:w-39",
      showCaption: false,
      overlayTitle: false,
      previewOnHover: false,
      hover: { y: -6, scale: 1.04 },
    },
    seeAll: "View All",
    motion: {
      fast: 170,
      base: 300,
      slow: 520,
      spring: { stiffness: 380, damping: 28 },
    },
    signals: ["Navy canvas", "Electric blue", "Rounded tiles"],
  },
  {
    id: "apple-tv",
    name: "Apple TV+",
    brand: "tv+",
    tagline: "Every story. Every screen.",
    description:
      "Pure black, frosted glass, a centered cinematic hero and deliberately slow fades.",
    paletteId: "apple-tv",
    wordmark: "apple",
    nav: [
      { label: "Home", href: "/" },
      { label: "TV Shows", href: "/browse" },
      { label: "Movies", href: "/browse" },
      { label: "Watchlist", href: "/wishlist" },
      { label: "Search", href: "/search" },
    ],
    hero: {
      badge: "Cinevo Original",
      primary: "Play",
      secondary: "Watch Trailer",
      align: "center",
      interval: 9000,
      fade: 1000,
    },
    cards: {
      orientation: "landscape",
      width: "w-56 sm:w-72",
      showCaption: true,
      overlayTitle: false,
      previewOnHover: false,
      hover: { y: -8, scale: 1.03 },
    },
    seeAll: "See All",
    motion: {
      fast: 220,
      base: 380,
      slow: 700,
      spring: { stiffness: 300, damping: 30 },
    },
    signals: ["Frosted glass", "Centered hero", "Cinematic fades"],
  },
];

const EXPERIENCE_BY_ID = new Map(EXPERIENCES.map((experience) => [experience.id, experience]));

export function isExperienceId(value: unknown): value is ExperienceId {
  return typeof value === "string" && EXPERIENCE_IDS.includes(value as ExperienceId);
}

export function getExperience(id: string | undefined | null): ExperienceDefinition {
  return (
    (id ? EXPERIENCE_BY_ID.get(id as ExperienceId) : undefined) ??
    EXPERIENCE_BY_ID.get(DEFAULT_EXPERIENCE_ID)!
  );
}
