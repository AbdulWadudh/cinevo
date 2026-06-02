"use server";

import { db } from "@/lib/db";
import { getOrCreateProfile } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export interface WatchProgressInput {
  mediaId: string;
  mediaType: "movie" | "tv";
  title: string;
  posterPath?: string;
  season?: number;
  episode?: number;
  progress: number; // in seconds
  duration: number; // in seconds
}

/**
 * Upserts watch progress for a movie or TV show episode.
 * Using a transaction-safe upsert based on the unique compound index.
 */
export async function updateWatchProgress(input: WatchProgressInput) {
  try {
    const profile = await getOrCreateProfile();
    if (!profile) return { success: false, requiresAuth: true };
    // Use 0 as default for movies/undefined to satisfy strict Prisma index typings
    const season = input.season || 0;
    const episode = input.episode || 0;

    const progress = await db.watchProgress.upsert({
      where: {
        profileId_mediaId_mediaType_season: {
          profileId: profile.id,
          mediaId: input.mediaId,
          mediaType: input.mediaType,
          season,
        },
      },
      update: {
        episode,
        progress: input.progress,
        duration: input.duration,
        title: input.title,
        posterPath: input.posterPath || null,
        updatedAt: new Date(),
      },
      create: {
        profileId: profile.id,
        mediaId: input.mediaId,
        mediaType: input.mediaType,
        title: input.title,
        posterPath: input.posterPath || null,
        season,
        episode,
        progress: input.progress,
        duration: input.duration,
      },
    });

    revalidatePath("/");
    revalidatePath("/history");
    return { success: true, data: progress };
  } catch (error) {
    console.error("Failed to update watch progress:", error);
    return { success: false, error: "Failed to update database progress" };
  }
}

/**
 * Fetches all WatchProgress records for a user, sorted by most recently updated first.
 */
export async function getWatchProgressList() {
  try {
    const profile = await getOrCreateProfile();
    if (!profile) return { success: true, data: [] };
    const items = await db.watchProgress.findMany({
      where: {
        profileId: profile.id,
      },
      orderBy: {
        updatedAt: "desc",
      },
    });
    return { success: true, data: items };
  } catch (error) {
    console.error("Failed to fetch watch progress list:", error);
    return { success: false, error: "Failed to load watch progress list" };
  }
}

/**
 * Fetches a single WatchProgress record for a specific media item.
 */
export async function getSingleWatchProgress(
  mediaId: string,
  mediaType: "movie" | "tv",
  season?: number,
  episode?: number
) {
  try {
    const profile = await getOrCreateProfile();
    if (!profile) return { success: true, data: null };
    const s = season || 0;
    const e = episode || 0;

    const record = await db.watchProgress.findUnique({
      where: {
        profileId_mediaId_mediaType_season: {
          profileId: profile.id,
          mediaId,
          mediaType,
          season: s,
        },
      },
    });

    // The season holds a single record for its last-watched episode. Only resume
    // progress when the requested episode is the one we have progress for.
    if (record && record.episode !== e) {
      return { success: true, data: { ...record, progress: 0 } };
    }

    return { success: true, data: record };
  } catch (error) {
    console.error("Failed to fetch single watch progress:", error);
    return { success: false, error: "Failed to query watch progress" };
  }
}

/**
 * Deletes a watch progress record.
 */
export async function deleteWatchProgress(
  mediaId: string,
  mediaType: "movie" | "tv",
  season?: number
) {
  try {
    const profile = await getOrCreateProfile();
    if (!profile) return { success: false, requiresAuth: true };
    const s = season || 0;

    await db.watchProgress.delete({
      where: {
        profileId_mediaId_mediaType_season: {
          profileId: profile.id,
          mediaId,
          mediaType,
          season: s,
        },
      },
    });

    revalidatePath("/");
    revalidatePath("/history");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete watch progress:", error);
    return { success: false, error: "Failed to delete progress" };
  }
}

/**
 * Batch-upsert watch-history entries from the local store. Called by the
 * background syncer (every ~10 min + on tab hide), not per playback event.
 */
export async function syncWatchProgress(entries: WatchProgressInput[]) {
  try {
    const profile = await getOrCreateProfile();
    if (!profile) return { success: false, requiresAuth: true };
    if (entries.length === 0) return { success: true, count: 0 };

    await db.$transaction(
      entries.map((input) => {
        const season = input.season || 0;
        const episode = input.episode || 0;
        return db.watchProgress.upsert({
          where: {
            profileId_mediaId_mediaType_season: {
              profileId: profile.id,
              mediaId: input.mediaId,
              mediaType: input.mediaType,
              season,
            },
          },
          update: { episode, progress: input.progress, duration: input.duration, title: input.title, posterPath: input.posterPath || null, updatedAt: new Date() },
          create: {
            profileId: profile.id,
            mediaId: input.mediaId,
            mediaType: input.mediaType,
            title: input.title,
            posterPath: input.posterPath || null,
            season,
            episode,
            progress: input.progress,
            duration: input.duration,
          },
        });
      })
    );

    revalidatePath("/");
    revalidatePath("/history");
    return { success: true, count: entries.length };
  } catch (error) {
    console.error("Failed to sync watch progress:", error);
    return { success: false, error: "Failed to sync history" };
  }
}

/**
 * Deletes watch-history rows by media identity (works whether or not the row
 * has been synced yet). Used for single + batch removal on the history page.
 */
export async function deleteWatchEntries(
  entries: { mediaId: string; mediaType: string; season: number }[]
) {
  try {
    const profile = await getOrCreateProfile();
    if (!profile) return { success: false, requiresAuth: true };
    if (entries.length === 0) return { success: true, count: 0 };

    const res = await db.watchProgress.deleteMany({
      where: {
        profileId: profile.id,
        OR: entries.map((e) => ({
          mediaId: e.mediaId,
          mediaType: e.mediaType,
          season: e.season,
        })),
      },
    });

    revalidatePath("/");
    revalidatePath("/history");
    return { success: true, count: res.count };
  } catch (error) {
    console.error("Failed to delete watch history items:", error);
    return { success: false, error: "Failed to delete history items" };
  }
}

/** Clears the current user's entire watch history. */
export async function clearWatchProgress() {
  try {
    const profile = await getOrCreateProfile();
    if (!profile) return { success: false, requiresAuth: true };

    const res = await db.watchProgress.deleteMany({ where: { profileId: profile.id } });

    revalidatePath("/");
    revalidatePath("/history");
    return { success: true, count: res.count };
  } catch (error) {
    console.error("Failed to clear watch history:", error);
    return { success: false, error: "Failed to clear history" };
  }
}
