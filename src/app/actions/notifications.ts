"use server";

import { db } from "@/lib/db";
import { getOrCreateProfile } from "@/lib/auth";
import { tmdb } from "@/lib/tmdb";

export interface EpisodeNotification {
  id: string;            // stable key: `${mediaId}:${season}:${episode}`
  mediaId: string;
  title: string;
  posterPath: string | null;
  season: number;
  episode: number;
  episodeName: string;
  airDate: string;
  kind: "new" | "upcoming";
}

const DAY = 24 * 60 * 60 * 1000;

/**
 * New & upcoming episodes for the TV shows in the user's wishlist. "new" =
 * aired in the last 21 days; "upcoming" = airing within the next 21 days.
 */
export async function getNewEpisodeNotifications(): Promise<EpisodeNotification[]> {
  try {
    const profile = await getOrCreateProfile();
    if (!profile) return [];

    const shows = await db.wishlist.findMany({
      where: { profileId: profile.id, mediaType: "tv" },
      orderBy: { createdAt: "desc" },
      take: 25,
    });
    if (shows.length === 0) return [];

    const now = Date.now();
    const details = await Promise.all(shows.map((s) => tmdb.getDetails(s.mediaId, "tv")));

    const out: EpisodeNotification[] = [];
    details.forEach((d, i) => {
      const show = shows[i];
      const ep = (d as any)?.next_episode_to_air ?? (d as any)?.last_episode_to_air;
      if (!ep?.air_date) return;
      const airMs = new Date(ep.air_date).getTime();
      if (Number.isNaN(airMs)) return;
      const diff = airMs - now;
      const isUpcoming = diff > 0 && diff <= 21 * DAY;
      const isNew = diff <= 0 && diff >= -21 * DAY;
      if (!isUpcoming && !isNew) return;
      out.push({
        id: `${show.mediaId}:${ep.season_number}:${ep.episode_number}`,
        mediaId: show.mediaId,
        title: show.title,
        posterPath: show.posterPath ?? d?.poster_path ?? null,
        season: ep.season_number,
        episode: ep.episode_number,
        episodeName: ep.name || `Episode ${ep.episode_number}`,
        airDate: ep.air_date,
        kind: isUpcoming ? "upcoming" : "new",
      });
    });

    return out.sort((a, b) => new Date(b.airDate).getTime() - new Date(a.airDate).getTime());
  } catch (error) {
    console.error("Failed to load episode notifications:", error);
    return [];
  }
}
