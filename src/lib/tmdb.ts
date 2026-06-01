const TMDB_API_URL = "https://api.themoviedb.org/3";
const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_ACCESS_TOKEN = process.env.TMDB_ACCESS_TOKEN;

// Helper to construct headers with Bearer token
const getHeaders = () => {
  return {
    accept: "application/json",
    Authorization: `Bearer ${TMDB_ACCESS_TOKEN}`,
  };
};

/**
 * Standard optimized fetch wrapper with automatic Next.js RSC caching
 */
async function tmdbFetch<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
  const queryParams = new URLSearchParams({
    api_key: TMDB_API_KEY || "",
    language: "en-US",
    ...params,
  });

  const url = `${TMDB_API_URL}${endpoint}?${queryParams.toString()}`;

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: getHeaders(),
      next: { revalidate: 3600 }, // Cache response for 1 hour
    });

    if (!res.ok) {
      throw new Error(`TMDb API error: ${res.status} ${res.statusText}`);
    }

    return await res.json() as T;
  } catch (error) {
    console.error(`Failed to fetch from TMDb endpoint ${endpoint}:`, error);
    throw error;
  }
}

export interface TMDBMedia {
  id: number;
  title?: string;
  name?: string;
  overview: string;
  poster_path: string;
  backdrop_path: string;
  vote_average: number;
  release_date?: string;
  first_air_date?: string;
  media_type?: "movie" | "tv" | "person";
  genre_ids: number[];
  popularity?: number;
}

export interface TMDBResponse {
  results: TMDBMedia[];
  page?: number;
  total_pages?: number;
}

export interface TMDBPagedResult {
  results: TMDBMedia[];
  page: number;
  totalPages: number;
}

/** Describes where a row's items come from, so "See All" can keep paging the same source. */
export type MediaSource =
  | { kind: "trending"; mediaType: "movie" | "tv" }
  | { kind: "topRated"; mediaType: "movie" | "tv" }
  | { kind: "newReleases"; mediaType: "movie" | "tv" }
  | { kind: "genre"; value: string; mediaType: "movie" | "tv" }
  | { kind: "company"; value: string; mediaType: "movie" | "tv" }
  | { kind: "language"; value: string; mediaType: "movie" | "tv" };

interface TMDBVideo {
  key: string;
  site: string;
  type: string;
  official: boolean;
}

export interface TMDBDetails extends TMDBMedia {
  genres: { id: number; name: string }[];
  runtime?: number;
  episode_run_time?: number[];
  number_of_seasons?: number;
  number_of_episodes?: number;
  tagline?: string;
  seasons?: any[];
  original_language?: string;
  status?: string;
  belongs_to_collection?: { id: number; name: string; poster_path: string | null; backdrop_path: string | null } | null;
}

export interface TMDBPerson {
  id: number;
  name: string;
  biography: string;
  birthday: string | null;
  deathday: string | null;
  place_of_birth: string | null;
  profile_path: string | null;
  known_for_department: string | null;
}

/** Filters accepted by the /browse discover view. */
export interface DiscoverFilters {
  mediaType: "movie" | "tv";
  genre?: string;
  year?: string;
  minRating?: string;
  sortBy?: string;
}

export interface TMDBReview {
  id: string;
  author: string;
  content: string;
  created_at: string;
  author_details: {
    avatar_path: string | null;
    rating: number | null;
  };
}

export interface TMDBReviewResponse {
  results: TMDBReview[];
}

export interface TMDBCast {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
}

export interface TMDBCreditsResponse {
  cast: TMDBCast[];
}

/**
 * High-level TMDb API operations
 */
