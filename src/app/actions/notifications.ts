"use server";

import { getOrCreateProfile } from "@/lib/auth";
import { computeEpisodeNotifications, type EpisodeNotification } from "@/lib/episodeNotifications";

// NOTE: a "use server" module may only export async functions — the
// EpisodeNotification *type* is exported from "@/lib/episodeNotifications".

/** New & upcoming episodes for the current user's wishlist TV shows. */
export async function getNewEpisodeNotifications(): Promise<EpisodeNotification[]> {
  try {
    const profile = await getOrCreateProfile();
    if (!profile) return [];
    return await computeEpisodeNotifications(profile.id);
  } catch (error) {
    console.error("Failed to load episode notifications:", error);
    return [];
  }
}
