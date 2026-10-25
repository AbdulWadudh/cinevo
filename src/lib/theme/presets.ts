import { accentDelta, mix, parseHex, toHex } from "./accent";
import type { BaseTokens, ThemeDefinition } from "./studio/types";

export type CinevoTokens = BaseTokens & {
  bgElevated: string;
  surfaceHover: string;
  textSecondary: string;
  primaryHover: string;
  accentStrong: string;
  accentStrongHover: string;
  accentRgb: string;
  gold: string;
  blue: string;
  emerald: string;
  fontHeading: string;
  fontBody: string;
  elevation: string;
  elevationSm: string;
  elevationLg: string;
  elevationXl: string;
};

export const DEFAULT_THEME_ID = "cinevo";

/**
 * The only tokens the studio may persist. Cookies are shared across every port
 * on a host, so the SSR reader also requires the payload to name one of our
 * presets *and* declare Cinevo as its family before trusting a delta.
 */
export const CUSTOMIZABLE_THEME_KEYS = [
  "primary",
  "primaryHover",
  "accentStrong",
  "accentStrongHover",
  "accentRgb",
  "canvas",
  "surface",
  "surfaceHover",
  "card",
  "bgElevated",
  "border",
  "textPrimary",
  "textSecondary",
  "textMuted",
  "secondary",
  "accent",
  "success",
  "danger",
  "warning",
  "gold",
  "blue",
  "emerald",
  "radius",
  "fontHeading",
  "fontBody",
  "elevation",
  "elevationSm",
  "elevationLg",
  "elevationXl",
] as const;

export type CinevoThemeKey = (typeof CUSTOMIZABLE_THEME_KEYS)[number];

/** Shape scale keyed off a single `--radius` value, so one control resizes
 *  cards, inputs, dialogs and pills together. Factors reproduce today's sizes
 *  at the 0.75rem default (rounded-md 8px, rounded-lg 12px, rounded-xl 12px). */
export const RADIUS_OPTIONS = [
  { value: "0rem", label: "Sharp" },
  { value: "0.25rem", label: "Crisp" },
  { value: "0.5rem", label: "Compact" },
  { value: "0.625rem", label: "Soft" },
  { value: "0.75rem", label: "Default" },
  { value: "1.25rem", label: "Round" },
] as const;

type Elevation = Pick<CinevoTokens, "elevationSm" | "elevation" | "elevationLg" | "elevationXl">;

interface ElevationPreset {
  id: string;
  label: string;
  tokens: Elevation;
}

const NATURAL_ELEVATION: Elevation = {
  elevationSm: "0 1px 2px 0 rgba(0,0,0,0.05)",
  elevation: "0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)",
  elevationLg: "0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)",
  elevationXl: "0 25px 50px -12px rgba(0,0,0,0.25)",
};

export const ELEVATION_PRESETS: ElevationPreset[] = [
  {
    id: "none",
    label: "Flat",
    tokens: { elevationSm: "none", elevation: "none", elevationLg: "none", elevationXl: "none" },
  },
  {
    id: "subtle",
    label: "Subtle",
    tokens: {
      elevationSm: "0 1px 2px 0 rgba(0,0,0,0.05)",
      elevation: "0 2px 4px -2px rgba(0,0,0,0.08)",
      elevationLg: "0 8px 12px -3px rgba(0,0,0,0.1)",
      elevationXl: "0 16px 24px -6px rgba(0,0,0,0.16)",
    },
  },
  { id: "natural", label: "Natural", tokens: NATURAL_ELEVATION },
  {
    id: "deep",
    label: "Deep",
    tokens: {
      elevationSm: "0 2px 4px 0 rgba(0,0,0,0.2)",
      elevation: "0 8px 12px -3px rgba(0,0,0,0.2)",
      elevationLg: "0 18px 28px -5px rgba(0,0,0,0.28)",
      elevationXl: "0 32px 64px -12px rgba(0,0,0,0.4)",
    },
  },
];

