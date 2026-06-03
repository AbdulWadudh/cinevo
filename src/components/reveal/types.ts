// Shared shape for a revealed card (used by client components + server actions).
export interface RevealItem {
  id: number;
  mediaType: "movie" | "tv";
  title: string;
  poster: string | null;
  rating: number;
  year: string;
}

export interface RevealPreference {
  mediaType: "movie" | "tv";
  genres: string[];
  language?: string;
  yearFrom?: string;
  yearTo?: string;
}
