"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Play, ChevronRight } from "lucide-react";
import WishlistHeart from "@/components/wishlist/WishlistHeart";
import { TMDBMedia } from "@/lib/tmdb";
import { useWatchHistory } from "@/lib/watchStore";

export default function ContinueWatching() {
  const history = useWatchHistory();

  // Collapse a TV series to a single card (its most recent episode). The list
  // is already newest-first, so keep the first occurrence per title.
  const seen = new Set<string>();
  const progressList = history.filter((item) => {
    const key = `${item.mediaType}:${item.mediaId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  if (progressList.length === 0) return null;

  return (
    <section className="px-6 md:px-12 mb-10 w-full animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-xl md:text-2xl font-bold tracking-tight">
          Continue Watching
        </h2>
        <Link
          href="/history"
          className="group inline-flex items-center gap-1 text-xs sm:text-sm font-semibold text-muted hover:text-accent transition-colors active:scale-95 duration-200"
        >
          See all
          <ChevronRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" />
        </Link>
      </div>

      <div className="relative">
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x">
          {progressList.map((item) => {
            const percent = item.duration > 0
              ? Math.min(100, Math.floor((item.progress / item.duration) * 100))
              : 0;
            const watchUrl = item.mediaType === "tv"
              ? `/watch/tv/${item.mediaId}?season=${item.season || 1}&episode=${item.episode || 1}`
              : `/watch/movie/${item.mediaId}`;

            return (
              <div
                key={`${item.mediaType}:${item.mediaId}`}
                className="flex-none w-[170px] sm:w-[210px] snap-start group"
              >
                <Link href={watchUrl} className="block cursor-pointer">
                  {/* Card Image Container */}
                  <div className="relative aspect-[16/10] bg-surface rounded-lg overflow-hidden border border-white/[0.04] shadow-md hover:border-accent hover:-translate-y-1 transition-all duration-300">
                    <Image
                      src={item.posterPath ? `https://image.tmdb.org/t/p/w500${item.posterPath}` : "https://picsum.photos/seed/cinevodefault/300/180"}
                      alt={item.title}
                      fill
                      sizes="(max-width: 640px) 170px, 210px"
                      className="object-cover brightness-[0.7] group-hover:brightness-[0.45] transition-all duration-500 scale-100 group-hover:scale-105"
                    />

                    {/* Progress Fill Bar (only when there's real progress) */}
                    {percent > 0 && (
                      <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/20">
                        <div
                          style={{ width: `${percent}%` }}
                          className="h-full bg-accent rounded-r-md transition-all duration-300"
                        />
                      </div>
                    )}

                    {/* Play Mini Hover Overlay */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="w-10 h-10 bg-accent text-white rounded-full flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform duration-300">
                        <Play className="w-4 h-4 fill-white translate-x-0.5" />
                      </div>
                    </div>

                    {/* Remaining Time Overlay (only when there's real progress) */}
                    {percent > 0 && (
                      <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-semibold text-fg-secondary">
                        {percent}% watched
                      </div>
                    )}

                    <WishlistHeart
                      corner="left"
                      mediaType={item.mediaType === "tv" ? "tv" : "movie"}
                      item={{
                        id: Number(item.mediaId),
                        media_type: item.mediaType === "tv" ? "tv" : "movie",
                        title: item.title,
                        poster_path: item.posterPath || "",
                      } as TMDBMedia}
                    />
                  </div>

                  {/* Card Meta Content */}
                  <div className="pt-2 px-1">
                    <h3 className="text-xs sm:text-sm font-semibold truncate text-fg group-hover:text-accent transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-[10px] sm:text-xs text-muted mt-0.5 font-medium">
                      {item.mediaType === "tv" ? `S${item.season} E${item.episode}` : "Movie"}
                    </p>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
