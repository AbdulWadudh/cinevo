"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { Star, Play, ChevronLeft, ChevronRight } from "lucide-react";
import { TMDBMedia } from "@/lib/tmdb";

interface HeroCarouselProps {
  items: TMDBMedia[];
  /** Map of media id → YouTube trailer key (or null) for inline banner playback. */
  trailers?: Record<number, string | null>;
}

export default function HeroCarousel({ items, trailers = {} }: HeroCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const hoveredRef = useRef(false);

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
            {/* Backdrop Image */}
            <div className="absolute inset-0 w-full h-full">
              <Image
                src={item.backdrop_path ? `https://image.tmdb.org/t/p/original${item.backdrop_path}` : "https://picsum.photos/seed/cinevo/1920/1080"}
                alt={item.title || item.name || ""}
                fill
                priority={index === 0}
                sizes="100vw"
                className={`object-cover brightness-[0.55] transition-transform duration-[7000ms] ease-out ${
                  isActive ? "scale-105" : "scale-100"
                }`}
              />

              {/* Inline muted trailer preview (active slide only) */}
              {isActive && trailers[item.id] && (
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                  <iframe
                    src={`https://www.youtube.com/embed/${trailers[item.id]}?autoplay=1&mute=1&controls=0&loop=1&playlist=${trailers[item.id]}&modestbranding=1&playsinline=1&rel=0&showinfo=0&iv_load_policy=3`}
                    title={`${item.title || item.name} trailer`}
                    allow="autoplay; encrypted-media"
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[177.78vh] min-w-full h-[56.25vw] min-h-full border-0 brightness-[0.55]"
                  />
                </div>
              )}

              <div className="absolute inset-0 bg-gradient-to-t from-bg via-transparent to-black/30" />
              <div className="absolute inset-0 bg-gradient-to-r from-bg/90 via-bg/40 to-transparent" />
            </div>

            {/* Full-banner click target → details (sits below the info/controls layers) */}
            {isActive && (
              <Link
                href={`/watch/${item.media_type || "movie"}/${item.id}`}
                aria-label={`Open ${item.title || item.name}`}
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
              
              <div className="flex items-center gap-3 pointer-events-auto">
                <Link
                  href={`/watch/${item.media_type || "movie"}/${item.id}`}
                  className="relative z-20 inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-bold bg-accent text-white hover:bg-accent-hover hover:shadow-[0_6px_20px_rgba(229,62,79,0.35)] transition-all cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-white" /> Play Now
                </Link>
              </div>
            </div>
          </div>
        );
      })}

      {/* Navigation Arrow buttons */}
      <button
        onClick={handlePrev}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-30 p-2.5 rounded-full bg-black/40 hover:bg-accent text-white border border-white/[0.08] hover:border-accent opacity-0 group-hover/hero:opacity-100 transition-all duration-300 backdrop-blur-md cursor-pointer hover:scale-105"
        aria-label="Previous Slide"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      <button
        onClick={handleNext}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-30 p-2.5 rounded-full bg-black/40 hover:bg-accent text-white border border-white/[0.08] hover:border-accent opacity-0 group-hover/hero:opacity-100 transition-all duration-300 backdrop-blur-md cursor-pointer hover:scale-105"
        aria-label="Next Slide"
      >
        <ChevronRight className="w-5 h-5" />
      </button>

      {/* Indicator Dots */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2">
        {carouselItems.map((_, index) => {
          const isActive = index === activeIndex;
          return (
            <button
              key={index}
              onClick={() => handleDotClick(index)}
              className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                isActive ? "w-6 bg-accent" : "w-1.5 bg-white/40 hover:bg-white/70"
              }`}
              aria-label={`Slide ${index + 1}`}
            />
          );
        })}
      </div>
    </section>
  );
}
