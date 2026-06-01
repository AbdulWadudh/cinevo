"use server";

import { db } from "@/lib/db";
import { getOrCreateProfile } from "@/lib/auth";
import { revalidatePath } from "next/cache";

/** Set (or update) the current user's rating (1–10) for a title. */
export async function setRating(mediaId: string, mediaType: "movie" | "tv", rating: number) {
  try {
    const profile = await getOrCreateProfile();
    if (!profile) return { success: false, requiresAuth: true };
    const value = Math.max(1, Math.min(10, Math.round(rating)));
    await db.rating.upsert({
      where: { profileId_mediaId_mediaType: { profileId: profile.id, mediaId, mediaType } },
      update: { rating: value },
      create: { profileId: profile.id, mediaId, mediaType, rating: value },
    });
    revalidatePath(`/watch/${mediaType}/${mediaId}`);
    return { success: true, rating: value };
  } catch (error) {
    console.error("Failed to set rating:", error);
    return { success: false, error: "Failed to save rating" };
  }
}

/** Remove the current user's rating for a title. */
export async function removeRating(mediaId: string, mediaType: "movie" | "tv") {
  try {
    const profile = await getOrCreateProfile();
    if (!profile) return { success: false, requiresAuth: true };
    await db.rating.deleteMany({ where: { profileId: profile.id, mediaId, mediaType } });
    revalidatePath(`/watch/${mediaType}/${mediaId}`);
    return { success: true };
  } catch (error) {
    console.error("Failed to remove rating:", error);
    return { success: false, error: "Failed to remove rating" };
  }
}

/** Get the current user's rating for a title (0 when none / signed out). */
export async function getRating(mediaId: string, mediaType: "movie" | "tv"): Promise<number> {
  try {
    const profile = await getOrCreateProfile();
    if (!profile) return 0;
    const r = await db.rating.findUnique({
      where: { profileId_mediaId_mediaType: { profileId: profile.id, mediaId, mediaType } },
    });
    return r?.rating ?? 0;
  } catch {
    return 0;
  }
}
