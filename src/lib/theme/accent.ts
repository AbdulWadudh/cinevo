export const WHITE = { r: 255, g: 255, b: 255 };

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

export function parseHex(hex: string): Rgb | null {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return null;
  const value = parseInt(match[1], 16);
  return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 };
}

export function toHex({ r, g, b }: Rgb): string {
  return `#${[r, g, b].map((channel) => Math.round(channel).toString(16).padStart(2, "0")).join("")}`;
}

export function mix(color: Rgb, target: Rgb, amount: number): Rgb {
  return {
    r: color.r + (target.r - color.r) * amount,
    g: color.g + (target.g - color.g) * amount,
    b: color.b + (target.b - color.b) * amount,
  };
}

function luminance({ r, g, b }: Rgb): number {
  const channel = (value: number) => {
    const s = value / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrastOnWhite(color: Rgb): number {
  return 1.05 / (luminance(color) + 0.05);
}

/** Darken until white labels clear WCAG AA on solid accent fills. */
function solidFromAccent(accent: Rgb): Rgb {
  let candidate = accent;
  for (let step = 0; step < 20 && contrastOnWhite(candidate) < 4.6; step += 1) {
    candidate = mix(candidate, { r: 0, g: 0, b: 0 }, 0.06);
  }
  return candidate;
}

/** Primary plus the derived shades the shell needs to stay legible. */
export function accentDelta(hex: string) {
  const parsed = parseHex(hex);
  if (!parsed) return null;

  const solid = solidFromAccent(parsed);
  const hoverCandidate = mix(solid, WHITE, 0.08);
  const solidHover = contrastOnWhite(hoverCandidate) >= 4.5 ? hoverCandidate : solid;

  return {
    primary: toHex(parsed),
    primaryHover: toHex(mix(parsed, WHITE, 0.14)),
    accentStrong: toHex(solid),
    accentStrongHover: toHex(solidHover),
    accentRgb: `${parsed.r}, ${parsed.g}, ${parsed.b}`,
  };
}
