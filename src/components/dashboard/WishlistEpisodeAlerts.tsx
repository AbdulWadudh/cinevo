"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { CalendarClock, ChevronRight, Film, Sparkles } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { getNewEpisodeNotifications } from "@/app/actions/notifications";
import type { EpisodeNotification } from "@/lib/episodeNotifications";

export default function WishlistEpisodeAlerts() {
  const reduceMotion = useReducedMotion();
  const [items, setItems] = useState<EpisodeNotification[]>([]);

  useEffect(() => {
    let active = true;
    getNewEpisodeNotifications()
      .then((notifications) => {
        if (active) setItems(notifications.slice(0, 3));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  if (items.length === 0) return null;

  return (
    <section className="mb-10 px-6 md:px-12" aria-labelledby="episode-alerts-title">
      <div className="mb-4">
        <h2
          id="episode-alerts-title"
          className="font-display text-xl font-bold tracking-tight md:text-2xl"
        >
          From your wishlist
        </h2>
        <p className="mt-1 text-xs text-muted">New and upcoming episodes</p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {items.map((item, index) => {
          const airDate = new Intl.DateTimeFormat(undefined, {
            month: "short",
            day: "numeric",
          }).format(new Date(`${item.airDate}T00:00:00`));

          return (
            <motion.article
              key={item.id}
              initial={reduceMotion ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.06, ease: "easeOut" }}
              whileHover={reduceMotion ? undefined : { y: -3 }}
              whileTap={reduceMotion ? undefined : { scale: 0.99 }}
            >
              <Link
                href={`/watch/tv/${item.mediaId}?season=${item.season}&episode=${item.episode}`}
                className="group flex min-h-24 items-center gap-3 rounded-2xl border border-white/8 bg-surface/80 p-3 transition-colors hover:border-accent/40 hover:bg-surface-hover"
              >
                <div className="grid h-20 w-14 flex-none place-items-center overflow-hidden rounded-lg bg-surface-hover text-muted">
                  {item.posterPath ? (
                    <Image
                      src={`https://image.tmdb.org/t/p/w185${item.posterPath}`}
                      alt=""
                      width={56}
                      height={80}
                      sizes="56px"
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <Film className="size-5" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-bold transition-colors group-hover:text-accent">
                    {item.title}
                  </h3>
                  <p className="mt-1 truncate text-xs text-fg-secondary">
                    S{item.season} E{item.episode} · {item.episodeName}
                  </p>
                  <p
                    className={`mt-2 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider ${
                      item.kind === "upcoming" ? "text-blue" : "text-success"
                    }`}
                  >
                    {item.kind === "upcoming" ? (
                      <CalendarClock className="size-3" />
                    ) : (
                      <Sparkles className="size-3" />
                    )}
                    {item.kind === "upcoming" ? `Airs ${airDate}` : "New episode"}
                  </p>
                </div>
                <ChevronRight className="size-4 flex-none text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-accent" />
              </Link>
            </motion.article>
          );
        })}
      </div>
    </section>
  );
}
