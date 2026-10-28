"use server";

import type { PersonPreview, TitlePreview } from "@/components/hover/types";
import type { RevealItem, RevealPreference } from "@/components/reveal/types";
import {
	certificationOf,
	runtimeOf,
	seasonsOf,
} from "@/components/watch/detail/format";
import {
	type DiscoverFilters,
	type MediaSource,
	type TMDBGenre,
	type TMDBMedia,
	type TMDBSeasonDetails,
	tmdb,
} from "@/lib/tmdb";

/**
 * Server Action for the "Pick with Preference" reveal — discovers a pool of
 * titles matching the chosen media type, genres, language and year range.
 */
export async function pickWithPreferenceAction(
	prefs: RevealPreference,
): Promise<{ success: boolean; data: RevealItem[] }> {
	try {
		const results = await tmdb.discoverByPreference(prefs);
		const seen = new Set<number>();
		const items: RevealItem[] = [];
		for (const m of results) {
			if (!m.poster_path || seen.has(m.id)) continue;
			seen.add(m.id);
			items.push({
				id: m.id,
				mediaType: prefs.mediaType,
				title: m.title || m.name || "Untitled",
				poster: m.poster_path,
				rating: m.vote_average ?? 0,
				year: (m.release_date || m.first_air_date || "").split("-")[0] ?? "",
			});
		}
		return { success: true, data: items };
	} catch (error) {
		console.error("Failed to pick with preference:", error);
		return { success: false, data: [] };
	}
}

/**
 * Server Action to fetch the official TMDB genre list for a media type.
 * The result is cached client-side in localStorage (see lib/genres).
 */
export async function getGenresAction(
	type: "movie" | "tv",
): Promise<{ success: boolean; data: TMDBGenre[] }> {
	try {
		const data = await tmdb.getGenres(type);
		return { success: true, data };
	} catch (error) {
		console.error("Failed to fetch genres:", error);
		return { success: false, data: [] };
	}
}

/**
 * Server Action for the poster hover card: the extra file a list item does not
 * carry — certification, genres, running time and the top-billed cast with
 * portraits. `getDetails` is the same cached read the details page makes.
 */
export async function getTitlePreviewAction(
	mediaId: string,
	mediaType: "movie" | "tv",
): Promise<{ success: boolean; data: TitlePreview | null }> {
	try {
		const details = await tmdb.getDetails(mediaId, mediaType);
		if (!details) return { success: false, data: null };
		return {
			success: true,
			data: {
				overview: details.overview || "",
				genres: details.genres.map((genre) => genre.name).slice(0, 4),
				certification: certificationOf(details),
				runtime: mediaType === "tv" ? seasonsOf(details) : runtimeOf(details),
				cast: (details.credits?.cast ?? []).slice(0, 12).map((member) => ({
					id: member.id,
					name: member.name,
					character: member.character,
					profilePath: member.profile_path,
				})),
			},
		};
	} catch (error) {
		console.error("Failed to load title preview:", error);
		return { success: false, data: null };
	}
}

/**
 * Server Action for the cast hover card: the actor's own record plus the four
 * titles they are best known for. `getPersonCredits` is already popularity-
 * sorted, so the poster-bearing head is the useful slice.
 */
export async function getPersonPreviewAction(
	personId: string,
): Promise<{ success: boolean; data: PersonPreview | null }> {
	try {
		const [person, credits] = await Promise.all([
			tmdb.getPerson(personId),
			tmdb.getPersonCredits(personId),
		]);
		if (!person) return { success: false, data: null };
		const rawBio = person.biography || "";
		const seenCredits = new Set<string>();
		const knownFor = credits
			.filter(
				(credit): credit is TMDBMedia & { media_type: "movie" | "tv" } =>
					credit.media_type === "movie" || credit.media_type === "tv",
			)
			.filter((credit) => {
				const key = `${credit.media_type}:${credit.id}`;
				if (!credit.poster_path || seenCredits.has(key)) return false;
				seenCredits.add(key);
				return true;
			})
			.slice(0, 12)
			.map((credit) => ({
				id: credit.id,
				mediaType: credit.media_type,
				title: credit.title || credit.name || "Untitled",
				posterPath: credit.poster_path ?? null,
				year: (credit.release_date || credit.first_air_date || "").slice(0, 4),
			}));
		return {
			success: true,
			data: {
				biography:
					rawBio.length > 800 ? `${rawBio.slice(0, 800).trimEnd()}…` : rawBio,
				birthday: person.birthday,
				deathday: person.deathday,
				placeOfBirth: person.place_of_birth,
				knownForDepartment: person.known_for_department,
				knownFor,
			},
		};
	} catch (error) {
		console.error("Failed to load person preview:", error);
		return { success: false, data: null };
	}
}

/**
 * Server Action for the /browse discover grid — filtered + paginated.
 */
export async function discoverMediaAction(
	filters: DiscoverFilters,
	page: number,
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
 * Server Action to fetch the best YouTube trailer key for a title (on demand,
 * e.g. when a "Watch Trailer" button is clicked).
 */
export async function getTrailerKeyAction(
	mediaId: string,
	mediaType: "movie" | "tv",
): Promise<{ success: boolean; key: string | null }> {
	try {
		const key = await tmdb.getVideos(mediaId, mediaType);
		return { success: true, key };
	} catch (error) {
		console.error("Failed to fetch trailer key:", error);
		return { success: false, key: null };
	}
}

/**
 * Server Action to search or discover movies dynamically by TMDb genre ID
 */
export async function getMoviesByGenreAction(
	genreId: string,
): Promise<{ success: boolean; data: TMDBMedia[] }> {
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
	page: number,
): Promise<{ success: boolean; data: TMDBMedia[]; totalPages: number }> {
	try {
		const { results, totalPages } = await tmdb.getByGenrePaged(
			genreId,
			type,
			page,
		);
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
	page: number,
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
export async function searchMediaAction(
	query: string,
): Promise<{ success: boolean; data: TMDBMedia[] }> {
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
export async function getPersonCreditsAction(
	personId: string,
): Promise<{ success: boolean; data: TMDBMedia[] }> {
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
export async function getSeasonDetailsAction(
	seriesId: string,
	seasonNumber: number,
): Promise<{ success: boolean; data: TMDBSeasonDetails | null }> {
	try {
		const data = await tmdb.getSeasonDetails(seriesId, seasonNumber);
		return { success: true, data };
	} catch (error) {
		console.error("Failed to load season details:", error);
		return { success: false, data: null };
	}
}
