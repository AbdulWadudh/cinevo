"use client";

import React, { useEffect, useState } from "react";
import { useHolo } from "./useHolo";
import { getEffect } from "./effects";
import "./revealing-cards.css"; // ported effect styles (MIT, simeydotme)
import "./HoloCard.css";        // Cinevo wrappers + card back

export type { RevealItem } from "./types";
import type { RevealItem } from "./types";

/** Holographic card using the ported pokemon-cards-css effects (MIT).
 *  Renders the repo's exact .card structure; the chosen effect's data-attrs
 *  drive which foil/shine/glare apply. Front = movie poster, back = our cover. */
export default function HoloCard({
  item,
  effectKey,
  demo = false,
}: {
  item: RevealItem;
  effectKey: string;
  demo?: boolean;
}) {
  const { ref, onPointerMove, onPointerLeave } = useHolo<HTMLDivElement>();
  const [loading, setLoading] = useState(true);
  const effect = getEffect(effectKey);

  useEffect(() => {
    // Re-run the flip whenever the effect or item changes (fresh reveal).
    setLoading(true);
    const t = setTimeout(() => setLoading(false), 650);
    return () => clearTimeout(t);
  }, [effectKey, item.id]);

  // Deterministic per-card seeds (avoids hydration mismatch) for cosmos/glitter.
  const seedX = ((item.id % 1000) / 1000) || 0.5;
  const seedY = (((item.id * 31) % 1000) / 1000) || 0.5;
  const staticStyles = {
    ["--seedx" as string]: `${seedX}`,
    ["--seedy" as string]: `${seedY}`,
    ["--cosmosbg" as string]: `${Math.floor(seedX * 734)}px ${Math.floor(seedY * 1280)}px`,
  } as React.CSSProperties;

  const posterUrl = item.poster
    ? `https://image.tmdb.org/t/p/w780${item.poster}`
    : "https://picsum.photos/seed/cinevocard/600/900";

  return (
    <div className={`holo-stage-card ${demo ? "holo-stage-card--demo" : ""}`}>
      <div
        className={`card interactive ${loading ? "loading" : ""}`}
        data-rarity={effect.rarity}
        data-subtypes={effect.subtypes ?? "basic"}
        data-supertype={effect.supertype ?? "pokémon"}
        data-trainer-gallery={effect.gallery ? "true" : undefined}
      >
        <div className="card__translater">
          {/* rotator is the interactive layer (repo sets .card pointer-events:none) */}
          <div
            ref={ref}
            className="card__rotator"
            onPointerMove={onPointerMove}
            onPointerLeave={onPointerLeave}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="card__back" />
            <div className="card__front" style={staticStyles}>
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
