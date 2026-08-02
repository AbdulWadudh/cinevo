"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { X, ChevronLeft, ChevronRight, Clock, Film, Tv, Play } from "lucide-react";
import {
  getUserWatchHistoryAction,
  type AdminUser,
  type UserWatchEntry,
  type UserWatchPage,
} from "@/app/actions/admin";
import { relativeTime } from "@/lib/relativeTime";

const POSTER_FALLBACK = "https://picsum.photos/seed/cinevodefault/300/450";

/**
 * Resumes where the entry left off — the same target the history page uses,
 * plus `?preview=1` so looking at someone else's title doesn't write it into
 * the admin's own watch history.
 */
function watchUrl(entry: UserWatchEntry): string {
  return entry.mediaType === "tv"
    ? `/watch/tv/${entry.mediaId}?season=${entry.season || 1}&episode=${
        entry.episode || 1
      }&preview=1`
    : `/watch/movie/${entry.mediaId}?preview=1`;
}

interface UserWatchDialogProps {
  /** The user whose history to show — `null` closes the dialog. */
  user: AdminUser | null;
  onClose: () => void;
}

/** Admin dialog listing everything a user has watched, newest first. */
export default function UserWatchDialog({ user, onClose }: UserWatchDialogProps) {
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!user) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [user, onClose]);

  return (
    <AnimatePresence>
      {user && (
        <motion.div
          className="fixed inset-0 z-60 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={`Watch history for ${user.username || user.email}`}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.94, y: 12 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            className="relative flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-bg-elevated shadow-2xl shadow-black/70"
          >
            <div className="flex flex-none items-center justify-between gap-3 border-b border-white/6 px-5 py-3.5">
              <div className="flex min-w-0 items-center gap-2.5">
                <Avatar user={user} />
                <div className="min-w-0">
                  <h3 className="truncate font-display text-sm font-bold text-white">
                    {user.username || user.email.split("@")[0]}
                  </h3>
                  <p className="truncate text-[11px] text-muted">{user.email}</p>
                </div>
              </div>
              <motion.button
                type="button"
                onClick={onClose}
                aria-label="Close"
                whileHover={reduceMotion ? undefined : { scale: 1.15, rotate: 90 }}
                whileTap={reduceMotion ? undefined : { scale: 0.85 }}
                className="flex-none cursor-pointer text-muted transition-colors hover:text-white"
              >
                <X className="size-4" />
              </motion.button>
            </div>

            {/* Keyed on the user so switching rows refetches by remounting,
                rather than syncing props into state from an effect. */}
            <DialogBody key={user.id} userId={user.id} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function DialogBody({ userId }: { userId: string }) {
  const reduceMotion = useReducedMotion();
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<{ page: number; data: UserWatchPage | null } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const data = result?.data ?? null;
  const loading = result?.page !== page;

  useEffect(() => {
    let cancelled = false;

    getUserWatchHistoryAction(userId, page).then((res) => {
      if (cancelled) return;
      if (res.success && res.data) {
        setError(null);
        setResult({ page, data: res.data });
      } else {
        setError(res.error ?? "Could not load this history");
        // Settle the page anyway, or the list would sit loading forever.
        setResult((prev) => ({ page, data: prev?.data ?? null }));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [userId, page]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
        {loading && !data ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <motion.div
                key={i}
                className="h-18 rounded-xl border border-white/6 bg-surface/40"
                animate={reduceMotion ? { opacity: 0.45 } : { opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.06 }}
              />
            ))}
          </div>
        ) : error && !data ? (
          <p className="py-10 text-center text-sm text-red-400">{error}</p>
        ) : !data || data.entries.length === 0 ? (
          <div className="py-12 text-center">
            <Clock className="mx-auto mb-3 size-8 text-muted" />
            <p className="text-sm text-muted">Nothing watched yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence mode="popLayout">
              {data.entries.map((entry, i) => {
                const pct =
                  entry.duration > 0
                    ? Math.min(100, Math.round((entry.progress / entry.duration) * 100))
                    : 0;
                const isTv = entry.mediaType === "tv";

                return (
                  <motion.div
                    key={entry.id}
                    layout={!reduceMotion}
                    initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduceMotion ? undefined : { opacity: 0, scale: 0.97 }}
                    transition={{
                      duration: 0.25,
                      ease: "easeOut",
                      delay: reduceMotion ? 0 : Math.min(i * 0.03, 0.3),
                    }}
                  >
                    {/* Opens in a new tab so the admin keeps their place in
                        the list instead of losing it to the player. */}
                    <Link
                      href={watchUrl(entry)}
                      target="_blank"
                      rel="noreferrer noopener"
                      aria-label={`Open ${entry.title} in a new tab`}
                      title={`Open ${entry.title} in a new tab`}
                      className="group flex items-center gap-3 rounded-xl border border-white/6 bg-surface/50 p-2.5 transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/40 hover:bg-surface/80 active:scale-[0.99]"
                    >
                      <div className="relative aspect-2/3 w-11 flex-none overflow-hidden rounded-lg border border-white/8 bg-surface-hover">
                        <Image
                          src={
                            entry.posterPath
                              ? `https://image.tmdb.org/t/p/w300${entry.posterPath}`
                              : POSTER_FALLBACK
                          }
                          alt=""
                          fill
                          sizes="44px"
                          className="object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 grid place-items-center bg-black/50 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                          <Play className="size-3.5 fill-white text-white" />
                        </div>
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-white transition-colors group-hover:text-accent">
                          {entry.title}
                        </p>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted">
                          <span className="flex flex-none items-center gap-1">
                            {isTv ? <Tv className="size-3" /> : <Film className="size-3" />}
                            {isTv ? `S${entry.season ?? 1} E${entry.episode ?? 1}` : "Movie"}
                          </span>
                          <span aria-hidden>·</span>
                          <span className="flex-none">{relativeTime(entry.watchedAt)}</span>
                        </div>

                        <div className="mt-1.5 flex items-center gap-2">
                          <div className="h-1 min-w-0 flex-1 overflow-hidden rounded-full bg-white/8">
                            <motion.div
                              initial={reduceMotion ? false : { width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: 0.5, ease: "easeOut" }}
                              className={`h-full rounded-full ${
                                pct >= 90 ? "bg-emerald-400" : "bg-accent-strong"
                              }`}
                            />
                          </div>
                          <span className="flex-none text-[10px] font-bold tabular-nums text-fg-secondary">
                            {pct}%
                          </span>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      <div className="flex flex-none items-center justify-between gap-3 border-t border-white/6 px-5 py-3">
        <span className="text-[11px] text-muted">
          {data && data.total > 0
            ? `${(data.page - 1) * data.pageSize + 1}–${Math.min(
                data.page * data.pageSize,
                data.total
              )} of ${data.total.toLocaleString()} watched`
            : " "}
        </span>

        {data && data.total > data.pageSize && (
          <div className="flex items-center gap-1.5">
            <PageButton
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              label="Previous page"
            >
              <ChevronLeft className="size-4" />
            </PageButton>
            <span className="px-1 text-[11px] tabular-nums text-fg-secondary">
              {page} / {totalPages}
            </span>
            <PageButton
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => p + 1)}
              label="Next page"
            >
              <ChevronRight className="size-4" />
            </PageButton>
          </div>
        )}
      </div>
    </>
  );
}

function Avatar({ user }: { user: AdminUser }) {
  const initial = (user.username || user.email).charAt(0).toUpperCase();

  if (!user.avatarUrl) {
    return (
      <div className="grid size-9 flex-none place-items-center rounded-lg border border-white/8 bg-bg/60 text-xs font-extrabold text-fg-secondary">
        {initial}
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={user.avatarUrl}
      alt=""
      referrerPolicy="no-referrer"
      className="size-9 flex-none rounded-lg border border-white/8 object-cover"
    />
  );
}

function PageButton({
  disabled,
  onClick,
  label,
  children,
}: {
  disabled: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="flex size-8 cursor-pointer items-center justify-center rounded-lg border border-white/8 bg-bg/50 text-fg-secondary transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}
