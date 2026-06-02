"use client";

import React from "react";
import { useGenres } from "@/lib/genres";

export interface Genre {
  name: string;
  id: string;
}

interface GenreBarProps {
  selectedGenreId: string;
  onGenreSelect: (genreId: string) => void;
  customGenre?: { name: string; id: string } | null;
}

export default function GenreBar({
  selectedGenreId,
  onGenreSelect,
  customGenre
}: GenreBarProps) {
  // Live movie genres (cached in localStorage — see lib/genres). The Explore
  // carousel discovers movies, so we use the movie list here.
  const { movie } = useGenres();
  const displayGenres: Genre[] = [
    { name: "All", id: "" },
    ...movie.map((g) => ({ name: g.name, id: String(g.id) })),
  ];
  if (customGenre && !displayGenres.some((g) => g.id === customGenre.id)) {
    displayGenres.push(customGenre);
  }

  return (
    <div className="w-full px-6 md:px-12 mb-8 overflow-x-auto scrollbar-hide flex gap-2.5 py-1">
      {displayGenres.map((genre) => {
        const active = selectedGenreId === genre.id;
        return (
          <button
            key={genre.name}
            onClick={() => onGenreSelect(genre.id)}
            className={`flex-none px-4.5 py-2 rounded-full text-xs font-semibold border transition-all duration-200 cursor-pointer ${
              active 
                ? "bg-accent border-accent text-white shadow-[0_4px_15px_rgba(229,62,79,0.35)]" 
                : "bg-surface border-border text-fg-secondary hover:border-fg-secondary/50 hover:text-fg"
            }`}
          >
            {genre.name}
          </button>
        );
      })}
    </div>
  );
}
