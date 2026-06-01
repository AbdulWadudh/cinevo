"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  Play, Maximize, RefreshCw, Shield, Tv2, Film,
  ChevronDown, Check, Server, Layers, ListOrdered,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useProviders } from "@/lib/useProviders";
import { buildEmbedUrl, providerIndexFromKey } from "@/lib/sources";

interface SeasonInfo {
  season_number: number;
  episode_count: number;
  name: string;
}

interface IframePlayerProps {
  mediaId: string;
  mediaType: "movie" | "tv";
  title: string;
  posterPath?: string;
  season?: number;
  episode?: number;
  initialProgress?: number;
  /** `?source=` key — resolved against the loaded provider list. */
  initialSourceKey?: string;
  /** Explicit `?sandbox=` value; when absent we use the provider's default. */
  initialSandbox?: "on" | "off";
  seasons?: SeasonInfo[];
}

/* ─── Custom animated dropdown ─────────────────────────────── */
interface DropdownOption { value: number; label: string; sub?: string }
interface CustomDropdownProps {
  icon: React.ReactNode;
  label: string;
  options: DropdownOption[];
  value: number;
  onChange: (v: number) => void;
  onOpenChange?: (open: boolean) => void;
  disabled?: boolean;
  /** Optional control rendered on the right of the panel header (e.g. refresh). */
  headerAction?: React.ReactNode;
}

