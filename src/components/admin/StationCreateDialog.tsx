"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { X, Loader2, Plus, Check, ChevronDown, Sparkles, Search } from "lucide-react";
import {
  searchRadioCategoriesAction,
  type RadioCategoryOption,
} from "@/app/actions/radio";

export interface NewStationInput {
  name: string;
  url: string;
  categorySlug?: string;
  newCategoryName?: string;
}

interface StationCreateDialogProps {
  open: boolean;
  busy: boolean;
  error: string | null;
  onCreate: (input: NewStationInput) => void;
  onClose: () => void;
}

/** Admin dialog for adding a station to an existing or brand new category. */
export default function StationCreateDialog({
  open,
  busy,
  error,
  onCreate,
  onClose,
}: StationCreateDialogProps) {
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, busy, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-60 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => !busy && onClose()}
            aria-hidden="true"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Add station"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.94, y: 12 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            className="relative w-full max-w-md overflow-visible rounded-2xl border border-white/10 bg-bg-elevated shadow-2xl shadow-black/70"
          >
            <div className="flex items-center justify-between border-b border-white/6 px-5 py-3.5">
              <h3 className="font-display text-sm font-bold text-white">Add station</h3>
              <motion.button
                type="button"
                onClick={onClose}
                disabled={busy}
                aria-label="Close"
                whileHover={reduceMotion ? undefined : { scale: 1.15, rotate: 90 }}
                whileTap={reduceMotion ? undefined : { scale: 0.85 }}
                className="cursor-pointer text-muted transition-colors hover:text-white disabled:opacity-40"
              >
                <X className="size-4" />
              </motion.button>
            </div>

            {/* Remounts per open, so the form starts clean each time. */}
            <CreateForm busy={busy} error={error} onCreate={onCreate} onClose={onClose} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function CreateForm({
  busy,
  error,
  onCreate,
  onClose,
}: Omit<StationCreateDialogProps, "open">) {
  const reduceMotion = useReducedMotion();
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [category, setCategory] = useState<RadioCategoryOption | null>(null);
  const [newCategory, setNewCategory] = useState<string | null>(null);

  const hasCategory = Boolean(category || newCategory);
  const valid = name.trim() !== "" && /^https?:\/\/\S+$/i.test(url.trim()) && hasCategory;

  return (
    <>
      <div className="space-y-4 px-5 py-5">
        <Field label="Station name">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={busy}
            autoFocus
            placeholder="e.g. Radio Paradise"
            className="w-full rounded-lg border border-white/8 bg-surface px-3 py-2 text-sm text-fg outline-none transition-colors placeholder:text-muted focus:border-purple-500/60 disabled:opacity-50"
          />
        </Field>

        <Field label="Stream URL">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={busy}
            spellCheck={false}
            placeholder="https://stream.example.com/listen"
            className="w-full rounded-lg border border-white/8 bg-surface px-3 py-2 font-mono text-xs text-fg outline-none transition-colors placeholder:text-muted focus:border-purple-500/60 disabled:opacity-50"
          />
        </Field>

        <Field label="Category">
          <CategoryPicker
            disabled={busy}
            selected={category}
            newCategory={newCategory}
            onSelect={(c) => {
              setCategory(c);
              setNewCategory(null);
            }}
            onCreateNew={(label) => {
              setNewCategory(label);
              setCategory(null);
            }}
          />
        </Field>

        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs text-red-300"
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      <div className="flex justify-end gap-2 border-t border-white/6 px-5 py-3.5">
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          className="cursor-pointer rounded-lg border border-white/8 px-3.5 py-2 text-xs font-semibold text-fg-secondary transition-colors hover:text-white disabled:opacity-40"
        >
          Cancel
        </button>

        <motion.button
          type="button"
          onClick={() =>
            onCreate({
              name: name.trim(),
              url: url.trim(),
              categorySlug: category?.slug,
              newCategoryName: newCategory ?? undefined,
            })
          }
          disabled={busy || !valid}
          whileHover={reduceMotion || !valid ? undefined : { scale: 1.03 }}
          whileTap={reduceMotion || !valid ? undefined : { scale: 0.96 }}
          className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-linear-to-r from-purple-600 to-fuchsia-600 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:from-purple-500 hover:to-fuchsia-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
          Add station
        </motion.button>
      </div>
    </>
  );
}

