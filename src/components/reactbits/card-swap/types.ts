import type { CSSProperties, ReactNode } from "react";

export interface CardSwapHandle {
  next: () => void;
  prev: () => void;
}

export interface CardSwapProps {
  width?: number;
  height?: number;
  cardDistance?: number;
  verticalDistance?: number;
  depth?: number;
  skewAmount?: number;
  visibleCards?: number;
  delay?: number;
  autoplay?: boolean;
  pauseOnHover?: boolean;
  draggable?: boolean;
  speed?: number;
  bounce?: number;
  parallax?: number;
  hoverSpread?: number;
  dim?: number;
  cardRadius?: number;
  intro?: boolean;
  theme?: "dark" | "light";
  onCardClick?: (index: number) => void;
  onChange?: (index: number) => void;
  className?: string;
  children?: ReactNode;
}

export type Axis = "x" | "y" | "z" | "r" | "p";

export type Vec = { x: number; y: number };

export type Pose = Record<Axis, number>;

export interface Bounds {
  width: number;
  height: number;
  originX: number;
  originY: number;
}

export interface BoundsInput {
  width: number;
  height: number;
  cardDistance: number;
  verticalDistance: number;
  depth: number;
  skewAmount: number;
  visible: number;
  hoverSpread: number;
}

export interface Settings {
  width: number;
  height: number;
  dx: number;
  dy: number;
  dz: number;
  skew: number;
  visible: number;
  delay: number;
  autoplay: boolean;
  pauseOnHover: boolean;
  draggable: boolean;
  speed: number;
  bounce: number;
  parallax: number;
  hoverSpread: number;
  dim: number;
  intro: boolean;
  bounds: Bounds;
  onCardClick?: (index: number) => void;
  onChange?: (index: number) => void;
}

export interface DeckCard extends Pose {
  el: HTMLDivElement | null;
  shade: HTMLSpanElement | null;
  index: number;
  pos: number;
  from: number;
  hold: number;
  nudge: number;
  phase: "rest" | "exit" | "enter" | "drag";
  dir: Vec;
  tilt: number;
  top: number;
  under: boolean;
  v: Pose;
}

export interface DragState {
  id: number;
  index: number;
  startX: number;
  startY: number;
  active: boolean;
  samples: { x: number; y: number; t: number }[];
}

export interface EngineState {
  order: number[];
  raf: number;
  last: number;
  timer: number;
  queue: number[];
  layers: number;
  scale: number;
  hovered: boolean;
  overCard: boolean;
  inView: boolean;
  drag: DragState | null;
  spread: number;
  spreadV: number;
  px: number;
  py: number;
  pvx: number;
  pvy: number;
  tx: number;
  ty: number;
  dragged: boolean;
  autoplay: boolean;
  delay: number;
}

export interface ShiftOptions {
  dir?: Vec;
  tilt?: number;
  velocity?: Vec;
}

export interface SwapApi {
  next: () => void;
  prev: () => void;
  refresh: () => void;
}

export interface SwapEngine extends SwapApi {
  destroy: () => void;
}

export interface SwapStyles {
  rootStyle: CSSProperties;
}
