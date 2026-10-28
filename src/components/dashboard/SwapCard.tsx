"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { Info, Play, Star } from "lucide-react";
import { useTrailer } from "@/components/TrailerProvider";
import { getExperience } from "@/lib/theme/experiences";
import { useTheme } from "@/lib/theme/studio/provider";
import type { TMDBMedia } from "@/lib/tmdb";

interface SwapCardProps {
  item: TMDBMedia;
  mediaType: "movie" | "tv";
  trailers?: Record<number, string | null>;
  engaged?: boolean;
  isFront?: boolean;
}

export default function SwapCard({
  item,
  mediaType,
  trailers = {},
  engaged = false,
  isFront = true,
}: SwapCardProps) {
  const { openTrailer } = useTrailer();
  const { experience } = useTheme();
  const activeExperience = getExperience(experience);
  const reduceMotion = useReducedMotion();
  const title = item.title || item.name || "";
  const releaseYear = item.release_date
    ? item.release_date.split("-")[0]
    : item.first_air_date
      ? item.first_air_date.split("-")[0]
      : "2026";
  const href = `/watch/${item.media_type || mediaType}/${item.id}`;
  const trailer = trailers[item.id];

  return (
    <div className="relative h-full w-full overflow-hidden bg-bg text-white">
      <Image
        src={
          item.backdrop_path
            ? `https://image.tmdb.org/t/p/original${item.backdrop_path}`
            : "https://picsum.photos/seed/cinevo/1920/1080"
        }
        alt={title}
        fill
        priority={isFront}
        draggable={false}
        sizes="100vw"
        className="object-cover brightness-[0.55]"
      />

      {isFront && engaged && trailer && (
        <motion.div
          initial={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="pointer-events-none absolute inset-0 overflow-hidden"
        >
          <iframe
            {...{ credentialless: "" }}
            src={`https://www.youtube-nocookie.com/embed/${trailer}?autoplay=1&mute=1&controls=0&loop=1&playlist=${trailer}&modestbranding=1&playsinline=1&rel=0&showinfo=0&iv_load_policy=3`}
            title={`${title} trailer`}
            allow="autoplay; encrypted-media"
            className="absolute left-1/2 top-1/2 h-[56.25vw] min-h-full w-[177.78vh] min-w-full -translate-x-1/2 -translate-y-1/2 border-0 brightness-[0.55]"
          />
        </motion.div>
      )}

      <div
        data-xp-hero-gradient="bottom"
        className="absolute inset-0 bg-gradient-to-t from-bg via-transparent to-black/30"
      />
      <div
        data-xp-hero-gradient="side"
        className="absolute inset-0 bg-gradient-to-r from-bg/90 via-bg/40 to-transparent"
      />

      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.45, ease: "easeOut" }}
        className="pointer-events-none absolute bottom-0 left-0 right-0 z-20 max-w-3xl px-6 pb-10 text-left md:px-12"
        data-xp-hero-copy=""
      >
        <span
          data-xp-hero-badge=""
          className="mb-4 inline-block rounded-full border border-accent/20 bg-accent/10 px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest text-accent"
        >
          {activeExperience.hero.badge}
        </span>

        <h1
          data-xp-hero-title=""
          className="mb-3 font-display text-3xl font-extrabold leading-[1.08] tracking-tight text-white drop-shadow-md sm:text-4xl md:text-5xl"
        >
          {title}
        </h1>

        {activeExperience.id === "netflix" ? (
          <div
            data-xp-hero-meta=""
            className="mb-3 flex flex-wrap items-center gap-2.5 text-xs font-semibold text-white/85 sm:text-sm"
          >
            <span className="font-bold text-[#46d369]">
              {Math.max(50, Math.round((item.vote_average || 0) * 10))}% Match
            </span>
            <span>{releaseYear}</span>
            <span className="rounded-[2px] border border-white/30 px-1.5 py-0.5 text-[10px] leading-none">
              HD
            </span>
            <span>{item.media_type === "tv" ? "TV Series" : "Film"}</span>
          </div>
        ) : (
          <div
            data-xp-hero-meta=""
            className="mb-3 flex flex-wrap items-center gap-3 text-xs font-medium text-fg-secondary sm:text-sm"
          >
            <span className="flex items-center gap-1 rounded bg-gold px-2.5 py-[3px] text-xs font-extrabold text-black shadow-sm">
              <Star className="h-3.5 w-3.5 fill-black stroke-black" />
              {item.vote_average ? item.vote_average.toFixed(1) : "N/A"}
            </span>
            <span>&bull;</span>
            <span>{releaseYear}</span>
          </div>
        )}

        <p className="mb-4 line-clamp-2 max-w-[85%] text-sm leading-relaxed text-fg-secondary md:line-clamp-3">
          {item.overview}
        </p>

        <div className="flex items-center gap-3 pointer-events-auto">
          <Link
            href={href}
            data-xp-hero-primary=""
            className="relative z-20 inline-flex items-center gap-2 rounded-lg bg-accent-strong px-6 py-3 text-sm font-bold text-white transition-all hover:bg-accent-strong-hover hover:shadow-[0_6px_20px_rgba(var(--accent-rgb),0.35)] cursor-pointer"
          >
            <Play className="h-4 w-4 fill-white" /> {activeExperience.hero.primary}
          </Link>
          {activeExperience.id === "netflix" ? (
            <Link
              href={href}
              data-xp-hero-secondary=""
              className="relative z-20 inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/[0.12] px-6 py-3 text-sm font-bold text-white backdrop-blur-md transition-all hover:bg-white/20 cursor-pointer"
            >
              <Info className="h-4 w-4" /> {activeExperience.hero.secondary}
            </Link>
          ) : (
            <button
              type="button"
              data-xp-hero-secondary=""
              onClick={() =>
                openTrailer({
                  id: String(item.id),
                  mediaType: (item.media_type as "movie" | "tv") || mediaType,
                  title,
                  rating: item.vote_average,
                  date: item.release_date || item.first_air_date,
                })
              }
              className="relative z-20 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-white/20 bg-white/[0.12] px-6 py-3 text-sm font-bold text-white backdrop-blur-md transition-all hover:bg-white/20"
            >
              <Play className="h-4 w-4" /> {activeExperience.hero.secondary}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
