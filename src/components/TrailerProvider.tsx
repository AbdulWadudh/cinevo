"use client";

import React, { createContext, useContext, useCallback, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { X, Loader2, Film, Play, Star } from "lucide-react";
import { getTrailerKeyAction } from "@/app/actions/tmdb-actions";

export interface TrailerMedia {
  id: string;
  mediaType: "movie" | "tv";
  title: string;
  rating?: number;
  /** Raw release_date / first_air_date (YYYY-MM-DD). */
  date?: string;
  /** Pre-fetched YouTube key — skips the lookup when available (e.g. hero). */
  key?: string | null;
}

interface TrailerContextValue {
  openTrailer: (media: TrailerMedia) => void;
}

const TrailerContext = createContext<TrailerContextValue | null>(null);

export function useTrailer(): TrailerContextValue {
  const ctx = useContext(TrailerContext);
  if (!ctx) throw new Error("useTrailer must be used within <TrailerProvider>");
  return ctx;
}

function formatDate(raw?: string): string {
  if (!raw) return "";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
}

export default function TrailerProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [media, setMedia] = useState<TrailerMedia | null>(null);
  const [key, setKey] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const close = useCallback(() => setOpen(false), []);

  const openTrailer = useCallback<TrailerContextValue["openTrailer"]>(async (m) => {
    setMedia(m);
    setOpen(true);
    if (m.key !== undefined && m.key !== null) {
      setKey(m.key);
      setLoading(false);
      return;
    }
    setKey(null);
    setLoading(true);
    const res = await getTrailerKeyAction(m.id, m.mediaType);
    setKey(res.key);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, close]);

  const dateText = formatDate(media?.date);

  return (
    <TrailerContext.Provider value={{ openTrailer }}>
      {children}
      {mounted && createPortal(
        <AnimatePresence>
          {open && media && (
            <motion.div
              className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={close}
            >
              <div className="absolute inset-0 bg-black/85 backdrop-blur-md" />
              <motion.div
                className="relative z-10 w-full max-w-5xl"
                initial={{ scale: 0.95, y: 12 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 12 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header: title + meta on the left, Play + close on the right */}
                <div className="flex items-center justify-between gap-4 mb-3">
                  <div className="min-w-0">
                    <h3 className="font-display text-lg sm:text-2xl font-extrabold text-white truncate">
                      {media.title}
                    </h3>
                    <div className="flex items-center gap-2.5 mt-1 text-xs sm:text-sm font-medium flex-wrap">
                      {media.rating ? (
                        <span className="bg-gold text-black font-extrabold px-2 py-[2px] rounded flex items-center gap-1">
                          <Star className="w-3 h-3 fill-black stroke-black" />
                          {media.rating.toFixed(1)}
                        </span>
                      ) : null}
                      {dateText && <span className="text-fg-secondary">{dateText}</span>}
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-accent">Trailer</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-none">
                    <Link
                      href={`/watch/${media.mediaType}/${media.id}`}
                      onClick={close}
                      className="inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl text-sm font-bold bg-accent text-white hover:bg-accent-hover hover:shadow-[0_6px_20px_rgba(229,62,79,0.35)] transition-all cursor-pointer"
                    >
                      <Play className="w-4 h-4 fill-white" />
                      <span className="hidden sm:inline">Play {media.mediaType === "tv" ? "Show" : "Movie"}</span>
                    </Link>
                    <button
                      onClick={close}
                      aria-label="Close trailer"
                      className="w-10 h-10 rounded-full bg-surface hover:bg-accent text-fg-secondary hover:text-white border border-white/[0.1] flex items-center justify-center transition-all cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Video */}
                <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden border border-white/[0.1] shadow-[0_24px_80px_rgba(0,0,0,0.8)]">
                  {loading ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Loader2 className="w-10 h-10 text-accent animate-spin" />
                    </div>
                  ) : key ? (
                    <iframe
                      src={`https://www.youtube.com/embed/${key}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
                      title={`${media.title} trailer`}
                      allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
                      allowFullScreen
                      className="absolute inset-0 w-full h-full border-0"
                    />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted">
                      <Film className="w-10 h-10 opacity-40" />
                      <p className="text-sm">No trailer available for this title.</p>
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </TrailerContext.Provider>
  );
}
