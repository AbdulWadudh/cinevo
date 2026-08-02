"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";
import { Star, Play, ChevronLeft, ChevronRight, Clapperboard } from "lucide-react";
import { TMDBMedia } from "@/lib/tmdb";
import { useTrailer } from "@/components/TrailerProvider";
import { FocusSection, FocusableLink, FocusableButton } from "@/components/tv/Focusable";

interface HeroCarouselProps {
  items: TMDBMedia[];
  /** Map of media id → YouTube trailer key (or null) for inline banner playback. */
  trailers?: Record<number, string | null>;
}

/** Gestures that mean a person is actually here. Deliberately not `scroll` —
 *  tooling and restored scroll positions fire that without anyone present. */
const ENGAGEMENT_EVENTS = ["pointermove", "pointerdown", "touchstart", "keydown"] as const;

export default function HeroCarousel({ items, trailers = {} }: HeroCarouselProps) {
  const { openTrailer } = useTrailer();
  const reduceMotion = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const hoveredRef = useRef(false);

  // The backdrop paints immediately; the trailer waits for the first real
  // gesture. Mounting YouTube's player on load put ~1MB of third-party script
  // on the critical path and let the embed drop cookies on visitors who never
  // asked for a video — for a banner most people scroll straight past.
  const [engaged, setEngaged] = useState(false);

  // Only the visible slide's backdrop is mounted up front. All six used to sit
  // in the DOM at `inset-0`, so every one counted as in-viewport and downloaded
  // immediately — six full-bleed backdrops before the page was usable, five of
  // them for slides nobody had reached. The neighbours (for the cross-fade in
  // either direction) mount once the first one has painted, so they can't
  // compete with the LCP image for bandwidth.
  const [heroLoaded, setHeroLoaded] = useState(false);

  useEffect(() => {
    const engage = () => setEngaged(true);
    ENGAGEMENT_EVENTS.forEach((e) =>
      window.addEventListener(e, engage, { once: true, passive: true })
    );
    return () => ENGAGEMENT_EVENTS.forEach((e) => window.removeEventListener(e, engage));
  }, []);

  const carouselItems = items.slice(0, 6); // Top 6 trending items

  const startAutoPlay = () => {
    stopAutoPlay();
    timerRef.current = setInterval(() => {
      // Pause rotation while the user is hovering the banner.
      if (hoveredRef.current) return;
      setActiveIndex((prevIndex) => (prevIndex + 1) % carouselItems.length);
    }, 7000); // Rotate every 7 seconds
  };

  const stopAutoPlay = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  };

  useEffect(() => {
    if (carouselItems.length > 0) {
      startAutoPlay();
    }
    return () => stopAutoPlay();
  }, [carouselItems.length]);

  const handlePrev = (e: React.MouseEvent) => {
    e.preventDefault();
    setActiveIndex((prevIndex) => (prevIndex - 1 + carouselItems.length) % carouselItems.length);
    startAutoPlay();
  };

  const handleNext = (e: React.MouseEvent) => {
    e.preventDefault();
    setActiveIndex((prevIndex) => (prevIndex + 1) % carouselItems.length);
    startAutoPlay();
  };

  const handleDotClick = (index: number) => {
    setActiveIndex(index);
    startAutoPlay();
  };

  if (carouselItems.length === 0) return null;

  return (
    <section 
      className="relative w-full h-[85vh] min-h-[500px] max-h-[850px] overflow-hidden mb-8 group/hero"
      onMouseEnter={() => { hoveredRef.current = true; }}
      onMouseLeave={() => { hoveredRef.current = false; }}
    >
      {/* Slides */}
      {carouselItems.map((item, index) => {
        const isActive = index === activeIndex;
        const total = carouselItems.length;
        // Either neighbour, so the cross-fade has something to fade to whichever
        // way the carousel moves.
        const isNeighbour =
          index === (activeIndex + 1) % total || index === (activeIndex - 1 + total) % total;
        const showBackdrop = isActive || (heroLoaded && isNeighbour);
        const releaseYear = item.release_date
          ? item.release_date.split("-")[0] 
          : item.first_air_date 
            ? item.first_air_date.split("-")[0] 
            : "2026";

        return (
          <div
            key={item.id}
            className={`absolute inset-0 w-full h-full transition-opacity duration-1000 ease-in-out ${
              isActive ? "opacity-100 z-10 pointer-events-auto" : "opacity-0 z-0 pointer-events-none"
            }`}
          >
            {/* Backdrop Image. The size segment here is cosmetic — the custom
                loader rewrites it to the bucket that matches the rendered width. */}
            <div className="absolute inset-0 w-full h-full">
              {showBackdrop && (
                <Image
                  src={item.backdrop_path ? `https://image.tmdb.org/t/p/original${item.backdrop_path}` : "https://picsum.photos/seed/cinevo/1920/1080"}
                  alt={item.title || item.name || ""}
                  fill
                  priority={index === 0}
                  // `priority` alone only emits the preload link; the LCP element
                  // wants the hint on the tag itself so the fetch outranks the
                  // poster rows queued behind it.
                  fetchPriority={index === 0 ? "high" : undefined}
                  // Unlock the neighbours off whichever backdrop is on screen,
                  // and off `onError` too, so a dead image can't strand the
                  // carousel with nothing left to fade to.
                  onLoad={isActive && !heroLoaded ? () => setHeroLoaded(true) : undefined}
                  onError={isActive && !heroLoaded ? () => setHeroLoaded(true) : undefined}
                  sizes="100vw"
                  className={`object-cover brightness-[0.55] transition-transform duration-7000 ease-out ${
                    isActive ? "scale-105" : "scale-100"
                  }`}
                />
              )}

              {/* Inline muted trailer preview (active slide only), fading up over
                  the backdrop once the visitor has shown they're here. */}
              {isActive && engaged && trailers[item.id] && (
                <motion.div
                  initial={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className="absolute inset-0 overflow-hidden pointer-events-none"
                >
                  <iframe
                    // youtube-nocookie + `credentialless`: the frame gets an
                    // ephemeral, empty cookie jar. Muted looping playback needs
                    // neither cookies nor a signed-in session.
                    {...{ credentialless: "" }}
                    src={`https://www.youtube-nocookie.com/embed/${trailers[item.id]}?autoplay=1&mute=1&controls=0&loop=1&playlist=${trailers[item.id]}&modestbranding=1&playsinline=1&rel=0&showinfo=0&iv_load_policy=3`}
                    title={`${item.title || item.name} trailer`}
                    allow="autoplay; encrypted-media"
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[177.78vh] min-w-full h-[56.25vw] min-h-full border-0 brightness-[0.55]"
                  />
                </motion.div>
              )}

              <div className="absolute inset-0 bg-gradient-to-t from-bg via-transparent to-black/30" />
              <div className="absolute inset-0 bg-gradient-to-r from-bg/90 via-bg/40 to-transparent" />
            </div>

            {/* Full-banner click target → details (sits below the info/controls
                layers). Pointer-only convenience: it duplicates "Play Now", so it
                stays out of the tab order and the accessibility tree rather than
                announcing the same destination twice. */}
            {isActive && (
              <Link
                href={`/watch/${item.media_type || "movie"}/${item.id}`}
                tabIndex={-1}
                aria-hidden="true"
                className="absolute inset-0 z-10"
              />
            )}

            {/* Info details (panel ignores clicks so the banner link works; buttons re-enable them) */}
            <div className="absolute bottom-0 left-0 right-0 z-20 px-6 md:px-12 pb-20 max-w-2xl text-left pointer-events-none">
              <span className="inline-block text-[10px] font-extrabold tracking-widest text-accent uppercase bg-accent/10 px-3 py-1 rounded-full border border-accent/20 mb-4 animate-pulse">
                Trending Now
              </span>
              
              <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-extrabold leading-[1.08] tracking-tight text-white mb-4 drop-shadow-md">
                {item.title || item.name}
              </h1>
              
              <div className="flex items-center gap-3 text-xs sm:text-sm text-fg-secondary font-medium mb-4 flex-wrap">
                <span className="bg-gold text-black text-xs font-extrabold px-2.5 py-[3px] rounded flex items-center gap-1 shadow-sm">
                  <Star className="w-3.5 h-3.5 fill-black stroke-black" />
                  {item.vote_average ? item.vote_average.toFixed(1) : "N/A"}
                </span>
                <span>&bull;</span>
                <span>{releaseYear}</span>
              </div>
              
              <p className="text-sm text-fg-secondary leading-relaxed mb-6 line-clamp-3 md:line-clamp-4 max-w-[85%]">
                {item.overview}
              </p>
              
              {/* Only the active slide's actions are focusable (others are hidden). */}
              {isActive && (
                <FocusSection className="flex items-center gap-3 pointer-events-auto" focusKey="HERO_ACTIONS" saveChild={false}>
                  <FocusableLink
                    href={`/watch/${item.media_type || "movie"}/${item.id}`}
                    className="relative z-20 inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-bold bg-accent-strong text-white hover:bg-accent-strong-hover hover:shadow-[0_6px_20px_rgba(229,62,79,0.35)] transition-all cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-white" /> Play Now
                  </FocusableLink>
                  <FocusableButton
                    onPress={() =>
                      openTrailer({
                        id: String(item.id),
                        mediaType: (item.media_type as "movie" | "tv") || "movie",
                        title: item.title || item.name || "",
                        rating: item.vote_average,
                        date: item.release_date || item.first_air_date,
                        key: trailers[item.id],
                      })
                    }
                    className="relative z-20 inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-bold bg-white/[0.12] text-white border border-white/20 hover:bg-white/20 backdrop-blur-md transition-all cursor-pointer"
                  >
                    <Clapperboard className="w-4 h-4" /> Watch Trailer
                  </FocusableButton>
                </FocusSection>
              )}
            </div>
          </div>
        );
      })}

      {/* Navigation Arrow buttons */}
      <button
        onClick={handlePrev}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-30 p-2.5 rounded-full bg-black/40 hover:bg-accent-strong text-white border border-white/8 hover:border-accent opacity-0 group-hover/hero:opacity-100 transition-all duration-300 backdrop-blur-md cursor-pointer hover:scale-105"
        aria-label="Previous Slide"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      <button
        onClick={handleNext}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-30 p-2.5 rounded-full bg-black/40 hover:bg-accent-strong text-white border border-white/8 hover:border-accent opacity-0 group-hover/hero:opacity-100 transition-all duration-300 backdrop-blur-md cursor-pointer hover:scale-105"
        aria-label="Next Slide"
      >
        <ChevronRight className="w-5 h-5" />
      </button>

      {/* Indicator Dots — the dot itself stays small, but each button keeps a
          44px-tall / 28px-wide hit area so it is thumb-reachable and clears the
          24px minimum target size. */}
      <div
        className="absolute bottom-1 left-1/2 -translate-x-1/2 z-30 flex items-center gap-0.5"
        role="group"
        aria-label="Choose slide"
      >
        {carouselItems.map((item, index) => {
          const isActive = index === activeIndex;
          return (
            <button
              key={item.id}
              onClick={() => handleDotClick(index)}
              className="group/dot grid h-11 w-7 cursor-pointer place-items-center"
              aria-label={`Go to slide ${index + 1} of ${carouselItems.length}`}
              aria-current={isActive ? "true" : undefined}
            >
              <span
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  isActive ? "w-6 bg-accent-strong" : "w-1.5 bg-white/40 group-hover/dot:bg-white/70"
                }`}
              />
            </button>
          );
        })}
      </div>
    </section>
  );
}
