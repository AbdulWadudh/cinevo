"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { Play, Star, Loader2 } from "lucide-react";
import { TMDBMedia } from "@/lib/tmdb";
import { loadGenrePageAction } from "@/app/actions/tmdb-actions";
import WishlistHeart from "@/components/wishlist/WishlistHeart";

interface GenreSectionProps {
  title: string;
  genreId: string;
  mediaType: "movie" | "tv";
  initialItems: TMDBMedia[];
  totalPages: number;
}

export default function GenreSection({
  title,
  genreId,
  mediaType,
  initialItems,
  totalPages,
}: GenreSectionProps) {
  const [items, setItems] = useState<TMDBMedia[]>(initialItems);
  const [page, setPage] = useState(1);
  const [isPending, startTransition] = useTransition();

  const hasMore = page < totalPages;

  const loadMore = () => {
    startTransition(async () => {
      const next = page + 1;
      const res = await loadGenrePageAction(genreId, mediaType, next);
      if (res.success) {
        // De-duplicate by id in case TMDB returns overlapping entries across pages.
        setItems((prev) => {
          const seen = new Set(prev.map((i) => i.id));
          return [...prev, ...res.data.filter((i) => !seen.has(i.id))];
        });
        setPage(next);
      }
    });
  };

  if (items.length === 0) return null;

  return (
    <section className="px-6 md:px-12 mb-12">
      <h2 className="font-display text-lg md:text-xl font-bold tracking-tight text-fg mb-5">{title}</h2>

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-x-4 gap-y-7">
        {items.map((item) => (
          <Link key={item.id} href={`/watch/${mediaType}/${item.id}`} className="group block">
            <div className="relative aspect-[2/3] w-full rounded-xl overflow-hidden bg-surface border border-white/[0.04] shadow-md transition-all duration-300 group-hover:-translate-y-1 group-hover:border-accent group-hover:shadow-[0_8px_25px_rgba(0,0,0,0.7)]">
              <img
                src={item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : "https://picsum.photos/seed/cinevoposter/300/450"}
                alt={item.title || item.name}
                loading="lazy"
                className="w-full h-full object-cover transition duration-500 group-hover:scale-105"
              />
              <WishlistHeart item={item} mediaType={mediaType} />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/40 transition-opacity duration-300">
                <div className="w-11 h-11 bg-accent text-white rounded-full flex items-center justify-center shadow-[0_4px_20px_rgba(229,62,79,0.45)]">
                  <Play className="w-4 h-4 fill-white translate-x-0.5" />
                </div>
              </div>
              {item.vote_average ? (
                <span className="absolute top-2 left-2 flex items-center gap-1 text-[10px] font-bold text-gold bg-black/70 px-1.5 py-0.5 rounded">
                  <Star className="w-3 h-3 fill-gold stroke-gold" />
                  {item.vote_average.toFixed(1)}
                </span>
              ) : null}
            </div>
            <div className="pt-2 px-0.5">
              <div className="text-xs font-semibold truncate text-fg group-hover:text-accent transition-colors">{item.title || item.name}</div>
              <div className="text-[10px] text-muted mt-0.5">
                {(item.release_date || item.first_air_date || "").split("-")[0]} &bull; {mediaType === "tv" ? "Show" : "Movie"}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {hasMore && (
        <div className="flex justify-center mt-10">
          <button
            onClick={loadMore}
            disabled={isPending}
            className="inline-flex items-center gap-2 px-7 py-3 rounded-full text-sm font-semibold bg-surface border border-border text-fg hover:border-accent hover:text-accent transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Loading…
              </>
            ) : (
              "Load More"
            )}
          </button>
        </div>
      )}
    </section>
  );
}
