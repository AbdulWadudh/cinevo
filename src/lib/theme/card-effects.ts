export const CARD_EFFECT_IDS = ["none", "decay"] as const;

export type CardEffectId = (typeof CARD_EFFECT_IDS)[number];

export const DEFAULT_CARD_EFFECT_ID: CardEffectId = "none";

export const HERO_EFFECT_IDS = ["none", "swap"] as const;

export type HeroEffectId = (typeof HERO_EFFECT_IDS)[number];

export const DEFAULT_HERO_EFFECT_ID: HeroEffectId = "none";

export const DECAY_RING_MIN = 1;
export const DECAY_RING_MAX = 12;
export const DEFAULT_DECAY_RING = 2;
export const CARD_DISTANCE_MIN = 0;
export const CARD_DISTANCE_MAX = 200;
export const DEFAULT_CARD_DISTANCE = 50;

export interface EffectDefinition<T extends string> {
  id: T;
  name: string;
  description: string;
}

export const CARD_EFFECTS: EffectDefinition<CardEffectId>[] = [
  {
    id: "none",
    name: "Standard",
    description: "A still poster with the hover preview and its controls.",
  },
  {
    id: "decay",
    name: "Decay",
    description: "An always-on eaten accent border; the ring follows the pointer and the poster stays whole.",
  },
];

export const HERO_EFFECTS: EffectDefinition<HeroEffectId>[] = [
  {
    id: "none",
    name: "Standard",
    description: "The shipped hero carousel: one full-width slide at a time.",
  },
  {
    id: "swap",
    name: "Card swap",
    description: "A full-width 3D deck of the same hero slides, trailer and details in each card.",
  },
];

export function isCardEffectId(value: unknown): value is CardEffectId {
  return (
    typeof value === "string" &&
    (CARD_EFFECT_IDS as readonly string[]).includes(value)
  );
}

export function isHeroEffectId(value: unknown): value is HeroEffectId {
  return (
    typeof value === "string" &&
    (HERO_EFFECT_IDS as readonly string[]).includes(value)
  );
}

export function getCardEffect(id: string | null | undefined): EffectDefinition<CardEffectId> {
  return CARD_EFFECTS.find((effect) => effect.id === id) ?? CARD_EFFECTS[0];
}

export function getHeroEffect(id: string | null | undefined): EffectDefinition<HeroEffectId> {
  return HERO_EFFECTS.find((effect) => effect.id === id) ?? HERO_EFFECTS[0];
}

export function isDecayRing(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= DECAY_RING_MIN &&
    value <= DECAY_RING_MAX
  );
}

export function clampDecayRing(value: unknown): number {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number)) return DEFAULT_DECAY_RING;
  return Math.min(DECAY_RING_MAX, Math.max(DECAY_RING_MIN, Math.round(number)));
}

export function isCardDistance(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= CARD_DISTANCE_MIN &&
    value <= CARD_DISTANCE_MAX
  );
}

export function clampCardDistance(value: unknown): number {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number)) return DEFAULT_CARD_DISTANCE;
  return Math.min(CARD_DISTANCE_MAX, Math.max(CARD_DISTANCE_MIN, Math.round(number)));
}
