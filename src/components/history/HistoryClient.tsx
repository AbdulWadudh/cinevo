"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import {
  Clock, Play, Trash2, CheckSquare, Square, X, Loader2, AlertCircle, History as HistoryIcon,
} from "lucide-react";
import { deleteWatchProgressByIds, clearWatchProgress } from "@/app/actions/progress";

export interface HistoryItem {
  id: string;
  mediaId: string;
  mediaType: string;
  title: string;
  posterPath: string | null;
  season: number | null;
  episode: number | null;
  progress: number;
  duration: number;
  updatedAt: string;
}

/** "3 days ago" style relative time from an ISO string. */
function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  const wk = Math.floor(day / 7);
  if (wk < 5) return `${wk}w ago`;
  return new Date(iso).toLocaleDateString();
}

function watchUrl(item: HistoryItem): string {
  return item.mediaType === "tv"
    ? `/watch/tv/${item.mediaId}?season=${item.season || 1}&episode=${item.episode || 1}`
    : `/watch/movie/${item.mediaId}`;
}

export default function HistoryClient({ initial }: { initial: HistoryItem[] }) {
  const [items, setItems] = useState<HistoryItem[]>(initial);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmClear, setConfirmClear] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const toggleSelect = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const exitSelect = () => {
    setSelectMode(false);
    setSelected(new Set());
  };

  const removeIds = (ids: string[]) => {
    setError(null);
    startTransition(async () => {
      const res = await deleteWatchProgressByIds(ids);
      if (res.success) {
        const gone = new Set(ids);
        setItems((prev) => prev.filter((i) => !gone.has(i.id)));
        setSelected((prev) => {
          const next = new Set(prev);
          ids.forEach((id) => next.delete(id));
          return next;
        });
      } else {
        setError(res.error || "Failed to delete");
      }
    });
  };

  const clearAll = () => {
    setError(null);
    startTransition(async () => {
      const res = await clearWatchProgress();
      if (res.success) {
        setItems([]);
        setConfirmClear(false);
        exitSelect();
      } else {
        setError(res.error || "Failed to clear history");
      }
    });
  };

  return (
    <section className="pt-24 md:pt-28 px-6 md:px-12 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent/15 border border-accent/25 flex items-center justify-center">
            <Clock className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-extrabold tracking-tight">Watch History</h1>
            <p className="text-xs text-muted">{items.length} {items.length === 1 ? "title" : "titles"}</p>
          </div>
        </div>

        {items.length > 0 && (
          <div className="flex items-center gap-2">
            {selectMode ? (
              <>
                <button
                  onClick={() => removeIds([...selected])}
                  disabled={selected.size === 0 || pending}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-bold bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  Delete ({selected.size})
                </button>
                <button
                  onClick={exitSelect}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold bg-white/[0.05] border border-white/[0.1] text-fg-secondary hover:text-fg transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" /> Cancel
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setSelectMode(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold bg-white/[0.05] border border-white/[0.1] text-fg-secondary hover:text-fg hover:bg-white/[0.09] transition-all cursor-pointer"
                >
                  <CheckSquare className="w-4 h-4" /> Select
                </button>
                {confirmClear ? (
                  <button
                    onClick={clearAll}
                    disabled={pending}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-bold bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/30 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    Confirm clear all
                  </button>
                ) : (
                  <button
                    onClick={() => setConfirmClear(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold bg-white/[0.05] border border-white/[0.1] text-fg-secondary hover:text-red-400 hover:border-red-500/40 transition-all cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" /> Clear all
                  </button>
                )}
                {confirmClear && (
                  <button
                    onClick={() => setConfirmClear(false)}
                    className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-white/[0.05] border border-white/[0.1] text-muted hover:text-fg transition-all cursor-pointer"
                    aria-label="Cancel clear all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 mb-4 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          <AlertCircle className="w-4 h-4 flex-none" />
          <span>{error}</span>
        </div>
      )}

      {/* Empty state */}
      {items.length === 0 ? (
        <div className="text-center py-24 text-muted">
          <HistoryIcon className="w-12 h-12 mx-auto mb-4 opacity-30 text-accent" />
          <h3 className="text-lg font-bold text-fg mb-1">No watch history yet</h3>
          <p className="text-sm max-w-xs mx-auto mb-6">Titles you open will show up here so you can jump back in.</p>
          <Link href="/" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-accent text-white hover:bg-accent-hover transition-all">
            Browse titles
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
          <AnimatePresence>
            {items.map((item, i) => {
              const isSel = selected.has(item.id);
              const pct = item.duration > 0 ? Math.min(100, Math.floor((item.progress / item.duration) * 100)) : 0;
              const card = (
                <>
                  <div className={`relative aspect-[2/3] w-full bg-surface-hover rounded-xl overflow-hidden border transition-all duration-300 ${isSel ? "border-accent ring-2 ring-accent/40" : "border-border group-hover:border-accent"}`}>
                    <img
                      src={item.posterPath ? `https://image.tmdb.org/t/p/w300${item.posterPath}` : "https://picsum.photos/seed/cinevodefault/300/450"}
                      alt={item.title}
                      className="w-full h-full object-cover transition duration-500 group-hover:scale-105"
                      loading="lazy"
                    />

                    {pct > 0 && (
                      <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/20">
                        <div style={{ width: `${pct}%` }} className="h-full bg-accent" />
                      </div>
                    )}

                    {/* Hover play (browse mode) */}
                    {!selectMode && (
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/40 transition-opacity duration-300 z-10">
                        <div className="w-10 h-10 bg-accent text-white rounded-full flex items-center justify-center shadow-lg scale-90 group-hover:scale-100 transition-transform">
                          <Play className="w-4 h-4 fill-white translate-x-0.5" />
                        </div>
                      </div>
                    )}

                    {/* Selection checkbox */}
                    {selectMode && (
                      <div className="absolute top-2 left-2 z-20">
                        {isSel
                          ? <CheckSquare className="w-6 h-6 text-accent fill-accent/20" />
                          : <Square className="w-6 h-6 text-white/80 drop-shadow" />}
                      </div>
                    )}

                    {/* Single delete (browse mode) */}
                    {!selectMode && (
                      <button
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); removeIds([item.id]); }}
                        disabled={pending}
                        title="Remove from history"
                        aria-label="Remove from history"
                        className="absolute top-2 right-2 z-20 w-8 h-8 rounded-lg bg-black/60 hover:bg-red-500/80 border border-white/10 hover:border-red-400 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <h5 className="text-[11px] sm:text-xs font-bold truncate text-fg mt-2 group-hover:text-accent transition-colors">
                    {item.title}
                  </h5>
                  <p className="text-[9px] sm:text-[10px] text-muted mt-0.5 flex items-center justify-between gap-1">
                    <span className="truncate">{item.mediaType === "tv" ? `S${item.season} E${item.episode}` : "Movie"}</span>
                    <span className="flex-none">{relativeTime(item.updatedAt)}</span>
                  </p>
                </>
              );

              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.92 }}
                  transition={{ duration: 0.2, delay: Math.min(i * 0.015, 0.3) }}
                >
                  {selectMode ? (
                    <button onClick={() => toggleSelect(item.id)} className="group block text-left w-full cursor-pointer">
                      {card}
                    </button>
                  ) : (
                    <Link href={watchUrl(item)} className="group block cursor-pointer">
                      {card}
                    </Link>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </section>
  );
}
