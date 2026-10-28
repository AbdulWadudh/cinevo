import type {
  TMDBCast,
  TMDBDetails,
  TMDBMedia,
  TMDBWatchProviders,
} from "@/lib/tmdb";

export interface DetailLayoutProps {
  details: TMDBDetails;
  cast: TMDBCast[];
  similar: TMDBMedia[];
  watchProviders: TMDBWatchProviders | null;
  mediaId: string;
  mediaType: "movie" | "tv";
  season: number;
  episode: number;
  preview: boolean;
  initialTime: number;
  initialSourceKey?: string;
  initialSandbox?: "strict" | "balanced" | "off";
  wishlistExists: boolean;
  tabQuery: string;
  view: string;
  bgGradientClass: string;
  backButtonBorderClass: string;
  tagHoverClass: string;
}

export interface DetailFact {
  label: string;
  value: string;
}

export interface DetailLink {
  label: string;
  href: string;
}
