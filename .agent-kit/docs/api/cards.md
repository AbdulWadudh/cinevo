# cards — effects, the hero deck and the hover preview

Signatures only. Bodies belong in the source. Which card carries the decay border is
[../CARD_SURFACES.md](../CARD_SURFACES.md).

### `src/lib/theme/card-effects.ts`

```ts
export const CARD_EFFECT_IDS = ["none", "decay"] as const;
export type CardEffectId = (typeof CARD_EFFECT_IDS)[number];
export const HERO_EFFECT_IDS = ["none", "swap"] as const;
export type HeroEffectId = (typeof HERO_EFFECT_IDS)[number];
export const DECAY_RING_MIN = 1;
export const DECAY_RING_MAX = 12;
export const DEFAULT_DECAY_RING = 2;
export function isCardEffectId(value: unknown): value is CardEffectId;
export function isHeroEffectId(value: unknown): value is HeroEffectId;
export function isDecayRing(value: unknown): value is number;
export function clampDecayRing(value: unknown): number;
```

### `src/components/reactbits/card-swap/`

```ts
export default function CardSwap(props: CardSwapProps): ReactNode;
export interface CardSwapHandle { next(): void; prev(): void }
export interface CardSwapProps {
  width?: number; height?: number; cardDistance?: number; verticalDistance?: number;
  depth?: number; skewAmount?: number; visibleCards?: number; delay?: number;
  autoplay?: boolean; pauseOnHover?: boolean; draggable?: boolean; speed?: number;
  bounce?: number; parallax?: number; hoverSpread?: number; dim?: number;
  cardRadius?: number; intro?: boolean; theme?: "dark" | "light";
  onCardClick?: (index: number) => void; onChange?: (index: number) => void;
  className?: string; children?: ReactNode;
}
```

### `src/components/hover/` — the shared hover preview

```ts
export function useHoverPopover(options: {
  enabled?: boolean; minWidth?: number; maxWidth?: number; widthFactor?: number;
  headerRatio?: number; estimatedBody: number; onOpen?: () => void;
}): HoverPopoverState;

export interface HoverPopoverLayout { width: number; left: number; top: number; originX: number; originY: number }
export interface HoverPopoverState {
  hostRef: RefObject<HTMLDivElement | null>; panelRef: RefObject<HTMLDivElement | null>;
  layout: HoverPopoverLayout | null;
  schedule(): void; closeSoon(event?: React.PointerEvent): void;
  keepOpen(event?: React.PointerEvent): void; dismiss(): void;
}

export interface TitlePreview { overview: string; genres: string[]; certification: string; runtime: string; cast: PreviewCastMember[] }
export interface PersonPreview {
  biography: string; birthday: string | null; deathday: string | null;
  placeOfBirth: string | null; knownForDepartment: string | null; knownFor: PersonKnownFor[];
}

export default function TitleHoverCard(props: {
  item: TMDBMedia; mediaType: "movie" | "tv"; href: string;
  enabled?: boolean; className?: string; children: ReactNode;
}): ReactNode;

export default function PersonHoverCard(props: {
  personId: number; name: string; character?: string; profilePath: string | null;
  enabled?: boolean; className?: string; children: ReactNode;
}): ReactNode;

export default function Skeleton(props: { className?: string }): ReactNode;
```