const HARD_ELEVATION: Elevation = {
  elevationSm: "2px 2px 0px 0px #000000",
  elevation: "4px 4px 0px 0px #000000",
  elevationLg: "6px 6px 0px 0px #000000",
  elevationXl: "8px 8px 0px 0px #000000",
};

const FLAT_ELEVATION: Elevation = {
  elevationSm: "none",
  elevation: "none",
  elevationLg: "none",
  elevationXl: "none",
};

const APPLE_ELEVATION: Elevation = {
  elevationSm: "0 1px 2px rgba(0,0,0,0.35)",
  elevation: "0 8px 24px rgba(0,0,0,0.5)",
  elevationLg: "0 20px 60px rgba(0,0,0,0.65)",
  elevationXl: "0 30px 90px rgba(0,0,0,0.8)",
};

const JAKARTA = "var(--font-plus-jakarta)";
const GEIST = "var(--font-geist-sans)";
const SPACE_GROTESK = "'Space Grotesk', ui-sans-serif, system-ui, sans-serif";
const INTER = "'Inter', ui-sans-serif, system-ui, sans-serif";
const ROBOTO = "'Roboto', ui-sans-serif, system-ui, sans-serif";
const APPLE_SYSTEM =
  "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', sans-serif";
const JETBRAINS_MONO = "'JetBrains Mono', ui-monospace, monospace";

interface PresetSeed {
  id: string;
  name: string;
  description: string;
  canvas: string;
  surface: string;
  card: string;
  border: string;
  primary: string;
  secondary: string;
  accent: string;
  success: string;
  danger: string;
  warning: string;
  textPrimary: string;
  textMuted: string;
  radius: string;
  fontHeading?: string;
  fontBody?: string;
  elevation?: Elevation;
}

const shade = (from: string, to: string, amount: number) => {
  const a = parseHex(from);
  const b = parseHex(to);
  return a && b ? toHex(mix(a, b, amount)) : from;
};

/** Builds a full Cinevo token set from the compact shape the upstream studio
 *  presets use, deriving the shades the shell needs but the studio doesn't ship. */
function buildPreset(seed: PresetSeed): ThemeDefinition<CinevoTokens> {
  const accent = accentDelta(seed.primary);
  if (!accent) throw new Error(`Theme preset ${seed.id} has an invalid primary colour`);

  return {
    id: seed.id,
    name: seed.name,
    description: seed.description,
    tokens: {
      canvas: seed.canvas,
      surface: seed.surface,
      card: seed.card,
      border: seed.border,
      bgElevated: shade(seed.canvas, seed.surface, 0.6),
      surfaceHover: seed.card,
      textPrimary: seed.textPrimary,
      textSecondary: shade(seed.textPrimary, seed.textMuted, 0.5),
      textMuted: seed.textMuted,
      secondary: seed.secondary,
      accent: seed.accent,
      success: seed.success,
      danger: seed.danger,
      warning: seed.warning,
      gold: seed.warning,
      blue: seed.accent,
      emerald: seed.success,
      radius: seed.radius,
      fontHeading: seed.fontHeading ?? JAKARTA,
      fontBody: seed.fontBody ?? GEIST,
      ...(seed.elevation ?? NATURAL_ELEVATION),
      ...accent,
    },
  };
}

/**
 * Every preset ships dark-only on purpose: overlays, gradients and scrims across
 * the app are authored against a dark canvas, so a light variant would need a
 * full visual pass rather than a token swap. The studio's upstream library
 * contributes its dark token set for each preset; its `lightTokens` half is
 * deliberately skipped.
 */
