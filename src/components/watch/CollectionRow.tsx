import React from "react";
import MediaCarousel from "@/components/dashboard/MediaCarousel";
import { tmdb } from "@/lib/tmdb";

/**
 * Shows the other entries in a movie's franchise/collection (e.g. the whole
 * trilogy). Renders nothing when the collection has no usable parts.
 */
export default async function CollectionRow({ collectionId, name }: { collectionId: number; name: string }) {
  const collection = await tmdb.getCollection(String(collectionId));
  if (!collection) return null;

  const parts = collection.parts
    .filter((p) => p.poster_path)
    .sort((a, b) => (a.release_date || "").localeCompare(b.release_date || ""));
  if (parts.length < 2) return null;

  return (
    <div className="pt-6">
      <MediaCarousel title={name || collection.name} items={parts} mediaType="movie" />
    </div>
  );
}