/**
 * Searchable category combobox. Offers to create a category when the typed
 * name doesn't match anything — fully custom, no native `<select>`.
 */
function CategoryPicker({
  disabled,
  selected,
  newCategory,
  onSelect,
  onCreateNew,
}: {
  disabled: boolean;
  selected: RadioCategoryOption | null;
  newCategory: string | null;
  onSelect: (c: RadioCategoryOption) => void;
  onCreateNew: (label: string) => void;
}) {
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<RadioCategoryOption[]>([]);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const q = query.trim();

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    const handle = setTimeout(() => {
      setLoading(true);
      searchRadioCategoriesAction(q)
        .then((res) => {
          if (!cancelled) setOptions(res.success ? res.data : []);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, q ? 250 : 0);

    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [open, q]);

  const exactMatch = options.some((o) => o.name.toLowerCase() === q.toLowerCase());
  const canCreate = q.length >= 2 && !exactMatch;

  const label = selected?.name ?? (newCategory ? `${newCategory} (new)` : "Choose a category…");

  const choose = useCallback(
    (fn: () => void) => {
      fn();
      setOpen(false);
      setQuery("");
    },
    []
  );

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-sm outline-none transition-colors disabled:opacity-50 ${
          open ? "border-purple-500/60 bg-purple-500/10" : "border-white/8 bg-surface"
        }`}
      >
        <span className={`truncate ${selected || newCategory ? "text-fg" : "text-muted"}`}>
          {newCategory && <Sparkles className="mr-1.5 inline size-3 text-amber-400" />}
          {label}
        </span>
        <ChevronDown
          className={`size-3.5 flex-none text-muted transition-transform duration-200 ${
            open ? "rotate-180 text-purple-400" : ""
          }`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 460, damping: 32 }}
            className="absolute left-0 right-0 top-full z-20 mt-1.5 overflow-hidden rounded-xl border border-white/10 bg-bg-elevated shadow-2xl shadow-black/70"
          >
            <div className="relative border-b border-white/6">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search or type a new name…"
                aria-label="Search categories"
                autoFocus
                className="w-full bg-transparent py-2.5 pl-9 pr-3 text-xs text-fg outline-none placeholder:text-muted"
              />
            </div>

            <div className="scrollbar-hide max-h-56 overflow-y-auto py-1">
              {canCreate && (
                <button
                  type="button"
                  onClick={() => choose(() => onCreateNew(q))}
                  className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-amber-300 transition-colors hover:bg-amber-500/10"
                >
                  <Sparkles className="size-3.5 flex-none" />
                  Create category “{q}”
                </button>
              )}

              {loading && options.length === 0 ? (
                <p className="flex items-center gap-2 px-3 py-3 text-xs text-muted">
                  <Loader2 className="size-3 animate-spin" /> Searching…
                </p>
              ) : options.length === 0 && !canCreate ? (
                <p className="px-3 py-3 text-xs text-muted">
                  Type at least two characters to create a category.
                </p>
              ) : (
                options.map((opt) => {
                  const active = selected?.slug === opt.slug;
                  return (
                    <button
                      key={opt.slug}
                      type="button"
                      onClick={() => choose(() => onSelect(opt))}
                      className={`flex w-full cursor-pointer items-center justify-between gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-white/6 ${
                        active ? "text-white" : "text-fg-secondary"
                      }`}
                    >
                      <span className="flex min-w-0 items-center gap-1.5">
                        {opt.isCustom && <Sparkles className="size-3 flex-none text-amber-400" />}
                        <span className="truncate">{opt.name}</span>
                      </span>
                      <span className="flex flex-none items-center gap-1.5">
                        <span className="text-[10px] tabular-nums text-muted">
                          {opt.stationCount}
                        </span>
                        {active && <Check className="size-3 text-purple-400" />}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted">
        {label}
      </span>
      {children}
    </label>
  );
}
