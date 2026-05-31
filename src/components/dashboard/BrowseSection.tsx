"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import GenreBar from "./GenreBar";
import MediaCarousel from "./MediaCarousel";
import { getMoviesByGenreAction } from "@/app/actions/tmdb-actions";
import { TMDBMedia } from "@/lib/tmdb";

interface BrowseSectionProps {
  initialTrending: TMDBMedia[];
}

export default function BrowseSection({ initialTrending }: BrowseSectionProps) {
  const searchParams = useSearchParams();

  const [selectedGenreId, setSelectedGenreId] = useState("");
  const [customGenre, setCustomGenre] = useState<{ name: string; id: string } | null>(null);
  const [movies, setMovies] = useState<TMDBMedia[]>(initialTrending);
  const [isPending, startTransition] = useTransition();

  // Load selected genre reactively from Next.js query parameter updates
  useEffect(() => {
    if (!searchParams) return;
    const genreId = searchParams.get("genre");
    const genreName = searchParams.get("genreName");
    if (genreId) {
      setSelectedGenreId(genreId);
      if (genreName) {
        setCustomGenre({ name: genreName, id: genreId });
      }
    } else {
      setSelectedGenreId("");
    }
  }, [searchParams]);

  useEffect(() => {
    if (selectedGenreId === "") {
      setMovies(initialTrending);
      return;
    }

    startTransition(async () => {
      const res = await getMoviesByGenreAction(selectedGenreId);
      if (res.success && res.data) {
        setMovies(res.data);
      }
    });
  }, [selectedGenreId, initialTrending]);

  return (
    <div className="w-full">
      {/* Interactive Genre Chips */}
      <GenreBar 
        selectedGenreId={selectedGenreId} 
        onGenreSelect={setSelectedGenreId} 
        customGenre={customGenre}
      />

      {/* Sliding Horizontal Carousel Results */}
      {isPending ? (
        /* Loading Skeleton Carousel */
        <div className="px-6 md:px-12 mb-12 animate-pulse flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex-none w-[140px] sm:w-[180px]">
              <div className="aspect-[2/3] w-full bg-surface-hover rounded-xl mb-2" />
              <div className="h-4 bg-surface-hover rounded w-3/4 mb-1" />
              <div className="h-3 bg-surface-hover rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : (
        <div className="-mt-4">
          <MediaCarousel title="" items={movies} mediaType="movie" />
        </div>
      )}
    </div>
  );
}
