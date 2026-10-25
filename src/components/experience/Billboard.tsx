"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";
import { Clapperboard, Info, Play, Plus } from "lucide-react";
import type { TMDBMedia } from "@/lib/tmdb";
import { useTrailer } from "@/components/TrailerProvider";
import ExperienceBrand from "@/components/theme/ExperienceBrand";

type BillboardKind = "netflix" | "disney" | "apple";

interface BillboardProps {
  variant: BillboardKind;
  items: TMDBMedia[];
  trailers?: Record<number, string | null>;
}

const ENGAGEMENT_EVENTS = ["pointermove", "pointerdown", "touchstart", "keydown"] as const;

function yearOf(item: TMDBMedia) {
  return item.release_date?.split("-")[0] ?? item.first_air_date?.split("-")[0] ?? "2026";
}

function kindOf(item: TMDBMedia) {
  return item.media_type === "tv" ? "TV Series" : "Film";
}

/**
 * The full-bleed masthead for the cloned experiences. Cinevo keeps its own
 * carousel; Netflix gets a billboard with match/maturity metadata, Disney+ a
 * brand-art hero with Watch now / Trailer, and Apple TV+ a centred, frosted
 * treatment. Sharing one component keeps the backdrop, trailer and rotation
 * behaviour honest without inheriting Cinevo's pill badge and dot controls.
 */
