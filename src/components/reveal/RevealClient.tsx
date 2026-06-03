"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { Shuffle, Sparkles, X, Star, Play, Clapperboard } from "lucide-react";
import HoloCard, { type RevealItem } from "./HoloCard";
import PackCard from "./PackCard";
import { useTrailer } from "@/components/TrailerProvider";

const PACK_SIZE = 5;

function pickRandom(pool: RevealItem[], n: number): RevealItem[] {
  const copy = [...pool];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

export default function RevealClient({ pool }: { pool: RevealItem[] }) {
  // Pick on the client after mount so the secret isn't in the SSR HTML and the
  // face-down covers hydrate identically.
  const [picks, setPicks] = useState<RevealItem[]>([]);
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [openRect, setOpenRect] = useState<DOMRect | null>(null);
  const { openTrailer } = useTrailer();

  const deal = useCallback(() => {
    setPicks(pickRandom(pool, PACK_SIZE));
    setRevealed(new Set());
    setOpenIndex(null);
  }, [pool]);

  useEffect(() => { deal(); }, [deal]);

  // Lock body scroll + close on Escape while the stage is open.
  useEffect(() => {
    if (openIndex === null) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpenIndex(null); };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [openIndex]);

  const open = (i: number, rect: DOMRect) => {
    if (!picks[i]) return;
    setRevealed((prev) => new Set(prev).add(i));
    setOpenRect(rect);
    setOpenIndex(i);
  };

  const opened = openIndex !== null ? picks[openIndex] : null;

  // FLIP transform: where the centered full-screen card should start/return to
  // so it appears to grow out of — and shrink back into — its grid slot.
  const flip = (() => {
    if (!openRect || typeof window === "undefined") {
      return { x: 0, y: 0, scale: 0.6 };
    }
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const cardH = Math.min(vh * 0.86, 820); // matches .holo-stage-card height
    const cardW = cardH * 0.718;            // matches --card-aspect
    return {
      x: openRect.left + openRect.width / 2 - vw / 2,
      y: openRect.top + openRect.height / 2 - vh / 2,
      scale: openRect.width / cardW,
    };
  })();

  return (
    <section className="relative z-10 pt-24 md:pt-28 px-6 md:px-12 max-w-[1600px] mx-auto pb-16">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-center mb-10"
      >
        <span className="inline-flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.25em] text-accent bg-accent/10 border border-accent/25 px-4 py-1.5 rounded-full mb-4">
          <Sparkles className="w-3.5 h-3.5" /> Secret pack
        </span>
        <h1 className="font-display text-3xl sm:text-5xl font-extrabold tracking-tight leading-[1.05]">
          Your 5 mystery picks
        </h1>
        <p className="text-sm text-fg-secondary mt-3 max-w-md mx-auto">
          Five hidden titles, chosen at random. Tap a card to open it full-screen.
        </p>

        <div className="flex items-center justify-center mt-6">
          <button
            onClick={deal}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-accent text-white hover:bg-accent-hover active:scale-95 transition-all shadow-[0_8px_30px_rgba(229,62,79,0.35)] cursor-pointer"
          >
            <Shuffle className="w-4 h-4" /> New pack
          </button>
        </div>
      </motion.div>

      {/* Face-down pack grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-5 sm:gap-7 lg:gap-8">
        {Array.from({ length: PACK_SIZE }).map((_, i) => (
          <PackCard
            key={`${picks[i]?.id ?? "empty"}-${i}`}
            item={picks[i]}
            revealed={revealed.has(i)}
            index={i}
            onOpen={(rect) => open(i, rect)}
          />
        ))}
      </div>

      {/* Full-screen reveal — backdrop and card are separate so the card stays
          visible and flies back to its grid slot on close (reverse of opening). */}
      <div className="reveal-portal">
        <AnimatePresence>
          {opened && (
            <motion.div
              key="backdrop"
              className="reveal-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              onClick={() => setOpenIndex(null)}
            >
              <button className="reveal-close" aria-label="Close" onClick={() => setOpenIndex(null)}>
                <X className="w-5 h-5" />
              </button>
            </motion.div>
          )}

          {opened && (
            <motion.div
              key="card"
              className="reveal-card-layer"
              initial={{ opacity: 0, x: flip.x, y: flip.y, scale: flip.scale, rotateY: -360 }}
              animate={{ opacity: 1, x: 0, y: 0, scale: 1, rotateY: 0 }}
              exit={{ opacity: 0, x: flip.x, y: flip.y, scale: flip.scale, rotateY: -360 }}
              transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1], opacity: { duration: 0.9 } }}
              onClick={() => setOpenIndex(null)}
            >
              <div onClick={(e) => e.stopPropagation()}>
                {/* key forces a fresh reveal each time a card opens */}
                <HoloCard key={`${opened.mediaType}:${opened.id}`} item={opened} />
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
                {opened.year && <span className="text-muted">• {opened.year}</span>}
                {opened.rating > 0 && (
                  <span className="inline-flex items-center gap-0.5 text-gold">
                    <Star className="w-3.5 h-3.5 fill-gold stroke-gold" />
                    {opened.rating.toFixed(1)}
                  </span>
                )}
              </div>
              <h2 className="text-xl font-extrabold text-white max-w-[80vw] truncate">{opened.title}</h2>
              <div className="mt-1 flex items-center gap-3">
                <Link
                  href={`/watch/${opened.mediaType}/${opened.id}`}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold bg-accent text-white hover:bg-accent-hover active:scale-95 transition-all shadow-[0_8px_30px_rgba(229,62,79,0.4)]"
                >
                  <Play className="w-4 h-4 fill-white" /> Play now
                </Link>
                <button
                  onClick={() => openTrailer({ id: String(opened.id), mediaType: opened.mediaType, title: opened.title })}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold bg-white/[0.12] border border-white/[0.18] text-white backdrop-blur-md hover:bg-white/[0.2] active:scale-95 transition-all"
                >
                  <Clapperboard className="w-4 h-4" /> Watch Trailer
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
