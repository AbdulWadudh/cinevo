"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { toast } from "sonner";
import {
  Radio as RadioIcon, Search, X, Loader2, Heart, SearchX, Shuffle, ListFilter,
} from "lucide-react";
import {
  getRadioStationsAction,
  getAllRadioStationsAction,
  searchRadioStationsAction,
  reportRadioStationAction,
  updateRadioStationAction,
  deleteRadioStationAction,
  type RadioCategoryData,
  type RadioStationData,
} from "@/app/actions/radio";
import { prettifyName } from "@/lib/radio/categories";
import CategoryRail, { type RailTab } from "./CategoryRail";
import StationCard from "./StationCard";
import StationEditDialog, { type DialogMode } from "./StationEditDialog";
import PlayerBar from "./PlayerBar";
import Equalizer from "./Equalizer";
import { useRadioPlayer } from "./useRadioPlayer";
import { useRadioFavorites } from "./useRadioFavorites";
import { useRadioEqualizer } from "./useRadioEqualizer";
import { radioStorage } from "./radioStorage";

/** Cards rendered per page — motion on hundreds of nodes at once is costly. */
const PAGE_SIZE = 60;
const SEARCH_DEBOUNCE_MS = 320;
/** Ceiling on the skip-past-dead-stations chain, so a bad run can't spin. */
const MAX_AUTO_SKIPS = 8;
/** Cache key for the cross-category "All stations" list. */
const ALL_SLUG = "__all__";

/**
 * Shared horizontal gutter — identical to the one Nav uses, so the page
 * content lines up with the logo. Every band and the grid reference this.
 */
const GUTTER = "px-6 md:px-12";

/** Random element, or undefined for an empty list. */
function randomOf<T>(list: readonly T[]): T | undefined {
  return list.length > 0 ? list[Math.floor(Math.random() * list.length)] : undefined;
}

interface RadioClientProps {
  categories: RadioCategoryData[];
  featured: RadioCategoryData[];
  initialSlug: string | null;
  initialStations: RadioStationData[];
  isAdmin: boolean;
}

