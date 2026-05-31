"use server";

import { db } from "@/lib/db";
import { getOrCreateProfile } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export interface WishlistItemInput {
  mediaId: string;
  mediaType: "movie" | "tv";
  title: string;
  posterPath?: string;
  rating?: number;
  releaseDate?: string;
}

/**
 * Toggles a media item in the user's wishlist
 */
export async function toggleWishlist(item: WishlistItemInput) {
  try {
    const profile = await getOrCreateProfile();
    if (!profile) return { success: false, requiresAuth: true };

    const existing = await db.wishlist.findUnique({
      where: {
        profileId_mediaId_mediaType: {
          profileId: profile.id,
          mediaId: item.mediaId,
          mediaType: item.mediaType,
        },
      },
    });

    if (existing) {
      // Remove it
      await db.wishlist.delete({
        where: {
          id: existing.id,
        },
      });
      revalidatePath("/wishlist");
      revalidatePath("/");
      return { success: true, added: false };
    } else {
      // Add it
      await db.wishlist.create({
        data: {
          profileId: profile.id,
          mediaId: item.mediaId,
          mediaType: item.mediaType,
          title: item.title,
          posterPath: item.posterPath || null,
          rating: item.rating || null,
          releaseDate: item.releaseDate || null,
        },
      });
      revalidatePath("/wishlist");
      revalidatePath("/");
      return { success: true, added: true };
    }
  } catch (error) {
    console.error("Failed to toggle wishlist item:", error);
    return { success: false, error: "Database operation failed" };
  }
}

/**
 * Fetches all wishlist items for a user
 */
export async function getWishlist() {
  try {
    const profile = await getOrCreateProfile();
    if (!profile) return { success: true, data: [] };
    const items = await db.wishlist.findMany({
      where: {
        profileId: profile.id,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    return { success: true, data: items };
  } catch (error) {
    console.error("Failed to get wishlist:", error);
    return { success: false, error: "Failed to load wishlist items" };
  }
}

/**
 * Returns the set of wishlist keys (`${mediaType}:${mediaId}`) for the current
 * user in a single query — used to pre-fill hover hearts across the app.
 */
export async function getWishlistKeys(): Promise<{ success: boolean; data: string[] }> {
  try {
    const profile = await getOrCreateProfile();
    if (!profile) return { success: true, data: [] };
    const items = await db.wishlist.findMany({
      where: { profileId: profile.id },
      select: { mediaId: true, mediaType: true },
    });
    return {
      success: true,
      data: items.map((i: { mediaId: string; mediaType: string }) => `${i.mediaType}:${i.mediaId}`),
    };
  } catch (error) {
    console.error("Failed to load wishlist keys:", error);
    return { success: false, data: [] };
  }
}

/**
 * Checks if a specific media item is in the user's wishlist
 */
export async function checkWishlistStatus(mediaId: string, mediaType: "movie" | "tv") {
  try {
    const profile = await getOrCreateProfile();
    if (!profile) return { success: true, exists: false };
    const existing = await db.wishlist.findUnique({
      where: {
        profileId_mediaId_mediaType: {
          profileId: profile.id,
          mediaId: mediaId,
          mediaType: mediaType,
        },
      },
    });
    return { success: true, exists: !!existing };
  } catch (error) {
    console.error("Failed to check wishlist status:", error);
    return { success: false, exists: false };
  }
}
