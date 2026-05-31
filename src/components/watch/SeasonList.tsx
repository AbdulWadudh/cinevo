"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import {
  Play,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Tv2,
  CalendarDays,
  Hash,
  AlignLeft,
  X,
} from "lucide-react";
import { getSeasonDetailsAction } from "@/app/actions/tmdb-actions";

interface Season {
  id: number;
  name: string;
  episode_count: number;
  season_number: number;
  poster_path: string | null;
  air_date: string | null;
  overview: string | null;
}

interface SeasonListProps {
  seriesId: string;
  seasons: Season[];
  currentSeason: number;
  currentEpisode: number;
  backdropPath?: string | null;
}

interface DragState {
  isDown: boolean;
  startX: number;
  scrollLeft: number;
  dragDistance: number;
}

/* ── Episode overview popup ──────────────────────────────────── */
interface OverviewPopupProps {
  overview: string;
  epName: string;
  epNumber: number;
  seasonNumber: number;
  thumbUrl: string;
  onClose: () => void;
}

function OverviewPopup({ overview, epName, epNumber, seasonNumber, thumbUrl, onClose }: OverviewPopupProps) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      onClick={onClose}
      style={{ animation: "fadeInOverlay 0.2s ease both" }}
    >
      {/* Backdrop blur */}
      <div className="absolute inset-0 bg-black/75 backdrop-blur-2xl" />

      {/* Card */}
      <div
        className="relative z-10 w-full max-w-lg bg-surface/95 border border-white/[0.1] rounded-2xl overflow-hidden shadow-[0_32px_80px_rgba(0,0,0,0.8)]"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: "popupSlideUp 0.35s cubic-bezier(0.22, 1, 0.36, 1) both" }}
      >
        {/* Thumbnail */}
        <div className="relative aspect-video w-full overflow-hidden">
          <img
            src={thumbUrl}
            alt={epName}
            className="w-full h-full object-cover brightness-75"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-surface/95 via-surface/30 to-transparent" />
          {/* Badge */}
          <div className="absolute top-3 left-3 bg-accent text-white text-[9px] font-extrabold px-2 py-0.5 rounded uppercase tracking-widest shadow-md">
            S{seasonNumber} · EP {epNumber}
          </div>
          {/* Close */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-7 h-7 bg-black/60 hover:bg-accent/80 border border-white/10 hover:border-accent rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer"
            aria-label="Close"
          >
            <X className="w-3.5 h-3.5 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex flex-col gap-3">
          <div className="flex items-start gap-2">
            <AlignLeft className="w-4 h-4 text-accent mt-0.5 flex-none" />
            <h3 className="font-display text-base font-extrabold text-white leading-snug">{epName}</h3>
          </div>
          <p className="text-sm text-fg-secondary leading-relaxed">
            {overview || "No episode overview available."}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ── Shimmer skeleton ────────────────────────────────────────── */
function EpisodeSkeleton() {
  return (
    <div className="flex-none w-[220px] sm:w-[270px] animate-pulse">
      <div className="relative aspect-video w-full bg-white/[0.06] rounded-xl overflow-hidden">
        <div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.08] to-transparent"
          style={{ animation: "shimmer 1.5s infinite" }}
        />
      </div>
      <div className="pt-2 px-1 flex flex-col gap-1.5">
        <div className="h-3 bg-white/[0.06] rounded w-3/4" />
        <div className="h-2 bg-white/[0.04] rounded w-full" />
        <div className="h-2 bg-white/[0.04] rounded w-2/3" />
      </div>
    </div>
  );
}

