import React from "react";
import MediaCarousel from "@/components/dashboard/MediaCarousel";
import { getWatchProgressList } from "@/app/actions/progress";
import { tmdb } from "@/lib/tmdb";

/**
 * Personalized row seeded from the user's most recent watch-history item.
 * Renders nothing when the user is signed out, has no history, or TMDB has no
 * recommendations for the seed title.
 */
export default async function BecauseYouWatched() {
  const res = await getWatchProgressList();
  const recent = res.success && res.data && res.data.length > 0 ? res.data[0] : null;
  if (!recent) return null;

  const mediaType = recent.mediaType === "tv" ? "tv" : "movie";
  const recs = await tmdb.getSimilar(recent.mediaId, mediaType);
  const items = recs.filter((m) => m.poster_path).slice(0, 20);
  if (items.length === 0) return null;

  return (
    <MediaCarousel
      title={`Because you watched ${recent.title}`}
      items={items}
      mediaType={mediaType}
    />
  );
}
