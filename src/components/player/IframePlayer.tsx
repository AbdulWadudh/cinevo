"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import {
  Maximize, RefreshCw, Shield, ShieldOff,
  ChevronDown, Check, Server, Layers, ListOrdered, SkipForward, SkipBack, Flag, X, Clapperboard,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useProviders } from "@/lib/useProviders";
import { useTrailer } from "@/components/TrailerProvider";
import {
  buildEmbedUrl, providerIndexFromKey, LAST_PROVIDER_KEY,
  sandboxTokens, SANDBOX_MODES, type SandboxMode,
} from "@/lib/providers";
import { reportProvider } from "@/app/actions/reports";
import { safeStorage } from "@/lib/safeStorage";
import { toast } from "sonner";
import { updateWatchProgressLocal } from "@/lib/watchStore";
import { flushWatch } from "@/lib/watchSyncClient";

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
  /** Explicit `?sandbox=` mode; when absent we use the provider's configured mode. */
  initialSandbox?: SandboxMode;
  seasons?: SeasonInfo[];
  runtimeMinutes?: number;
  /** `?preview=1` — play normally, but keep it out of the watch history. */
  preview?: boolean;
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
  /** When set, mobile shows a compact "{shortLabel}{value}" trigger (e.g. "S1"). */
  shortLabel?: string;
}

