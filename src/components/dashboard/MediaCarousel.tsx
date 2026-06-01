"use client";

import React, { useRef, useState, useEffect, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Play, Star, X, Loader2 } from "lucide-react";
import { TMDBMedia, MediaSource } from "@/lib/tmdb";
import { loadMediaPageAction } from "@/app/actions/tmdb-actions";
import WishlistHeart from "@/components/wishlist/WishlistHeart";

interface MediaCarouselProps {
  title: string;
  items: TMDBMedia[];
  mediaType?: "movie" | "tv";
  badge?: "trend" | "new" | "top";
  /** When provided, the "See All" grid can keep paging this source via Load More. */
  source?: MediaSource;
}

export default function MediaCarousel({
  title,
  items,
  mediaType = "movie",
  badge,
  source
}: MediaCarouselProps) {
  const [isFullScreen, setIsFullScreen] = useState(false);

  // "See All" grid state — starts from the row's items, then pages the source.
  const [gridItems, setGridItems] = useState<TMDBMedia[]>(items);
  const [gridPage, setGridPage] = useState(1);
  const [gridTotalPages, setGridTotalPages] = useState<number>(source ? Number.MAX_SAFE_INTEGER : 1);
  const [isLoadingMore, startLoadMore] = useTransition();

  // Keep the grid in sync if the row's items change (e.g. genre filter swaps them).
  useEffect(() => {
    setGridItems(items);
    setGridPage(1);
    setGridTotalPages(source ? Number.MAX_SAFE_INTEGER : 1);
  }, [items, source]);

  // Lock background page scroll while the fullscreen "See All" grid is open
  // (otherwise the body and the modal each show their own scrollbar).
  useEffect(() => {
    if (isFullScreen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isFullScreen]);

  const hasMore = !!source && gridPage < gridTotalPages;

  const loadMore = () => {
    if (!source) return;
    startLoadMore(async () => {
      const next = gridPage + 1;
      const res = await loadMediaPageAction(source, next);
      if (res.success) {
        setGridItems((prev) => {
          const seen = new Set(prev.map((i) => i.id));
          return [...prev, ...res.data.filter((i) => !seen.has(i.id))];
        });
        setGridPage(next);
        setGridTotalPages(res.totalPages);
      }
    });
  };

  const carouselRef = useRef<HTMLDivElement>(null);
  const isDown = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);
  const dragDistance = useRef(0);

  // Smooth sub-pixel infinite auto-panning (Right-to-Left cards movement)
  useEffect(() => {
    const container = carouselRef.current;
    if (!container) return;

    let animationId: number;
    let isHovered = false;

    const handleMouseEnter = () => {
      isHovered = true;
    };
    const handleMouseLeave = () => {
      isHovered = false;
    };

    container.addEventListener("mouseenter", handleMouseEnter);
    container.addEventListener("mouseleave", handleMouseLeave);

    const step = () => {
      if (!isHovered && !isDown.current && !isFullScreen) {
        container.scrollLeft += 0.4;
        
        // Loop back to start if scrolled past boundaries
        if (container.scrollLeft >= container.scrollWidth - container.clientWidth - 2) {
          container.scrollLeft = 0;
        }
      }
      animationId = requestAnimationFrame(step);
    };

    animationId = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(animationId);
      container.removeEventListener("mouseenter", handleMouseEnter);
      container.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [isFullScreen]);

  const scroll = (direction: number) => {
    if (carouselRef.current) {
      const scrollAmount = direction * 500;
      carouselRef.current.scrollTo({
        left: carouselRef.current.scrollLeft + scrollAmount,
        behavior: "smooth"
      });
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!carouselRef.current) return;
    isDown.current = true;
    startX.current = e.pageX - carouselRef.current.offsetLeft;
    scrollLeft.current = carouselRef.current.scrollLeft;
    dragDistance.current = 0;
  };

  const handleMouseLeave = () => {
    isDown.current = false;
  };

  const handleMouseUp = () => {
    isDown.current = false;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDown.current || !carouselRef.current) return;
    e.preventDefault();
    const x = e.pageX - carouselRef.current.offsetLeft;
    const walk = (x - startX.current) * 1.5; // scroll speed multiplier
    carouselRef.current.scrollLeft = scrollLeft.current - walk;
    dragDistance.current = Math.abs(x - startX.current);
  };

  const handleLinkClick = (e: React.MouseEvent) => {
    if (dragDistance.current > 10) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  if (items.length === 0) return null;

  const badgeConfig = {
    trend: { label: "Trending", style: "bg-accent text-white" },
    new: { label: "New", style: "bg-blue text-white" },
    top: { label: "Top 10", style: "bg-gold text-black" }
  };

  return (
    <section className="px-6 md:px-12 mb-12 relative w-full group/carousel">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-lg md:text-xl font-bold tracking-tight text-fg">
          {title}
        </h2>
        <span 
          onClick={() => setIsFullScreen(true)}
          className="text-xs text-accent font-semibold hover:opacity-80 cursor-pointer transition-opacity"
        >
          See All &rarr;
        </span>
      </div>

      {/* Carousel Container */}
      <div className="relative">
        {/* Left Arrow */}
        <button 
          onClick={() => scroll(-1)}
          className="absolute left-0 top-0 bottom-4 w-12 bg-gradient-to-r from-bg/95 to-transparent z-20 flex items-center justify-start pl-2 text-white/80 hover:text-white opacity-0 group-hover/carousel:opacity-100 transition-opacity duration-300 pointer-events-none group-hover/carousel:pointer-events-auto cursor-pointer border-0 outline-none"
          aria-label="Scroll left"
        >
          <ChevronLeft className="w-8 h-8 filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" />
        </button>

        {/* Scrollable list */}
        <div 
          ref={carouselRef}
          onMouseDown={handleMouseDown}
          onMouseLeave={handleMouseLeave}
          onMouseUp={handleMouseUp}
          onMouseMove={handleMouseMove}
          className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x cursor-grab active:cursor-grabbing select-none"
        >
          {items.map((item) => {
            const currentBadge = badge ? badgeConfig[badge] : null;
            const linkUrl = `/watch/${item.media_type || mediaType}/${item.id}`;

            return (
              <div 
                key={item.id}
                className="flex-none w-[140px] sm:w-[180px] snap-start group"
              >
                <Link href={linkUrl} onClick={handleLinkClick} className="block cursor-pointer select-none" draggable={false}>
                  {/* Poster Container */}
                  <div className="relative aspect-[2/3] w-full bg-surface rounded-xl overflow-hidden border border-white/[0.04] shadow-md transition-all duration-500 hover:-translate-y-2 hover:scale-[1.02] hover:border-accent hover:shadow-[0_8px_25px_rgba(0,0,0,0.8)]">
                    <Image
                      src={item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : "https://picsum.photos/seed/cinevoposter/300/450"}
                      alt={item.title || item.name || ""}
                      fill
                      sizes="(max-width: 640px) 140px, 180px"
                      className="object-cover transition duration-700 group-hover:scale-108"
                      draggable={false}
                    />

                    <WishlistHeart item={item} mediaType={mediaType} />

                    {/* Centered Play Button Hover Overlay */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/40 transition-opacity duration-300 z-20">
                      <div className="w-12 h-12 bg-accent text-white rounded-full flex items-center justify-center shadow-[0_4px_20px_rgba(229,62,79,0.45)] transform scale-75 group-hover:scale-100 transition-transform duration-300">
                        <Play className="w-5 h-5 fill-white translate-x-0.5" />
                      </div>
                    </div>

                    {/* Bottom Metadata Hover Overlay */}
                    <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/95 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
                      <div className="flex items-center gap-1 text-[11px] font-bold text-gold">
                        <Star className="w-3.5 h-3.5 fill-gold stroke-gold" />
                        <span>{item.vote_average ? item.vote_average.toFixed(1) : "N/A"}</span>
                      </div>
                    </div>

                    {/* Optional Ribbon Badge */}
                    {currentBadge && (
                      <span className={`absolute top-2 left-2 text-[9px] font-extrabold px-2 py-0.5 rounded uppercase tracking-wider z-20 shadow-md ${currentBadge.style}`}>
                        {currentBadge.label}
                      </span>
                    )}
                  </div>

                  {/* Text Metadata */}
                  <div className="pt-2 px-1">
                    <h3 className="text-xs sm:text-sm font-semibold truncate text-fg group-hover:text-accent transition-colors">
                      {item.title || item.name}
                    </h3>
                    <p className="text-[10px] sm:text-xs text-muted mt-0.5 font-medium">
                      {item.release_date ? item.release_date.split("-")[0] : item.first_air_date ? item.first_air_date.split("-")[0] : ""} &bull; {item.media_type === "tv" || mediaType === "tv" ? "TV" : "Movie"}
                    </p>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>

        {/* Right Arrow */}
        <button 
          onClick={() => scroll(1)}
          className="absolute right-0 top-0 bottom-4 w-12 bg-gradient-to-l from-bg/95 to-transparent z-20 flex items-center justify-end pr-2 text-white/80 hover:text-white opacity-0 group-hover/carousel:opacity-100 transition-opacity duration-300 pointer-events-none group-hover/carousel:pointer-events-auto cursor-pointer border-0 outline-none"
          aria-label="Scroll right"
        >
          <ChevronRight className="w-8 h-8 filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" />
        </button>
      </div>

      {/* Full-Screen See All Grid Modal Overlay */}
      {isFullScreen && (
        <div className="fixed inset-0 bg-bg/98 backdrop-blur-3xl z-50 overflow-y-auto animate-fade-in flex flex-col px-6 md:px-24 pt-20 pb-12">
          {/* Header */}
          <div className="flex items-center justify-between w-full max-w-[1400px] mx-auto border-b border-white/[0.08] pb-4 mb-8">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-accent">Category view</span>
              <h3 className="text-xl md:text-2xl font-bold text-white tracking-tight">{title} ({gridItems.length})</h3>
            </div>
            <button
              onClick={() => setIsFullScreen(false)}
              className="p-2.5 bg-surface hover:bg-surface-hover hover:text-accent text-fg-secondary border border-border rounded-xl transition-all cursor-pointer flex items-center justify-center"
              aria-label="Close fullscreen grid"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Grid display */}
          <div className="w-full max-w-[1400px] mx-auto flex-1">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 gap-6 pb-8">
              {gridItems.map((item) => {
                const currentBadge = badge ? badgeConfig[badge] : null;
                const linkUrl = `/watch/${item.media_type || mediaType}/${item.id}`;

                return (
                  <div key={item.id} className="group">
                    <Link 
                      href={linkUrl} 
                      onClick={() => setIsFullScreen(false)} 
                      className="block cursor-pointer select-none"
                    >
                      <div className="relative aspect-[2/3] w-full bg-surface rounded-xl overflow-hidden border border-white/[0.04] shadow-md transition-all duration-500 hover:-translate-y-2 hover:scale-[1.02] hover:border-accent hover:shadow-[0_8px_25px_rgba(0,0,0,0.8)]">
                        <Image
                          src={item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : "https://picsum.photos/seed/cinevoposter/300/450"}
                          alt={item.title || item.name || ""}
                          fill
                          sizes="(max-width: 640px) 50vw, 14vw"
                          className="object-cover transition duration-700 group-hover:scale-108"
                          draggable={false}
                        />

                        <WishlistHeart item={item} mediaType={mediaType} />

                        {/* Centered Play Button Hover Overlay */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/40 transition-opacity duration-300 z-20">
                          <div className="w-12 h-12 bg-accent text-white rounded-full flex items-center justify-center shadow-[0_4px_20px_rgba(229,62,79,0.45)] transform scale-75 group-hover:scale-100 transition-transform duration-300">
                            <Play className="w-5 h-5 fill-white translate-x-0.5" />
                          </div>
                        </div>

                        {/* Bottom Metadata Hover Overlay */}
                        <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/95 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
                          <div className="flex items-center gap-1 text-[11px] font-bold text-gold">
                            <Star className="w-3.5 h-3.5 fill-gold stroke-gold" />
                            <span>{item.vote_average ? item.vote_average.toFixed(1) : "N/A"}</span>
                          </div>
                        </div>

                        {/* Optional Ribbon Badge */}
                        {currentBadge && (
                          <span className={`absolute top-2 left-2 text-[9px] font-extrabold px-2 py-0.5 rounded uppercase tracking-wider z-20 shadow-md ${currentBadge.style}`}>
                            {currentBadge.label}
                          </span>
                        )}
                      </div>

                      {/* Text Metadata */}
                      <div className="pt-2 px-1">
                        <h3 className="text-xs sm:text-sm font-semibold truncate text-fg group-hover:text-accent transition-colors">
                          {item.title || item.name}
                        </h3>
                        <p className="text-[10px] sm:text-xs text-muted mt-0.5 font-medium">
                          {item.release_date ? item.release_date.split("-")[0] : item.first_air_date ? item.first_air_date.split("-")[0] : ""} &bull; {item.media_type === "tv" || mediaType === "tv" ? "TV" : "Movie"}
                        </p>
                      </div>
                    </Link>
                  </div>
                );
              })}
            </div>

            {hasMore && (
              <div className="flex justify-center pb-12">
                <button
                  onClick={loadMore}
                  disabled={isLoadingMore}
                  className="inline-flex items-center gap-2 px-7 py-3 rounded-full text-sm font-semibold bg-surface border border-border text-fg hover:border-accent hover:text-accent transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isLoadingMore ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Loading…
                    </>
                  ) : (
                    "Load More"
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
