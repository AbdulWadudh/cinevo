"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

// Sync or fetch default profile for simple testing
async function getOrCreateProfile(userId: string = "test-user-123") {
  let profile = await db.profile.findUnique({
    where: { id: userId },
  });

  if (!profile) {
    profile = await db.profile.create({
      data: {
        id: userId,
        email: "streamer@cinevo.com",
        username: "Cinevo Streamer",
        avatarUrl: "https://i.pravatar.cc/150?img=33",
      },
    });
  }
  return profile;
}

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
export async function updateWatchProgress(input: WatchProgressInput, userId: string = "test-user-123") {
  try {
    const profile = await getOrCreateProfile(userId);
    // Use 0 as default for movies/undefined to satisfy strict Prisma index typings
    const season = input.season || 0;
    const episode = input.episode || 0;

    const progress = await db.watchProgress.upsert({
      where: {
        profileId_mediaId_mediaType_season_episode: {
          profileId: profile.id,
          mediaId: input.mediaId,
          mediaType: input.mediaType,
          season,
          episode,
        },
      },
      update: {
        progress: input.progress,
        duration: input.duration,
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
    return { success: true, data: progress };
  } catch (error) {
    console.error("Failed to update watch progress:", error);
    return { success: false, error: "Failed to update database progress" };
  }
}

/**
 * Fetches all WatchProgress records for a user, sorted by most recently updated first.
 */
export async function getWatchProgressList(userId: string = "test-user-123") {
  try {
    const profile = await getOrCreateProfile(userId);
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
  episode?: number,
  userId: string = "test-user-123"
) {
  try {
    const profile = await getOrCreateProfile(userId);
    const s = season || 0;
    const e = episode || 0;

    const record = await db.watchProgress.findUnique({
      where: {
        profileId_mediaId_mediaType_season_episode: {
          profileId: profile.id,
          mediaId,
          mediaType,
          season: s,
          episode: e,
        },
      },
    });

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
  season?: number,
  episode?: number,
  userId: string = "test-user-123"
) {
  try {
    const profile = await getOrCreateProfile(userId);
    const s = season || 0;
    const e = episode || 0;

    await db.watchProgress.delete({
      where: {
        profileId_mediaId_mediaType_season_episode: {
          profileId: profile.id,
          mediaId,
          mediaType,
          season: s,
          episode: e,
        },
      },
    });

    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete watch progress:", error);
    return { success: false, error: "Failed to delete progress" };
  }
}
