"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { Play, Clapperboard, X } from "lucide-react";
import DomeGallery from "@/components/reactbits/DomeGallery";
import HoloCard from "@/components/reveal/HoloCard";
import { useRevealEffect } from "@/components/reveal/revealEffectStore";
import type { RevealItem } from "@/components/reveal/types";
import { useTrailer } from "@/components/TrailerProvider";

export interface DomeImage {
  src: string;
  alt: string;
  id: number;
  mediaType: "movie" | "tv";
  title: string;
  poster: string | null;
}

interface OpenedRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface OpenedItem {
  id: string;
  mediaType: "movie" | "tv";
  title: string;
  poster: string;
  rect: OpenedRect;
}

export default function TrendingDome({ images }: { images: DomeImage[] }) {
  const router = useRouter();
  const { openTrailer } = useTrailer();
  const effectKey = useRevealEffect();
  const domeControls = useRef<{ close: () => void } | null>(null);
  const [opened, setOpened] = useState<OpenedItem | null>(null);
  // Kept across close so the exit animation can fly back to the same tile.
  const [flipRect, setFlipRect] = useState<OpenedRect | null>(null);

  const handleOpen = useCallback((it: OpenedItem) => {
    setFlipRect(it.rect);
    setOpened(it);
  }, []);

  // Close is owned by DomeGallery (it releases the focused tile + unlocks
  // scroll); its onCloseItem callback then clears our opened state.
  const close = useCallback(() => domeControls.current?.close(), []);

  const play = () => {
    if (!opened) return;
    router.push(`/watch/${opened.mediaType}/${opened.id}`);
  };

  const trailer = () => {
    if (!opened) return;
    openTrailer({ id: opened.id, mediaType: opened.mediaType, title: opened.title });
  };

  // Close on Escape while a card is open.
  useEffect(() => {
    if (!opened) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [opened, close]);

  // FLIP transform: where the centered full-screen card should start/return to
  // so it appears to grow out of — and shrink back into — its dome tile.
  const flip = (() => {
    if (!flipRect || typeof window === "undefined") {
      return { x: 0, y: 0, scale: 0.5 };
    }
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    // matches .holo-stage-card { width: min(92vw, 56vh) }
    const cardW = Math.min(vw * 0.92, vh * 0.56);
    return {
      x: flipRect.left + flipRect.width / 2 - vw / 2,
      y: flipRect.top + flipRect.height / 2 - vh / 2,
      scale: flipRect.width / cardW,
    };
  })();

  // The holo card expects a TMDB poster *path* (it builds a w780 URL itself).
  const revealItem: RevealItem | null = opened
    ? {
      id: Number(opened.id),
      mediaType: opened.mediaType,
      title: opened.title,
      poster: opened.poster || null,
      rating: 0,
      year: "",
    }
    : null;

  return (
    <div className="absolute inset-0">
      <DomeGallery
        controlsRef={domeControls}
        images={images}
        revealMode
        grayscale={false}
        autoRotate
        autoRotateSpeed={6}
        fit={0.62}
        minRadius={600}
        maxVerticalRotationDeg={12}
        dragDampening={1.4}
        overlayBlurColor="#08080f"
        imageBorderRadius="16px"
        onOpenItem={handleOpen}
        onCloseItem={() => setOpened(null)}
      />

      {/* Full-screen holographic reveal — same effect/animation as the Mystery
          pack: a 360° flip out of the tile, blurred backdrop, and holo shine. */}
      <div className="reveal-portal">
        <AnimatePresence>
          {opened && revealItem && (
            <motion.div
              key="backdrop"
              className="reveal-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              onClick={close}
            >
              <button className="reveal-close" aria-label="Close" onClick={close}>
                <X className="w-5 h-5" />
              </button>
            </motion.div>
          )}

          {opened && revealItem && (
            <motion.div
              key="card"
              className="reveal-card-layer"
              initial={{ opacity: 0, x: flip.x, y: flip.y, scale: flip.scale, rotateY: -360 }}
              animate={{ opacity: 1, x: 0, y: 0, scale: 1, rotateY: 0 }}
              exit={{ opacity: 0, x: flip.x, y: flip.y, scale: flip.scale, rotateY: -360 }}
              transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1], opacity: { duration: 0.9 } }}
              onClick={close}
            >
              <div onClick={(e) => e.stopPropagation()}>
                {/* key forces a fresh reveal each time a poster opens */}
                <HoloCard key={`${opened.mediaType}:${opened.id}`} item={revealItem} effectKey={effectKey} />
              </div>
            </motion.div>
          )}

          {opened && (
            <motion.div
              key="caption"
              className="reveal-caption"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ delay: 0.55, duration: 0.3 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-fg-secondary">
                <span>{opened.mediaType === "tv" ? "TV Series" : "Movie"}</span>
              </div>
              <h2 className="text-xl font-extrabold text-white max-w-[80vw] truncate">{opened.title}</h2>
              <div className="mt-1 flex items-center gap-3">
                <button
                  onClick={play}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold bg-accent-strong text-white hover:bg-accent-strong-hover hover:scale-[1.03] active:scale-95 transition-all shadow-[0_8px_30px_rgba(229,62,79,0.4)] cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-white" /> Play
                </button>
                <button
                  onClick={trailer}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold bg-white/12 border border-white/18 text-white backdrop-blur-md hover:bg-white/20 hover:scale-[1.03] active:scale-95 transition-all cursor-pointer"
                >
                  <Clapperboard className="w-4 h-4" /> Watch Trailer
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
