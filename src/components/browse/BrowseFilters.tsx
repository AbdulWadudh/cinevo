"use client";

import React, { useState, useEffect, useTransition, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "motion/react";
import { Film, Tv2, Star, Play, Loader2, SlidersHorizontal, Tag, CalendarDays, ArrowDownWideNarrow, Languages } from "lucide-react";
import { discoverMediaAction } from "@/app/actions/tmdb-actions";
import { TMDBMedia, DiscoverFilters } from "@/lib/tmdb";
import WishlistHeart from "@/components/wishlist/WishlistHeart";
import CustomSelect, { type SelectOption } from "@/components/ui/CustomSelect";
import { useGenres, toGenreOptions } from "@/lib/genres";

const ALL_GENRES: SelectOption[] = [{ label: "All genres", value: "" }];
// Film industries mapped to their TMDB original-language codes.
const LANGUAGES: SelectOption[] = [
  { label: "All languages", value: "" },
  { label: "English", value: "en" },
  { label: "Hindi", value: "hi" },
  { label: "Telugu", value: "te" },
  { label: "Tamil", value: "ta" },
  { label: "Malayalam", value: "ml" },
  { label: "Kannada", value: "kn" },
];
const SORTS: SelectOption[] = [
  { label: "Most Popular", value: "popularity.desc" },
  { label: "Top Rated", value: "vote_average.desc" },
  { label: "Newest", value: "primary_release_date.desc" },
  { label: "Oldest", value: "primary_release_date.asc" },
];
const RATINGS: SelectOption[] = [
  { label: "Any rating", value: "" }, { label: "6+", value: "6" },
  { label: "7+", value: "7" }, { label: "8+", value: "8" }, { label: "9+", value: "9" },
];

const currentYear = 2026;
const YEARS: SelectOption[] = [
  { label: "Any year", value: "" },
  ...Array.from({ length: 56 }, (_, i) => ({ label: String(currentYear - i), value: String(currentYear - i) })),
];

export default function BrowseFilters() {
  const [mediaType, setMediaType] = useState<"movie" | "tv">("movie");
  const [genre, setGenre] = useState("");
  const [year, setYear] = useState("");
  const [minRating, setMinRating] = useState("");
  const [language, setLanguage] = useState("");
  const [sortBy, setSortBy] = useState("popularity.desc");

  const [items, setItems] = useState<TMDBMedia[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pending, startTransition] = useTransition();
  const [loadingMore, setLoadingMore] = useState(false);

  // Genre lists are fetched once and cached in localStorage (see lib/genres).
  const genreCache = useGenres();

  const filters: DiscoverFilters = { mediaType, genre, year, minRating, language, sortBy };

  // Reset + fetch first page whenever a filter changes.
  useEffect(() => {
    startTransition(async () => {
      const res = await discoverMediaAction({ mediaType, genre, year, minRating, language, sortBy }, 1);
      if (res.success) {
        setItems(res.data);
        setTotalPages(res.totalPages);
        setPage(1);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mediaType, genre, year, minRating, language, sortBy]);

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

  const genreList = mediaType === "tv" ? genreCache.tv : genreCache.movie;
  const genres = genreList.length ? toGenreOptions(genreList) : ALL_GENRES;

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
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold transition-all cursor-pointer ${mediaType === t ? "bg-accent-strong text-white" : "text-fg-secondary hover:text-fg"}`}
            >
              {t === "movie" ? <Film className="w-3.5 h-3.5" /> : <Tv2 className="w-3.5 h-3.5" />}
              {t === "movie" ? "Movies" : "TV"}
            </button>
          ))}
        </div>

        <CustomSelect value={genre} options={genres} onChange={setGenre} ariaLabel="Genre" icon={<Tag className="w-3.5 h-3.5" />} />
        <CustomSelect value={language} options={LANGUAGES} onChange={setLanguage} ariaLabel="Language / industry" icon={<Languages className="w-3.5 h-3.5" />} />
        <CustomSelect value={year} options={YEARS} onChange={setYear} ariaLabel="Year" icon={<CalendarDays className="w-3.5 h-3.5" />} />
        <CustomSelect value={minRating} options={RATINGS} onChange={setMinRating} ariaLabel="Minimum rating" icon={<Star className="w-3.5 h-3.5" />} />
        <CustomSelect value={sortBy} options={SORTS} onChange={setSortBy} ariaLabel="Sort by" icon={<ArrowDownWideNarrow className="w-3.5 h-3.5" />} />
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
                      <Image
                        src={item.poster_path ? `https://image.tmdb.org/t/p/w300${item.poster_path}` : "https://picsum.photos/seed/cinevodefault/300/450"}
                        alt={item.title || item.name || ""}
                        fill
                        sizes="(max-width: 640px) 50vw, 16vw"
                        className="object-cover transition duration-500 group-hover:scale-105"
                      />
                      <WishlistHeart item={item} mediaType={mediaType} />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/40 transition-opacity duration-300 z-10">
                        <div className="w-10 h-10 bg-accent-strong text-white rounded-full flex items-center justify-center shadow-lg scale-90 group-hover:scale-100 transition-transform">
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
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-xs font-extrabold tracking-wider uppercase border border-accent/30 text-white bg-accent/10 hover:bg-accent-strong hover:border-accent transition-all duration-300 cursor-pointer disabled:opacity-60"
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
