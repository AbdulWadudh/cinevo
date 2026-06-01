"use server";

import { tmdb, TMDBMedia, MediaSource, DiscoverFilters } from "@/lib/tmdb";

/**
 * Server Action for the /browse discover grid — filtered + paginated.
 */
export async function discoverMediaAction(
  filters: DiscoverFilters,
  page: number
): Promise<{ success: boolean; data: TMDBMedia[]; totalPages: number }> {
  try {
    const { results, totalPages } = await tmdb.discover(filters, page);
    return { success: true, data: results, totalPages };
  } catch (error) {
    console.error("Failed to discover media:", error);
    return { success: false, data: [], totalPages: 0 };
  }
}

/**
 * Server Action to search or discover movies dynamically by TMDb genre ID
 */
export async function getMoviesByGenreAction(genreId: string): Promise<{ success: boolean; data: TMDBMedia[] }> {
  try {
    let list: TMDBMedia[] = [];
    if (genreId === "") {
      list = await tmdb.getTrending("movie");
    } else {
      list = await tmdb.getByGenre(genreId, "movie");
    }
    return { success: true, data: list };
  } catch (error) {
    console.error("Failed to load genre movies:", error);
    return { success: false, data: [] };
  }
}

/**
 * Server Action to load a specific page of genre results (for "Load More" browsing)
 */
export async function loadGenrePageAction(
  genreId: string,
  type: "movie" | "tv",
  page: number
): Promise<{ success: boolean; data: TMDBMedia[]; totalPages: number }> {
  try {
    const { results, totalPages } = await tmdb.getByGenrePaged(genreId, type, page);
    return { success: true, data: results, totalPages };
  } catch (error) {
    console.error("Failed to load genre page:", error);
    return { success: false, data: [], totalPages: 0 };
  }
}

/**
 * Server Action to load a page from any media row source (for "See All → Load More")
 */
export async function loadMediaPageAction(
  source: MediaSource,
  page: number
): Promise<{ success: boolean; data: TMDBMedia[]; totalPages: number }> {
  try {
    const { results, totalPages } = await tmdb.fetchMediaPage(source, page);
    return { success: true, data: results, totalPages };
  } catch (error) {
    console.error("Failed to load media page:", error);
    return { success: false, data: [], totalPages: 0 };
  }
}

/**
 * Server Action to search movies, TV shows, directors, actors, etc.
 */
export async function searchMediaAction(query: string): Promise<{ success: boolean; data: TMDBMedia[] }> {
  try {
    if (!query || query.trim() === "") {
      return { success: true, data: [] };
    }
    const data = await tmdb.search(query);
    return { success: true, data };
  } catch (error) {
    console.error("Failed to search TMDb:", error);
    return { success: false, data: [] };
  }
}

/**
 * Server Action to fetch an actor's combined credits (filmography)
 */
export async function getPersonCreditsAction(personId: string): Promise<{ success: boolean; data: TMDBMedia[] }> {
  try {
    const data = await tmdb.getPersonCredits(personId);
    return { success: true, data };
  } catch (error) {
    console.error("Failed to fetch person credits:", error);
    return { success: false, data: [] };
  }
}

/**
 * Server Action to fetch TV season details (with all episodes) dynamically
 */
export async function getSeasonDetailsAction(seriesId: string, seasonNumber: number): Promise<{ success: boolean; data: any }> {
  try {
    const data = await tmdb.getSeasonDetails(seriesId, seasonNumber);
    return { success: true, data };
  } catch (error) {
    console.error("Failed to load season details:", error);
    return { success: false, data: null };
  }
}