export default function RadioClient({
  categories,
  featured,
  initialSlug,
  initialStations,
  isAdmin,
}: RadioClientProps) {
  const reduceMotion = useReducedMotion();
  const { favorites, toggleFavorite, isFavorite } = useRadioFavorites();

  const [activeTab, setActiveTab] = useState<RailTab>("featured");
  const [activeSlug, setActiveSlug] = useState<string | null>(initialSlug);
  const [query, setQuery] = useState("");

  /** Stations keyed by category slug — the in-memory half of the cache. */
  const [stationsBySlug, setStationsBySlug] = useState<Record<string, RadioStationData[]>>(() =>
    initialSlug ? { [initialSlug]: initialStations } : {}
  );

  /** Last completed search, tagged with the query it answers. */
  const [search, setSearch] = useState<{ q: string; data: RadioStationData[] } | null>(null);

  /** Phone-only: which of search / categories is expanded. */
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>("none");

  const [dialogStation, setDialogStation] = useState<RadioStationData | null>(null);
  const [dialogMode, setDialogMode] = useState<DialogMode>("edit");
  const [dialogBusy, setDialogBusy] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);

  const player = useRadioPlayer();
  const eq = useRadioEqualizer(player.audioRef, player.markElementTainted);

  /** Consecutive dead streams stepped over, so a bad run can't loop forever. */
  const autoSkipRef = useRef(0);

  /** Set as soon as the listener picks anything, so we stop second-guessing. */
  const touchedRef = useRef(false);
  const cuedRef = useRef(false);

  const handleEqToggle = useCallback(
    async (enabled: boolean) => {
      const ok = await eq.setEnabled(enabled);
      if (enabled && !ok) {
        toast.error("This station doesn't allow audio processing", {
          description: "The equaliser stays off for it — try another station.",
        });
      } else if (enabled) {
        toast.success("Equaliser on");
      }
    },
    [eq]
  );

  /* ── Station loading (localStorage-backed) ───────────────────────────── */

  // "All stations" is loaded through the same cache, under a reserved key.
  const loadSlug = activeTab === "all" ? ALL_SLUG : activeSlug;

  useEffect(() => {
    if (!loadSlug || stationsBySlug[loadSlug] !== undefined) return;

    let cancelled = false;

    // Async so the cache read lands in a promise callback rather than
    // synchronously in the effect body.
    (async () => {
      const cached = radioStorage.readStations(loadSlug);
      if (cached) {
        if (!cancelled) setStationsBySlug((prev) => ({ ...prev, [loadSlug]: cached }));
        return;
      }

      const res =
        loadSlug === ALL_SLUG
          ? await getAllRadioStationsAction()
          : await getRadioStationsAction(loadSlug);
      if (cancelled) return;

      const data = res.success ? res.data : [];
      if (data.length > 0) radioStorage.writeStations(loadSlug, data);
      setStationsBySlug((prev) => ({ ...prev, [loadSlug]: data }));
    })();

    return () => {
      cancelled = true;
    };
  }, [loadSlug, stationsBySlug]);

  /* ── Global search (debounced, server-side) ──────────────────────────── */

  const q = query.trim();
  const searchActive = q.length >= 2;

  useEffect(() => {
    if (!searchActive) return;

    let cancelled = false;
    const handle = setTimeout(() => {
      searchRadioStationsAction(q).then((res) => {
        if (!cancelled) setSearch({ q, data: res.success ? res.data : [] });
      });
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [q, searchActive]);

  /* ── What the grid shows ─────────────────────────────────────────────── */

  const mode: "search" | "favorites" | "all" | "category" = searchActive
    ? "search"
    : activeTab === "favorites"
      ? "favorites"
      : activeTab === "all"
        ? "all"
        : "category";

  const searchData = search && search.q === q ? search.data : null;
  const stations = loadSlug ? stationsBySlug[loadSlug] : undefined;

  const busy =
    mode === "search"
      ? searchData === null
      : (mode === "category" || mode === "all") && Boolean(loadSlug) && stations === undefined;

  const displayed = useMemo(() => {
    if (mode === "search") return searchData ?? [];
    if (mode === "favorites") return favorites;
    return stations ?? [];
  }, [mode, searchData, favorites, stations]);

  /* ── Cue a station on arrival ────────────────────────────────────────── */

  /**
   * The station to open on, in descending order of how likely it is to be
   * what the listener wants:
   *
   *   1. the station they last played
   *   2. a random favourite
   *   3. a random station from the tab they're looking at
   *   4. a random station from anywhere
   *
   * Every fallback is random by design — always opening on the alphabetically
   * first station made the page feel stuck on one entry.
   */
  const pickOpeningStation = useCallback(
    () =>
      radioStorage.readLastStation() ??
      // Read straight from storage rather than the `favorites` state: on the
      // first post-hydration commit that state can still hold the empty
      // server snapshot, which would silently skip this rung.
      randomOf(radioStorage.getFavoritesSnapshot()) ??
      randomOf(displayed) ??
      randomOf(initialStations),
    [displayed, initialStations]
  );

  /**
   * Cue it once, after hydration — both the storage read and `Math.random`
   * would desync a server-rendered choice.
   *
   * No cleanup: this effect re-runs whenever the station lists settle, and
   * cancelling the pending callback on re-run meant the guard below blocked
   * the retry and nothing was ever cued. `cue` is a stable callback, so it is
   * safe to depend on directly.
   */
  useEffect(() => {
    if (touchedRef.current || cuedRef.current) return;

    const pick = pickOpeningStation();
    if (!pick) return;

    cuedRef.current = true;
    queueMicrotask(() => player.cue(pick));
    // Re-running on every render is harmless — the guard above returns
    // immediately once a station has been cued.
  }, [pickOpeningStation, player]);

  /* ── Auto-skip past dead streams ─────────────────────────────────────── */

  useEffect(() => {
    if (player.status === "playing") {
      // A station that opens successfully ends the chain.
      autoSkipRef.current = 0;
      return;
    }
    if (player.status !== "error") return;

    const failed = player.current;
    if (!failed || displayed.length < 2) return;

    const idx = displayed.findIndex((s) => s.id === failed.id);
    if (idx === -1) return;

    const next = displayed[(idx + 1) % displayed.length];
    if (!next || next.id === failed.id) return;

    if (autoSkipRef.current >= MAX_AUTO_SKIPS) {
      autoSkipRef.current = 0;
      toast.error("Several stations in a row failed", {
        description: "This category may be offline — try another one.",
      });
      return;
    }

    // Brief pause so the failure is visible before moving on, and so the
    // state change happens in a callback rather than during the effect.
    const handle = setTimeout(() => {
      autoSkipRef.current += 1;
      toast(`Skipping “${failed.name}”`, { description: `Trying ${next.name}…`, duration: 2200 });
      void player.play(next);
    }, 900);

    return () => clearTimeout(handle);
  }, [player, displayed]);

  /* ── Keep the playing station on screen ──────────────────────────────── */

  const playingId = player.current?.id ?? null;

  useEffect(() => {
    if (!playingId) return;

    // Runs after paint, so the card is mounted by the time we look for it.
    const handle = requestAnimationFrame(() => {
      const el = document.querySelector<HTMLElement>(`[data-station-id="${CSS.escape(playingId)}"]`);
      if (!el) return;

      // Visibility is measured against the scroll container, not the window,
      // and the docked player bar covers its lower edge.
      const scroller = document.querySelector("[data-radio-scroll]");
      const view = scroller?.getBoundingClientRect();
      const viewTop = view?.top ?? 0;
      const viewBottom = (view?.bottom ?? window.innerHeight) - 110;

      const { top, bottom } = el.getBoundingClientRect();
      if (top >= viewTop && bottom <= viewBottom) return;

      el.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
    });

    return () => cancelAnimationFrame(handle);
  }, [playingId, reduceMotion]);

  /* ── Pagination, reset when the underlying list changes ──────────────── */

  const listKey = `${mode}:${loadSlug ?? ""}:${mode === "search" ? q : ""}`;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [pagedKey, setPagedKey] = useState(listKey);

  // Adjusting state during render is React's recommended way to reset derived
  // state on a change — no effect, no extra commit.
  if (pagedKey !== listKey) {
    setPagedKey(listKey);
    setVisibleCount(PAGE_SIZE);
  }

  const visible = useMemo(() => displayed.slice(0, visibleCount), [displayed, visibleCount]);
  const remaining = displayed.length - visible.length;

  /* ── Infinite scroll ─────────────────────────────────────────────────── */

  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (remaining <= 0) return;
    const el = sentinelRef.current;
    if (!el) return;

    const total = displayed.length;
    const observer = new IntersectionObserver(
      (entries) => {
        // setState from the observer callback, not the effect body.
        if (entries.some((e) => e.isIntersecting)) {
          setVisibleCount((v) => Math.min(v + PAGE_SIZE, total));
        }
      },
      {
        // Scroll happens inside the grid container, not the window.
        root: document.querySelector("[data-radio-scroll]"),
        // Fetch the next page before the user reaches the bottom.
        rootMargin: "600px 0px",
      }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [remaining, displayed.length]);

  const activeCategory = useMemo(
    () => categories.find((c) => c.slug === activeSlug) ?? null,
    [categories, activeSlug]
  );

  /* ── Mutations ───────────────────────────────────────────────────────── */

  /** Applies a station change to every cached list holding it. */
  const patchStation = useCallback((id: string, patch: Partial<RadioStationData> | null) => {
    setStationsBySlug((prev) => {
      const next: Record<string, RadioStationData[]> = {};
      for (const [slug, list] of Object.entries(prev)) {
        if (!list.some((s) => s.id === id)) {
          next[slug] = list;
          continue;
        }
        next[slug] =
          patch === null
            ? list.filter((s) => s.id !== id)
            : list.map((s) => (s.id === id ? { ...s, ...patch } : s));
        radioStorage.writeStations(slug, next[slug]);
      }
      return next;
    });

    setSearch((prev) => {
      if (!prev || !prev.data.some((s) => s.id === id)) return prev;
      return {
        q: prev.q,
        data:
          patch === null
            ? prev.data.filter((s) => s.id !== id)
            : prev.data.map((s) => (s.id === id ? { ...s, ...patch } : s)),
      };
    });
  }, []);

  const handleReport = useCallback(
    async (station: RadioStationData) => {
      // Admins toggle the flag outright; everyone else files a report.
      if (isAdmin && station.isBroken) {
        const res = await updateRadioStationAction(station.id, { isBroken: false });
        if (res.success) {
          patchStation(station.id, { isBroken: false, reportCount: 0 });
          toast.success(`“${station.name}” marked as working`);
        } else {
          toast.error(res.error ?? "Could not update station");
        }
        return;
      }

      const res = await reportRadioStationAction(station.id);
      if (res.success && res.data) {
        patchStation(station.id, { isBroken: res.data.isBroken, reportCount: res.data.reportCount });
        toast.success(`Thanks — “${station.name}” reported`, {
          description: res.data.isBroken
            ? "Enough reports came in; it's now flagged as not working."
            : "We'll flag it once a few more listeners agree.",
        });
      } else {
        toast.error(res.error ?? "Could not report station");
      }
    },
    [isAdmin, patchStation]
  );

  const openDialog = useCallback((station: RadioStationData, dialog: DialogMode) => {
    setDialogStation(station);
    setDialogMode(dialog);
    setDialogError(null);
  }, []);

  const handleSave = useCallback(
    async (patch: { name: string; url: string }) => {
      if (!dialogStation) return;
      setDialogBusy(true);
      setDialogError(null);

      const res = await updateRadioStationAction(dialogStation.id, patch);
      setDialogBusy(false);

      if (res.success && res.data) {
        patchStation(dialogStation.id, { name: res.data.name, url: res.data.url });
        setDialogStation(null);
        toast.success("Station updated");
      } else {
        setDialogError(res.error ?? "Could not save changes");
      }
    },
    [dialogStation, patchStation]
  );

  const handleDelete = useCallback(async () => {
    if (!dialogStation) return;
    setDialogBusy(true);
    setDialogError(null);

    const res = await deleteRadioStationAction(dialogStation.id);
    setDialogBusy(false);

    if (res.success) {
      const removed = dialogStation;
      if (player.current?.id === removed.id) player.stop();
      patchStation(removed.id, null);
      setDialogStation(null);
      toast.success(`Deleted “${removed.name}”`);
    } else {
      setDialogError(res.error ?? "Could not delete station");
    }
  }, [dialogStation, patchStation, player]);

  /* ── Handlers ────────────────────────────────────────────────────────── */

  const handleTabChange = useCallback(
    (tab: RailTab) => {
      setActiveTab(tab);
      setQuery("");
      // These two are lists in their own right — no category to land on, so
      // close the phone picker and show them straight away.
      if (tab === "favorites" || tab === "all") {
        setMobilePanel("none");
        return;
      }

      const pool = tab === "featured" ? featured : categories.filter((c) => c.group === tab);
      if (pool.length > 0 && !pool.some((c) => c.slug === activeSlug)) {
        setActiveSlug(pool[0].slug);
      }
    },
    [categories, featured, activeSlug]
  );

  const handleSelectCategory = useCallback((slug: string) => {
    setActiveSlug(slug);
    setQuery("");
    // Picking a category on a phone means you're done with the picker.
    setMobilePanel("none");
  }, []);

  const handleSelect = useCallback(
    (station: RadioStationData) => {
      touchedRef.current = true;
      autoSkipRef.current = 0; // an explicit pick starts a fresh chain
      player.toggle(station);
    },
    [player]
  );

  /**
   * Brings a station into view: pages it in if it sits past the rendered
   * window, then scrolls to it. Shuffle can land anywhere in a 400-item list,
   * so without this the station that starts playing is often off-screen —
   * or not even mounted.
   */
  const revealStation = useCallback(
    (station: RadioStationData) => {
      const idx = displayed.findIndex((s) => s.id === station.id);
      if (idx === -1) return;

      if (idx >= visibleCount) {
        setVisibleCount(Math.ceil((idx + 1) / PAGE_SIZE) * PAGE_SIZE);
      }

      // Two frames: one for the paging re-render, one for layout.
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          const el = document.querySelector<HTMLElement>(
            `[data-station-id="${CSS.escape(station.id)}"]`
          );
          el?.scrollIntoView({
            behavior: reduceMotion ? "auto" : "smooth",
            block: "center",
          });
        })
      );
    },
    [displayed, visibleCount, reduceMotion]
  );

  const skipBy = useCallback(
    (delta: number) => {
      if (!player.current || displayed.length === 0) return;
      const idx = displayed.findIndex((s) => s.id === player.current!.id);
      if (idx === -1) return;
      const next = displayed[(idx + delta + displayed.length) % displayed.length];
      touchedRef.current = true;
      autoSkipRef.current = 0;
      void player.play(next);
      revealStation(next);
    },
    [displayed, player, revealStation]
  );

  /** Plays a random station from whatever the grid is showing. */
  const handleShuffle = useCallback(() => {
    if (displayed.length === 0) return;

    // Exclude the current station so every click actually changes something.
    const pool =
      displayed.length > 1 && player.current
        ? displayed.filter((s) => s.id !== player.current!.id)
        : displayed;

    const pick = pool[Math.floor(Math.random() * pool.length)];
    if (!pick) return;

    touchedRef.current = true;
    autoSkipRef.current = 0;
    void player.play(pick);
    revealStation(pick);
  }, [displayed, player, revealStation]);

  /* ── Keyboard shortcuts ──────────────────────────────────────────────── */

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const isSpace = e.code === "Space" || e.key === " ";
      const isPrev = e.key === "ArrowLeft";
      const isNext = e.key === "ArrowRight";
      if (!isSpace && !isPrev && !isNext) return;

      // Typing — and caret movement — must keep working in any text field.
      const el = e.target as HTMLElement | null;
      if (el) {
        const tag = el.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable) {
          return;
        }
      }

      // These keys do nothing else on this page — not even activating a
      // focused button or scrolling — so swallow the default.
      e.preventDefault();
      touchedRef.current = true;

      if (isNext || isPrev) {
        // Arrows only make sense once something is playing; otherwise there's
        // no position in the list to move from.
        if (player.current) skipBy(isNext ? 1 : -1);
        return;
      }

      if (player.current) {
        player.toggle();
        return;
      }

      // Nothing cued yet — fall back to the same priority chain rather than
      // grabbing the first station in the list.
      const pick = pickOpeningStation();
      if (pick) {
        autoSkipRef.current = 0;
        void player.play(pick);
        revealStation(pick);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [player, pickOpeningStation, skipBy, revealStation]);

  const handleEdit = useCallback((s: RadioStationData) => openDialog(s, "edit"), [openDialog]);
  const handleDeleteRequest = useCallback((s: RadioStationData) => openDialog(s, "delete"), [openDialog]);

  const currentIsFavorite = player.current ? isFavorite(player.current.id) : false;

  const gridVariants = useMemo(
    () => ({
      hidden: {},
      show: { transition: { staggerChildren: reduceMotion ? 0 : 0.015 } },
    }),
    [reduceMotion]
  );

  const heading =
    mode === "search"
      ? `Results for “${q}”`
      : mode === "favorites"
        ? "Your favourites"
        : mode === "all"
          ? "All stations"
          : (activeCategory?.name ?? (activeSlug ? prettifyName(activeSlug) : "Stations"));

  return (
    <>
      {/* Clears the fixed Nav. */}
      <div className="h-16 shrink-0" aria-hidden="true" />

      {/* Masthead, sections and categories are fixed furniture — they never
          scroll; only the station grid below does. */}
      <div
        data-radio-sticky=""
        className="shrink-0 border-b border-white/6 bg-[#07020d]/92 backdrop-blur-xl"
      >
        <RadioHeader
          query={query}
          onQueryChange={setQuery}
          searching={mode === "search" && busy}
          categoryCount={categories.length}
          isAdmin={isAdmin}
          onShuffle={handleShuffle}
          canShuffle={displayed.length > 0}
          panel={mobilePanel}
          onPanelChange={setMobilePanel}
        />

        {/* Always present from md up; on phones it's behind the filter toggle
            so the grid keeps most of the screen. */}
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.1, ease: "easeOut" }}
          className={`${GUTTER} pb-4 ${mobilePanel === "categories" ? "" : "hidden md:block"}`}
        >
          <CategoryRail
            categories={categories}
            featured={featured}
            favoritesCount={favorites.length}
            activeTab={activeTab}
            activeSlug={activeSlug}
            onTabChange={handleTabChange}
            onSelectCategory={handleSelectCategory}
          />
        </motion.div>

        {/* Current list title sits at the foot of the band, so the grid below
            scrolls cleanly with no second header seam. The band's own bottom
            border is the only rule here — a border-t as well read as a
            double line. */}
        <div className={`${GUTTER} flex items-center justify-between gap-4 pb-3.5 pt-1`}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={heading}
              initial={reduceMotion ? false : { opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, x: 8 }}
              transition={{ duration: 0.18 }}
              className="flex min-w-0 items-center gap-2.5"
            >
              <span
                aria-hidden="true"
                className="h-4 w-1 flex-none rounded-full bg-linear-to-b from-purple-400 to-fuchsia-500"
              />
              <h2 className="truncate font-display text-base font-bold tracking-tight text-white">
                {heading}
              </h2>
            </motion.div>
          </AnimatePresence>

          {!busy && displayed.length > 0 && (
            <motion.span
              initial={reduceMotion ? false : { opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex-none rounded-full border border-white/8 bg-white/5 px-2.5 py-1 text-[11px] font-medium tabular-nums text-fg-secondary"
            >
              {displayed.length.toLocaleString()} station{displayed.length === 1 ? "" : "s"}
            </motion.span>
          )}
        </div>
      </div>

      {/* The page's only scroll container. */}
      <main data-radio-scroll="" className={`${GUTTER} min-h-0 flex-1 overflow-y-auto pb-40 pt-5`}>
        {busy ? (
          <StationGridSkeleton />
        ) : displayed.length === 0 ? (
          <EmptyState mode={mode} query={q} />
        ) : (
          <>
            <motion.div
              key={listKey}
              variants={gridVariants}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4"
            >
              <AnimatePresence mode="popLayout">
                {visible.map((station) => (
                  <StationCard
                    key={station.id}
                    station={station}
                    isCurrent={player.current?.id === station.id}
                    status={player.status}
                    isFavorite={isFavorite(station.id)}
                    isAdmin={isAdmin}
                    onSelect={handleSelect}
                    onToggleFavorite={toggleFavorite}
                    onReport={handleReport}
                    onEdit={handleEdit}
                    onDelete={handleDeleteRequest}
                  />
                ))}
              </AnimatePresence>
            </motion.div>

            {/* Tripwire for infinite scroll — the observer above pages in the
                next batch well before this comes into view. */}
            {remaining > 0 && (
              <div
                ref={sentinelRef}
                className="mt-6 flex items-center justify-center gap-2 py-6 text-xs text-muted"
              >
                <Loader2 className="size-3.5 animate-spin text-purple-400" />
                Loading {Math.min(remaining, PAGE_SIZE)} more…
              </div>
            )}
          </>
        )}
      </main>

      <PlayerBar
        station={player.current}
        status={player.status}
        volume={player.volume}
        isMuted={player.isMuted}
        isFavorite={currentIsFavorite}
        canSkip={displayed.length > 1}
        onToggle={() => player.toggle()}
        onPrev={() => skipBy(-1)}
        onNext={() => skipBy(1)}
        onVolumeChange={player.changeVolume}
        onToggleMute={player.toggleMute}
        onToggleFavorite={() => player.current && toggleFavorite(player.current)}
        onReport={() => player.current && handleReport(player.current)}
        onClose={player.stop}
        eq={eq.settings}
        eqSupported={eq.supported}
        eqPending={eq.pending}
        onEqToggle={handleEqToggle}
        onEqBand={eq.setBand}
        onEqPreset={eq.applyPreset}
      />

      <StationEditDialog
        station={dialogStation}
        mode={dialogMode}
        busy={dialogBusy}
        error={dialogError}
        onSave={handleSave}
        onConfirmDelete={handleDelete}
        onClose={() => !dialogBusy && setDialogStation(null)}
      />
    </>
  );
}

