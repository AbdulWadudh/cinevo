import type { CSSProperties } from "react";
import type { Axis, Vec } from "./types";

export const THEMES: Record<"dark" | "light", Record<string, string>> = {
  dark: {
    "--swap-tile": "var(--surface)",
    "--swap-tile-edge": "var(--border)",
    "--swap-tile-highlight": "rgba(255, 255, 255, 0.08)",
    "--swap-shadow":
      "0 30px 60px -24px rgba(0, 0, 0, 0.8), 0 10px 24px -12px rgba(0, 0, 0, 0.55)",
    "--swap-media-edge": "var(--border)",
    "--swap-ink": "var(--fg)",
    "--swap-badge": "rgba(255, 255, 255, 0.08)",
    "--swap-shade": "var(--bg)",
  },
  light: {
    "--swap-tile": "linear-gradient(180deg, #ffffff 0%, #f6f6f8 100%)",
    "--swap-tile-edge": "rgba(24, 24, 27, 0.08)",
    "--swap-tile-highlight": "rgba(255, 255, 255, 1)",
    "--swap-shadow":
      "0 30px 60px -28px rgba(24, 24, 27, 0.35), 0 10px 24px -14px rgba(24, 24, 27, 0.2)",
    "--swap-media-edge": "rgba(24, 24, 27, 0.06)",
    "--swap-ink": "#27272a",
    "--swap-badge": "rgba(24, 24, 27, 0.05)",
    "--swap-shade": "#ffffff",
  },
};

export const PERSPECTIVE = 900;
export const TAU = Math.PI * 2;
export const STEP = 1 / 240;
export const PAD = 32;
export const AXES: Axis[] = ["x", "y", "z", "r", "p"];
export const DOWN: Vec = { x: 0, y: 1 };

export const SIZER_STYLE: CSSProperties = {
  maxWidth: "var(--swap-stage-w)",
  aspectRatio: "var(--swap-ratio)",
};

export const STAGE_STYLE: CSSProperties = {
  width: "var(--swap-stage-w)",
  height: "var(--swap-stage-h)",
  perspective: "900px",
  transform: "translate(-50%, -50%)",
};

export const SLOT_STYLE: CSSProperties = {
  top: "var(--swap-oy)",
  left: "var(--swap-ox)",
  width: "var(--swap-w)",
  height: "var(--swap-h)",
  margin: "calc(var(--swap-h) / -2) 0 0 calc(var(--swap-w) / -2)",
  borderRadius: "var(--swap-radius)",
  boxShadow: "var(--swap-shadow)",
  WebkitBackfaceVisibility: "hidden",
  backfaceVisibility: "hidden",
};

export const SLOT_CLASS =
  "pointer-events-auto absolute isolate touch-pan-y overflow-hidden select-none group-focus-visible/swap:data-front:outline-2 group-focus-visible/swap:data-front:outline-offset-[3px] group-focus-visible/swap:data-front:outline-solid group-focus-visible/swap:data-front:[outline-color:var(--swap-ink)]";

export const TILE_RIM =
  "inset 0 0 0 1px var(--swap-tile-edge), inset 0 1px 0 var(--swap-tile-highlight)";
export const MEDIA_RIM = "inset 0 0 0 1px var(--swap-media-edge)";

export const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));