/* ── Main Component ──────────────────────────────────────────── */
export default function SeasonList({
  seriesId,
  seasons,
  currentSeason,
  currentEpisode,
  backdropPath,
}: SeasonListProps) {
  const [expandedSeasonNum, setExpandedSeasonNum] = useState<number | null>(null);
  const [loadedSeasons, setLoadedSeasons] = useState<Record<number, any>>({});
  const [loadingSeasonNum, setLoadingSeasonNum] = useState<number | null>(null);
  const [visibleSeasons, setVisibleSeasons] = useState<Set<number>>(new Set());
  const [popup, setPopup] = useState<{
    overview: string;
    epName: string;
    epNumber: number;
    seasonNumber: number;
    thumbUrl: string;
  } | null>(null);

  const sliderRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const dragStates = useRef<Record<number, DragState>>({});
  const seasonCardRefs = useRef<Record<number, HTMLDivElement | null>>({});

  /* Intersection observer for entrance animations */
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = Number((entry.target as HTMLElement).dataset.seasonId);
            setVisibleSeasons((prev) => new Set([...prev, id]));
          }
        });
      },
      { threshold: 0.1 }
    );
    Object.values(seasonCardRefs.current).forEach((el) => {
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [seasons]);

  const validSeasons = seasons
    .filter((s) => s.season_number > 0)
    .sort((a, b) => a.season_number - b.season_number);

  /* ── Toggle expand (whole card click) ── */
  const handleToggleEpisodes = async (seasonNumber: number) => {
    if (expandedSeasonNum === seasonNumber) {
      setExpandedSeasonNum(null);
      return;
    }
    if (loadedSeasons[seasonNumber]) {
      setExpandedSeasonNum(seasonNumber);
      return;
    }
    setLoadingSeasonNum(seasonNumber);
    const res = await getSeasonDetailsAction(seriesId, seasonNumber);
    if (res.success && res.data) {
      setLoadedSeasons((prev) => ({ ...prev, [seasonNumber]: res.data }));
      setExpandedSeasonNum(seasonNumber);
    }
    setLoadingSeasonNum(null as any);
  };

  /* ── Chevron scroll ── */
  const scrollSlider = (seasonNum: number, direction: number) => {
    const slider = sliderRefs.current[seasonNum];
    if (slider) {
      slider.scrollTo({ left: slider.scrollLeft + direction * 560, behavior: "smooth" });
    }
  };

  /* ── Drag-to-scroll ── */
  const getDragState = (sn: number): DragState => {
    if (!dragStates.current[sn]) {
      dragStates.current[sn] = { isDown: false, startX: 0, scrollLeft: 0, dragDistance: 0 };
    }
    return dragStates.current[sn];
  };

  const handleMouseDown = useCallback((e: React.MouseEvent, sn: number) => {
    const slider = sliderRefs.current[sn];
    if (!slider) return;
    const ds = getDragState(sn);
    ds.isDown = true;
    ds.startX = e.pageX - slider.offsetLeft;
    ds.scrollLeft = slider.scrollLeft;
    ds.dragDistance = 0;
  }, []);

  const handleMouseLeave = useCallback((_e: React.MouseEvent, sn: number) => {
    getDragState(sn).isDown = false;
  }, []);

  const handleMouseUp = useCallback((_e: React.MouseEvent, sn: number) => {
    getDragState(sn).isDown = false;
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent, sn: number) => {
    const ds = getDragState(sn);
    if (!ds.isDown) return;
    e.preventDefault();
    const slider = sliderRefs.current[sn];
    if (!slider) return;
    const x = e.pageX - slider.offsetLeft;
    const walk = (x - ds.startX) * 1.6;
    slider.scrollLeft = ds.scrollLeft - walk;
    ds.dragDistance = Math.abs(x - ds.startX);
  }, []);

  const handleLinkClick = useCallback((e: React.MouseEvent, sn: number) => {
    if (getDragState(sn).dragDistance > 10) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, []);

  return (
    <>
      <style>{`
        @keyframes shimmer {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(100%);  }
        }
        @keyframes slideInUp {
          from { opacity: 0; transform: translateY(40px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)   scale(1);    }
        }
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-24px); }
          to   { opacity: 1; transform: translateX(0);     }
        }
        @keyframes fadeInSlide {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        @keyframes expandDown {
          from { opacity: 0; max-height: 0;      transform: scaleY(0.9); }
          to   { opacity: 1; max-height: 9999px; transform: scaleY(1);   }
        }
        @keyframes glowPulse {
          0%,100% { box-shadow: 0 0 10px rgba(229,62,79,0.3); }
          50%      { box-shadow: 0 0 28px rgba(229,62,79,0.7), 0 0 60px rgba(229,62,79,0.2); }
        }
        @keyframes badgePop {
          0%  { transform: scale(0.5); opacity: 0; }
          70% { transform: scale(1.15); }
          100%{ transform: scale(1);   opacity: 1; }
        }
        @keyframes scanLine {
          0%   { top: -10%; }
          100% { top: 110%; }
        }
        @keyframes fadeInOverlay {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes popupSlideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0)    scale(1);    }
        }
        @keyframes cardHoverGlow {
          0%,100% { box-shadow: 0 0 0 0 rgba(229,62,79,0); }
          50%     { box-shadow: 0 0 0 2px rgba(229,62,79,0.25); }
        }
        .season-card-enter  { animation: slideInUp  0.55s cubic-bezier(0.22,1,0.36,1) both; }
        .ep-card-enter      { animation: fadeInSlide 0.4s  cubic-bezier(0.22,1,0.36,1) both; }
        .episodes-expand    { animation: expandDown  0.45s cubic-bezier(0.22,1,0.36,1) both; overflow:hidden; transform-origin:top; }
        .now-playing-glow   { animation: glowPulse 2s ease-in-out infinite; }
        .badge-pop          { animation: badgePop   0.5s  cubic-bezier(0.22,1,0.36,1) both; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        .season-card-clickable { cursor: pointer; }
        .season-card-clickable:hover .season-expand-indicator { opacity: 1; }
      `}</style>

      {/* Overview popup portal */}
      {popup && (
        <OverviewPopup
          overview={popup.overview}
          epName={popup.epName}
          epNumber={popup.epNumber}
          seasonNumber={popup.seasonNumber}
          thumbUrl={popup.thumbUrl}
          onClose={() => setPopup(null)}
        />
      )}

      <section className="px-6 md:px-12 pt-12 flex flex-col gap-8 w-full">

        {/* Header */}
        <div
          className="border-b border-white/[0.08] pb-5 flex flex-col gap-1"
          style={{ animation: "slideInLeft 0.5s cubic-bezier(0.22,1,0.36,1) both" }}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center border border-accent/30">
              <Tv2 className="w-4 h-4 text-accent" />
            </div>
            <h2 className="font-display text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              All Seasons
            </h2>
          </div>
          <div className="flex items-center gap-2 mt-1 ml-11">
            <span className="w-12 h-[3px] bg-accent rounded-full" />
            <p className="text-xs text-muted uppercase tracking-widest font-extrabold">
              {validSeasons.length} Season{validSeasons.length !== 1 ? "s" : ""} Available · Click a season to browse episodes
            </p>
          </div>
        </div>

        {/* Season cards */}
        <div className="flex flex-col gap-7">
          {validSeasons.map((s, idx) => {
            const isExpanded = expandedSeasonNum === s.season_number;
            const isLoading = loadingSeasonNum === s.season_number;
            const isVisible = visibleSeasons.has(s.season_number);
            const year = s.air_date ? s.air_date.split("-")[0] : "N/A";
            const posterUrl = s.poster_path
              ? `https://image.tmdb.org/t/p/w185${s.poster_path}`
              : `https://picsum.photos/seed/cinevoseason${s.season_number}/185/278`;

            return (
              <div
                key={s.id}
                data-season-id={s.season_number}
                ref={(el) => { seasonCardRefs.current[s.season_number] = el; }}
                className={`flex flex-col border border-white/[0.05] bg-gradient-to-br from-surface/30 to-surface/10 rounded-2xl overflow-hidden transition-all duration-500 shadow-lg ${
                  isExpanded
                    ? "border-accent/20 shadow-[0_4px_40px_rgba(229,62,79,0.08)]"
                    : "hover:border-white/[0.12] hover:shadow-2xl"
                } ${isVisible ? "season-card-enter" : "opacity-0"} season-card-clickable`}
                style={{ animationDelay: isVisible ? `${idx * 80}ms` : undefined }}
                onClick={() => handleToggleEpisodes(s.season_number)}
              >
                {/* ── Season Header Row ── */}
                <div className="flex flex-col sm:flex-row gap-5 items-start p-5 relative">

                  {/* Expand indicator (top-right corner) */}
                  <div className="season-expand-indicator absolute top-4 right-4 opacity-0 transition-opacity duration-300 flex items-center gap-1 text-[9px] font-extrabold tracking-widest text-muted uppercase">
                    {isLoading ? (
                      <Loader2 className="w-3 h-3 animate-spin text-accent" />
                    ) : isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-accent" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </div>

                  {/* Poster */}
                  <div className="w-24 sm:w-[88px] aspect-[2/3] rounded-xl overflow-hidden bg-surface flex-none relative shadow-xl border border-white/[0.06] group/poster transition-all duration-300">
                    <img
                      src={posterUrl}
                      alt={s.name}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover/poster:scale-110"
                      loading="lazy"
                      draggable={false}
                    />
                    {/* Scan line on hover */}
                    <div className="absolute inset-0 overflow-hidden opacity-0 group-hover/poster:opacity-100 transition-opacity duration-300 pointer-events-none">
                      <div
                        className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-accent/60 to-transparent"
                        style={{ animation: "scanLine 1.5s linear infinite" }}
                      />
                    </div>
                    {/* Gold name badge */}
                    <div className="badge-pop absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent pt-4 pb-1.5 px-1.5">
                      <span className="text-[8px] font-extrabold text-gold uppercase tracking-wider leading-tight line-clamp-2 text-center block">
                        {s.name}
                      </span>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between pt-1 self-stretch">
                    <div className="flex flex-col gap-2">
                      {/* Title */}
                      <h3 className="font-display text-lg sm:text-xl font-extrabold text-accent hover:text-white tracking-tight transition-colors duration-200 pr-8">
                        {s.name}
                      </h3>

                      {/* Meta pills */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold bg-gold/15 text-gold border border-gold/25 px-2 py-0.5 rounded-full">
                          <Hash className="w-2.5 h-2.5" />
                          {s.episode_count} Episodes
                        </span>
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-white/[0.05] text-fg-secondary border border-white/[0.06] px-2 py-0.5 rounded-full">
                          <CalendarDays className="w-2.5 h-2.5" />
                          {year}
                        </span>
                        {isExpanded && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold bg-accent/15 text-accent border border-accent/25 px-2 py-0.5 rounded-full" style={{ animation: "badgePop 0.4s cubic-bezier(0.22,1,0.36,1) both" }}>
                            Episodes loaded
                          </span>
                        )}
                      </div>

                      {/* Overview */}
                      <p className="text-xs sm:text-sm text-muted leading-relaxed italic line-clamp-3 mt-1">
                        {s.overview || "No overview available for this season."}
                      </p>
                    </div>

                    {/* Status text (replaces the old button) */}
                    <div className="mt-4 flex items-center gap-2">
                      {isLoading ? (
                        <span className="inline-flex items-center gap-2 text-[10px] font-extrabold tracking-widest uppercase text-muted">
                          <Loader2 className="w-3 h-3 animate-spin text-accent" />
                          Loading episodes…
                        </span>
                      ) : isExpanded ? (
                        <span className="text-[10px] font-extrabold tracking-widest uppercase text-accent flex items-center gap-1.5">
                          <ChevronUp className="w-3 h-3" /> Click to collapse
                        </span>
                      ) : (
                        <span className="text-[10px] font-extrabold tracking-widest uppercase text-gold/70 flex items-center gap-1.5">
                          <ChevronDown className="w-3 h-3" /> Click card to view {s.episode_count} episodes
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* ── Expanded Episodes Panel ── */}
                {(isLoading || (isExpanded && loadedSeasons[s.season_number])) && (
                  <div
                    className="episodes-expand border-t border-white/[0.05] bg-black/20"
                    onClick={(e) => e.stopPropagation()} // prevent card toggle when interacting with episodes
                  >
                    <div className="p-5 flex flex-col gap-4">

                      {/* Panel header */}
                      <div className="flex items-center justify-between">
                        <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-accent flex items-center gap-2">
                          <span className="w-1 h-4 bg-accent rounded-full inline-block" />
                          Season {s.season_number} · Episode List
                        </h4>
                        {!isLoading && loadedSeasons[s.season_number] && (
                          <span className="text-[9px] text-muted font-bold uppercase tracking-widest">
                            {loadedSeasons[s.season_number].episodes?.length} episodes · click overview to expand
                          </span>
                        )}
                      </div>

                      {/* Vertical episode list */}
                      <div className="flex flex-col divide-y divide-white/[0.04]">

                        {/* Skeletons */}
                        {isLoading && Array.from({ length: 5 }).map((_, i) => (
                          <div key={i} className="flex items-center gap-4 py-3.5 animate-pulse">
                            <div className="w-[120px] sm:w-[160px] aspect-video rounded-xl bg-white/[0.06] flex-none relative overflow-hidden">
                              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" style={{ animation: "shimmer 1.5s infinite" }} />
                            </div>
                            <div className="flex-1 flex flex-col gap-2">
                              <div className="h-3.5 bg-white/[0.06] rounded w-2/5" />
                              <div className="h-2.5 bg-white/[0.04] rounded w-3/4" />
                              <div className="h-2 bg-white/[0.04] rounded w-1/2" />
                            </div>
                          </div>
                        ))}

                        {/* Episode rows */}
                        {!isLoading && loadedSeasons[s.season_number]?.episodes?.map((ep: any, epIdx: number) => {
                          const isCurrentPlaying = currentSeason === s.season_number && currentEpisode === ep.episode_number;
                          const epThumb = ep.still_path
                            ? `https://image.tmdb.org/t/p/w300${ep.still_path}`
                            : backdropPath
                              ? `https://image.tmdb.org/t/p/w300${backdropPath}`
                              : `https://picsum.photos/seed/ep${ep.id}/300/170`;

                          return (
                            <div
                              key={ep.id}
                              className={`ep-card-enter group/row flex items-center gap-4 py-3 rounded-xl transition-all duration-250 ${
                                isCurrentPlaying
                                  ? "bg-accent/[0.07] border border-accent/20 px-3 -mx-3"
                                  : "border border-transparent hover:bg-white/[0.03] hover:border-white/[0.05] px-0"
                              }`}
                              style={{ animationDelay: `${epIdx * 25}ms` }}
                            >
                              {/* Thumbnail */}
                              <Link
                                href={`/watch/tv/${seriesId}?season=${s.season_number}&episode=${ep.episode_number}`}
                                className={`relative flex-none w-[120px] sm:w-[156px] aspect-video rounded-xl overflow-hidden bg-surface border-2 transition-all duration-300 cursor-pointer select-none block ${
                                  isCurrentPlaying ? "border-accent now-playing-glow" : "border-white/[0.05] group-hover/row:border-accent/40"
                                }`}
                                onClick={(e) => handleLinkClick(e, s.season_number)}
                                draggable={false}
                              >
                                <img
                                  src={epThumb}
                                  alt={ep.name}
                                  className="w-full h-full object-cover brightness-[0.82] transition-all duration-500 group-hover/row:scale-110 group-hover/row:brightness-100"
                                  loading="lazy"
                                  draggable={false}
                                />
                                {/* Hover play overlay */}
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/row:opacity-100 transition-all duration-300 bg-black/30">
                                  <div className="w-9 h-9 bg-accent rounded-full flex items-center justify-center shadow-[0_4px_20px_rgba(229,62,79,0.6)] scale-50 group-hover/row:scale-100 transition-transform duration-300">
                                    <Play className="w-3.5 h-3.5 fill-white translate-x-0.5" />
                                  </div>
                                </div>
                                {/* EP badge */}
                                <div className="absolute bottom-1.5 left-1.5 bg-black/70 backdrop-blur-md text-white text-[8px] font-extrabold px-1.5 py-0.5 rounded border border-white/10">
                                  {ep.episode_number}
                                </div>
                                {/* Now Playing */}
                                {isCurrentPlaying && (
                                  <div className="absolute top-1.5 left-1.5 badge-pop">
                                    <span className="bg-accent text-white text-[7px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider animate-pulse">▶ Now Playing</span>
                                  </div>
                                )}
                              </Link>

                              {/* Info */}
                              <div className="flex-1 min-w-0 flex flex-col gap-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Link
                                    href={`/watch/tv/${seriesId}?season=${s.season_number}&episode=${ep.episode_number}`}
                                    onClick={(e) => handleLinkClick(e, s.season_number)}
                                    draggable={false}
                                    className="cursor-pointer"
                                  >
                                    <h5 className={`text-sm font-bold leading-snug transition-colors duration-200 ${
                                      isCurrentPlaying ? "text-accent" : "text-fg group-hover/row:text-accent"
                                    }`}>
                                      {ep.name || `Episode ${ep.episode_number}`}
                                    </h5>
                                  </Link>
                                  {ep.runtime && (
                                    <span className="text-[9px] font-bold text-muted bg-white/[0.05] border border-white/[0.08] px-1.5 py-0.5 rounded">{ep.runtime}m</span>
                                  )}
                                </div>
                                {/* Overview — click opens popup */}
                                <p
                                  className="text-xs text-muted leading-relaxed line-clamp-2 cursor-pointer hover:text-fg-secondary transition-colors duration-150"
                                  title="Click to read full overview"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setPopup({
                                      overview: ep.overview || "No episode overview available.",
                                      epName: ep.name || `Episode ${ep.episode_number}`,
                                      epNumber: ep.episode_number,
                                      seasonNumber: s.season_number,
                                      thumbUrl: epThumb,
                                    });
                                  }}
                                >
                                  {ep.overview || "No episode overview available."}
                                </p>
                              </div>

                              {/* Right: play circle */}
                              <Link
                                href={`/watch/tv/${seriesId}?season=${s.season_number}&episode=${ep.episode_number}`}
                                onClick={(e) => handleLinkClick(e, s.season_number)}
                                draggable={false}
                                className="flex-none w-9 h-9 rounded-full border border-white/[0.08] group-hover/row:border-accent/50 flex items-center justify-center text-muted group-hover/row:text-accent transition-all duration-300 group-hover/row:bg-accent/10 hidden sm:flex"
                                aria-label={`Play episode ${ep.episode_number}`}
                              >
                                <Play className="w-3.5 h-3.5 fill-current" />
                              </Link>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}
