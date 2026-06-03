"use client";

import React, { useEffect, useState, useCallback, useTransition } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { Shuffle, Sparkles, X, Star, Play, Clapperboard, SlidersHorizontal } from "lucide-react";
import HoloCard from "./HoloCard";
import type { RevealItem, RevealPreference } from "./types";
import PackCard from "./PackCard";
import PreferencePanel from "./PreferencePanel";
import { useTrailer } from "@/components/TrailerProvider";
import { useRevealEffect } from "./revealEffectStore";
import { pickWithPreferenceAction } from "@/app/actions/tmdb-actions";

const DEFAULT_COUNT = 5;

function pickRandom(pool: RevealItem[], n: number): RevealItem[] {
  const copy = [...pool];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

export default function RevealClient({ pool: initialPool }: { pool: RevealItem[] }) {
  // Pick on the client after mount so the secret isn't in the SSR HTML and the
  // face-down covers hydrate identically.
  const [pool, setPool] = useState<RevealItem[]>(initialPool);
  const [count, setCount] = useState(DEFAULT_COUNT);
  const [picks, setPicks] = useState<RevealItem[]>([]);
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [openRect, setOpenRect] = useState<DOMRect | null>(null);
  const [showPrefs, setShowPrefs] = useState(false);
  const [prefError, setPrefError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const { openTrailer } = useTrailer();
  const effectKey = useRevealEffect();

  const dealFrom = useCallback((src: RevealItem[], n: number) => {
    setPicks(pickRandom(src, Math.min(n, src.length || n)));
    setRevealed(new Set());
    setOpenIndex(null);
  }, []);

  const deal = useCallback(() => dealFrom(pool, count), [dealFrom, pool, count]);

  // Initial deal from the default (trending/top) pool.
  useEffect(() => { dealFrom(initialPool, DEFAULT_COUNT); }, [dealFrom, initialPool]);

  const generateFromPrefs = (prefs: RevealPreference[], n: number) => {
    setPrefError(null);
    startTransition(async () => {
      const results = await Promise.all(prefs.map((p) => pickWithPreferenceAction(p)));
      const seen = new Set<string>();
      const merged: RevealItem[] = [];
      for (const r of results) {
        if (!r.success) continue;
        for (const it of r.data) {
          const k = `${it.mediaType}:${it.id}`;
          if (!seen.has(k)) { seen.add(k); merged.push(it); }
        }
      }
      if (merged.length === 0) {
        setPrefError("No titles matched those preferences — try widening them.");
        return;
      }
      setPool(merged);
      setCount(n);
      dealFrom(merged, n);
      setShowPrefs(false);
    });
  };

  // Lock body scroll + close on Escape while the stage is open. Also flag the
  // body so the site menu can hide (its toggle sits where the close button is).
  useEffect(() => {
    if (openIndex === null) return;
    document.body.style.overflow = "hidden";
    document.body.classList.add("reveal-open");
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpenIndex(null); };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.body.classList.remove("reveal-open");
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
    // matches .holo-stage-card { width: min(92vw, 56vh) }
    const cardW = Math.min(vw * 0.92, vh * 0.56);
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
          Your {picks.length || count} mystery {(picks.length || count) === 1 ? "pick" : "picks"}
        </h1>
        <p className="text-sm text-fg-secondary mt-3 max-w-md mx-auto">
          Hidden titles, chosen at random. Tap a card to open it full-screen.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
          <button
            onClick={deal}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-accent text-white hover:bg-accent-hover active:scale-95 transition-all shadow-[0_8px_30px_rgba(229,62,79,0.35)] cursor-pointer"
          >
            <Shuffle className="w-4 h-4" /> New pack
          </button>
          <button
            onClick={() => setShowPrefs((s) => !s)}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold border transition-all active:scale-95 cursor-pointer ${showPrefs ? "bg-accent/15 border-accent/40 text-accent" : "bg-white/[0.06] border-white/[0.12] text-fg hover:bg-white/[0.12]"}`}
          >
            <SlidersHorizontal className="w-4 h-4" /> Pick with Preference
          </button>
        </div>
      </motion.div>

      {/* Preference panel */}
      <AnimatePresence initial={false}>
        {showPrefs && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden max-w-3xl mx-auto"
          >
            {prefError && (
              <div className="mb-3 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-center">
                {prefError}
              </div>
            )}
            <PreferencePanel loading={pending} onGenerate={generateFromPrefs} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Face-down pack grid — flex-wrap + center so any count stays centered */}
      <div className="flex flex-wrap justify-center gap-4 sm:gap-6 lg:gap-8">
        {Array.from({ length: picks.length || count }).map((_, i) => (
          <div key={`${picks[i]?.id ?? "empty"}-${i}`} className="w-[140px] sm:w-[170px] lg:w-[190px]">
            <PackCard
              item={picks[i]}
              revealed={revealed.has(i)}
              index={i}
              onOpen={(rect) => open(i, rect)}
            />
          </div>
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
                <HoloCard key={`${opened.mediaType}:${opened.id}`} item={opened} effectKey={effectKey} />
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
