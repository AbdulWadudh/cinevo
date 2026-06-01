"use client";

import React, { useState, useEffect, useTransition, useCallback } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { Film, Tv2, Star, Play, Loader2, SlidersHorizontal } from "lucide-react";
import { discoverMediaAction } from "@/app/actions/tmdb-actions";
import { TMDBMedia, DiscoverFilters } from "@/lib/tmdb";
import WishlistHeart from "@/components/wishlist/WishlistHeart";

const GENRES_MOVIE = [
  { name: "All", id: "" }, { name: "Action", id: "28" }, { name: "Adventure", id: "12" },
  { name: "Animation", id: "16" }, { name: "Comedy", id: "35" }, { name: "Crime", id: "80" },
  { name: "Documentary", id: "99" }, { name: "Drama", id: "18" }, { name: "Fantasy", id: "14" },
  { name: "Horror", id: "27" }, { name: "Mystery", id: "9648" }, { name: "Romance", id: "10749" },
  { name: "Sci-Fi", id: "878" }, { name: "Thriller", id: "53" }, { name: "War", id: "10752" },
];
const GENRES_TV = [
  { name: "All", id: "" }, { name: "Action & Adventure", id: "10759" }, { name: "Animation", id: "16" },
  { name: "Comedy", id: "35" }, { name: "Crime", id: "80" }, { name: "Documentary", id: "99" },
  { name: "Drama", id: "18" }, { name: "Kids", id: "10762" }, { name: "Mystery", id: "9648" },
  { name: "Sci-Fi & Fantasy", id: "10765" }, { name: "Reality", id: "10764" },
];
const SORTS = [
  { label: "Most Popular", value: "popularity.desc" },
  { label: "Top Rated", value: "vote_average.desc" },
  { label: "Newest", value: "primary_release_date.desc" },
  { label: "Oldest", value: "primary_release_date.asc" },
];
const RATINGS = [
  { label: "Any rating", value: "" }, { label: "6+", value: "6" },
  { label: "7+", value: "7" }, { label: "8+", value: "8" }, { label: "9+", value: "9" },
];

const currentYear = 2026;
const YEARS = ["", ...Array.from({ length: 56 }, (_, i) => String(currentYear - i))];

const selectCls =
  "bg-surface border border-border rounded-xl px-3 py-2 text-sm text-fg outline-none focus:border-accent/60 transition-colors cursor-pointer";

