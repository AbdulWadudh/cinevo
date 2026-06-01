"use client";

import React, { useState, useTransition } from "react";
import { Star, Check, Eye } from "lucide-react";
import { setRating, removeRating } from "@/app/actions/ratings";
import { touchWatch, useWatchHistory } from "@/lib/watchStore";

interface WatchActionsProps {
  mediaId: string;
  mediaType: "movie" | "tv";
  title: string;
  posterPath?: string;
  season?: number;
  episode?: number;
  initialRating: number;
}

export default function WatchActions({
  mediaId, mediaType, title, posterPath, season, episode, initialRating,
}: WatchActionsProps) {
  const [rating, setRatingState] = useState(initialRating);
  const [hover, setHover] = useState(0);
  const [, startTransition] = useTransition();

  // Reflect "watched" state from the local store (movie or current episode).
  const history = useWatchHistory();
  const wKey = `${mediaType}:${mediaId}:${mediaType === "tv" ? (season ?? 1) : 0}:${mediaType === "tv" ? (episode ?? 1) : 0}`;
  const isWatched = history.some(
    (e) => `${e.mediaType}:${e.mediaId}:${e.season}:${e.episode}` === wKey
  );

  const choose = (value: number) => {
    const next = value === rating ? 0 : value; // click same star to clear
    setRatingState(next);
    startTransition(async () => {
      if (next === 0) await removeRating(mediaId, mediaType);
      else await setRating(mediaId, mediaType, next);
    });
  };

  const display = hover || rating;

  return (
    <div className="flex flex-col gap-3">
      {/* Personal rating */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted">Your rating</span>
        <div className="flex items-center gap-0.5" onMouseLeave={() => setHover(0)}>
          {Array.from({ length: 10 }, (_, i) => i + 1).map((v) => (
            <button
              key={v}
              onMouseEnter={() => setHover(v)}
              onClick={() => choose(v)}
              aria-label={`Rate ${v} of 10`}
              className="p-0.5 cursor-pointer transition-transform hover:scale-125"
            >
              <Star className={`w-4 h-4 transition-colors ${v <= display ? "fill-gold stroke-gold" : "stroke-muted"}`} />
            </button>
          ))}
        </div>
        {rating > 0 && <span className="text-xs font-bold text-gold">{rating}/10</span>}
      </div>

      {/* Mark watched */}
      <button
        onClick={() => touchWatch({ mediaId, mediaType, title, posterPath, season, episode })}
        disabled={isWatched}
        className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all w-fit ${isWatched
          ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 cursor-default"
          : "bg-white/[0.05] border border-white/[0.1] text-fg-secondary hover:text-fg hover:bg-white/[0.09] cursor-pointer"
          }`}
      >
        {isWatched ? <Check className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        {isWatched ? (mediaType === "tv" ? "Episode watched" : "Watched") : "Mark as watched"}
      </button>
    </div>
  );
}
