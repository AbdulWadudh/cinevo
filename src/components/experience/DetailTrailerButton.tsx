"use client";

import React from "react";
import { Clapperboard } from "lucide-react";
import { useTrailer } from "@/components/TrailerProvider";

interface DetailTrailerButtonProps {
  id: string;
  mediaType: "movie" | "tv";
  title: string;
  rating?: number;
  date?: string;
  label?: string;
}

export default function DetailTrailerButton({
  id,
  mediaType,
  title,
  rating,
  date,
  label = "Trailer",
}: DetailTrailerButtonProps) {
  const { openTrailer } = useTrailer();

  return (
    <button
      type="button"
      onClick={() => openTrailer({ id, mediaType, title, rating, date })}
      className="xp-detail-trailer"
    >
      <Clapperboard className="h-4 w-4" />
      <span>{label}</span>
    </button>
  );
}
