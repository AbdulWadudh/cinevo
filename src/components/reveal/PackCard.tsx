"use client";

import React from "react";
import { Sparkles, HelpCircle } from "lucide-react";
import { useHolo } from "./useHolo";
import type { RevealItem } from "./HoloCard";

/** Face-down pack card in the grid — holographic tilt/shine on hover. */
export default function PackCard({
  item,
  revealed,
  index,
  onOpen,
}: {
  item?: RevealItem;
  revealed: boolean;
  index: number;
  onOpen: (rect: DOMRect) => void;
}) {
  const { ref, onPointerMove, onPointerLeave } = useHolo<HTMLButtonElement>();
  // The holo effect only applies once the card is revealed (a poster shows).
  const interactive = revealed && !!item;

  return (
    <button
      ref={ref}
      className="pack-card"
      style={{ ["--reveal-delay" as string]: `${index * 110}ms` }}
      onPointerMove={interactive ? onPointerMove : undefined}
      onPointerLeave={interactive ? onPointerLeave : undefined}
      onClick={() => { if (ref.current) onOpen(ref.current.getBoundingClientRect()); }}
      aria-label={revealed && item ? `Reopen ${item.title}` : "Reveal hidden card"}
    >
      <div className="pack-card__tilt">
        {revealed && item ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element -- TMDB CDN poster */}
            <img
              className="pack-card__thumb"
              src={item.poster ? `https://image.tmdb.org/t/p/w342${item.poster}` : "https://picsum.photos/seed/cinevocard/300/450"}
              alt={item.title}
              draggable={false}
            />
            <div className="pack-card__thumb-veil">Tap to view</div>
            {/* Holographic layers — only on revealed cards */}
            <div className="pack-card__shine" />
            <div className="pack-card__glare" />
          </>
        ) : (
          <>
            <div className="pack-card__shimmer" />
            <div className="pack-card__center">
              <div className="pack-card__emblem">
                {item ? <Sparkles className="w-6 h-6 text-accent" /> : <HelpCircle className="w-6 h-6 text-white/40" />}
              </div>
              <span className="pack-card__label">{item ? "Tap to reveal" : "Shuffling…"}</span>
            </div>
          </>
        )}
      </div>
    </button>
  );
}