export const tmdb = {
  // Fetch trending movies and TV shows
  getTrending: async (type: "all" | "movie" | "tv" = "all"): Promise<TMDBMedia[]> => {
    try {
      const data = await tmdbFetch<TMDBResponse>(`/trending/${type}/day`);
      return data.results;
    } catch {
      return [];
    }
  },

  // Fetch highly rated movies
  getTopRated: async (type: "movie" | "tv" = "movie"): Promise<TMDBMedia[]> => {
    try {
      const data = await tmdbFetch<TMDBResponse>(`/${type}/top_rated`);
      return data.results;
    } catch {
      return [];
    }
  },

  // Fetch upcoming/newly released movies or shows
  getNewReleases: async (type: "movie" | "tv" = "movie"): Promise<TMDBMedia[]> => {
    try {
      const data = await tmdbFetch<TMDBResponse>(
        type === "movie" ? "/movie/upcoming" : "/tv/on_the_air"
      );
      return data.results;
    } catch {
      return [];
    }
  },

  // Fetch media details (supports both movies and TV shows)
  getDetails: async (id: string, type: "movie" | "tv" = "movie"): Promise<TMDBDetails | null> => {
    try {
      return await tmdbFetch<TMDBDetails>(`/${type}/${id}`);
    } catch {
      return null;
    }
  },

  // Fetch "more like this" for a specific title. Prefers TMDB's /recommendations
  // (much more relevant) and falls back to /similar when there are none.
  getSimilar: async (id: string, type: "movie" | "tv" = "movie"): Promise<TMDBMedia[]> => {
    try {
      const recs = await tmdbFetch<TMDBResponse>(`/${type}/${id}/recommendations`);
      if (recs.results.length > 0) return recs.results;
      const similar = await tmdbFetch<TMDBResponse>(`/${type}/${id}/similar`);
      return similar.results;
    } catch {
      return [];
    }
  },

  // Fetch cast lists
  getCast: async (id: string, type: "movie" | "tv" = "movie"): Promise<TMDBCast[]> => {
    try {
      const data = await tmdbFetch<TMDBCreditsResponse>(`/${type}/${id}/credits`);
      return data.cast.slice(0, 12); // return top 12 cast members
    } catch {
      return [];
    }
  },

  // Fetch audience reviews
  getReviews: async (id: string, type: "movie" | "tv" = "movie"): Promise<TMDBReview[]> => {
    try {
      const data = await tmdbFetch<TMDBReviewResponse>(`/${type}/${id}/reviews`);
      return data.results.slice(0, 4); // return top 4 reviews
    } catch {
      return [];
    }
  },

  // Fetch media by genre (first page only — used by the inline browse filter)
  getByGenre: async (genreId: string, type: "movie" | "tv" = "movie"): Promise<TMDBMedia[]> => {
    try {
      const data = await tmdbFetch<TMDBResponse>(`/discover/${type}`, {
        with_genres: genreId,
        sort_by: "popularity.desc",
      });
      return data.results;
    } catch {
      return [];
    }
  },

  // Fetch media by genre with pagination metadata (for "load more" browsing)
  getByGenrePaged: async (
    genreId: string,
    type: "movie" | "tv" = "movie",
    page: number = 1
  ): Promise<TMDBPagedResult> => {
    try {
      const data = await tmdbFetch<TMDBResponse>(`/discover/${type}`, {
        with_genres: genreId,
        sort_by: "popularity.desc",
        page: String(page),
      });
      return {
        results: data.results,
        page: data.page ?? page,
        // TMDB caps discover paging at 500 pages.
        totalPages: Math.min(data.total_pages ?? 1, 500),
      };
    } catch {
      return { results: [], page, totalPages: 0 };
    }
  },

  // Fetch media by production company/studio (e.g. Marvel Studios, DC) — accepts a
  // single id or TMDB's OR syntax ("420|7505").
  getByCompany: async (companyIds: string, type: "movie" | "tv" = "movie"): Promise<TMDBMedia[]> => {
    try {
      const data = await tmdbFetch<TMDBResponse>(`/discover/${type}`, {
        with_companies: companyIds,
        sort_by: "popularity.desc",
      });
      return data.results;
    } catch {
      return [];
    }
  },

  // Fetch media by original language (e.g. Bollywood = "hi", Tollywood = "te")
  getByLanguage: async (language: string, type: "movie" | "tv" = "movie"): Promise<TMDBMedia[]> => {
    try {
      const data = await tmdbFetch<TMDBResponse>(`/discover/${type}`, {
        with_original_language: language,
        sort_by: "popularity.desc",
        "vote_count.gte": "30", // filter out obscure low-signal titles
      });
      return data.results;
    } catch {
      return [];
    }
  },

  // Fetch the best YouTube trailer key for a title (null if none available)
  getVideos: async (id: string, type: "movie" | "tv" = "movie"): Promise<string | null> => {
    try {
      const data = await tmdbFetch<{ results: TMDBVideo[] }>(`/${type}/${id}/videos`);
      const yt = data.results.filter((v) => v.site === "YouTube");
      const best =
        yt.find((v) => v.type === "Trailer" && v.official) ||
        yt.find((v) => v.type === "Trailer") ||
        yt.find((v) => v.type === "Teaser") ||
        yt[0];
      return best ? best.key : null;
    } catch {
      return null;
    }
  },

  // Generic paged fetch for any row source — powers "See All → Load More"
  fetchMediaPage: async (source: MediaSource, page: number = 1): Promise<TMDBPagedResult> => {
    const { mediaType } = source;
    let endpoint = "";
    const params: Record<string, string> = { page: String(page) };

    switch (source.kind) {
      case "trending":
        endpoint = `/trending/${mediaType}/day`;
        break;
      case "topRated":
        endpoint = `/${mediaType}/top_rated`;
        break;
      case "newReleases":
        endpoint = mediaType === "movie" ? "/movie/upcoming" : "/tv/on_the_air";
        break;
      case "genre":
        endpoint = `/discover/${mediaType}`;
        params.with_genres = source.value;
        params.sort_by = "popularity.desc";
        break;
      case "company":
        endpoint = `/discover/${mediaType}`;
        params.with_companies = source.value;
        params.sort_by = "popularity.desc";
        break;
      case "language":
        endpoint = `/discover/${mediaType}`;
        params.with_original_language = source.value;
        params.sort_by = "popularity.desc";
        params["vote_count.gte"] = "30";
        break;
    }

    try {
      const data = await tmdbFetch<TMDBResponse>(endpoint, params);
      return {
        results: data.results,
        page: data.page ?? page,
        totalPages: Math.min(data.total_pages ?? 1, 500),
      };
    } catch {
      return { results: [], page, totalPages: 0 };
    }
  },

  // Search media
  search: async (query: string): Promise<TMDBMedia[]> => {
    try {
      const data = await tmdbFetch<TMDBResponse>("/search/multi", { query });
      return data.results.filter(
        (item) =>
          item.media_type === "movie" ||
          item.media_type === "tv" ||
          item.media_type === "person"
      );
    } catch {
      return [];
    }
  },

  // Fetch person combined credits (movies and TV shows they worked in)
  getPersonCredits: async (personId: string): Promise<TMDBMedia[]> => {
    try {
      const data = await tmdbFetch<{ cast: TMDBMedia[] }>(`/person/${personId}/combined_credits`);
      // Sort credits by popularity descending so that famous works appear first
      const sortedCast = data.cast.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
      return sortedCast;
    } catch {
      return [];
    }
  },

  // Fetch TV season details (with all episodes)
  getSeasonDetails: async (seriesId: string, seasonNumber: number): Promise<any | null> => {
    try {
      return await tmdbFetch<any>(`/tv/${seriesId}/season/${seasonNumber}`);
    } catch {
      return null;
    }
  },

  // Fetch a person's profile/biography
  getPerson: async (personId: string): Promise<TMDBPerson | null> => {
    try {
      return await tmdbFetch<TMDBPerson>(`/person/${personId}`);
    } catch {
      return null;
    }
  },

  // Fetch a collection (franchise) with its parts
  getCollection: async (collectionId: string): Promise<{ id: number; name: string; overview: string; backdrop_path: string | null; parts: TMDBMedia[] } | null> => {
    try {
      return await tmdbFetch<{ id: number; name: string; overview: string; backdrop_path: string | null; parts: TMDBMedia[] }>(`/collection/${collectionId}`);
    } catch {
      return null;
    }
  },

  // Discover with arbitrary filters (genre, year, rating, sort) — powers /browse
  discover: async (filters: DiscoverFilters, page: number = 1): Promise<TMDBPagedResult> => {
    const { mediaType } = filters;
    const params: Record<string, string> = {
      sort_by: filters.sortBy || "popularity.desc",
      page: String(page),
      "vote_count.gte": "50",
    };
    if (filters.genre) params.with_genres = filters.genre;
    if (filters.minRating) params["vote_average.gte"] = filters.minRating;
    if (filters.year) {
      if (mediaType === "movie") params.primary_release_year = filters.year;
      else params.first_air_date_year = filters.year;
    }
    try {
      const data = await tmdbFetch<TMDBResponse>(`/discover/${mediaType}`, params);
      return {
        results: data.results,
        page: data.page ?? page,
        totalPages: Math.min(data.total_pages ?? 1, 500),
      };
    } catch {
      return { results: [], page, totalPages: 0 };
    }
  },
};
