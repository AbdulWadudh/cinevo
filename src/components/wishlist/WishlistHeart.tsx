"use client";

import React from "react";
import { Heart } from "lucide-react";
import { TMDBMedia } from "@/lib/tmdb";
import { useWishlist } from "./WishlistProvider";

interface WishlistHeartProps {
  item: TMDBMedia;
  /** Fallback media type when the item itself doesn't carry media_type. */
  mediaType?: "movie" | "tv";
  /** Which top corner to pin to (default right). */
  corner?: "right" | "left";
  className?: string;
}

/**
 * Corner heart shown on poster cards. Appears on hover (and stays visible
 * when the item is already saved). Toggles the wishlist via the provider.
 */
export default function WishlistHeart({ item, mediaType = "movie", corner = "right", className = "" }: WishlistHeartProps) {
  const { has, toggle } = useWishlist();

  const id = String(item.id);
  const mt: "movie" | "tv" =
    item.media_type === "tv" || item.media_type === "movie" ? item.media_type : mediaType;
  const active = has(mt, id);

  const onClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggle({
      mediaId: id,
      mediaType: mt,
      title: item.title || item.name || "",
      posterPath: item.poster_path || undefined,
      rating: item.vote_average,
      releaseDate: item.release_date || item.first_air_date || undefined,
    });
  };

  return (
    <button
      onClick={onClick}
      aria-label={active ? "Remove from wishlist" : "Add to wishlist"}
      title={active ? "Remove from wishlist" : "Add to wishlist"}
      className={`absolute top-2 ${corner === "left" ? "left-2" : "right-2"} z-30 w-8 h-8 rounded-full flex items-center justify-center border backdrop-blur-md transition-all duration-200 cursor-pointer ${
        active
          ? "bg-accent-strong border-accent text-white opacity-100"
          : "bg-black/55 border-white/15 text-white hover:bg-accent-strong hover:border-accent opacity-0 group-hover:opacity-100"
      } ${className}`}
    >
      <Heart className={`w-4 h-4 ${active ? "fill-white" : ""}`} />
    </button>
  );
}