/* ── Pieces ────────────────────────────────────────────────────────────── */

interface RadioHeaderProps {
  query: string;
  onQueryChange: (v: string) => void;
  searching: boolean;
  categoryCount: number;
  isAdmin: boolean;
  onShuffle: () => void;
  canShuffle: boolean;
  panel: MobilePanel;
  onPanelChange: (panel: MobilePanel) => void;
}

/** Which space-hungry control is expanded on phones. */
type MobilePanel = "none" | "search" | "categories";

/**
 * Compact masthead. On phones the search field and the whole category rail
 * collapse behind toggles — shown inline they left almost no room for the
 * station grid.
 */
function RadioHeader({
  query,
  onQueryChange,
  searching,
  categoryCount,
  isAdmin,
  onShuffle,
  canShuffle,
  panel,
  onPanelChange,
}: RadioHeaderProps) {
  const reduceMotion = useReducedMotion();
  const [spins, setSpins] = useState(0);

  const searchField = (
    <div className="relative min-w-0 flex-1">
      <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
      <input
        type="text"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        placeholder="Search every station…"
        aria-label="Search stations"
        className="w-full rounded-xl border border-white/6 bg-surface/70 py-2.5 pl-10 pr-10 text-sm text-fg outline-none transition-colors placeholder:text-muted focus:border-purple-500/50"
      />
      <AnimatePresence>
        {(query || searching) && (
          <motion.div
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.7 }}
            className="absolute right-3 top-1/2 -translate-y-1/2"
          >
            {searching ? (
              <Loader2 className="size-4 animate-spin text-purple-400" />
            ) : (
              <button
                type="button"
                onClick={() => onQueryChange("")}
                aria-label="Clear search"
                className="cursor-pointer rounded p-1 text-muted transition-colors hover:text-white"
              >
                <X className="size-3.5" />
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  return (
    // No ambient blur blob here: clipping a `blur-3xl` glow against the
    // section edge left a hard horizontal seam across the band.
    <section className={`${GUTTER} relative pb-3 pt-4`}>
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="relative flex items-center justify-between gap-4"
      >
        <div className="flex min-w-0 items-center gap-3">
          <motion.div
            className="flex size-9 flex-none items-center justify-center rounded-xl border border-purple-500/25 bg-purple-950/50 md:size-10"
            animate={reduceMotion ? undefined : { scale: [1, 1.06, 1] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          >
            <RadioIcon className="size-4.5 text-purple-300 md:size-5" />
          </motion.div>

          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <h1 className="truncate font-display text-xl font-extrabold tracking-tight text-white md:text-3xl">
                Live Radio
              </h1>
              <Equalizer active bars={4} className="hidden h-4 sm:flex" barClassName="bg-purple-400/70" />
              {isAdmin && (
                <span className="hidden rounded-md border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300 sm:inline">
                  Admin
                </span>
              )}
            </div>
            {/* Dropped on phones — the row budget is better spent on stations. */}
            <p className="mt-0.5 hidden truncate text-xs text-fg-secondary sm:block">
              {categoryCount.toLocaleString()} categories · genres, decades, languages & countries
            </p>
          </div>
        </div>

        <div className="flex flex-none items-center gap-2 md:w-full md:max-w-md md:flex-1">
          {/* Surprise-me: plays a random station from the current grid. */}
          <motion.button
            type="button"
            onClick={() => {
              setSpins((s) => s + 1);
              onShuffle();
            }}
            disabled={!canShuffle}
            aria-label="Play a random station"
            title="Play a random station"
            whileHover={reduceMotion || !canShuffle ? undefined : { scale: 1.06, y: -1 }}
            whileTap={reduceMotion || !canShuffle ? undefined : { scale: 0.94 }}
            transition={{ type: "spring", stiffness: 440, damping: 26 }}
            className="tv-focusable flex flex-none cursor-pointer items-center gap-2 rounded-xl border border-purple-500/30 bg-purple-500/12 p-2.5 text-sm font-semibold text-purple-200 outline-none transition-colors hover:border-purple-400/60 hover:bg-purple-500/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-40 md:px-3.5"
          >
            <motion.span
              animate={reduceMotion ? undefined : { rotate: spins * 180 }}
              transition={{ type: "spring", stiffness: 260, damping: 20 }}
              className="flex"
            >
              <Shuffle className="size-4" />
            </motion.span>
            <span className="hidden lg:inline">Surprise me</span>
          </motion.button>

          {/* Phone-only toggles for the two space-hungry controls. */}
          <PanelToggle
            active={panel === "search"}
            label="Toggle search"
            onClick={() => onPanelChange(panel === "search" ? "none" : "search")}
          >
            <Search className="size-4" />
          </PanelToggle>
          <PanelToggle
            active={panel === "categories"}
            label="Toggle categories"
            onClick={() => onPanelChange(panel === "categories" ? "none" : "categories")}
          >
            <ListFilter className="size-4" />
          </PanelToggle>

          {/* Desktop keeps the field inline. */}
          <div className="hidden min-w-0 flex-1 md:flex">{searchField}</div>
        </div>
      </motion.div>

      {/* Phone: the field drops onto its own row when toggled open. */}
      <AnimatePresence initial={false}>
        {panel === "search" && (
          <motion.div
            initial={reduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="overflow-hidden md:hidden"
          >
            <div className="flex pt-3">{searchField}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function PanelToggle({
  active,
  label,
  onClick,
  children,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      whileHover={reduceMotion ? undefined : { scale: 1.06 }}
      whileTap={reduceMotion ? undefined : { scale: 0.92 }}
      transition={{ type: "spring", stiffness: 440, damping: 26 }}
      className={`tv-focusable flex-none cursor-pointer rounded-xl border p-2.5 outline-none transition-colors md:hidden ${
        active
          ? "border-purple-400/60 bg-purple-500/25 text-white"
          : "border-white/8 bg-surface/70 text-fg-secondary"
      }`}
    >
      {children}
    </motion.button>
  );
}

function StationGridSkeleton() {
  const reduceMotion = useReducedMotion();
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
      {Array.from({ length: 16 }).map((_, i) => (
        <motion.div
          key={i}
          className="h-14.5 rounded-xl border border-white/6 bg-surface/40"
          initial={{ opacity: 0.35 }}
          animate={reduceMotion ? { opacity: 0.45 } : { opacity: [0.3, 0.65, 0.3] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut", delay: i * 0.05 }}
        />
      ))}
    </div>
  );
}

function EmptyState({
  mode,
  query,
}: {
  mode: "search" | "favorites" | "all" | "category";
  query: string;
}) {
  const reduceMotion = useReducedMotion();

  const [Icon, title, body] =
    mode === "favorites"
      ? [Heart, "No favourites yet", "Tap the heart on any station to pin it here."]
      : mode === "search"
        ? [SearchX, "Nothing found", `No cached station matches “${query}”. Try a category instead.`]
        : mode === "all"
          ? [RadioIcon, "Nothing cached yet", "Open a category or two — everything you browse lands here."]
          : [RadioIcon, "No stations here", "This playlist came back empty upstream. Pick another category."];

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center gap-3 py-20 text-center"
    >
      <motion.div
        animate={reduceMotion ? undefined : { y: [0, -7, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className="flex size-14 items-center justify-center rounded-2xl border border-white/6 bg-surface/60"
      >
        <Icon className="size-6 text-muted" />
      </motion.div>
      <h3 className="font-display text-sm font-bold text-white">{title}</h3>
      <p className="max-w-xs text-xs text-fg-secondary">{body}</p>
    </motion.div>
  );
}
