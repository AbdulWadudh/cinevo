/**
 * Adapted from @k79/theme-studio v1.0.0 (MIT © Zenith Theme contributors).
 * Fonts are fetched on demand from Fontsource's CDN, with Google Fonts as the
 * fallback, so a chosen face costs nothing until someone selects it. The two
 * faces Cinevo already ships through next/font stay bundled and are never
 * fetched again.
 */

const loaded = new Set<string>();

const BUNDLED: Record<string, string> = {
  "plus jakarta sans": "var(--font-plus-jakarta), 'Plus Jakarta Sans', sans-serif",
  geist: "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif",
};

export interface FontOption {
  id: string;
  family: string;
  category: "sans-serif" | "serif" | "monospace";
  stack: string;
}

const familyStack = (family: string, category: FontOption["category"]) =>
  `'${family}', ${category === "monospace" ? "ui-monospace, monospace" : category === "serif" ? "ui-serif, Georgia, serif" : "ui-sans-serif, system-ui, sans-serif"}`;

export const FONT_OPTIONS: FontOption[] = [
  { id: "plus-jakarta-sans", family: "Plus Jakarta Sans", category: "sans-serif", stack: BUNDLED["plus jakarta sans"] },
  { id: "geist", family: "Geist", category: "sans-serif", stack: BUNDLED.geist },
  { id: "inter", family: "Inter", category: "sans-serif", stack: familyStack("Inter", "sans-serif") },
  { id: "outfit", family: "Outfit", category: "sans-serif", stack: familyStack("Outfit", "sans-serif") },
  { id: "space-grotesk", family: "Space Grotesk", category: "sans-serif", stack: familyStack("Space Grotesk", "sans-serif") },
  { id: "manrope", family: "Manrope", category: "sans-serif", stack: familyStack("Manrope", "sans-serif") },
  { id: "dm-sans", family: "DM Sans", category: "sans-serif", stack: familyStack("DM Sans", "sans-serif") },
  { id: "sora", family: "Sora", category: "sans-serif", stack: familyStack("Sora", "sans-serif") },
  { id: "poppins", family: "Poppins", category: "sans-serif", stack: familyStack("Poppins", "sans-serif") },
  { id: "playfair-display", family: "Playfair Display", category: "serif", stack: familyStack("Playfair Display", "serif") },
  { id: "jetbrains-mono", family: "JetBrains Mono", category: "monospace", stack: familyStack("JetBrains Mono", "monospace") },
  { id: "fira-code", family: "Fira Code", category: "monospace", stack: familyStack("Fira Code", "monospace") },
];

/** First family in a CSS stack, following the two next/font variables we ship. */
export function fontFamilyOf(value: string | undefined): string | null {
  if (!value) return null;
  if (value.includes("--font-plus-jakarta")) return "Plus Jakarta Sans";
  if (value.includes("--font-geist-sans")) return "Geist";
  const first = value.split(",")[0]?.trim().replace(/^['"]|['"]$/g, "");
  return first && first !== "var(--font-body)" && first !== "var(--font-heading)" ? first : null;
}

export function slugify(family: string): string {
  return family
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const CATALOG_URL = "https://api.fontsource.org/v1/fonts";

export interface FontsourceEntry {
  id: string;
  family: string;
  category: string;
  variable: boolean;
  weights: number[];
  styles: string[];
  subsets: string[];
}

let catalogPromise: Promise<FontsourceEntry[]> | null = null;

/** The full Fontsource catalogue, fetched once per page session on demand. */
export function fetchFontsourceCatalog(): Promise<FontsourceEntry[]> {
  if (!catalogPromise) {
    catalogPromise = fetch(CATALOG_URL)
      .then((response) => {
        if (!response.ok) throw new Error(`Fontsource catalogue failed (${response.status})`);
        return response.json() as Promise<FontsourceEntry[]>;
      })
      .then((entries) => entries.filter((entry) => entry.category !== "icons"))
      .catch((error: unknown) => {
        catalogPromise = null;
        throw error;
      });
  }
  return catalogPromise;
}

export function fontsourceStack(family: string, category: string): string {
  const kind = category === "monospace" ? "monospace" : category === "serif" ? "serif" : "sans-serif";
  return familyStack(family, kind);
}

function whenStylesheetFails(link: HTMLLinkElement, next: () => void): void {
  link.onerror = () => {
    link.remove();
    next();
  };
}

export function loadFont(value: string | undefined): void {
  if (typeof document === "undefined") return;
  const family = fontFamilyOf(value);
  if (!family || BUNDLED[family.toLowerCase()]) return;

  const slug = slugify(family);
  if (loaded.has(slug) || document.getElementById(`cinevo-font-${slug}`)) return;
  loaded.add(slug);

  const googleFallback = () => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.id = `cinevo-font-${slug}-google`;
    link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@400;500;600;700&display=swap`;
    document.head.appendChild(link);
  };

  const staticBuild = () => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.id = `cinevo-font-${slug}`;
    link.href = `https://cdn.jsdelivr.net/fontsource/css/${slug}@latest/index.css`;
    whenStylesheetFails(link, googleFallback);
    document.head.appendChild(link);
  };

  // Variable builds carry the whole 100–900 range in one file; static families
  // have no `:vf` package and 404 into the weight-400 index instead.
  const variable = document.createElement("link");
  variable.rel = "stylesheet";
  variable.id = `cinevo-font-${slug}`;
  variable.href = `https://cdn.jsdelivr.net/fontsource/css/${slug}:vf@latest/index.css`;
  whenStylesheetFails(variable, staticBuild);
  document.head.appendChild(variable);
}