export default function BrowseFilters() {
  const [mediaType, setMediaType] = useState<"movie" | "tv">("movie");
  const [genre, setGenre] = useState("");
  const [year, setYear] = useState("");
  const [minRating, setMinRating] = useState("");
  const [sortBy, setSortBy] = useState("popularity.desc");

  const [items, setItems] = useState<TMDBMedia[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pending, startTransition] = useTransition();
  const [loadingMore, setLoadingMore] = useState(false);

  const filters: DiscoverFilters = { mediaType, genre, year, minRating, sortBy };

  // Reset + fetch first page whenever a filter changes.
  useEffect(() => {
    startTransition(async () => {
      const res = await discoverMediaAction({ mediaType, genre, year, minRating, sortBy }, 1);
      if (res.success) {
        setItems(res.data);
        setTotalPages(res.totalPages);
        setPage(1);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mediaType, genre, year, minRating, sortBy]);

  const loadMore = useCallback(async () => {
    if (loadingMore || page >= totalPages) return;
    setLoadingMore(true);
    const next = page + 1;
    const res = await discoverMediaAction(filters, next);
    if (res.success) {
      setItems((prev) => [...prev, ...res.data]);
      setPage(next);
    }
    setLoadingMore(false);
  }, [loadingMore, page, totalPages, filters]);

  const genres = mediaType === "tv" ? GENRES_TV : GENRES_MOVIE;

  return (
    <div className="w-full">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2.5 mb-8">
        {/* Type toggle */}
        <div className="flex items-center bg-surface border border-border rounded-xl p-1">
          {(["movie", "tv"] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setMediaType(t); setGenre(""); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold transition-all cursor-pointer ${mediaType === t ? "bg-accent text-white" : "text-fg-secondary hover:text-fg"}`}
            >
              {t === "movie" ? <Film className="w-3.5 h-3.5" /> : <Tv2 className="w-3.5 h-3.5" />}
              {t === "movie" ? "Movies" : "TV"}
            </button>
          ))}
        </div>

        <select value={genre} onChange={(e) => setGenre(e.target.value)} className={selectCls} aria-label="Genre">
          {genres.map((g) => <option key={g.id || "all"} value={g.id}>{g.name === "All" ? "All genres" : g.name}</option>)}
        </select>

        <select value={year} onChange={(e) => setYear(e.target.value)} className={selectCls} aria-label="Year">
          {YEARS.map((y) => <option key={y || "any"} value={y}>{y || "Any year"}</option>)}
        </select>

        <select value={minRating} onChange={(e) => setMinRating(e.target.value)} className={selectCls} aria-label="Minimum rating">
          {RATINGS.map((r) => <option key={r.value || "any"} value={r.value}>{r.label}</option>)}
        </select>

        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className={selectCls} aria-label="Sort by">
          {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      {/* Results */}
      {pending ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-5">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-[2/3] w-full bg-surface-hover rounded-xl mb-2" />
              <div className="h-3 bg-surface-hover rounded w-3/4" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-24 text-muted">
          <SlidersHorizontal className="w-12 h-12 mx-auto mb-4 opacity-30 text-accent" />
          <h3 className="text-lg font-bold text-fg mb-1">No matches</h3>
          <p className="text-sm">Try loosening your filters.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-5">
            {items.map((item, i) => {
              const year = (item.release_date || item.first_air_date || "").split("-")[0];
              return (
                <motion.div
                  key={`${item.id}-${i}`}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: Math.min((i % 18) * 0.015, 0.3) }}
                >
                  <Link href={`/watch/${mediaType}/${item.id}`} className="group block cursor-pointer">
                    <div className="relative aspect-[2/3] w-full bg-surface-hover rounded-xl overflow-hidden border border-border group-hover:border-accent transition-all duration-300">
                      <img
                        src={item.poster_path ? `https://image.tmdb.org/t/p/w300${item.poster_path}` : "https://picsum.photos/seed/cinevodefault/300/450"}
                        alt={item.title || item.name}
                        className="w-full h-full object-cover transition duration-500 group-hover:scale-105"
                        loading="lazy"
                      />
                      <WishlistHeart item={item} mediaType={mediaType} />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/40 transition-opacity duration-300 z-10">
                        <div className="w-10 h-10 bg-accent text-white rounded-full flex items-center justify-center shadow-lg scale-90 group-hover:scale-100 transition-transform">
                          <Play className="w-4 h-4 fill-white translate-x-0.5" />
                        </div>
                      </div>
                      {item.vote_average ? (
                        <span className="absolute bottom-2 left-2 z-10 flex items-center gap-0.5 text-[10px] font-bold text-gold bg-black/70 px-1.5 py-0.5 rounded">
                          <Star className="w-2.5 h-2.5 fill-gold stroke-gold" />
                          {item.vote_average.toFixed(1)}
                        </span>
                      ) : null}
                    </div>
                    <h5 className="text-[11px] sm:text-xs font-bold truncate text-fg mt-2 group-hover:text-accent transition-colors">
                      {item.title || item.name}
                    </h5>
                    {year && <p className="text-[9px] sm:text-[10px] text-muted mt-0.5">{year}</p>}
                  </Link>
                </motion.div>
              );
            })}
          </div>

          {page < totalPages && (
            <div className="flex justify-center mt-8">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-xs font-extrabold tracking-wider uppercase border border-accent/30 text-white bg-accent/10 hover:bg-accent hover:border-accent transition-all duration-300 cursor-pointer disabled:opacity-60"
              >
                {loadingMore ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Load more
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
