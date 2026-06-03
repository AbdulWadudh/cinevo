// Effect registry — maps a chooser key to the data-attributes the ported
// pokemon-cards-css stylesheet keys off (data-rarity / data-subtypes /
// data-supertype / data-trainer-gallery). All render procedurally on any poster
// (the "not masked" branches), since we don't use per-card foil masks.

export interface CardEffect {
  key: string;
  label: string;
  rarity: string;
  subtypes?: string;
  supertype?: string;
  gallery?: boolean;
}

export const CARD_EFFECTS: CardEffect[] = [
  { key: "v", label: "V (Holo)", rarity: "rare holo v" },
  { key: "holo", label: "Rare Holo", rarity: "rare holo" },
  { key: "reverse", label: "Reverse Holo", rarity: "reverse holo" },
  { key: "cosmos", label: "Cosmos Holo", rarity: "rare holo cosmos" },
  { key: "vmax", label: "VMAX", rarity: "rare holo vmax" },
  { key: "vstar", label: "VSTAR", rarity: "rare holo vstar" },
  { key: "vunion", label: "V-Union", rarity: "rare holo v", subtypes: "v-union" },
  { key: "vfullart", label: "V Full Art", rarity: "rare ultra" },
  { key: "trainerfullart", label: "Trainer Full Art", rarity: "rare ultra", supertype: "trainer" },
  { key: "rainbow", label: "Rainbow Rare", rarity: "rare rainbow" },
  { key: "rainbowalt", label: "Rainbow Alt", rarity: "rare rainbow alt" },
  { key: "secret", label: "Gold Secret", rarity: "rare secret" },
  { key: "amazing", label: "Amazing Rare", rarity: "amazing rare" },
  { key: "radiant", label: "Radiant", rarity: "radiant rare" },
  { key: "shiny", label: "Shiny", rarity: "rare shiny" },
  { key: "shinyv", label: "Shiny V", rarity: "rare shiny v" },
  { key: "shinyvmax", label: "Shiny VMAX", rarity: "rare shiny vmax" },
  { key: "trainergallery", label: "Trainer Gallery", rarity: "trainer gallery rare holo", gallery: true },
];

export const DEFAULT_EFFECT_KEY = "v";

export const getEffect = (key: string): CardEffect =>
  CARD_EFFECTS.find((e) => e.key === key) ?? CARD_EFFECTS[0];
