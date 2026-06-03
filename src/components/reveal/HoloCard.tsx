"use client";

import React, { useEffect, useState } from "react";
import { useHolo } from "./useHolo";
import "./HoloCard.css";

export interface RevealItem {
  id: number;
  mediaType: "movie" | "tv";
  title: string;
  poster: string | null;
  rating: number;
  year: string;
}

/** Holographic "rare holo V" card (adapted from pokemon-cards-css, MIT).
 *  Opens with a slow reveal spin, then tracks the pointer for tilt + holo foil. */
export default function HoloCard({ item }: { item: RevealItem }) {
  // The open/close spin is owned by the AnimatePresence wrapper so it plays
  // symmetrically on reveal and on return; here we only do pointer tilt + holo.
  const { ref, onPointerMove, onPointerLeave } = useHolo<HTMLDivElement>();
  const [loading, setLoading] = useState(true);

  // Hold the back a touch longer, then cross-fade to the poster as the spin eases.
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 650);
    return () => clearTimeout(t);
  }, []);

  const posterUrl = item.poster
    ? `https://image.tmdb.org/t/p/w780${item.poster}`
    : "https://picsum.photos/seed/cinevocard/600/900";

  return (
    <div className="holo-stage-card">
      <div
        ref={ref}
        className={`card interactive ${loading ? "loading" : ""}`}
        data-rarity="rare holo v"
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="card__translater">
          <div className="card__rotator">
            <div className="card__back" />
            <div className="card__front">
              {/* eslint-disable-next-line @next/next/no-img-element -- holo card needs a raw <img> layer */}
              <img src={posterUrl} alt={item.title} loading="eager" />
              <div className="card__shine" />
              <div className="card__glare" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
