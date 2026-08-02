"use client";

import React, { memo, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import {
  Heart, Play, Pause, Radio as RadioIcon, Loader2, AlertTriangle,
  MoreVertical, Pencil, Trash2, Flag, CheckCircle2, Star,
} from "lucide-react";
import type { RadioStationData } from "@/app/actions/radio";
import { prettifyName } from "@/lib/radio/categories";
import type { PlaybackStatus } from "./useRadioPlayer";
import Equalizer from "./Equalizer";

/** Deterministic accent so a station keeps the same colour between visits. */
const ACCENTS = [
  { tile: "bg-pink-500/15 text-pink-300", ring: "ring-pink-500/40" },
  { tile: "bg-purple-500/15 text-purple-300", ring: "ring-purple-500/40" },
  { tile: "bg-sky-500/15 text-sky-300", ring: "ring-sky-500/40" },
  { tile: "bg-emerald-500/15 text-emerald-300", ring: "ring-emerald-500/40" },
  { tile: "bg-amber-500/15 text-amber-300", ring: "ring-amber-500/40" },
  { tile: "bg-rose-500/15 text-rose-300", ring: "ring-rose-500/40" },
  { tile: "bg-violet-500/15 text-violet-300", ring: "ring-violet-500/40" },
];

function accentFor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return ACCENTS[Math.abs(hash) % ACCENTS.length];
}

interface StationCardProps {
  station: RadioStationData;
  isCurrent: boolean;
  status: PlaybackStatus;
  isFavorite: boolean;
  isAdmin: boolean;
  onSelect: (station: RadioStationData) => void;
  onToggleFavorite: (station: RadioStationData) => void;
  onReport: (station: RadioStationData) => void;
  onEdit: (station: RadioStationData) => void;
  onDelete: (station: RadioStationData) => void;
  onToggleRecommended: (station: RadioStationData) => void;
}

