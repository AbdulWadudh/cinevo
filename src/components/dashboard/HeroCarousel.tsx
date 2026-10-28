"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";
import { Star, Play, ChevronLeft, ChevronRight, Clapperboard, Info } from "lucide-react";
import CardSwap from "@/components/reactbits/card-swap";
import SwapCard from "@/components/dashboard/SwapCard";
import { TMDBMedia } from "@/lib/tmdb";
import { useTrailer } from "@/components/TrailerProvider";
import { FocusSection, FocusableLink, FocusableButton } from "@/components/tv/Focusable";
import { getExperience } from "@/lib/theme/experiences";
import { useTheme } from "@/lib/theme/studio/provider";

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
  const router = useRouter();
  const { experience, heroEffect, cardDistance } = useTheme();
  const activeExperience = getExperience(experience);
  const swapHero = heroEffect === "swap" && activeExperience.id === "cinevo";
  const reduceMotion = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);
  const [frontIndex, setFrontIndex] = useState(0);
  const [deck, setDeck] = useState({ width: 0, height: 0 });
  const deckRef = useRef<HTMLDivElement>(null);
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

  const stopAutoPlay = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  }, []);

  const startAutoPlay = useCallback(() => {
    stopAutoPlay();
    timerRef.current = setInterval(() => {
      // Pause rotation while the user is hovering the banner.
      if (hoveredRef.current) return;
      setActiveIndex((prevIndex) => (prevIndex + 1) % carouselItems.length);
    }, activeExperience.hero.interval);
  }, [activeExperience.hero.interval, carouselItems.length, stopAutoPlay]);

  useEffect(() => {
    if (carouselItems.length > 0 && !swapHero) {
      startAutoPlay();
    }
    return () => stopAutoPlay();
  }, [carouselItems.length, startAutoPlay, stopAutoPlay, swapHero]);

  useEffect(() => {
    if (!swapHero) return;
    const element = deckRef.current;
    if (!element) return;
    const section = element.closest("section");
    const measure = () => {
      const width = Math.round(element.clientWidth * 0.94);
      const height = Math.round(width * 0.62);
      setDeck((previous) =>
        previous.width === width && previous.height === height
          ? previous
          : { width, height },
      );
    };
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    if (section) observer.observe(section);
    return () => observer.disconnect();
  }, [swapHero]);

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

  if (swapHero) {
    return (
      <section
        data-xp-hero=""
        className="relative mb-8 flex min-h-[100dvh] w-full flex-col items-center justify-center overflow-hidden py-8"
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(var(--accent-rgb),0.16),transparent_60%)]" />
        <div className="relative z-10 mx-auto w-full max-w-7xl px-6">
          <div ref={deckRef} className="w-full">
          {deck.width > 0 && (
            <CardSwap
              width={deck.width}
              height={deck.height}
              cardDistance={cardDistance}
              verticalDistance={70}
              depth={90}
              skewAmount={0}
              visibleCards={4}
              delay={4000}
              autoplay
              pauseOnHover
              draggable
              speed={1}
              bounce={0.35}
              parallax={0.5}
              hoverSpread={0.12}
              dim={0.5}
              cardRadius={18}
              intro
              onChange={(index) => setFrontIndex(index)}
              onCardClick={(index) => {
                if (index !== frontIndex) return;
                const item = carouselItems[index];
                if (item) {
                  router.push(`/watch/${item.media_type || "movie"}/${item.id}`);
                }
              }}
            >
              {carouselItems.map((item, index) => (
                <SwapCard
                  key={item.id}
                  item={item}
                  mediaType={item.media_type === "tv" ? "tv" : "movie"}
                  trailers={trailers}
                  engaged={engaged}
                  isFront={index === frontIndex}
                />
              ))}
            </CardSwap>
          )}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section 
      data-xp-hero=""
      className="relative w-full h-[100dvh] min-h-[500px] overflow-hidden mb-8 group/hero"
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
            aria-hidden={!isActive}
            className={`absolute inset-0 w-full h-full transition-opacity ease-in-out ${
              isActive ? "opacity-100 z-10 pointer-events-auto" : "opacity-0 z-0 pointer-events-none"
            }`}
            style={{ transitionDuration: `${activeExperience.hero.fade}ms` }}
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

              <div data-xp-hero-gradient="bottom" className="absolute inset-0 bg-gradient-to-t from-bg via-transparent to-black/30" />
              <div data-xp-hero-gradient="side" className="absolute inset-0 bg-gradient-to-r from-bg/90 via-bg/40 to-transparent" />
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
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 24 }}
              animate={isActive ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
              transition={{ duration: reduceMotion ? 0 : 0.45, ease: "easeOut" }}
              className="absolute bottom-0 left-0 right-0 z-20 px-6 md:px-12 pb-20 max-w-2xl text-left pointer-events-none"
              data-xp-hero-copy=""
            >
              <span data-xp-hero-badge="" className="inline-block text-[10px] font-extrabold tracking-widest text-accent uppercase bg-accent/10 px-3 py-1 rounded-full border border-accent/20 mb-4 animate-pulse">
                {activeExperience.hero.badge}
              </span>
              
              <h1 data-xp-hero-title="" className="font-display text-4xl sm:text-5xl md:text-6xl font-extrabold leading-[1.08] tracking-tight text-white mb-4 drop-shadow-md">
                {item.title || item.name}
              </h1>
              
              {activeExperience.id === "netflix" ? (
                <div
                  data-xp-hero-meta=""
                  className="mb-4 flex flex-wrap items-center gap-2.5 text-xs font-semibold text-white/85 sm:text-sm"
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
                  className="flex items-center gap-3 text-xs sm:text-sm text-fg-secondary font-medium mb-4 flex-wrap"
                >
                  <span className="bg-gold text-black text-xs font-extrabold px-2.5 py-[3px] rounded flex items-center gap-1 shadow-sm">
                    <Star className="w-3.5 h-3.5 fill-black stroke-black" />
                    {item.vote_average ? item.vote_average.toFixed(1) : "N/A"}
                  </span>
                  <span>&bull;</span>
                  <span>{releaseYear}</span>
                </div>
              )}
              
              <p className="text-sm text-fg-secondary leading-relaxed mb-6 line-clamp-3 md:line-clamp-4 max-w-[85%]">
                {item.overview}
              </p>
              
              {/* Only the active slide's actions are focusable (others are hidden). */}
              {isActive && (
                <FocusSection className="flex items-center gap-3 pointer-events-auto" focusKey="HERO_ACTIONS" saveChild={false}>
                  <FocusableLink
                    href={`/watch/${item.media_type || "movie"}/${item.id}`}
                    data-xp-hero-primary=""
                    className="relative z-20 inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-bold bg-accent-strong text-white hover:bg-accent-strong-hover hover:shadow-[0_6px_20px_rgba(var(--accent-rgb),0.35)] transition-all cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-white" /> {activeExperience.hero.primary}
                  </FocusableLink>
                  {activeExperience.id === "netflix" ? (
                    <FocusableLink
                      href={`/watch/${item.media_type || "movie"}/${item.id}`}
                      data-xp-hero-secondary=""
                      className="relative z-20 inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-bold bg-white/[0.12] text-white border border-white/20 hover:bg-white/20 backdrop-blur-md transition-all cursor-pointer"
                    >
                      <Info className="w-4 h-4" /> {activeExperience.hero.secondary}
                    </FocusableLink>
                  ) : (
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
                      data-xp-hero-secondary=""
                      className="relative z-20 inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-bold bg-white/[0.12] text-white border border-white/20 hover:bg-white/20 backdrop-blur-md transition-all cursor-pointer"
                    >
                      <Clapperboard className="w-4 h-4" /> {activeExperience.hero.secondary}
                    </FocusableButton>
                  )}
                </FocusSection>
              )}
            </motion.div>
          </div>
        );
      })}

      {/* Navigation Arrow buttons */}
      <motion.button
        onClick={handlePrev}
        data-xp-hero-arrow=""
        whileHover={reduceMotion ? undefined : { scale: 1.08 }}
        whileTap={reduceMotion ? undefined : { scale: 0.92 }}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-30 flex size-11 items-center justify-center rounded-full bg-black/40 hover:bg-accent-strong text-white border border-white/8 hover:border-accent opacity-0 group-hover/hero:opacity-100 pointer-coarse:opacity-100 transition-colors duration-300 backdrop-blur-md cursor-pointer"
        aria-label="Previous Slide"
      >
        <ChevronLeft className="w-5 h-5" />
      </motion.button>
      <motion.button
        onClick={handleNext}
        data-xp-hero-arrow=""
        whileHover={reduceMotion ? undefined : { scale: 1.08 }}
        whileTap={reduceMotion ? undefined : { scale: 0.92 }}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-30 flex size-11 items-center justify-center rounded-full bg-black/40 hover:bg-accent-strong text-white border border-white/8 hover:border-accent opacity-0 group-hover/hero:opacity-100 pointer-coarse:opacity-100 transition-colors duration-300 backdrop-blur-md cursor-pointer"
        aria-label="Next Slide"
      >
        <ChevronRight className="w-5 h-5" />
      </motion.button>

      {/* Indicator Dots — the dot itself stays small, but each button keeps a
          44px-tall / 28px-wide hit area so it is thumb-reachable and clears the
          24px minimum target size. */}
      <div
        className="absolute bottom-1 left-1/2 -translate-x-1/2 z-30 flex items-center gap-0.5"
        data-xp-hero-dots=""
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