export const themePresets: ThemeDefinition<CinevoTokens>[] = [
  {
    id: DEFAULT_THEME_ID,
    name: "Cinevo",
    description: "The signature crimson cinema palette",
    tokens: {
      canvas: "#08080f",
      surface: "#141422",
      card: "#1c1c30",
      border: "#1e1e32",
      primary: "#e53e4f",
      primaryHover: "#f04d5e",
      accentStrong: "#d02f43",
      accentStrongHover: "#db3346",
      accentRgb: "229, 62, 79",
      secondary: "#f59e0b",
      accent: "#2563eb",
      success: "#34d399",
      danger: "#f87171",
      warning: "#f59e0b",
      textPrimary: "#eeeef4",
      textSecondary: "#b0b0c4",
      textMuted: "#8888a4",
      bgElevated: "#0e0e18",
      surfaceHover: "#1c1c30",
      gold: "#f59e0b",
      blue: "#2563eb",
      emerald: "#34d399",
      radius: "0.75rem",
      fontHeading: "var(--font-plus-jakarta)",
      fontBody: "var(--font-geist-sans)",
      ...NATURAL_ELEVATION,
    },
  },
  {
    id: "midnight",
    name: "Midnight",
    description: "Cold-blue projector light on near-black",
    tokens: {
      canvas: "#060b16",
      surface: "#0d1626",
      card: "#142036",
      border: "#1c2c45",
      primary: "#3b82f6",
      primaryHover: "#60a5fa",
      accentStrong: "#1d4ed8",
      accentStrongHover: "#2563eb",
      accentRgb: "59, 130, 246",
      secondary: "#38bdf8",
      accent: "#38bdf8",
      success: "#34d399",
      danger: "#fb7185",
      warning: "#fbbf24",
      textPrimary: "#eef2ff",
      textSecondary: "#b6c2e2",
      textMuted: "#8b9bc0",
      bgElevated: "#0a1220",
      surfaceHover: "#16233a",
      gold: "#fbbf24",
      blue: "#3b82f6",
      emerald: "#34d399",
      radius: "0.75rem",
      fontHeading: "var(--font-plus-jakarta)",
      fontBody: "var(--font-geist-sans)",
      ...NATURAL_ELEVATION,
    },
  },
  {
    id: "verdant",
    name: "Verdant",
    description: "Forest greens with a jade cast",
    tokens: {
      canvas: "#060f0c",
      surface: "#0c1b15",
      card: "#12271e",
      border: "#1a3529",
      primary: "#34d399",
      primaryHover: "#6ee7b7",
      accentStrong: "#047857",
      accentStrongHover: "#0a7a5c",
      accentRgb: "52, 211, 153",
      secondary: "#a3e635",
      accent: "#22d3ee",
      success: "#34d399",
      danger: "#fb7185",
      warning: "#fbbf24",
      textPrimary: "#ecfdf5",
      textSecondary: "#b4cfc3",
      textMuted: "#86a99b",
      bgElevated: "#081410",
      surfaceHover: "#163026",
      gold: "#fbbf24",
      blue: "#22d3ee",
      emerald: "#34d399",
      radius: "0.75rem",
      fontHeading: "var(--font-plus-jakarta)",
      fontBody: "var(--font-geist-sans)",
      ...NATURAL_ELEVATION,
    },
  },
  {
    id: "ember",
    name: "Ember",
    description: "Warm amber haze over charcoal",
    tokens: {
      canvas: "#0d0806",
      surface: "#1a100b",
      card: "#261711",
      border: "#3a2418",
      primary: "#f59e0b",
      primaryHover: "#fbbf24",
      accentStrong: "#b45309",
      accentStrongHover: "#c2610b",
      accentRgb: "245, 158, 11",
      secondary: "#fb923c",
      accent: "#f97316",
      success: "#34d399",
      danger: "#f87171",
      warning: "#fbbf24",
      textPrimary: "#fdf6ec",
      textSecondary: "#cdb9a6",
      textMuted: "#a89483",
      bgElevated: "#150d08",
      surfaceHover: "#2d1c13",
      gold: "#fbbf24",
      blue: "#60a5fa",
      emerald: "#34d399",
      radius: "0.75rem",
      fontHeading: "var(--font-plus-jakarta)",
      fontBody: "var(--font-geist-sans)",
      ...NATURAL_ELEVATION,
    },
  },
  buildPreset({
    id: "dark-slate",
    name: "Dark Slate",
    description: "Precision graphite with electric sky and cyber indigo accents",
    canvas: "#0B0F17",
    surface: "#111827",
    card: "#162032",
    border: "#1E293B",
    primary: "#38BDF8",
    secondary: "#818CF8",
    accent: "#34D399",
    success: "#10B981",
    danger: "#EF4444",
    warning: "#F59E0B",
    textPrimary: "#F8FAFC",
    textMuted: "#94A3B8",
    radius: "0.625rem",
  }),
  buildPreset({
    id: "slate-indigo",
    name: "Slate Indigo",
    description: "Crisp architectural slate with indigo primary and cyan lift",
    canvas: "#090D16",
    surface: "#0F172A",
    card: "#1E293B",
    border: "#334155",
    primary: "#6366F1",
    secondary: "#22D3EE",
    accent: "#FBBF24",
    success: "#10B981",
    danger: "#EF4444",
    warning: "#F59E0B",
    textPrimary: "#F8FAFC",
    textMuted: "#94A3B8",
    radius: "0.5rem",
  }),
  buildPreset({
    id: "obsidian-cyber",
    name: "Obsidian Cyber",
    description: "Deep obsidian black with neon violet and fuchsia glow",
    canvas: "#050508",
    surface: "#0D0D14",
    card: "#141420",
    border: "#232338",
    primary: "#A855F7",
    secondary: "#EC4899",
    accent: "#F59E0B",
    success: "#10B981",
    danger: "#EF4444",
    warning: "#F59E0B",
    textPrimary: "#FAF5FF",
    textMuted: "#A1A1AA",
    radius: "0.5rem",
  }),
  buildPreset({
    id: "cobalt-deep",
    name: "Cobalt Deep",
    description: "Oceanic navy with vibrant electric blues",
    canvas: "#070E1B",
    surface: "#0C1930",
    card: "#112242",
    border: "#1E3A6E",
    primary: "#38BDF8",
    secondary: "#60A5FA",
    accent: "#38BDF8",
    success: "#10B981",
    danger: "#EF4444",
    warning: "#F59E0B",
    textPrimary: "#F0F9FF",
    textMuted: "#7DD3FC",
    radius: "0.75rem",
  }),
  buildPreset({
    id: "neobrutalism",
    name: "Neobrutalism",
    description: "Mechanical borders, hard offset shadows and loud primaries",
    canvas: "#18181B",
    surface: "#27272A",
    card: "#27272A",
    border: "#000000",
    primary: "#3B82F6",
    secondary: "#60A5FA",
    accent: "#F43F5E",
    success: "#00FF66",
    danger: "#FF3366",
    warning: "#FFD026",
    textPrimary: "#FFFFFF",
    textMuted: "#A1A1AA",
    radius: "0.25rem",
    fontHeading: SPACE_GROTESK,
    fontBody: INTER,
    elevation: HARD_ELEVATION,
  }),
  buildPreset({
    id: "midnight-sapphire",
    name: "Midnight Sapphire",
    description: "Deep navy with an electric blue that carries every action",
    canvas: "#060A14",
    surface: "#0C1322",
    card: "#111A2C",
    border: "#1A2438",
    primary: "#3B82F6",
    secondary: "#16203A",
    accent: "#22D3EE",
    success: "#10B981",
    danger: "#EF4444",
    warning: "#F59E0B",
    textPrimary: "#E8EEF9",
    textMuted: "#64748B",
    radius: "1.25rem",
  }),
  buildPreset({
    id: "crimson-ember",
    name: "Crimson Ember",
    description: "Charcoal warmed by ember orange and fiery accents",
    canvas: "#0A0706",
    surface: "#16100E",
    card: "#1D1512",
    border: "#2A1D18",
    primary: "#F2542D",
    secondary: "#241914",
    accent: "#FFB703",
    success: "#10B981",
    danger: "#EF4444",
    warning: "#F59E0B",
    textPrimary: "#F7EDE6",
    textMuted: "#7A6A61",
    radius: "0.75rem",
  }),
  buildPreset({
    id: "verdant-canopy",
    name: "Verdant Canopy",
    description: "Moss, deep canopy greens and lichen highlights",
    canvas: "#05100B",
    surface: "#0C1A12",
    card: "#102117",
    border: "#1A2E20",
    primary: "#4ADE80",
    secondary: "#15281B",
    accent: "#A3E635",
    success: "#10B981",
    danger: "#EF4444",
    warning: "#F59E0B",
    textPrimary: "#E9F5EC",
    textMuted: "#66806F",
    radius: "0.75rem",
  }),
  buildPreset({
    id: "amethyst-haze",
    name: "Amethyst Haze",
    description: "Violet glass over deep plum with neon magenta accents",
    canvas: "#0A0614",
    surface: "#140C24",
    card: "#1A1030",
    border: "#26183F",
    primary: "#A855F7",
    secondary: "#211640",
    accent: "#F472B6",
    success: "#10B981",
    danger: "#EF4444",
    warning: "#F59E0B",
    textPrimary: "#F1EAFF",
    textMuted: "#7A6B9C",
    radius: "1.25rem",
  }),
  buildPreset({
    id: "solar-flare",
    name: "Solar Flare",
    description: "Amber, solar gold and scarlet at full brightness",
    canvas: "#0D0A03",
    surface: "#171105",
    card: "#1F1706",
    border: "#2E2209",
    primary: "#F59E0B",
    secondary: "#261C08",
    accent: "#EF4444",
    success: "#10B981",
    danger: "#EF4444",
    warning: "#F59E0B",
    textPrimary: "#FEF6E4",
    textMuted: "#85775A",
    radius: "0.75rem",
  }),
  buildPreset({
    id: "arctic",
    name: "Arctic",
    description: "Cold slate and glacier cyan with crisp precision edges",
    canvas: "#080C0F",
    surface: "#0F161B",
    card: "#141D24",
    border: "#1E2A33",
    primary: "#38BDF8",
    secondary: "#19242C",
    accent: "#2DD4BF",
    success: "#10B981",
    danger: "#EF4444",
    warning: "#F59E0B",
    textPrimary: "#ECF3F7",
    textMuted: "#667C8A",
    radius: "0.625rem",
  }),
  buildPreset({
    id: "rose-quartz",
    name: "Rose Quartz",
    description: "Soft rose and orchid dusk with rounded fluid curves",
    canvas: "#100A0D",
    surface: "#1B1116",
    card: "#22151B",
    border: "#311F27",
    primary: "#FB7185",
    secondary: "#2A1A21",
    accent: "#C084FC",
    success: "#10B981",
    danger: "#EF4444",
    warning: "#F59E0B",
    textPrimary: "#FCEEF3",
    textMuted: "#8E7280",
    radius: "1.25rem",
  }),
  buildPreset({
    id: "terminal-mono",
    name: "Terminal Mono",
    description: "Phosphor green on pitch black, monospaced throughout",
    canvas: "#000000",
    surface: "#070B07",
    card: "#0A130C",
    border: "#16301B",
    primary: "#22C55E",
    secondary: "#0E1A10",
    accent: "#A3E635",
    success: "#22C55E",
    danger: "#EF4444",
    warning: "#EAB308",
    textPrimary: "#C8F7C5",
    textMuted: "#3F7A48",
    radius: "0rem",
    fontHeading: JETBRAINS_MONO,
    fontBody: JETBRAINS_MONO,
  }),
  buildPreset({
    id: "parchment",
    name: "Parchment",
    description: "Ink on aged warm paper with classical typographic tone",
    canvas: "#12100C",
    surface: "#1B1813",
    card: "#201D17",
    border: "#2E2A22",
    primary: "#C89B3C",
    secondary: "#26221B",
    accent: "#8C6239",
    success: "#10B981",
    danger: "#EF4444",
    warning: "#F59E0B",
    textPrimary: "#F0E9D8",
    textMuted: "#7E7563",
    radius: "0.5rem",
  }),
  buildPreset({
    id: "cyberpunk",
    name: "Cyberpunk Neon",
    description: "Obsidian canvas with high-voltage neon magenta and yellow",
    canvas: "#05050A",
    surface: "#0D0E1A",
    card: "#131424",
    border: "#2A284D",
    primary: "#EC4899",
    secondary: "#EAB308",
    accent: "#06B6D4",
    success: "#00FF66",
    danger: "#FF0033",
    warning: "#FFE600",
    textPrimary: "#FAF5FF",
    textMuted: "#A855F7",
    radius: "0.25rem",
  }),
  buildPreset({
    id: "nord",
    name: "Nord Frost",
    description: "Arctic polar night with aurora teal and frost blues",
    canvas: "#2E3440",
    surface: "#3B4252",
    card: "#434C5E",
    border: "#4C566A",
    primary: "#88C0D0",
    secondary: "#81A1C1",
    accent: "#A3BE8C",
    success: "#A3BE8C",
    danger: "#BF616A",
    warning: "#EBCB8B",
    textPrimary: "#ECEFF4",
    textMuted: "#D8DEE9",
    radius: "0.75rem",
  }),
  {
    id: "netflix",
    name: "Netflix",
    description: "Pure black, signature red and sharp four-pixel corners",
    tokens: {
      canvas: "#000000",
      surface: "#141414",
      card: "#181818",
      border: "#2f2f2f",
      primary: "#e50914",
      primaryHover: "#f6121d",
      accentStrong: "#e50914",
      accentStrongHover: "#f6121d",
      accentRgb: "229, 9, 20",
      secondary: "#b3b3b3",
      accent: "#e50914",
      success: "#46d369",
      danger: "#e50914",
      warning: "#f5c518",
      textPrimary: "#ffffff",
      textSecondary: "#e5e5e5",
      textMuted: "#b3b3b3",
      bgElevated: "#0b0b0b",
      surfaceHover: "#232323",
      gold: "#f5c518",
      blue: "#0b84ff",
      emerald: "#46d369",
      radius: "0.25rem",
      fontHeading: INTER,
      fontBody: INTER,
      ...FLAT_ELEVATION,
    },
  },
  {
    id: "disney-hotstar",
    name: "Disney+ Hotstar",
    description: "Deep navy with electric blue and rounded content tiles",
    tokens: {
      canvas: "#0f1014",
      surface: "#15171e",
      card: "#1b1e27",
      border: "#262a36",
      primary: "#1f80e0",
      primaryHover: "#3b95f5",
      accentStrong: "#0d6ac2",
      accentStrongHover: "#1179d8",
      accentRgb: "31, 128, 224",
      secondary: "#00c6ff",
      accent: "#00c6ff",
      success: "#1a9e5c",
      danger: "#e5484d",
      warning: "#f5a623",
      textPrimary: "#f9f9fb",
      textSecondary: "#c3c7d1",
      textMuted: "#8f95a3",
      bgElevated: "#0a0b0f",
      surfaceHover: "#222633",
      gold: "#f5a623",
      blue: "#1f80e0",
      emerald: "#1a9e5c",
      radius: "0.5rem",
      fontHeading: ROBOTO,
      fontBody: ROBOTO,
      ...NATURAL_ELEVATION,
    },
  },
  {
    id: "apple-tv",
    name: "Apple TV+",
    description: "Cinematic black, frosted glass and pure white action",
    tokens: {
      canvas: "#000000",
      surface: "#1c1c1e",
      card: "#2c2c2e",
      border: "#3a3a3c",
      primary: "#f5f5f7",
      primaryHover: "#ffffff",
      accentStrong: "#ffffff",
      accentStrongHover: "#e8e8ed",
      accentRgb: "245, 245, 247",
      secondary: "#8e8e93",
      accent: "#f5f5f7",
      success: "#30d158",
      danger: "#ff453a",
      warning: "#ffd60a",
      textPrimary: "#ffffff",
      textSecondary: "#c7c7cc",
      textMuted: "#8e8e93",
      bgElevated: "#101011",
      surfaceHover: "#333336",
      gold: "#ffd60a",
      blue: "#0a84ff",
      emerald: "#30d158",
      radius: "0.75rem",
      fontHeading: APPLE_SYSTEM,
      fontBody: APPLE_SYSTEM,
      ...APPLE_ELEVATION,
    },
  },
];
