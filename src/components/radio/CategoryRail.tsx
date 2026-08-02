"use client";

import React, { useMemo, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { Heart, Search, Sparkles, ChevronDown, X, Library, Star } from "lucide-react";
import type { RadioCategoryData } from "@/app/actions/radio";
import { RADIO_GROUPS, type RadioGroup } from "@/lib/radio/categories";

/** Pseudo-groups that sit alongside the real ones in the tab strip. */
export type RailTab = "recommended" | "favorites" | "all" | "featured" | RadioGroup;

const CHIP_PAGE = 48;

interface CategoryRailProps {
  categories: RadioCategoryData[];
  featured: RadioCategoryData[];
  favoritesCount: number;
  recommendedCount: number;
  activeTab: RailTab;
  activeSlug: string | null;
  onTabChange: (tab: RailTab) => void;
  onSelectCategory: (slug: string) => void;
}

export default function CategoryRail({
  categories,
  featured,
  favoritesCount,
  recommendedCount,
  activeTab,
  activeSlug,
  onTabChange,
  onSelectCategory,
}: CategoryRailProps) {
  const [filter, setFilter] = useState("");
  const [visible, setVisible] = useState(CHIP_PAGE);
  const reduceMotion = useReducedMotion();

  const tabs = useMemo(
    () => [
      { id: "recommended" as const, label: "Recommended", badge: recommendedCount || null },
      { id: "favorites" as const, label: "Favourites", badge: favoritesCount },
      { id: "all" as const, label: "All stations", badge: null },
      { id: "featured" as const, label: "Featured", badge: featured.length },
      ...RADIO_GROUPS.map((g) => ({
        id: g.id as RailTab,
        label: g.label,
        badge: categories.filter((c) => c.group === g.id).length,
      })),
    ],
    [categories, featured.length, favoritesCount, recommendedCount]
  );

  const chips = useMemo(() => {
    // These tabs are lists in their own right, not collections of categories.
    if (activeTab === "favorites" || activeTab === "all" || activeTab === "recommended") return [];
    const pool = activeTab === "featured" ? featured : categories.filter((c) => c.group === activeTab);
    const q = filter.trim().toLowerCase();
    if (!q) return pool;
    return pool.filter((c) => c.name.toLowerCase().includes(q) || c.slug.includes(q));
  }, [activeTab, categories, featured, filter]);

  const shown = chips.slice(0, visible);
  const remaining = chips.length - shown.length;

  const resetPaging = (next: RailTab) => {
    onTabChange(next);
    setFilter("");
    setVisible(CHIP_PAGE);
  };

  return (
    <div className="space-y-4">
      {/* Section tabs */}
      <div className="scrollbar-hide -mx-1 flex items-center gap-1.5 overflow-x-auto px-1 pb-1">
        {tabs.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <motion.button
              key={tab.id}
              type="button"
              onClick={() => resetPaging(tab.id)}
              whileHover={reduceMotion ? undefined : { y: -2 }}
              whileTap={reduceMotion ? undefined : { scale: 0.95 }}
              transition={{ type: "spring", stiffness: 420, damping: 28 }}
              className={`tv-focusable relative flex flex-none cursor-pointer items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold whitespace-nowrap outline-none transition-colors ${
                active ? "text-white" : "text-fg-secondary hover:text-white"
              }`}
            >
              {active && (
                <motion.span
                  layoutId={reduceMotion ? undefined : "radio-tab-pill"}
                  className="absolute inset-0 -z-10 rounded-xl bg-linear-to-r from-purple-600 to-fuchsia-600 shadow-lg shadow-purple-900/40"
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                />
              )}
              {!active && <span className="absolute inset-0 -z-10 rounded-xl border border-white/6 bg-surface" />}

              {tab.id === "favorites" && (
                <Heart className={`size-3.5 ${active ? "fill-white text-white" : "text-pink-500"}`} />
              )}
              {tab.id === "recommended" && (
                <Star className={`size-3.5 ${active ? "fill-white text-white" : "fill-amber-400/30 text-amber-400"}`} />
              )}
              {tab.id === "all" && (
                <Library className={`size-3.5 ${active ? "text-white" : "text-sky-400"}`} />
              )}
              {tab.id === "featured" && (
                <Sparkles className={`size-3.5 ${active ? "text-white" : "text-amber-400"}`} />
              )}
              {tab.label}
              {tab.badge !== null && (
                <span className={`text-[10px] tabular-nums ${active ? "text-white/70" : "text-muted"}`}>
                  {tab.badge}
                </span>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Category chips for the active section */}
      <AnimatePresence mode="wait" initial={false}>
        {activeTab !== "favorites" && activeTab !== "all" && activeTab !== "recommended" && (
          <motion.div
            key={activeTab}
            initial={reduceMotion ? false : { opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="space-y-3"
          >
            {/* Filter within the section — the genre list alone runs to 800+. */}
            {chips.length > 12 && (
              <div className="relative max-w-xs">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted" />
                <input
                  type="text"
                  value={filter}
                  onChange={(e) => {
                    setFilter(e.target.value);
                    setVisible(CHIP_PAGE);
                  }}
                  placeholder="Filter categories…"
                  aria-label="Filter categories"
                  className="w-full rounded-lg border border-white/6 bg-surface/70 py-1.5 pl-9 pr-8 text-xs text-fg outline-none transition-colors placeholder:text-muted focus:border-purple-500/50"
                />
                <AnimatePresence>
                  {filter && (
                    <motion.button
                      type="button"
                      onClick={() => setFilter("")}
                      initial={{ opacity: 0, scale: 0.6 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.6 }}
                      aria-label="Clear category filter"
                      className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer rounded p-1 text-muted hover:text-white"
                    >
                      <X className="size-3" />
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Capped and scrollable: some sections carry hundreds of chips,
                and the rail is fixed — it must not swallow the viewport.
                Scrolling one axis clips the other, so the inner padding keeps
                chips from being shaved as they scale on hover. */}
            <motion.div
              // -mx-1/px-1 cancel out, so the inner padding buys room for the
              // hover scale without pushing chips off the shared gutter.
              className="scrollbar-hide -mx-1 flex max-h-28 flex-wrap gap-2 overflow-y-auto px-1 py-1.5"
              initial="hidden"
              animate="show"
              variants={{
                hidden: {},
                show: { transition: { staggerChildren: reduceMotion ? 0 : 0.012 } },
              }}
            >
              <AnimatePresence mode="popLayout">
                {shown.map((cat) => {
                  const active = activeSlug === cat.slug;
                  return (
                    <motion.button
                      key={cat.slug}
                      type="button"
                      layout={!reduceMotion}
                      variants={{
                        hidden: { opacity: 0, scale: 0.85 },
                        show: { opacity: 1, scale: 1 },
                      }}
                      exit={{ opacity: 0, scale: 0.85 }}
                      whileHover={reduceMotion ? undefined : { scale: 1.06, y: -1 }}
                      whileTap={reduceMotion ? undefined : { scale: 0.94 }}
                      transition={{ type: "spring", stiffness: 460, damping: 30 }}
                      onClick={() => onSelectCategory(cat.slug)}
                      className={`tv-focusable cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-medium outline-none transition-colors ${
                        active
                          ? "border-purple-400/60 bg-purple-500/25 text-white"
                          : "border-white/6 bg-surface/60 text-fg-secondary hover:border-white/15 hover:text-white"
                      }`}
                    >
                      {cat.name}
                      <span className="ml-1.5 text-[10px] tabular-nums text-muted">{cat.count}</span>
                    </motion.button>
                  );
                })}
              </AnimatePresence>
            </motion.div>

            {remaining > 0 && (
              <motion.button
                type="button"
                onClick={() => setVisible((v) => v + CHIP_PAGE * 2)}
                whileHover={reduceMotion ? undefined : { y: -1 }}
                whileTap={reduceMotion ? undefined : { scale: 0.96 }}
                className="tv-focusable flex cursor-pointer items-center gap-1 rounded-lg border border-white/6 bg-surface/60 px-3 py-1.5 text-xs font-medium text-fg-secondary outline-none transition-colors hover:text-white"
              >
                <ChevronDown className="size-3.5" />
                Show {Math.min(remaining, CHIP_PAGE * 2)} more
                <span className="text-muted">({remaining} hidden)</span>
              </motion.button>
            )}

            {chips.length === 0 && (
              <p className="text-xs text-muted">No categories match “{filter}”.</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
