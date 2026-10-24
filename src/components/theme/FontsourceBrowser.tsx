"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ArrowLeft, Loader2, Search } from "lucide-react";
import {
  fetchFontsourceCatalog,
  fontsourceStack,
  loadFont,
  type FontsourceEntry,
} from "@/lib/theme/studio/fonts";

const PAGE = 60;

const CATEGORIES = [
  { id: "all", label: "All" },
  { id: "sans-serif", label: "Sans" },
  { id: "serif", label: "Serif" },
  { id: "display", label: "Display" },
  { id: "monospace", label: "Mono" },
  { id: "handwriting", label: "Script" },
] as const;

function weightLabel(entry: FontsourceEntry): string {
  if (entry.variable) return "variable";
  const min = Math.min(...entry.weights);
  const max = Math.max(...entry.weights);
  return min === max ? `${min}` : `${min}–${max}`;
}

export default function FontsourceBrowser({
  label,
  onApply,
  onClose,
}: {
  label: string;
  onApply: (entry: FontsourceEntry) => void;
  onClose: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const [catalog, setCatalog] = useState<FontsourceEntry[] | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [attempt, setAttempt] = useState(0);
  const [filters, setFilters] = useState({ query: "", category: "all", visible: PAGE });
  const inputRef = useRef<HTMLInputElement>(null);
  const previewTimer = useRef<number | null>(null);

  useEffect(() => {
    let alive = true;
    fetchFontsourceCatalog()
      .then((entries) => {
        if (!alive) return;
        setCatalog(entries);
        setStatus("ready");
      })
      .catch(() => {
        if (alive) setStatus("error");
      });
    return () => {
      alive = false;
    };
  }, [attempt]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(
    () => () => {
      if (previewTimer.current) window.clearTimeout(previewTimer.current);
    },
    [],
  );

  // Hovering or focusing a row fetches just that face, so browsing the
  // catalogue never downloads every font it shows.
  const preview = useCallback((entry: FontsourceEntry) => {
    if (previewTimer.current) window.clearTimeout(previewTimer.current);
    previewTimer.current = window.setTimeout(() => {
      loadFont(fontsourceStack(entry.family, entry.category));
    }, 160);
  }, []);

  const filtered = useMemo(() => {
    if (!catalog) return [];
    const query = filters.query.trim().toLowerCase();
    return catalog.filter((entry) => {
      if (filters.category !== "all" && entry.category !== filters.category) return false;
      if (!query) return true;
      return entry.family.toLowerCase().includes(query) || entry.id.includes(query);
    });
  }, [catalog, filters.query, filters.category]);

  const shown = filtered.slice(0, filters.visible);
  const remaining = filtered.length - shown.length;

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className="flex flex-col gap-2.5 rounded-xl border border-border bg-surface/40 p-2.5"
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onClose}
          aria-label="Back to quick font list"
          className="grid size-9 flex-none cursor-pointer place-items-center rounded-lg text-fg-secondary transition-colors hover:bg-surface hover:text-fg"
        >
          <ArrowLeft className="size-4" />
        </button>
        <div className="min-w-0">
          <p className="text-xs font-bold text-fg">Browse Fontsource</p>
          <p className="truncate text-[10px] text-muted">
            2,000+ families · applied to {label}
          </p>
        </div>
      </div>

      <label className="relative block">
        <span className="sr-only">Search Fontsource</span>
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted" />
        <input
          ref={inputRef}
          type="search"
          value={filters.query}
          onChange={(event) =>
            setFilters((current) => ({ ...current, query: event.target.value, visible: PAGE }))
          }
          placeholder="Search families"
          className="min-h-9 w-full rounded-lg border border-border bg-bg pl-8 pr-2.5 text-xs text-fg outline-none transition-colors placeholder:text-muted focus:border-accent"
        />
      </label>

      <div className="flex flex-wrap gap-1">
        {CATEGORIES.map((category) => {
          const active = filters.category === category.id;
          return (
            <button
              key={category.id}
              type="button"
              aria-pressed={active}
              onClick={() =>
                setFilters((current) => ({
                  ...current,
                  category: category.id,
                  visible: PAGE,
                }))
              }
              className={`min-h-9 cursor-pointer rounded-full border px-2.5 text-[10px] font-bold transition-colors ${
                active
                  ? "border-accent/60 bg-accent/10 text-fg"
                  : "border-border text-fg-secondary hover:border-accent/40 hover:text-fg"
              }`}
            >
              {category.label}
            </button>
          );
        })}
      </div>

      <div className="max-h-72 overflow-y-auto overscroll-contain pr-1">
        {status === "loading" && (
          <div className="flex flex-col gap-1.5 py-1" aria-live="polite">
            <span className="flex items-center gap-1.5 text-[10px] text-muted">
              <Loader2 className="size-3 animate-spin" />
              Loading the Fontsource catalogue…
            </span>
            {[0, 1, 2, 3].map((row) => (
              <div key={row} className="h-10 animate-pulse rounded-lg bg-surface/70" />
            ))}
          </div>
        )}

        {status === "error" && (
          <div className="flex flex-col items-start gap-2 py-2" role="alert">
            <p className="text-[11px] text-muted">
              Couldn&rsquo;t reach Fontsource. Check the connection and try again.
            </p>
            <button
              type="button"
              onClick={() => {
                setStatus("loading");
                setAttempt((value) => value + 1);
              }}
              className="min-h-9 cursor-pointer rounded-lg border border-border px-3 text-[11px] font-bold text-fg-secondary transition-colors hover:border-accent/50 hover:text-fg"
            >
              Retry
            </button>
          </div>
        )}

        {status === "ready" && shown.length === 0 && (
          <p className="py-4 text-center text-[11px] text-muted">
            No fonts match &ldquo;{filters.query}&rdquo;.
          </p>
        )}

        {status === "ready" && shown.length > 0 && (
          <ul className="flex flex-col">
            {shown.map((entry) => {
              const stack = fontsourceStack(entry.family, entry.category);
              return (
                <li key={entry.id}>
                  <button
                    type="button"
                    onClick={() => onApply(entry)}
                    onPointerEnter={() => preview(entry)}
                    onFocus={() => preview(entry)}
                    className="flex min-h-12 w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-surface focus-visible:bg-surface focus-visible:outline-none"
                  >
                    <span className="min-w-0">
                      <span
                        className="block truncate text-sm text-fg"
                        style={{ fontFamily: stack }}
                      >
                        {entry.family}
                      </span>
                      <span className="block text-[10px] capitalize text-muted">
                        {entry.category.replace("-", " ")} · {weightLabel(entry)}
                      </span>
                    </span>
                    <span className="flex-none text-[10px] font-bold uppercase tracking-wide text-accent">
                      Use
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {status === "ready" && filtered.length > 0 && (
        <p className="text-[10px] text-muted" aria-live="polite">
          Showing {shown.length} of {filtered.length} · hover a name to preview
        </p>
      )}

      {status === "ready" && remaining > 0 && (
        <button
          type="button"
          onClick={() =>
            setFilters((current) => ({ ...current, visible: current.visible + PAGE }))
          }
          className="min-h-9 cursor-pointer rounded-lg border border-border text-[11px] font-bold text-fg-secondary transition-colors hover:border-accent/50 hover:text-fg"
        >
          Show {Math.min(PAGE, remaining)} more
        </button>
      )}
    </motion.div>
  );
}
