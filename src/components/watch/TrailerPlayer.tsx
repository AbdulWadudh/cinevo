"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Play, Film } from "lucide-react";

interface TrailerPlayerProps {
  trailerKey: string | null;
  poster?: string;
  title: string;
}

export default function TrailerPlayer({ trailerKey, poster, title }: TrailerPlayerProps) {
  const [playing, setPlaying] = useState(false);

  if (!trailerKey) {
    return (
      <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-surface border border-white/[0.06] flex flex-col items-center justify-center gap-2 text-center">
        <Film className="w-8 h-8 text-muted" />
        <p className="text-xs text-muted">No trailer available</p>
      </div>
    );
  }

  // No autoplay — the iframe only mounts after the user clicks play.
  if (playing) {
    return (
      <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black border border-white/[0.06]">
        <iframe
          src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
          title={`${title} trailer`}
          allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 w-full h-full border-0"
        />
      </div>
    );
  }

  return (
    <button
      onClick={() => setPlaying(true)}
      aria-label={`Play ${title} trailer`}
      className="group relative w-full aspect-video rounded-xl overflow-hidden bg-surface border border-white/[0.06] cursor-pointer block"
    >
      <Image
        src={poster || `https://img.youtube.com/vi/${trailerKey}/hqdefault.jpg`}
        alt={`${title} trailer thumbnail`}
        fill
        sizes="(max-width: 1024px) 100vw, 33vw"
        className="object-cover brightness-[0.6] transition duration-500 group-hover:scale-105 group-hover:brightness-[0.5]"
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-14 h-14 bg-accent text-white rounded-full flex items-center justify-center shadow-[0_6px_24px_rgba(229,62,79,0.45)] transition-transform duration-300 group-hover:scale-110">
          <Play className="w-6 h-6 fill-white translate-x-0.5" />
        </div>
      </div>
      <span className="absolute bottom-2 left-3 text-[10px] font-extrabold uppercase tracking-widest text-white/90 drop-shadow">
        Watch Trailer
      </span>
    </button>
  );
}
