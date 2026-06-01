"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { Bell, Sparkles, CalendarClock, Check } from "lucide-react";
import { getNewEpisodeNotifications, type EpisodeNotification } from "@/app/actions/notifications";

const DISMISS_KEY = "cinevo:notifDismissed";

function readDismissed(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(DISMISS_KEY) || "[]")); } catch { return new Set(); }
}
function writeDismissed(ids: string[]) {
  try { localStorage.setItem(DISMISS_KEY, JSON.stringify(ids)); } catch { /* ignore */ }
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<EpisodeNotification[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDismissed(readDismissed());
    getNewEpisodeNotifications().then(setItems).catch(() => {});
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const unread = items.filter((i) => !dismissed.has(i.id)).length;

  const markAllRead = () => {
    const ids = items.map((i) => i.id);
    setDismissed(new Set(ids));
    writeDismissed(ids);
  };

  return (
    <div className="relative" ref={wrapRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Notifications"
        className="p-2 text-fg-secondary hover:text-fg hover:bg-white/[0.06] rounded-full transition-all relative cursor-pointer"
      >
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 min-w-[15px] h-[15px] px-1 bg-accent rounded-full text-[9px] font-extrabold text-white flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.18 }}
            className="absolute right-0 mt-2 w-[320px] max-w-[90vw] bg-surface/98 backdrop-blur-2xl border border-white/[0.1] rounded-2xl shadow-[0_24px_60px_rgba(0,0,0,0.7)] overflow-hidden z-50"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-accent">Notifications</p>
              {items.length > 0 && unread > 0 && (
                <button onClick={markAllRead} className="inline-flex items-center gap-1 text-[10px] font-bold text-muted hover:text-fg transition-colors cursor-pointer">
                  <Check className="w-3 h-3" /> Mark all read
                </button>
              )}
            </div>

            <div className="max-h-[60vh] overflow-y-auto">
              {items.length === 0 ? (
                <div className="px-4 py-10 text-center text-muted">
                  <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-xs">No new episodes from your wishlist.</p>
                </div>
              ) : (
                items.map((n) => {
                  const isUnread = !dismissed.has(n.id);
                  return (
                    <Link
                      key={n.id}
                      href={`/watch/tv/${n.mediaId}?season=${n.season}&episode=${n.episode}`}
                      onClick={() => setOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 border-b border-white/[0.04] hover:bg-white/[0.04] transition-colors ${isUnread ? "bg-accent/[0.04]" : ""}`}
                    >
                      <div className="w-9 h-12 rounded-md overflow-hidden bg-surface-hover flex-none">
                        {n.posterPath
                          ? <img src={`https://image.tmdb.org/t/p/w92${n.posterPath}`} alt={n.title} className="w-full h-full object-cover" />
                          : null}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-fg truncate">{n.title}</p>
                        <p className="text-[11px] text-muted truncate">S{n.season} E{n.episode} · {n.episodeName}</p>
                        <span className={`inline-flex items-center gap-1 mt-0.5 text-[9px] font-extrabold uppercase tracking-widest ${n.kind === "upcoming" ? "text-sky-400" : "text-emerald-400"}`}>
                          {n.kind === "upcoming" ? <CalendarClock className="w-2.5 h-2.5" /> : <Sparkles className="w-2.5 h-2.5" />}
                          {n.kind === "upcoming" ? `Airs ${n.airDate}` : "New episode"}
                        </span>
                      </div>
                      {isUnread && <span className="w-2 h-2 rounded-full bg-accent flex-none" />}
                    </Link>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
