"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { Play, Star, Loader2 } from "lucide-react";
import { TMDBMedia, type MediaSource } from "@/lib/tmdb";
import { loadMediaPageAction } from "@/app/actions/tmdb-actions";
import WishlistHeart from "@/components/wishlist/WishlistHeart";

interface GenreSectionProps {
  title: string;
  source: MediaSource;
  initialItems: TMDBMedia[];
  totalPages: number;
}

export default function GenreSection({
  title,
  source,
  initialItems,
  totalPages,
}: GenreSectionProps) {
  const { mediaType } = source;
  const [items, setItems] = useState<TMDBMedia[]>(initialItems);
  const [page, setPage] = useState(1);
  const [isPending, startTransition] = useTransition();
  const searchParams = useSearchParams();
  const theme = searchParams.get("theme");

  const hasMore = page < totalPages;

  const loadMore = () => {
    startTransition(async () => {
      const next = page + 1;
      const res = await loadMediaPageAction(source, next);
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

  const loadMoreHoverClass = 
    theme === "marvel" ? "hover:border-red-500 hover:text-red-500 hover:bg-red-500/5" :
    theme === "dc" ? "hover:border-sky-400 hover:text-sky-400 hover:bg-sky-950/10" :
    theme === "hbo" ? "hover:border-white hover:text-white hover:bg-white/5" :
    theme === "animation" ? "hover:border-purple-400 hover:text-purple-400 hover:bg-purple-950/10" :
    theme === "bollywood" ? "hover:border-amber-500 hover:text-amber-500 hover:bg-amber-950/10" :
    "hover:border-accent hover:text-accent hover:bg-white/[0.08]";

  const spinnerColorClass = 
    theme === "marvel" ? "text-red-500" :
    theme === "dc" ? "text-sky-450" :
    theme === "hbo" ? "text-white" :
    theme === "animation" ? "text-purple-400" :
    theme === "bollywood" ? "text-amber-500" :
    "text-accent";

  return (
    <section className="px-6 md:px-12 mb-12">
      <h2 className="font-display text-lg md:text-xl font-bold tracking-tight text-fg mb-5">{title}</h2>

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-x-4 gap-y-7">
        {items.map((item) => {
          const hoverBorderClass = 
            theme === "marvel" ? "group-hover:border-red-500 group-hover:shadow-[0_8px_25px_rgba(239,68,68,0.3)]" :
            theme === "dc" ? "group-hover:border-sky-450 group-hover:shadow-[0_8px_25px_rgba(14,165,233,0.3)]" :
            theme === "hbo" ? "group-hover:border-white group-hover:shadow-[0_8px_25px_rgba(255,255,255,0.15)]" :
            theme === "animation" ? "group-hover:border-purple-400 group-hover:shadow-[0_8px_25px_rgba(168,85,247,0.3)]" :
            theme === "bollywood" ? "group-hover:border-amber-500 group-hover:shadow-[0_8px_25px_rgba(245,158,11,0.3)]" :
            "group-hover:border-accent group-hover:shadow-[0_8px_25px_rgba(229,62,79,0.3)]";

          const playBgClass = 
            theme === "marvel" ? "bg-red-600 shadow-[0_4px_20px_rgba(239,68,68,0.55)] text-white" :
            theme === "dc" ? "bg-sky-500 shadow-[0_4px_20px_rgba(14,165,233,0.55)] text-white" :
            theme === "hbo" ? "bg-white text-black shadow-[0_4px_20px_rgba(255,255,255,0.3)]" :
            theme === "animation" ? "bg-purple-600 shadow-[0_4px_20px_rgba(168,85,247,0.55)] text-white" :
            theme === "bollywood" ? "bg-amber-600 shadow-[0_4px_20px_rgba(245,158,11,0.55)] text-white" :
            "bg-accent shadow-[0_4px_20px_rgba(229,62,79,0.45)] text-white";

          const titleHoverClass = 
            theme === "marvel" ? "group-hover:text-red-500" :
            theme === "dc" ? "group-hover:text-sky-400" :
            theme === "hbo" ? "group-hover:text-white" :
            theme === "animation" ? "group-hover:text-purple-400" :
            theme === "bollywood" ? "group-hover:text-amber-500" :
            "group-hover:text-accent";

          const watchUrl = `/watch/${mediaType}/${item.id}${theme ? `?theme=${theme}` : ""}`;

          return (
            <Link key={item.id} href={watchUrl} className="group block">
              <div className={`relative aspect-[2/3] w-full rounded-xl overflow-hidden bg-surface border border-white/4 shadow-md transition-all duration-300 group-hover:-translate-y-1 ${hoverBorderClass}`}>
                <Image
                  src={item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : "https://picsum.photos/seed/cinevoposter/300/450"}
                  alt={item.title || item.name || ""}
                  fill
                  sizes="(max-width: 640px) 33vw, (max-width: 1280px) 16vw, 12vw"
                  className="object-cover transition duration-500 group-hover:scale-105"
                />
                <WishlistHeart item={item} mediaType={mediaType} />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/40 transition-opacity duration-300">
                  <div className={`w-11 h-11 rounded-full flex items-center justify-center ${playBgClass}`}>
                    <Play className={`w-4 h-4 translate-x-0.5 ${theme === "hbo" ? "fill-black stroke-black" : "fill-white"}`} />
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
                <div className={`text-xs font-semibold truncate text-fg transition-colors ${titleHoverClass}`}>{item.title || item.name}</div>
                <div className="text-[10px] text-muted mt-0.5">
                  {(item.release_date || item.first_air_date || "").split("-")[0]} &bull; {mediaType === "tv" ? "Show" : "Movie"}
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {hasMore && (
        <div className="flex justify-center mt-10">
          <button
            onClick={loadMore}
            disabled={isPending}
            className={`inline-flex items-center gap-2 px-7 py-3 rounded-full text-sm font-semibold bg-surface border border-border text-fg transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${loadMoreHoverClass}`}
          >
            {isPending ? (
              <>
                <Loader2 className={`w-4 h-4 animate-spin ${spinnerColorClass}`} /> Loading…
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