function CustomDropdown({ icon, label, options, value, onChange, onOpenChange, disabled, headerAction }: CustomDropdownProps) {
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const selected = options.find((o) => o.value === value);

  useEffect(() => setMounted(true), []);

  // Position the (portaled) panel under the trigger, clamped inside the viewport
  // so its edges never run off-screen.
  const updatePosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const PANEL_W = 220;
    const margin = 8;
    const maxLeft = window.innerWidth - PANEL_W - margin;
    const left = Math.max(margin, Math.min(r.left, maxLeft));
    setRect({ top: r.bottom + 8, left });
  }, []);

  const toggleOpen = (next: boolean) => {
    if (next) updatePosition();
    setOpen(next);
    onOpenChange?.(next);
  };

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || panelRef.current?.contains(t)) return;
      toggleOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") toggleOpen(false); };
    const reposition = () => updatePosition();
    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <div className="relative">
      {/* Trigger */}
      <button
        ref={triggerRef}
        onClick={() => !disabled && toggleOpen(!open)}
        disabled={disabled}
        className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all duration-200 outline-none group/trigger ${disabled
            ? "bg-white/[0.03] border-white/[0.06] opacity-60 cursor-not-allowed"
            : open
            ? "bg-accent/20 border-accent/60 shadow-[0_0_16px_rgba(229,62,79,0.15)] cursor-pointer"
            : "bg-white/[0.05] border-white/[0.10] hover:bg-white/[0.09] hover:border-white/[0.20] cursor-pointer"
          }`}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={`transition-colors duration-200 ${open ? "text-accent" : "text-muted"}`}>
          {icon}
        </span>
        <div className="flex flex-col items-start leading-none">
          <span className="text-[9px] font-extrabold uppercase tracking-widest text-muted">{label}</span>
          <span className="text-xs font-bold text-white mt-0.5 max-w-[96px] truncate">{selected?.label ?? "—"}</span>
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 text-muted ml-1 transition-transform duration-300 ${open ? "rotate-180 text-accent" : ""}`}
        />
      </button>

      {/* Panel — portaled to <body> so it escapes the player's backdrop-blur
          stacking context and the page's overflow clipping. */}
      {open && rect && mounted &&
        createPortal(
          <div
            ref={panelRef}
            role="listbox"
            style={{
              position: "fixed",
              top: rect.top,
              left: rect.left,
              zIndex: 1000,
              animation: "dropDown 0.22s cubic-bezier(0.22,1,0.36,1) both",
            }}
            className="w-[220px] bg-surface/98 backdrop-blur-2xl border border-white/[0.12] rounded-2xl shadow-[0_24px_60px_rgba(0,0,0,0.9)] overflow-hidden"
          >
            {/* Panel header */}
            <div className="px-4 py-2.5 border-b border-white/[0.06] flex items-center justify-between gap-2">
              <p className="text-[9px] font-extrabold uppercase tracking-widest text-accent">{label}</p>
              {headerAction}
            </div>
            {/* Options */}
            <div className="flex flex-col py-1 max-h-[220px] overflow-y-auto">
              {options.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => { onChange(opt.value); toggleOpen(false); }}
                  role="option"
                  aria-selected={opt.value === value}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all duration-150 cursor-pointer group/opt ${opt.value === value
                      ? "bg-accent/15 text-accent"
                      : "text-fg hover:bg-white/[0.06] hover:text-white"
                    }`}
                >
                  <span className={`flex-1 flex flex-col gap-0.5`}>
                    <span className="text-xs font-bold leading-none">{opt.label}</span>
                    {opt.sub && <span className="text-[9px] text-muted leading-none mt-0.5">{opt.sub}</span>}
                  </span>
                  {opt.value === value && (
                    <Check className="w-3.5 h-3.5 text-accent flex-none" />
                  )}
                </button>
              ))}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

/* ─── Main Player ───────────────────────────────────────────── */
export default function IframePlayer({
  mediaId,
  mediaType,
  title,
  posterPath,
  season: initialSeason = 1,
  episode: initialEpisode = 1,
  initialSourceKey,
  initialSandbox,
  seasons = [],
}: IframePlayerProps) {
  const router = useRouter();
  const playerRef = useRef<HTMLDivElement>(null);

  // Providers are loaded from localStorage (version + TTL) then the DB.
  const { providers, loading: providersLoading, refreshing, refresh } = useProviders();

  // No autoplay — the user clicks the poster's play button to start the embed.
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [currentSeason, setCurrentSeason] = useState(initialSeason);
  const [currentEpisode, setCurrentEpisode] = useState(initialEpisode);
  const [anyDropdownOpen, setAnyDropdownOpen] = useState(false);
  const [sandboxEnabled, setSandboxEnabled] = useState(initialSandbox !== "off");
  const initializedRef = useRef(false);

  // Once providers arrive, resolve the initial source from the URL key and
  // apply its default sandbox state (unless the URL pinned an explicit one).
  useEffect(() => {
    if (providersLoading || providers.length === 0 || initializedRef.current) return;
    initializedRef.current = true;
    const idx = providerIndexFromKey(providers, initialSourceKey);
    setSelectedProvider(idx);
    if (!initialSandbox) {
      setSandboxEnabled(providers[idx]?.sandboxEnabled ?? true);
    }
  }, [providersLoading, providers, initialSourceKey, initialSandbox]);

  const activeProvider = providers[selectedProvider];

  // Build a consistent URL with all persistent query params
  const buildUrl = (opts: { season?: number; episode?: number; source?: number; sandbox?: boolean }) => {
    const s = opts.season ?? currentSeason;
    const e = opts.episode ?? currentEpisode;
    const src = opts.source ?? selectedProvider;
    const sb = opts.sandbox ?? sandboxEnabled;
    const srcKey = providers[src]?.key ?? providers[0]?.key ?? "";
    const base = mediaType === "tv"
      ? `/watch/tv/${mediaId}?season=${s}&episode=${e}&source=${srcKey}`
      : `/watch/movie/${mediaId}?source=${srcKey}`;
    // Always persist the explicit sandbox state so a manual toggle survives navigation.
    return `${base}&sandbox=${sb ? "on" : "off"}`;
  };

  const validSeasons = seasons
    .filter((s) => s.season_number > 0)
    .sort((a, b) => a.season_number - b.season_number);

  const selectedSeasonData = validSeasons.find((s) => s.season_number === currentSeason);
  const episodeCount = selectedSeasonData?.episode_count ?? 24;

  const reload = useCallback(() => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 1200);
  }, []);

  const handleSeasonChange = (v: number) => {
    setCurrentSeason(v);
    setCurrentEpisode(1);
    if (isPlaying) reload();
    router.replace(buildUrl({ season: v, episode: 1 }), { scroll: false });
  };

  const handleEpisodeChange = (v: number) => {
    setCurrentEpisode(v);
    if (isPlaying) reload();
    router.replace(buildUrl({ episode: v }), { scroll: false });
  };

  const handleProviderChange = (v: number) => {
    setSelectedProvider(v);
    // Apply the new provider's configured default sandbox state.
    const sb = providers[v]?.sandboxEnabled ?? true;
    setSandboxEnabled(sb);
    if (isPlaying) reload();
    router.replace(buildUrl({ source: v, sandbox: sb }), { scroll: false });
  };

  const handleSandboxToggle = () => {
    const next = !sandboxEnabled;
    setSandboxEnabled(next);
    if (isPlaying) reload();
    router.replace(buildUrl({ sandbox: next }), { scroll: false });
  };

  const handlePlay = () => {
    setIsLoading(true);
    setIsPlaying(true);
    setTimeout(() => setIsLoading(false), 1200);
  };

  const toggleFullscreen = () => {
    if (!playerRef.current) return;
    if (!document.fullscreenElement) {
      playerRef.current.requestFullscreen().catch(console.error);
    } else {
      document.exitFullscreen().catch(console.error);
    }
  };

  const embedUrl = activeProvider
    ? buildEmbedUrl(activeProvider, mediaId, mediaType, currentSeason, currentEpisode)
    : "";

  /* ─── Dropdown option arrays ── */
  const providerOptions: DropdownOption[] = providers.map((p, i) => ({ value: i, label: p.label, sub: p.sub ?? undefined }));
  const seasonOptions: DropdownOption[] = validSeasons.length > 0
    ? validSeasons.map((s) => ({ value: s.season_number, label: s.name || `Season ${s.season_number}` }))
    : Array.from({ length: 10 }, (_, i) => ({ value: i + 1, label: `Season ${i + 1}` }));
  const episodeOptions: DropdownOption[] = Array.from({ length: episodeCount }, (_, i) => ({
    value: i + 1,
    label: `Episode ${i + 1}`,
  }));

  return (
    <>
      <style>{`
        @keyframes splashPop  { from{opacity:0;transform:scale(0.6)} to{opacity:1;transform:scale(1)} }
        @keyframes splashFade { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes dropDown   { from{opacity:0;transform:translateY(-8px) scale(0.96)} to{opacity:1;transform:translateY(0) scale(1)} }
      `}</style>

      <div className="flex flex-col gap-0 w-full">

        {/* ── Player ── */}
        <div
          ref={playerRef}
          className="relative w-full aspect-video max-h-[70vh] bg-black rounded-t-xl overflow-hidden select-none shadow-2xl border border-white/[0.04] border-b-0 group"
        >
          {isPlaying ? (
            <div className="w-full h-full relative">
              {isLoading && (
                <div className="absolute inset-0 bg-bg/95 z-20 flex flex-col items-center justify-center gap-4">
                  <RefreshCw className="w-10 h-10 animate-spin text-accent" />
                  <p className="text-sm font-semibold text-fg-secondary animate-pulse">Securing safe link…</p>
                </div>
              )}
              {embedUrl && (
                <iframe
                  key={`${activeProvider?.key}-${currentSeason}-${currentEpisode}`}
                  src={embedUrl}
                  className="w-full h-full border-none"
                  allowFullScreen
                  allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
                  {...(sandboxEnabled ? { sandbox: "allow-scripts allow-same-origin allow-forms" as any } : {})}
                  title={title}
                />
              )}
              {/* Transparent overlay blocks iframe from stealing pointer events when a dropdown is open */}
              {anyDropdownOpen && (
                <div className="absolute inset-0 z-[9998]" aria-hidden="true" />
              )}
            </div>
          ) : (
            <div className="absolute inset-0">
              <img
                src={posterPath ? `https://image.tmdb.org/t/p/original${posterPath}` : "https://picsum.photos/seed/cinevodefault/1280/720"}
                alt={title}
                className="w-full h-full object-cover brightness-[0.45] transition duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-bg via-transparent to-black/40" />
              <div className="absolute inset-0 flex flex-col items-center justify-center z-10 p-6 text-center">
                <button
                  onClick={handlePlay}
                  disabled={providersLoading || !activeProvider}
                  aria-label="Play"
                  className="w-20 h-20 bg-accent hover:bg-accent-hover text-white rounded-full flex items-center justify-center shadow-[0_8px_40px_rgba(229,62,79,0.4)] hover:scale-110 active:scale-95 transition-all duration-300 mb-5 cursor-pointer disabled:opacity-50 disabled:cursor-wait disabled:hover:scale-100"
                >
                  {providersLoading
                    ? <RefreshCw className="w-7 h-7 animate-spin" />
                    : <Play className="w-8 h-8 fill-white translate-x-0.5" />}
                </button>
                <h2 className="text-xl md:text-3xl font-extrabold tracking-tight text-white font-display mb-2 max-w-[80%]">
                  {title}
                </h2>
                {mediaType === "tv" && (
                  <p className="text-sm text-accent font-semibold tracking-wider uppercase">
                    Season {currentSeason} &bull; Episode {currentEpisode}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Fullscreen */}
          <button
            onClick={toggleFullscreen}
            className="absolute top-3 right-3 z-30 w-8 h-8 bg-black/60 hover:bg-accent/80 border border-white/10 hover:border-accent rounded-lg flex items-center justify-center transition-all duration-200 opacity-0 group-hover:opacity-100 cursor-pointer"
            aria-label="Fullscreen"
          >
            <Maximize className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* ── Controls bar ── */}
        <div className="w-full bg-surface/50 backdrop-blur-xl border border-white/[0.07] border-t border-t-white/[0.04] rounded-b-xl px-2.5 py-2 sm:px-5 sm:py-3 flex flex-wrap items-center justify-center gap-2 sm:flex-nowrap sm:justify-between sm:gap-4 relative overflow-visible">

          {/* Left: Sandbox toggle */}
          <button
            onClick={handleSandboxToggle}
            title={sandboxEnabled ? "Sandbox ON — click to disable (allows full player features)" : "Sandbox OFF — click to enable (blocks ads/popups)"}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-all duration-300 cursor-pointer flex-shrink-0 ${sandboxEnabled
                ? "bg-emerald-500/10 border-emerald-500/25 hover:bg-emerald-500/20"
                : "bg-orange-500/10 border-orange-500/25 hover:bg-orange-500/20"
              }`}
            aria-label="Toggle iframe sandbox"
          >
            <Shield className={`w-3 h-3 transition-colors duration-300 ${sandboxEnabled ? "text-emerald-400" : "text-orange-400"
              }`} />
            <span className={`text-[9px] font-extrabold uppercase tracking-widest hidden sm:inline transition-colors duration-300 ${sandboxEnabled ? "text-emerald-400" : "text-orange-400"
              }`}>
              {sandboxEnabled ? "Sandbox ON" : "Sandbox OFF"}
            </span>
          </button>

          {/* Center: the dropdowns stay on one line together (Provider/Season/Episode).
              On mobile this group drops to its own full-width row; on desktop it
              flex-centers between the side items. Scrolls if too narrow. */}
          <div className="flex items-center justify-center gap-2 flex-nowrap sm:flex-1 sm:min-w-0 order-last w-full sm:order-none sm:w-auto overflow-x-auto scrollbar-hide">
            {/* Provider — the refresh control lives in the dropdown header.
                Clears the localStorage cache and re-fetches providers from the DB. */}
            <CustomDropdown
              icon={<Server className="w-3.5 h-3.5" />}
              label="Provider"
              options={providerOptions}
              value={selectedProvider}
              onChange={handleProviderChange}
              onOpenChange={setAnyDropdownOpen}
              disabled={providersLoading || providers.length === 0}
              headerAction={
                <button
                  onClick={(e) => { e.stopPropagation(); refresh(); }}
                  disabled={refreshing}
                  title="Refresh providers from server"
                  aria-label="Refresh providers"
                  className="flex items-center justify-center w-6 h-6 rounded-md border bg-white/[0.05] border-white/[0.10] hover:bg-white/[0.09] hover:border-accent/40 text-muted hover:text-accent transition-all duration-200 cursor-pointer disabled:opacity-60 disabled:cursor-wait"
                >
                  <RefreshCw className={`w-3 h-3 ${refreshing ? "animate-spin text-accent" : ""}`} />
                </button>
              }
            />

            {mediaType === "tv" && (
              <>
                {/* Divider */}
                <div className="w-px h-8 bg-white/[0.08] flex-shrink-0" />

                {/* Season */}
                <CustomDropdown
                  icon={<Layers className="w-3.5 h-3.5" />}
                  label="Season"
                  options={seasonOptions}
                  value={currentSeason}
                  onChange={handleSeasonChange}
                  onOpenChange={setAnyDropdownOpen}
                />

                {/* Divider */}
                <div className="w-px h-8 bg-white/[0.08] flex-shrink-0" />

                {/* Episode */}
                <CustomDropdown
                  icon={<ListOrdered className="w-3.5 h-3.5" />}
                  label="Episode"
                  options={episodeOptions}
                  value={currentEpisode}
                  onChange={handleEpisodeChange}
                  onOpenChange={setAnyDropdownOpen}
                />
              </>
            )}
          </div>

          {/* Right: media type badge */}
          <div className="flex items-center gap-1.5 bg-white/[0.04] border border-white/[0.07] px-2.5 py-1.5 rounded-lg flex-shrink-0">
            {mediaType === "tv"
              ? <><Tv2 className="w-3.5 h-3.5 text-accent" /><span className="text-[9px] font-extrabold text-muted uppercase tracking-widest hidden sm:inline">Series</span></>
              : <><Film className="w-3.5 h-3.5 text-fg-secondary" /><span className="text-[9px] font-extrabold text-muted uppercase tracking-widest hidden sm:inline">Movie</span></>
            }
          </div>
        </div>
      </div>
    </>
  );
}
