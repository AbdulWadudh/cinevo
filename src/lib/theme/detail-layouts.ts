export const DETAIL_LAYOUT_IDS = ["classic", "stage", "dossier", "console"] as const;

export type DetailLayoutId = (typeof DETAIL_LAYOUT_IDS)[number];

export const DEFAULT_DETAIL_LAYOUT_ID: DetailLayoutId = "classic";

export interface DetailLayoutDefinition {
  id: DetailLayoutId;
  name: string;
  description: string;
}

export const DETAIL_LAYOUTS: DetailLayoutDefinition[] = [
  {
    id: "classic",
    name: "Classic",
    description: "The original Cinevo page: full-width player, then title, actions and rows.",
  },
  {
    id: "stage",
    name: "Stage",
    description: "Full-bleed cinema: artwork, title and player in one continuous frame.",
  },
  {
    id: "dossier",
    name: "Dossier",
    description: "Editorial feature: a pinned poster beside a long-form spec sheet.",
  },
  {
    id: "console",
    name: "Console",
    description: "TV-first control room: player, action rail and a tabbed deck.",
  },
];

export function isDetailLayoutId(value: unknown): value is DetailLayoutId {
  return (
    typeof value === "string" &&
    (DETAIL_LAYOUT_IDS as readonly string[]).includes(value)
  );
}

export function getDetailLayout(id: string | null | undefined): DetailLayoutDefinition {
  return DETAIL_LAYOUTS.find((layout) => layout.id === id) ?? DETAIL_LAYOUTS[0];
}