function CustomDropdown({ icon, label, options, value, onChange, onOpenChange, disabled, headerAction, shortLabel }: CustomDropdownProps) {
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const selected = options.find((o) => o.value === value);

  // eslint-disable-next-line react-hooks/set-state-in-effect
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
        className={`flex items-center gap-1.5 sm:gap-2 px-2 py-1.5 sm:px-3 sm:py-2 rounded-lg sm:rounded-xl border transition-all duration-200 outline-none group/trigger ${disabled
          ? "bg-white/3 border-white/6 opacity-60 cursor-not-allowed"
          : open
            ? "bg-accent/20 border-accent/60 shadow-[0_0_16px_rgba(229,62,79,0.15)] cursor-pointer"
            : "bg-white/5 border-white/10 hover:bg-white/9 hover:border-white/20 cursor-pointer"
          }`}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={`transition-colors duration-200 ${open ? "text-accent" : "text-muted"}`}>
          {icon}
        </span>
        {shortLabel ? (
          <>
            {/* Mobile + tablet: compact e.g. "S1" / "E1" */}
            <span className="lg:hidden text-sm font-bold text-white">{shortLabel}{value}</span>
            {/* Desktop: full label + value */}
            <div className="hidden lg:flex flex-col items-start leading-none">
              <span className="text-[9px] font-extrabold uppercase tracking-widest text-muted">{label}</span>
              <span className="text-xs font-bold text-white mt-0.5 max-w-24 truncate">{selected?.label ?? "—"}</span>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-start leading-none">
            {/* tiny label hidden until desktop to keep the trigger short */}
            <span className="hidden lg:block text-[9px] font-extrabold uppercase tracking-widest text-muted">{label}</span>
            <span className="text-xs font-bold text-white lg:mt-0.5 max-w-18 lg:max-w-24 truncate">{selected?.label ?? "—"}</span>
          </div>
        )}
        <ChevronDown
          className={`w-3 h-3 sm:w-3.5 sm:h-3.5 text-muted ml-0.5 sm:ml-1 transition-transform duration-300 ${open ? "rotate-180 text-accent" : ""}`}
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
            className="w-55 bg-surface/98 backdrop-blur-2xl border border-white/12 rounded-2xl shadow-[0_24px_60px_rgba(0,0,0,0.9)] overflow-hidden"
          >
            {/* Panel header */}
            <div className="px-4 py-2.5 border-b border-white/6 flex items-center justify-between gap-2">
              <p className="text-[9px] font-extrabold uppercase tracking-widest text-accent">{label}</p>
              {headerAction}
            </div>
            {/* Options */}
            <div className="flex flex-col py-1 max-h-55 overflow-y-auto">
              {options.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => { onChange(opt.value); toggleOpen(false); }}
                  role="option"
                  aria-selected={opt.value === value}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all duration-150 cursor-pointer group/opt ${opt.value === value
                    ? "bg-accent/15 text-accent"
                    : "text-fg hover:bg-white/6 hover:text-white"
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
  initialProgress = 0,
  initialSourceKey,
  initialSandbox,
  seasons = [],
  runtimeMinutes,
  preview = false,
}: IframePlayerProps) {
  const router = useRouter();
  const playerRef = useRef<HTMLDivElement>(null);

  // Providers are loaded from localStorage (version + TTL) then the DB.
  const { providers, loading: providersLoading, refreshing, refresh } = useProviders();
  const { openTrailer } = useTrailer();
  const [selectedProvider, setSelectedProvider] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [currentSeason, setCurrentSeason] = useState(initialSeason);
  const [currentEpisode, setCurrentEpisode] = useState(initialEpisode);
  const [anyDropdownOpen, setAnyDropdownOpen] = useState(false);
  const [sandboxMode, setSandboxMode] = useState<SandboxMode>(initialSandbox ?? "balanced");
  const [reported, setReported] = useState(false);
  const [noticeDismissed, setNoticeDismissed] = useState(false);
  const initializedRef = useRef(false);
  // True once the user manually cycles the sandbox — stops us from auto-syncing
  // it back to the provider's configured mode.
  const sandboxTouchedRef = useRef(false);

  // Once providers arrive, pick the initial source: an explicit ?source= wins,
  // otherwise fall back to the user's last-used provider, then the admin default.
  useEffect(() => {
    if (providersLoading || providers.length === 0 || initializedRef.current) return;
    initializedRef.current = true;
    const lastKey = (() => {
      return safeStorage.get(LAST_PROVIDER_KEY) ?? undefined;
    })();
    const idx = providerIndexFromKey(providers, initialSourceKey ?? lastKey);
    setSelectedProvider(idx);
  }, [providersLoading, providers, initialSourceKey, initialSandbox]);

  const activeProvider = providers[selectedProvider];

  // Keep the sandbox mode in sync with the active provider's configured mode —
  // unless the URL pinned a mode or the user manually changed it this session.
  // This re-applies even after a provider refresh (so admin edits take effect).
  useEffect(() => {
    if (!activeProvider || initialSandbox || sandboxTouchedRef.current) return;
    setSandboxMode(activeProvider.sandboxMode);
  }, [activeProvider, initialSandbox]);

  /* ─── Playback Progress Tracking & Syncing ─── */
  const receivedPostMessageRef = useRef(false);
  const progressRef = useRef(initialProgress);
  const durationRef = useRef(runtimeMinutes ? runtimeMinutes * 60 : (mediaType === "tv" ? 2700 : 7200));

  // Update duration when props change
  useEffect(() => {
    durationRef.current = runtimeMinutes ? runtimeMinutes * 60 : (mediaType === "tv" ? 2700 : 7200);
  }, [runtimeMinutes, mediaType]);

  // Keep progressRef updated with initialProgress if it changes (e.g. fresh episode)
  useEffect(() => {
    progressRef.current = initialProgress;
    // Reset postMessage status for fresh episode
    receivedPostMessageRef.current = false;
  }, [initialProgress, currentSeason, currentEpisode]);

  const updateProgress = useCallback((prog: number, dur: number) => {
    const p = Math.floor(prog);
    const d = Math.floor(dur);
    if (Number.isNaN(p) || Number.isNaN(d) || d <= 0) return;

    // The refs still track position — the player's own resume and next-episode
    // logic reads them — but in preview the store never hears about it.
    progressRef.current = p;
    durationRef.current = d;
    if (preview) return;

    // Update local watch history
    updateWatchProgressLocal(
      {
        mediaId,
        mediaType,
        title,
        posterPath,
        season: mediaType === "tv" ? currentSeason : undefined,
        episode: mediaType === "tv" ? currentEpisode : undefined,
      },
      p,
      d
    );
  }, [mediaId, mediaType, title, posterPath, currentSeason, currentEpisode, preview]);

  // postMessage Listener for standard and provider-specific progress broadcasts
  useEffect(() => {
    const handlePostMessage = (event: MessageEvent) => {
      let payload = event.data;
      if (typeof payload === "string") {
        try {
          payload = JSON.parse(payload);
        } catch {
          return; // Ignore non-JSON strings
        }
      }

      if (!payload || typeof payload !== "object") return;

      let p: number | undefined;
      let d: number | undefined;

      // Sniff standard timeupdate and progress schemas (generic, nested, and vendor-specific)
      if (typeof payload.currentTime === "number") p = payload.currentTime;
      else if (typeof payload.seconds === "number") p = payload.seconds;
      else if (typeof payload.time === "number") p = payload.time;
      else if (typeof payload.progress === "number") p = payload.progress;

      if (typeof payload.duration === "number") d = payload.duration;
      else if (typeof payload.totalTime === "number") d = payload.totalTime;

      // Check nested structures (commonly wrapped in event/data envelopes)
      const nested = payload.data || payload.value || payload.payload;
      if (nested && typeof nested === "object") {
        if (typeof nested.currentTime === "number") p = nested.currentTime;
        else if (typeof nested.seconds === "number") p = nested.seconds;
        else if (typeof nested.time === "number") p = nested.time;
        else if (typeof nested.progress === "number") p = nested.progress;

        if (typeof nested.duration === "number") d = nested.duration;
        else if (typeof nested.totalTime === "number") d = nested.totalTime;
      }

      if (p !== undefined && d !== undefined && d > 0) {
        if (!receivedPostMessageRef.current) {
          console.log(`[Cinevo Player Sync] Active postMessage feed detected from: ${event.origin || "embed iframe"}`);
          receivedPostMessageRef.current = true;
        }
        console.log(`[Cinevo Player Sync] Progress update (postMessage): ${Math.floor(p)}s / ${Math.floor(d)}s`);
        updateProgress(p, d);
      }
    };

    window.addEventListener("message", handlePostMessage);
    return () => window.removeEventListener("message", handlePostMessage);
  }, [updateProgress]);

  // Simulated Progress Tracker (estimates progress if player is silent)
  useEffect(() => {
    let interval: NodeJS.Timeout;

    // Wait 15 seconds before starting the simulated estimation tracker,
    // to give any potential postMessage events time to register.
    const startTimeout = setTimeout(() => {
      if (receivedPostMessageRef.current) {
        console.log("[Cinevo Player Sync] PostMessage tracking active. Skipping simulated tracker.");
        return;
      }

      console.log("[Cinevo Player Sync] Starting visibility-aware progress estimation (no postMessage detected).");

      interval = setInterval(() => {
        // Only increment progress if the tab is in focus (document is visible)
        if (document.visibilityState === "visible") {
          const nextProg = progressRef.current + 10;
          const dur = durationRef.current;

          // Cap progress slightly below duration to avoid premature completed mark if they just left the tab open
          if (nextProg < dur * 0.98) {
            console.log(`[Cinevo Player Sync] Progress update (Estimated): ${nextProg}s / ${dur}s`);
            updateProgress(nextProg, dur);
          }
        }
      }, 10000); // Check and increment every 10 seconds
    }, 15000);

    return () => {
      clearTimeout(startTimeout);
      if (interval) clearInterval(interval);
    };
  }, [updateProgress]);

  // Instant DB flush on unmount
  useEffect(() => {
    return () => {
      console.log("[Cinevo Player Sync] Player unmounted. Flushing progress to database.");
      flushWatch().catch((err) => console.error("[Cinevo Player Sync] Flush failed:", err));
    };
  }, []);


  // Build a consistent URL with all persistent query params
  const buildUrl = useCallback((opts: { season?: number; episode?: number; source?: number; sandbox?: SandboxMode }) => {
    const s = opts.season ?? currentSeason;
    const e = opts.episode ?? currentEpisode;
    const src = opts.source ?? selectedProvider;
    const sb = opts.sandbox ?? sandboxMode;
    const srcKey = providers[src]?.key ?? providers[0]?.key ?? "";
    const base = mediaType === "tv"
      ? `/watch/tv/${mediaId}?season=${s}&episode=${e}&source=${srcKey}`
      : `/watch/movie/${mediaId}?source=${srcKey}`;
    // Always persist the explicit sandbox mode so a manual change survives
    // navigation — and preview, or changing episode would start recording.
    return `${base}&sandbox=${sb}${preview ? "&preview=1" : ""}`;
  }, [currentSeason, currentEpisode, selectedProvider, sandboxMode, providers, mediaType, mediaId, preview]);

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
    reload();
    router.replace(buildUrl({ season: v, episode: 1 }), { scroll: false });
  };

  const handleEpisodeChange = (v: number) => {
    setCurrentEpisode(v);
    reload();
    router.replace(buildUrl({ episode: v }), { scroll: false });
  };

  const handleProviderChange = useCallback((v: number) => {
    setSelectedProvider(v);
    // Remember this as the user's base provider for future visits.
    if (providers[v]) safeStorage.set(LAST_PROVIDER_KEY, providers[v].key);
    // Follow the newly-selected provider's configured sandbox mode.
    sandboxTouchedRef.current = false;
    const mode = providers[v]?.sandboxMode ?? "balanced";
    setSandboxMode(mode);
    reload();
    router.replace(buildUrl({ source: v, sandbox: mode }), { scroll: false });
  }, [providers, reload, router, buildUrl]);

  // Direct sandbox-mode pick (manual override — stops auto-sync to provider).
  const handleSandboxChange = useCallback((mode: SandboxMode) => {
    if (mode === sandboxMode) return;
    sandboxTouchedRef.current = true;
    setSandboxMode(mode);
    reload();
    router.replace(buildUrl({ sandbox: mode }), { scroll: false });
  }, [sandboxMode, reload, router, buildUrl]);

  const toggleFullscreen = () => {
    if (!playerRef.current) return;
    if (!document.fullscreenElement) {
      playerRef.current.requestFullscreen().catch(console.error);
    } else {
      document.exitFullscreen().catch(console.error);
    }
  };

  // Dynamically build embed URL and append start times for known providers
  const embedUrl = (() => {
    if (!activeProvider) return "";
    let url = buildEmbedUrl(activeProvider, mediaId, mediaType, currentSeason, currentEpisode, initialProgress);

    // If there is progress and the url template doesn't naturally support {progress},
    // append vendor-specific parameters to resume playback.
    if (initialProgress > 0 && !activeProvider.movieUrl.includes("{progress}") && !activeProvider.tvUrl.includes("{progress}")) {
      const separator = url.includes("?") ? "&" : "?";
      if (activeProvider.key.includes("vidlink")) {
        url = `${url}${separator}start=${initialProgress}`;
      } else if (activeProvider.key.includes("vidsrc")) {
        url = `${url}${separator}t=${initialProgress}`;
      } else {
        url = `${url}${separator}start=${initialProgress}`;
      }
    }
    return url;
  })();

  /* ─── Prev / Next episode (TV) ── */
  const seasonOrder = validSeasons.map((s) => s.season_number);
  const seasonIdx = seasonOrder.indexOf(currentSeason);

  const nextEpisode: { season: number; episode: number } | null = (() => {
    if (mediaType !== "tv") return null;
    if (currentEpisode < episodeCount) return { season: currentSeason, episode: currentEpisode + 1 };
    const nextSeason = seasonIdx >= 0 ? seasonOrder[seasonIdx + 1] : currentSeason + 1;
    return nextSeason !== undefined ? { season: nextSeason, episode: 1 } : null;
  })();

  const prevEpisode: { season: number; episode: number } | null = (() => {
    if (mediaType !== "tv") return null;
    if (currentEpisode > 1) return { season: currentSeason, episode: currentEpisode - 1 };
    if (seasonIdx > 0) {
      const prevSeason = validSeasons[seasonIdx - 1];
      return { season: prevSeason.season_number, episode: Math.max(1, prevSeason.episode_count || 1) };
    }
    return null; // already at S1E1
  })();

  const goToEpisode = useCallback((target: { season: number; episode: number }) => {
    setCurrentSeason(target.season);
    setCurrentEpisode(target.episode);
    reload();
    router.replace(buildUrl({ season: target.season, episode: target.episode }), { scroll: false });
  }, [reload, router, buildUrl]);

  // Global media keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't run shortcuts if the user is typing in form fields
      const active = document.activeElement;
      if (active?.tagName === "INPUT" || active?.tagName === "TEXTAREA" || active?.hasAttribute("contenteditable")) {
        return;
      }

      const key = e.key.toLowerCase();
      if (key === "f") {
        e.preventDefault();
        toggleFullscreen();
      } else if (key === "t") {
        e.preventDefault();
        openTrailer({ id: mediaId, mediaType, title });
      } else if (key === "p") {
        e.preventDefault();
        if (providers.length > 0) {
          const nextIdx = (selectedProvider + 1) % providers.length;
          handleProviderChange(nextIdx);
          toast.info(`Switched to provider: ${providers[nextIdx].label}`);
        }
      } else if (key === "s") {
        e.preventDefault();
        const currentIdx = SANDBOX_MODES.indexOf(sandboxMode);
        const nextIdx = (currentIdx + 1) % SANDBOX_MODES.length;
        handleSandboxChange(SANDBOX_MODES[nextIdx]);
        toast.info(`Sandbox: ${SANDBOX_MODES[nextIdx] === "off" ? "Off" : SANDBOX_MODES[nextIdx] === "strict" ? "Strict" : "Balanced"}`);
      } else if (e.shiftKey && e.key === "ArrowRight") {
        e.preventDefault();
        if (nextEpisode) {
          goToEpisode(nextEpisode);
          toast.info(`Next episode: S${nextEpisode.season} E${nextEpisode.episode}`);
        }
      } else if (e.shiftKey && e.key === "ArrowLeft") {
        e.preventDefault();
        if (prevEpisode) {
          goToEpisode(prevEpisode);
          toast.info(`Previous episode: S${prevEpisode.season} E${prevEpisode.episode}`);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedProvider, providers, sandboxMode, nextEpisode, prevEpisode, mediaId, mediaType, title, openTrailer, handleProviderChange, handleSandboxChange, goToEpisode]);


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

        .player-stage:fullscreen {
          max-height: none; aspect-ratio: auto; height: 100%;
          border: 0; border-radius: 0; box-shadow: none;
        }
        .player-stage:-webkit-full-screen {
          max-height: none; aspect-ratio: auto; height: 100%;
          border: 0; border-radius: 0; box-shadow: none;
        }
        .player-stage:fullscreen::backdrop { background: #000; }
        .player-stage:-webkit-full-screen::backdrop { background: #000; }
      `}</style>

      <div className="flex flex-col gap-0 w-full">

        {/* ── Player ── */}
        <div
          ref={playerRef}
          className="player-stage relative w-full aspect-video max-h-[70vh] bg-black rounded-t-xl overflow-hidden select-none shadow-2xl border border-white/4 border-b-0 group"
        >
          <div className="w-full h-full relative">
            {embedUrl && (
              <iframe
                key={`${activeProvider?.key}-${currentSeason}-${currentEpisode}-${sandboxMode}`}
                src={embedUrl}
                className="w-full h-full border-none"
                allowFullScreen
                allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
                referrerPolicy="no-referrer"
                {...(sandboxTokens(sandboxMode) ? { sandbox: sandboxTokens(sandboxMode) as string } : {})}
                title={title}
              />
            )}

            {/* Loading veil — shown while providers resolve or a switch reloads
                the embed. Backed by the poster so it never flashes plain black. */}
            {(isLoading || providersLoading || !embedUrl) && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 overflow-hidden">
                <Image
                  src={posterPath ? `https://image.tmdb.org/t/p/original${posterPath}` : "https://picsum.photos/seed/cinevodefault/1280/720"}
                  alt={title}
                  fill
                  sizes="100vw"
                  className="object-cover brightness-[0.3]"
                />
                <div className="absolute inset-0 bg-bg/80" />
                <RefreshCw className="relative w-10 h-10 animate-spin text-accent" />
                <p className="relative text-sm font-semibold text-fg-secondary animate-pulse">Securing safe link…</p>
              </div>
            )}

            {/* Transparent overlay blocks iframe from stealing pointer events when a dropdown is open */}
            {anyDropdownOpen && (
              <div className="absolute inset-0 z-9998" aria-hidden="true" />
            )}
          </div>

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
        <div className="w-full bg-surface/50 backdrop-blur-xl border border-white/[0.07] border-t border-t-white/4 rounded-b-xl px-2 py-1.5 sm:px-5 sm:py-3 flex flex-wrap items-center justify-center gap-1.5 sm:flex-nowrap sm:justify-between sm:gap-4 relative overflow-visible">

          {/* Left: Ad-block mode — direct pick (Balanced / Strict / Off) */}
          <CustomDropdown
            icon={sandboxMode === "off" ? <ShieldOff className="w-3.5 h-3.5" /> : <Shield className="w-3.5 h-3.5" />}
            label="Ad Block"
            options={SANDBOX_MODES.map((m, i) => ({
              value: i,
              label: m === "off" ? "Off" : m === "strict" ? "Strict" : "Balanced",
              sub: m === "off" ? "Ads possible" : m === "strict" ? "Max protection" : "Blocks ads",
            }))}
            value={SANDBOX_MODES.indexOf(sandboxMode)}
            onChange={(i) => handleSandboxChange(SANDBOX_MODES[i])}
            onOpenChange={setAnyDropdownOpen}
          />

          {/* Watch Trailer — matches the Ad-Block control's size (self-stretch). */}
          <button
            onClick={() => openTrailer({ id: mediaId, mediaType, title })}
            title="Watch trailer"
            aria-label="Watch trailer"
            className="flex items-center gap-1.5 sm:gap-2 px-2 py-1.5 sm:px-3 sm:py-2 rounded-lg sm:rounded-xl border bg-white/4 border-white/8 text-muted hover:text-accent hover:border-accent/40 transition-all duration-200 cursor-pointer shrink-0 self-stretch"
          >
            <Clapperboard className="w-3.5 h-3.5" />
            <span className="text-xs font-bold text-white hidden sm:inline">Trailer</span>
          </button>

          {/* Report broken provider — hidden for now */}
          {false && (
            <button
              onClick={() => {
                if (reported || !activeProvider) return;
                setReported(true);
                reportProvider({
                  providerKey: activeProvider.key,
                  providerLabel: activeProvider.label,
                  mediaId,
                  mediaType,
                  title,
                })
                  .then(() => toast.success(`Reported ${activeProvider.label}`, { description: "Thanks — our team will take a look." }))
                  .catch(() => toast.error("Couldn't submit report"));
                setTimeout(() => setReported(false), 4000);
              }}
              disabled={reported || !activeProvider}
              title={reported ? "Thanks — reported" : "Report this provider as not working"}
              aria-label="Report broken provider"
              className={`flex items-center gap-1.5 px-2 py-1.5 sm:px-2.5 rounded-lg border transition-all duration-300 cursor-pointer shrink-0 ${reported
                ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400"
                : "bg-white/4 border-white/8 text-muted hover:text-accent hover:border-accent/40"
                }`}
            >
              <Flag className="w-3 h-3" />
              <span className="text-[9px] font-extrabold uppercase tracking-widest hidden sm:inline">
                {reported ? "Reported" : "Report"}
              </span>
            </button>
          )}

          {/* Center: the dropdowns stay on one line together (Provider/Season/Episode).
              On mobile this group drops to its own full-width row; on desktop it
              flex-centers between the side items. Scrolls if too narrow. */}
          <div className="flex flex-wrap items-center justify-center gap-2 w-full order-last sm:flex-1 sm:min-w-0 sm:flex-nowrap sm:order-0 sm:w-auto sm:overflow-x-auto scrollbar-hide">
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
                  onClick={(e) => { e.stopPropagation(); refresh().then(() => toast.success("Providers refreshed")); }}
                  disabled={refreshing}
                  title="Refresh providers from server"
                  aria-label="Refresh providers"
                  className="flex items-center justify-center w-6 h-6 rounded-md border bg-white/5 border-white/10 hover:bg-white/9 hover:border-accent/40 text-muted hover:text-accent transition-all duration-200 cursor-pointer disabled:opacity-60 disabled:cursor-wait"
                >
                  <RefreshCw className={`w-3 h-3 ${refreshing ? "animate-spin text-accent" : ""}`} />
                </button>
              }
            />

            {mediaType === "tv" && (
              <>
                {/* Divider */}
                <div className="hidden sm:block w-px h-8 bg-white/8 shrink-0" />

                {/* Season */}
                <CustomDropdown
                  icon={<Layers className="w-3.5 h-3.5" />}
                  label="Season"
                  shortLabel="S"
                  options={seasonOptions}
                  value={currentSeason}
                  onChange={handleSeasonChange}
                  onOpenChange={setAnyDropdownOpen}
                />

                {/* Divider */}
                <div className="hidden sm:block w-px h-8 bg-white/8 shrink-0" />

                {/* Episode */}
                <CustomDropdown
                  icon={<ListOrdered className="w-3.5 h-3.5" />}
                  label="Episode"
                  shortLabel="E"
                  options={episodeOptions}
                  value={currentEpisode}
                  onChange={handleEpisodeChange}
                  onOpenChange={setAnyDropdownOpen}
                />

                {/* Prev / Next — icon-only, side by side; each hidden at its
                    boundary. Drops to its own centered row below on mobile. */}
                {(prevEpisode || nextEpisode) && (
                  <div className="flex items-center justify-center gap-1.5 w-full sm:w-auto sm:shrink-0">
                    {prevEpisode && (
                      <button
                        onClick={() => goToEpisode(prevEpisode)}
                        title={`Previous: S${prevEpisode.season} E${prevEpisode.episode}`}
                        aria-label="Previous episode"
                        className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl border bg-white/5 border-white/10 hover:bg-accent/20 hover:border-accent/60 text-muted hover:text-accent transition-all duration-200 cursor-pointer"
                      >
                        <SkipBack className="w-4 h-4" />
                      </button>
                    )}
                    {nextEpisode && (
                      <button
                        onClick={() => goToEpisode(nextEpisode)}
                        title={`Next: S${nextEpisode.season} E${nextEpisode.episode}`}
                        aria-label="Next episode"
                        className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl border bg-white/5 border-white/10 hover:bg-accent/20 hover:border-accent/60 text-muted hover:text-accent transition-all duration-200 cursor-pointer"
                      >
                        <SkipForward className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

        </div>

        {/* No-sandbox advisory — this provider can't be ad-protected */}
        {sandboxMode === "off" && !noticeDismissed && (
          <div className="mt-2 flex items-center gap-2 rounded-xl border border-orange-500/25 bg-orange-500/8 px-2.5 py-1.5 sm:px-3 sm:py-2 animate-fade-in">
            <ShieldOff className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-orange-400 shrink-0" />
            <p className="text-[10px] sm:text-xs text-orange-200/90 leading-snug flex-1">
              <b className="text-orange-300">Ad protection off</b> on {activeProvider?.label ?? "this provider"} — it doesn&apos;t allow blocking, so pop-ups/ads may appear. For a clean experience, use an ad-blocker like{" "}
              <a href="https://ublockorigin.com" target="_blank" rel="noreferrer" className="underline hover:text-orange-100">uBlock Origin</a>, or pick another provider.
            </p>
            <button
              onClick={() => setNoticeDismissed(true)}
              aria-label="Dismiss notice"
              className="shrink-0 text-orange-300/60 hover:text-orange-200 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </>
  );
}