export default function Billboard({ variant, items, trailers = {} }: BillboardProps) {
  const { openTrailer } = useTrailer();
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [engaged, setEngaged] = useState(false);
  const [heroLoaded, setHeroLoaded] = useState(false);
  const hoveredRef = useRef(false);

  const slides = items.slice(0, 4);

  useEffect(() => {
    const engage = () => setEngaged(true);
    ENGAGEMENT_EVENTS.forEach((event) =>
      window.addEventListener(event, engage, { once: true, passive: true }),
    );
    return () => ENGAGEMENT_EVENTS.forEach((event) => window.removeEventListener(event, engage));
  }, []);

  // Disney+ rotates its hero; Netflix and Apple hold one billboard so the
  // trailer can play undisturbed, the way both services behave.
  useEffect(() => {
    if (variant !== "disney" || slides.length < 2) return;
    const timer = window.setInterval(() => {
      if (hoveredRef.current) return;
      setIndex((current) => (current + 1) % slides.length);
    }, 7000);
    return () => window.clearInterval(timer);
  }, [variant, slides.length]);

  const item = slides[index];
  if (!item) return null;

  const title = item.title || item.name || "";
  const year = yearOf(item);
  const match = Math.max(50, Math.round((item.vote_average || 0) * 10));
  const rating = variant === "disney" ? "U/A 13+" : variant === "apple" ? "TV-14" : "13+";
  const trailerKey = trailers[item.id];
  const watchHref = `/watch/${item.media_type || "movie"}/${item.id}`;

  const playTrailer = () => {
    openTrailer({
      id: String(item.id),
      mediaType: (item.media_type as "movie" | "tv") || "movie",
      title,
      rating: item.vote_average,
      date: item.release_date || item.first_air_date,
      key: trailerKey,
    });
  };

  return (
    <section
      data-billboard={variant}
      aria-label="Featured spotlight"
      className="bb relative w-full overflow-hidden bg-black"
      onMouseEnter={() => {
        hoveredRef.current = true;
      }}
      onMouseLeave={() => {
        hoveredRef.current = false;
      }}
    >
      {/* Backdrop. Only the active slide's art is mounted, so the LCP image
          isn't queued behind three billboards nobody has reached. */}
      <div className="absolute inset-0">
        <Image
          key={item.id}
          src={
            item.backdrop_path
              ? `https://image.tmdb.org/t/p/original${item.backdrop_path}`
              : "https://picsum.photos/seed/cinevo/1920/1080"
          }
          alt=""
          fill
          priority
          fetchPriority="high"
          sizes="100vw"
          onLoad={!heroLoaded ? () => setHeroLoaded(true) : undefined}
          onError={!heroLoaded ? () => setHeroLoaded(true) : undefined}
          className={`bb-art object-cover ${heroLoaded ? "bb-art-ready" : ""}`}
        />

        {/* Native trailer after the first real gesture; mounting the player on
            load would put YouTube on the critical path for a banner. */}
        {engaged && trailerKey && (variant === "netflix" || variant === "apple") && (
          <motion.div
            initial={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.4, delay: 6, ease: "easeOut" }}
            className="bb-trailer absolute inset-0 overflow-hidden"
            aria-hidden="true"
          >
            <iframe
              {...{ credentialless: "" }}
              src={`https://www.youtube-nocookie.com/embed/${trailerKey}?autoplay=1&mute=1&controls=0&loop=1&playlist=${trailerKey}&modestbranding=1&playsinline=1&rel=0&showinfo=0&iv_load_policy=3`}
              title={`${title} trailer`}
              allow="autoplay; encrypted-media"
              tabIndex={-1}
              className="absolute top-1/2 left-1/2 h-[56.25vw] min-h-full w-[177.78vh] min-w-full -translate-x-1/2 -translate-y-1/2 border-0"
            />
          </motion.div>
        )}

        <div className="bb-fade-bottom absolute inset-0" />
        <div className={`bb-fade-side absolute inset-0 ${variant === "apple" ? "bb-fade-apple" : ""}`} />
      </div>

      <div className={`bb-inner relative z-10 ${variant === "apple" ? "bb-inner-apple" : ""}`}>
        <motion.div
          key={`${variant}-${item.id}`}
          initial={reduceMotion ? false : { opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: variant === "apple" ? 0.9 : 0.55, ease: "easeOut" }}
          className="bb-copy"
        >
          {variant === "netflix" ? (
            <>
              <span className="bb-kicker">
                A CINEVO {item.media_type === "tv" ? "SERIES" : "FILM"}
              </span>
              <h1 className="bb-title bb-title-netflix">{title}</h1>
              <div className="bb-meta">
                <span className="bb-match">{match}% Match</span>
                <span>{year}</span>
                <span className="bb-chip">{rating}</span>
                <span>{kindOf(item)}</span>
                <span className="bb-chip">HD</span>
              </div>
              <p className="bb-overview">{item.overview}</p>
              <div className="bb-actions">
                <Link href={watchHref} className="bb-btn bb-btn-netflix-play">
                  <Play className="h-5 w-5 fill-current" />
                  Play
                </Link>
                <Link href={watchHref} className="bb-btn bb-btn-netflix-info">
                  <Info className="h-5 w-5" />
                  More Info
                </Link>
              </div>
            </>
          ) : variant === "disney" ? (
            <>
              <span className="bb-kicker bb-kicker-disney">A Cinevo Original</span>
              <h1 className="bb-title bb-title-disney">{title}</h1>
              <div className="bb-meta">
                <span>{year}</span>
                <span className="bb-chip">{rating}</span>
                <span>{kindOf(item)}</span>
                <span className="bb-chip">4K</span>
              </div>
              <p className="bb-overview">{item.overview}</p>
              <div className="bb-actions">
                <Link href={watchHref} className="bb-btn bb-btn-disney-play">
                  <Play className="h-5 w-5 fill-current" />
                  Watch now
                </Link>
                <button type="button" onClick={playTrailer} className="bb-btn bb-btn-disney-trailer">
                  <Clapperboard className="h-5 w-5" />
                  Trailer
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="bb-apple-brand">
                <ExperienceBrand className="xp-billboard-brand" />
              </div>
              <span className="bb-kicker bb-kicker-apple">A Cinevo Original</span>
              <h1 className="bb-title bb-title-apple">{title}</h1>
              <div className="bb-meta bb-meta-apple">
                <span>{kindOf(item)}</span>
                <span className="bb-dot" />
                <span>{year}</span>
                <span className="bb-dot" />
                <span>{rating}</span>
              </div>
              <p className="bb-overview bb-overview-apple">{item.overview}</p>
              <div className="bb-actions bb-actions-apple">
                <Link href={watchHref} className="bb-btn bb-btn-apple-play">
                  <Play className="h-5 w-5 fill-current" />
                  Watch now
                </Link>
                <button type="button" onClick={playTrailer} className="bb-btn bb-btn-apple-add">
                  <Plus className="h-5 w-5" />
                  Add to Up Next
                </button>
              </div>
            </>
          )}
        </motion.div>
      </div>

      {variant === "netflix" && (
        <>
          <div className="bb-top10" aria-hidden="true">
            <span>TOP</span>
            <strong>10</strong>
            <span>In your area today</span>
          </div>
          <div className="bb-maturity" aria-hidden="true">
            <span className="bb-maturity-rating">{rating}</span>
            <span className="bb-maturity-note">HD</span>
          </div>
        </>
      )}

      {variant === "disney" && slides.length > 1 && (
        <div className="bb-dashes" role="group" aria-label="Choose spotlight">
          {slides.map((slide, slideIndex) => (
            <button
              key={slide.id}
              type="button"
              onClick={() => setIndex(slideIndex)}
              aria-label={`Show slide ${slideIndex + 1}`}
              aria-current={slideIndex === index ? "true" : undefined}
              className="bb-dash-hit"
            >
              <span className={`bb-dash ${slideIndex === index ? "bb-dash-on" : ""}`} />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
