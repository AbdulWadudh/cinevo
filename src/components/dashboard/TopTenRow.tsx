"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import type { TMDBMedia } from "@/lib/tmdb";

const MAX_RANKS = 10;
const SWIPE_TRIGGER = 0.12;

interface RowMetrics {
  pageSize: number;
  stride: number;
  maxOffset: number;
  maxPage: number;
  width: number;
}

const EMPTY_METRICS: RowMetrics = {
  pageSize: 1,
  stride: 0,
  maxOffset: 0,
  maxPage: 0,
  width: 0,
};

interface DragState {
  pointerId: number | null;
  startX: number;
  startY: number;
  base: number;
  dx: number;
  active: boolean;
}

function useCoarsePointer() {
  const [coarse, setCoarse] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(pointer: coarse)");
    const update = () => setCoarse(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return coarse;
}

/**
 * Netflix's Top 10 row. The outlined numeral is part of the card's geometry:
 * a fixed-width rank well sits under the poster, which overlaps its right
 * edge, so every card is the same width — including rank 10.
 *
 * Fine pointers page the track with `translate3d` (no native scrollbar);
 * coarse pointers drag the track 1:1 and snap to the next page.
 */
export default function TopTenRow({ items }: { items: TMDBMedia[] }) {
  const seen = new Set<string>();
  const ranked = items
    .filter((item) => {
      const key = `${item.media_type || "movie"}-${item.id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, MAX_RANKS);

  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const coarse = useCoarsePointer();
  const reduceMotion = useReducedMotion();
  const [{ page, metrics }, setRow] = useState<{ page: number; metrics: RowMetrics }>({
    page: 0,
    metrics: EMPTY_METRICS,
  });
  const setPage = useCallback((next: number) => {
    setRow((current) => ({ ...current, page: next }));
  }, []);
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<DragState>({
    pointerId: null,
    startX: 0,
    startY: 0,
    base: 0,
    dx: 0,
    active: false,
  });
  const suppressClickRef = useRef(false);

  const measure = useCallback(() => {
    const viewport = viewportRef.current;
    const track = trackRef.current;
    if (!viewport || !track) return;
    const cards = track.querySelectorAll<HTMLElement>("[data-top10-card]");
    if (cards.length === 0) return;

    const gap = Number.parseFloat(getComputedStyle(track).columnGap) || 0;
    const stride = cards[0].offsetWidth + gap;
    if (stride <= 0) return;

    const width = viewport.clientWidth;
    const pageSize = Math.max(1, Math.floor((width + gap) / stride));
    const totalWidth = cards.length * stride - gap;
    const maxOffset = Math.max(0, totalWidth - width);

    const maxPage = Math.max(0, Math.ceil(cards.length / pageSize) - 1);

    setRow((current) => {
      const next = {
        pageSize,
        stride,
        maxOffset,
        maxPage,
        width,
      };
      const same = (Object.keys(next) as (keyof RowMetrics)[]).every(
        (key) => current.metrics[key] === next[key],
      );
      if (same) return current;
      return { page: Math.min(current.page, maxPage), metrics: next };
    });
  }, []);

  useEffect(() => {
    measure();
    const viewport = viewportRef.current;
    if (!viewport) return;
    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [measure]);

  const offset =
    metrics.stride > 0
      ? Math.min(page * metrics.pageSize * metrics.stride, metrics.maxOffset)
      : 0;
  const atStart = page <= 0;
  const atEnd = page >= metrics.maxPage;

  const goToPage = useCallback(
    (next: number) => {
      setPage(Math.min(Math.max(next, 0), metrics.maxPage));
    },
    [metrics.maxPage, setPage],
  );

  const trackTransform = (value: number) => `translate3d(${-value}px, 0, 0)`;

  const resetTrack = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    track.style.transition = "";
    track.style.transform = trackTransform(offset);
  }, [offset]);

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!coarse) return;
      if (event.pointerType === "mouse" && event.button !== 0) return;
      const track = trackRef.current;
      if (!track) return;
      dragRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        base: offset,
        dx: 0,
        active: false,
      };
      track.style.transition = "none";
    },
    [coarse, offset],
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;
      const track = trackRef.current;
      if (!track || drag.pointerId === null || event.pointerId !== drag.pointerId) return;

      const dx = event.clientX - drag.startX;
      const dy = event.clientY - drag.startY;

      if (!drag.active) {
        if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 8) {
          drag.pointerId = null;
          resetTrack();
          return;
        }
        if (Math.abs(dx) < 6) return;
        drag.active = true;
        setDragging(true);
        event.currentTarget.setPointerCapture(event.pointerId);
      }

      drag.dx = dx;
      let next = drag.base - dx;
      if (next < 0) next *= 0.35;
      if (next > metrics.maxOffset) {
        next = metrics.maxOffset + (next - metrics.maxOffset) * 0.35;
      }
      track.style.transform = trackTransform(next);
    },
    [metrics.maxOffset, resetTrack],
  );

  const endSwipe = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;
      if (drag.pointerId === null || event.pointerId !== drag.pointerId) return;
      drag.pointerId = null;
      const wasActive = drag.active;
      drag.active = false;
      setDragging(false);

      if (!wasActive) {
        resetTrack();
        return;
      }

      suppressClickRef.current = true;
      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 350);

      const threshold = Math.max(40, metrics.width * SWIPE_TRIGGER);
      let nextPage = page;
      if (drag.dx <= -threshold) nextPage = page + 1;
      else if (drag.dx >= threshold) nextPage = page - 1;
      nextPage = Math.min(Math.max(nextPage, 0), metrics.maxPage);

      if (nextPage === page) {
        resetTrack();
      } else {
        const track = trackRef.current;
        if (track) track.style.transition = "";
        setPage(nextPage);
      }
    },
    [metrics.maxPage, metrics.width, page, resetTrack, setPage],
  );

  const handleClickCapture = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (!suppressClickRef.current) return;
    suppressClickRef.current = false;
    event.preventDefault();
    event.stopPropagation();
  }, []);

  if (ranked.length === 0) return null;

  return (
    <section aria-label="Top 10 in your area today" className="xp-top10 relative mt-2 mb-7">
      <div className="mb-3 px-4 md:px-12">
        <h2 className="xp-row-heading text-white">Top 10 in your area today</h2>
      </div>

      <div className="group/top10 relative px-4 md:px-12">
        <div
          ref={viewportRef}
          className="xp-top10-viewport"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endSwipe}
          onPointerCancel={endSwipe}
          onClickCapture={handleClickCapture}
        >
          <div
            ref={trackRef}
            role="list"
            className="xp-top10-track"
            style={{
              transform: trackTransform(offset),
              transitionDuration: dragging || reduceMotion ? "0ms" : undefined,
            }}
          >
            {ranked.map((item, index) => {
              const rank = index + 1;
              const href = `/watch/${item.media_type || "movie"}/${item.id}`;
              const title = item.title || item.name || "";
              const poster = item.poster_path
                ? `https://image.tmdb.org/t/p/w342${item.poster_path}`
                : item.backdrop_path
                  ? `https://image.tmdb.org/t/p/w500${item.backdrop_path}`
                  : "https://picsum.photos/seed/cinevoposter/300/450";

              return (
                <motion.div
                  key={`${item.media_type || "movie"}-${item.id}`}
                  role="listitem"
                  data-top10-card=""
                  className="xp-top10-card"
                  initial={reduceMotion ? false : { opacity: 1 }}
                  animate={reduceMotion ? { opacity: 1 } : { opacity: [0, 1] }}
                  transition={{
                    duration: 0.35,
                    delay: reduceMotion ? 0 : index * 0.045,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  onFocus={() => goToPage(Math.floor(index / metrics.pageSize))}
                >
                  <Link
                    href={href}
                    draggable={false}
                    onDragStart={(event) => event.preventDefault()}
                    aria-label={`${rank}. ${title}`}
                    className="xp-top10-link"
                  >
                    <span aria-hidden="true" className="xp-top10-rank">
                      <span
                        className="xp-top10-num"
                        data-double={rank === MAX_RANKS ? "true" : undefined}
                      >
                        {rank}
                      </span>
                    </span>
                    <span className="xp-top10-poster">
                      <Image
                        src={poster}
                        alt={title}
                        fill
                        sizes="(max-width: 639px) 96px, (max-width: 1023px) 120px, 132px"
                        className="object-cover"
                        draggable={false}
                      />
                      <span className="xp-top10-title">{title}</span>
                    </span>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>

        <button
          type="button"
          onClick={() => goToPage(page - 1)}
          disabled={atStart}
          aria-label="Previous Top 10 page"
          className={`xp-top10-arrow absolute left-0 top-1/2 z-30 grid size-11 -translate-y-1/2 cursor-pointer place-items-center rounded-full border border-white/15 bg-black/75 text-white backdrop-blur-md transition-[opacity,transform,background-color] duration-200 hover:scale-105 hover:bg-black/90 focus-visible:scale-105 focus-visible:outline-2 focus-visible:outline-white ${
            atStart ? "pointer-events-none opacity-0" : "opacity-0 group-hover/top10:opacity-100 group-focus-within/top10:opacity-100"
          }`}
        >
          <ChevronLeft className="size-6" />
        </button>

        <button
          type="button"
          onClick={() => goToPage(page + 1)}
          disabled={atEnd}
          aria-label="Next Top 10 page"
          className={`xp-top10-arrow absolute right-0 top-1/2 z-30 grid size-11 -translate-y-1/2 cursor-pointer place-items-center rounded-full border border-white/15 bg-black/75 text-white backdrop-blur-md transition-[opacity,transform,background-color] duration-200 hover:scale-105 hover:bg-black/90 focus-visible:scale-105 focus-visible:outline-2 focus-visible:outline-white ${
            atEnd ? "pointer-events-none opacity-0" : "opacity-0 group-hover/top10:opacity-100 group-focus-within/top10:opacity-100"
          }`}
        >
          <ChevronRight className="size-6" />
        </button>
      </div>
    </section>
  );
}
