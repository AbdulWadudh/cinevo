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
export async function toggleWishlist(item: WishlistItemInput, userId: string = "test-user-123") {
  try {
    const profile = await getOrCreateProfile(userId);

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
export async function getWishlist(userId: string = "test-user-123") {
  try {
    const profile = await getOrCreateProfile(userId);
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
 * Checks if a specific media item is in the user's wishlist
 */
export async function checkWishlistStatus(mediaId: string, mediaType: "movie" | "tv", userId: string = "test-user-123") {
  try {
    const profile = await getOrCreateProfile(userId);
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