function StationCardBase({
  station,
  isCurrent,
  status,
  isFavorite,
  isAdmin,
  onSelect,
  onToggleFavorite,
  onReport,
  onEdit,
  onDelete,
  onToggleRecommended,
}: StationCardProps) {
  const reduceMotion = useReducedMotion();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const accent = accentFor(station.name);

  // Dismiss on outside click / Escape rather than on mouse-leave: the menu
  // sits below the trigger, so leaving the card is exactly what the pointer
  // does on its way to the menu items.
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const connecting = isCurrent && status === "connecting";
  const playing = isCurrent && status === "playing";
  const errored = isCurrent && status === "error";

  const label = errored
    ? "Stream unavailable"
    : connecting
      ? "Connecting…"
      : playing
        ? "On air"
        : station.isBroken
          ? "Reported not working"
          : "Live stream";

  return (
    <motion.div
      layout={!reduceMotion}
      variants={{
        hidden: { opacity: 0, y: 10 },
        show: { opacity: 1, y: 0 },
        exit: { opacity: 0, scale: 0.96, transition: { duration: 0.15 } },
      }}
      transition={{ type: "spring", stiffness: 420, damping: 32 }}
      // Lift the whole card while its menu is open, otherwise later cards in
      // the grid paint over the dropdown.
      // Stays below the player bar (z-50) and the admin dialog (z-60).
      className={`group relative ${menuOpen ? "z-40" : "z-0"}`}
      // Lets the client scroll the playing station into view.
      data-station-id={station.id}
    >
      <motion.button
        type="button"
        onClick={() => onSelect(station)}
        aria-label={`Play ${station.name}`}
        whileHover={reduceMotion ? undefined : { y: -2 }}
        whileTap={reduceMotion ? undefined : { scale: 0.985 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className={`tv-focusable relative flex w-full cursor-pointer items-center gap-3 overflow-hidden rounded-xl border px-3 py-2.5 text-left outline-none transition-colors ${isCurrent
          ? "border-purple-400/70 bg-purple-500/15 shadow-lg shadow-purple-900/40 ring-2 ring-purple-500/50"
          : isFavorite
            ? "border-pink-500/30 bg-pink-500/6 hover:border-pink-400/50 hover:bg-pink-500/10"
            : "border-white/6 bg-surface/50 hover:border-white/14 hover:bg-surface-hover/60"
          } ${station.isBroken && !isCurrent ? "opacity-55" : ""}`}
      >
        {/* Breathing halo marks the station that's actually on air, so it
            stays findable after a shuffle scrolls it into view. */}
        {isCurrent && !reduceMotion && (
          <motion.span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-xl bg-linear-to-r from-purple-500/12 via-fuchsia-500/8 to-transparent"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
          />
        )}

        {/* Favourites get a standing accent stripe so they read as pinned
            even when the heart button is hidden. */}
        <AnimatePresence>
          {isFavorite && !isCurrent && (
            <motion.span
              aria-hidden="true"
              initial={reduceMotion ? { opacity: 0 } : { scaleY: 0, opacity: 0 }}
              animate={{ scaleY: 1, opacity: 1 }}
              exit={reduceMotion ? { opacity: 0 } : { scaleY: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 480, damping: 30 }}
              className="absolute inset-y-0 left-0 w-0.75 origin-center rounded-r-full bg-linear-to-b from-pink-400 to-rose-500"
            />
          )}
        </AnimatePresence>

        {/* Icon / state tile */}
        <span
          className={`relative flex size-9 flex-none items-center justify-center rounded-lg ${isFavorite && !isCurrent ? "bg-pink-500/15 text-pink-300" : accent.tile
            }`}
        >
          {connecting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : playing ? (
            <Equalizer active bars={4} className="h-3.5" barClassName="bg-current" />
          ) : errored ? (
            <AlertTriangle className="size-4 text-amber-400" />
          ) : (
            <RadioIcon className="size-4" />
          )}
        </span>

        {/* Name + status */}
        {/* Reserves room for the menu button, which is absolutely positioned
            and always visible on touch. Desktop needs none: its icons only
            appear on hover, over the play affordance's own space. */}
        <span className="min-w-0 flex-1 pr-11 pointer-fine:pr-0">
          <span className="flex items-center gap-1.5">
            {isFavorite && (
              <motion.span
                initial={reduceMotion ? false : { scale: 0, rotate: -30 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 600, damping: 18 }}
                className="flex-none"
              >
                <Heart className="size-3 fill-pink-500 text-pink-500" aria-label="Favourite" />
              </motion.span>
            )}
            {station.isRecommended && (
              <motion.span
                initial={reduceMotion ? false : { scale: 0, rotate: -30 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 600, damping: 18 }}
                className="flex-none"
              >
                <Star className="size-3 fill-amber-400 text-amber-400" aria-label="Recommended" />
              </motion.span>
            )}
            <span className="truncate text-[13px] font-semibold text-white">{station.name}</span>
            {station.isBroken && (
              <Flag className="size-3 flex-none text-amber-500/80" aria-label="Reported not working" />
            )}
          </span>
          <span className="mt-0.5 flex items-center gap-1.5">
            {/* Which category the station came from — the list is often mixed
                (favourites, search, All stations), so the card has to say. */}
            {station.categorySlug && (
              <span className="flex-none rounded bg-white/8 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-fg-secondary">
                {prettifyName(station.categorySlug)}
              </span>
            )}
            <span
              className={`truncate text-[10px] uppercase tracking-wider ${errored || station.isBroken
                ? "text-amber-400/80"
                : playing
                  ? "text-purple-300"
                  : "text-muted"
                }`}
            >
              {label}
            </span>
          </span>
        </span>

        {/* Play / pause affordance */}
        <span
          className={`hidden size-7 flex-none items-center justify-center rounded-full transition-all duration-200 pointer-fine:flex ${isCurrent
            ? "bg-white text-black"
            : "bg-white/8 text-white opacity-0 group-hover:opacity-100"
            }`}
        >
          {playing || connecting ? (
            <Pause className="size-3 fill-current" />
          ) : (
            <Play className="size-3 translate-x-px fill-current" />
          )}
        </span>
      </motion.button>

      {/* Two mutually exclusive presentations of the same actions, so neither
          breakpoint shows a control twice:
            · pointer (md+) — icons revealed on hover
            · touch (<md)   — a single menu, since a finger can't hover        */}
      <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-0.5 pointer-fine:right-11">
        <span
          className={`hidden items-center gap-0.5 transition-opacity duration-200 focus-within:opacity-100 group-hover:opacity-100 pointer-fine:flex ${
            menuOpen ? "opacity-100" : "opacity-0"
          }`}
        >
          <IconAction
            label={isFavorite ? "Remove from favourites" : "Add to favourites"}
            pressed={isFavorite}
            onClick={() => onToggleFavorite(station)}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={isFavorite ? "on" : "off"}
                initial={reduceMotion ? false : { scale: 0.4, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={reduceMotion ? undefined : { scale: 0.4, opacity: 0 }}
                transition={{ type: "spring", stiffness: 600, damping: 20 }}
                className="block"
              >
                <Heart className={`size-3.5 ${isFavorite ? "fill-pink-500 text-pink-500" : ""}`} />
              </motion.span>
            </AnimatePresence>
          </IconAction>

          <IconAction label="Report not working" onClick={() => onReport(station)}>
            <Flag className="size-3.5" />
          </IconAction>

          {isAdmin && (
            <IconAction
              label={
                station.isRecommended ? "Remove from Recommended" : "Add to Recommended"
              }
              pressed={station.isRecommended}
              onClick={() => onToggleRecommended(station)}
            >
              <Star
                className={`size-3.5 ${station.isRecommended ? "fill-amber-400 text-amber-400" : ""
                  }`}
              />
            </IconAction>
          )}
        </span>

        {/* On touch this is the only control, so it's always visible. On
            desktop it joins the hover set, and carries just the two actions
            that need a written label. Non-admins have none of those, so it
            disappears entirely there. */}
        <div
          ref={menuRef}
          className={`relative ${
            isAdmin
              ? `transition-opacity duration-200 pointer-fine:group-hover:opacity-100 ${
                  menuOpen ? "opacity-100" : "pointer-fine:opacity-0"
                }`
              : "pointer-fine:hidden"
          }`}
        >
          <IconAction label="Station actions" onClick={() => setMenuOpen((o) => !o)}>
            <MoreVertical className="size-3.5" />
          </IconAction>

          <AnimatePresence>
            {menuOpen && (
              <motion.div
                initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.9, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.9, y: -4 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className="absolute right-0 top-full z-30 mt-1 w-48 origin-top-right overflow-hidden rounded-xl border border-white/10 bg-bg-elevated/95 py-1 shadow-2xl shadow-black/60 backdrop-blur-xl"
              >
                {/* Touch-only: these have hover icons on desktop, and
                    repeating them there is the redundancy we're avoiding. */}
                <MenuItem
                  className="pointer-fine:hidden"
                  onClick={() => {
                    setMenuOpen(false);
                    onToggleFavorite(station);
                  }}
                >
                  <Heart className={`size-3.5 ${isFavorite ? "fill-pink-500 text-pink-500" : ""}`} />
                  {isFavorite ? "Remove favourite" : "Add to favourites"}
                </MenuItem>

                <MenuItem
                  className="pointer-fine:hidden"
                  onClick={() => {
                    setMenuOpen(false);
                    onReport(station);
                  }}
                >
                  {station.isBroken ? (
                    <>
                      <CheckCircle2 className="size-3.5" /> Clear broken flag
                    </>
                  ) : (
                    <>
                      <Flag className="size-3.5" /> Mark not working
                    </>
                  )}
                </MenuItem>

                {isAdmin && (
                  <>
                    <MenuItem
                      className="pointer-fine:hidden"
                      onClick={() => {
                        setMenuOpen(false);
                        onToggleRecommended(station);
                      }}
                    >
                      <Star
                        className={`size-3.5 ${station.isRecommended ? "fill-amber-400 text-amber-400" : ""
                          }`}
                      />
                      {station.isRecommended ? "Unrecommend" : "Recommend"}
                    </MenuItem>

                    <MenuItem
                      onClick={() => {
                        setMenuOpen(false);
                        onEdit(station);
                      }}
                    >
                      <Pencil className="size-3.5" /> Edit station
                    </MenuItem>

                    <MenuItem
                      danger
                      onClick={() => {
                        setMenuOpen(false);
                        onDelete(station);
                      }}
                    >
                      <Trash2 className="size-3.5" /> Delete station
                    </MenuItem>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

function IconAction({
  label,
  pressed,
  onClick,
  children,
}: {
  label: string;
  pressed?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      whileHover={reduceMotion ? undefined : { scale: 1.18 }}
      whileTap={reduceMotion ? undefined : { scale: 0.85 }}
      transition={{ type: "spring", stiffness: 500, damping: 20 }}
      // Roomier on touch, where a ~24px target is unusable; tightened from md
      // up, where the pointer is precise and the row is denser.
      className="tv-focusable cursor-pointer rounded-md border border-white/8 bg-black/45 p-2.5 text-fg-secondary outline-none backdrop-blur-sm transition-colors hover:text-white pointer-fine:p-1.5"
    >
      {children}
    </motion.button>
  );
}

function MenuItem({
  onClick,
  danger,
  className = "",
  children,
}: {
  onClick: () => void;
  danger?: boolean;
  /** Lets a caller drop an entry at the breakpoint where an icon replaces it. */
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      // Taller rows on touch, tighter once a pointer is doing the aiming.
      className={`flex w-full cursor-pointer items-center gap-2 px-3 py-2.5 text-left text-xs font-medium transition-colors pointer-fine:py-2 ${danger ? "text-red-400 hover:bg-red-500/12" : "text-fg-secondary hover:bg-white/6 hover:text-white"
        } ${className}`}
    >
      {children}
    </button>
  );
}

/**
 * Grids run to hundreds of cards; without memoisation every play/pause
 * re-renders all of them.
 */
export default memo(StationCardBase, (prev, next) =>
  prev.station.id === next.station.id &&
  prev.station.name === next.station.name &&
  prev.station.url === next.station.url &&
  prev.station.isBroken === next.station.isBroken &&
  prev.station.isRecommended === next.station.isRecommended &&
  prev.isCurrent === next.isCurrent &&
  prev.isFavorite === next.isFavorite &&
  prev.isAdmin === next.isAdmin &&
  (prev.isCurrent ? prev.status === next.status : true)
);
