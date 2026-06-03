"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Play, Heart, Trash2, Star, Film } from "lucide-react";
import { toggleWishlist, getWishlist } from "@/app/actions/wishlist";
import { site } from "@/config";

interface WishlistItem {
  id: string;
  mediaId: string;
  mediaType: "movie" | "tv";
  title: string;
  posterPath: string | null;
  rating: number | null;
  releaseDate: string | null;
}

export default function WishlistGrid() {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Load wishlist items
  useEffect(() => {
    async function loadWishlist() {
      const res = await getWishlist();
      if (res.success && res.data) {
        setItems(res.data as WishlistItem[]);
      }
      setLoading(false);
    }
    loadWishlist();
  }, []);

  // OPTIMISTIC REMOVE ACTION
  const handleRemove = async (mediaId: string, mediaType: "movie" | "tv", title: string) => {
    // 1. Snapshot previous state
    const previousItems = [...items];
    
    // 2. Perform optimistic update: remove item immediately
    setItems((prev) => prev.filter((item) => !(item.mediaId === mediaId && item.mediaType === mediaType)));

    // 3. Call server action in background
    const res = await toggleWishlist({
      mediaId,
      mediaType,
      title
    });

    // 4. Revert if action failed
    if (!res.success) {
      console.error("Failed to remove item optimistically:", res.error);
      setItems(previousItems);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
        <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-fg-secondary">Loading your playlist...</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[45vh] text-center p-6 bg-surface-hover/30 rounded-xl border border-white/[0.04] max-w-lg mx-auto">
        <Film className="w-14 h-14 text-accent/50 mb-4 animate-pulse" />
        <h3 className="font-display text-xl font-bold mb-1">Your List is Empty</h3>
        <p className="text-sm text-fg-secondary mb-6 max-w-[85%]">
          Explore movies and shows on {site.name} and heart them to add them to your personalized playlist.
        </p>
        <Link 
          href="/" 
          className="bg-accent hover:bg-accent-hover text-white text-sm font-bold px-6 py-3 rounded-lg hover:shadow-[0_4px_20px_rgba(229,62,79,0.3)] transition-all cursor-pointer"
        >
          Browse Content
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
        {items.map((item) => {
          const watchUrl = item.mediaType === "tv"
            ? `/watch/tv/${item.mediaId}`
            : `/watch/movie/${item.mediaId}`;

          return (
            <div 
              key={item.id}
              className="flex-none group relative"
            >
              {/* Card Container */}
              <div className="relative aspect-[2/3] w-full bg-surface rounded-xl overflow-hidden border border-white/[0.04] shadow-md transition-all duration-500 hover:-translate-y-2 hover:scale-[1.02] hover:border-accent hover:shadow-[0_10px_30px_rgba(0,0,0,0.8)]">
                <Image
                  src={item.posterPath ? `https://image.tmdb.org/t/p/w500${item.posterPath}` : "https://picsum.photos/seed/cinevoposter/300/450"}
                  alt={item.title}
                  fill
                  sizes="(max-width: 640px) 50vw, 16vw"
                  className="object-cover transition duration-700 group-hover:scale-105"
                />

                {/* Centered Play Button Hover Overlay */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/40 transition-opacity duration-300 z-20">
                  <Link href={watchUrl} className="absolute inset-0 z-10 cursor-pointer" />
                  <div className="w-12 h-12 bg-accent text-white rounded-full flex items-center justify-center shadow-[0_4px_20px_rgba(229,62,79,0.45)] transform scale-75 group-hover:scale-100 transition-transform duration-300 relative z-20">
                    <Play className="w-5 h-5 fill-white translate-x-0.5" />
                  </div>
                </div>

                {/* Bottom Metadata Hover Overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/95 via-black/45 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10 flex flex-col justify-end">
                  {/* Rating Badge */}
                  {item.rating && (
                    <div className="flex items-center gap-1 text-[11px] font-bold text-gold mb-1.5 relative z-20">
                      <Star className="w-3.5 h-3.5 fill-gold stroke-gold" />
                      <span>{item.rating.toFixed(1)}</span>
                    </div>
                  )}

                  {/* Genre Tag / Type Indicator */}
                  <div className="inline-block text-[10px] font-bold px-2 py-0.5 bg-white/10 text-fg-secondary rounded uppercase tracking-wider w-fit mb-1 relative z-20">
                    {item.mediaType === "movie" ? "Movie" : "TV Show"}
                  </div>
                </div>

                {/* Quick Optimistic Delete Heart Button (Visible on hover) */}
                <button
                  onClick={() => handleRemove(item.mediaId, item.mediaType, item.title)}
                  className="absolute top-3 right-3 p-2 bg-black/60 backdrop-blur-md text-accent hover:text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20 hover:bg-accent shadow-md cursor-pointer border border-white/[0.08]"
                  aria-label="Remove from list"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Title Content */}
              <div className="pt-2 px-1">
                <h3 className="text-xs sm:text-sm font-semibold truncate text-fg group-hover:text-accent transition-colors">
                  {item.title}
                </h3>
                <p className="text-[10px] sm:text-xs text-muted mt-0.5">
                  {item.releaseDate ? item.releaseDate.split("-")[0] : ""} &bull; {item.mediaType === "movie" ? "Movie" : "TV"}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
