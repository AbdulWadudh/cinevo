"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { toast } from "sonner";
import {
  Radio as RadioIcon, Search, X, Loader2, Pencil, Trash2, Flag, Power,
  ChevronLeft, ChevronRight, ExternalLink, Plus, Star,
} from "lucide-react";
import {
  getAdminRadioStationsAction,
  updateRadioStationAction,
  deleteRadioStationAction,
  createRadioStationAction,
  type AdminRadioStation,
  type AdminStationFilter,
  type AdminStationPage,
} from "@/app/actions/radio";
import StationEditDialog, { type DialogMode } from "@/components/radio/StationEditDialog";
import StationCreateDialog, { type NewStationInput } from "./StationCreateDialog";

const FILTERS: { id: AdminStationFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "disabled", label: "Disabled" },
  { id: "broken", label: "Reported" },
  { id: "recommended", label: "Recommended" },
];

const SEARCH_DEBOUNCE_MS = 320;

/** Admin panel for moderating the radio catalogue, mounted on the profile page. */
export default function RadioStationAdmin() {
  const reduceMotion = useReducedMotion();

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<AdminStationFilter>("all");
  const [page, setPage] = useState(1);

  const [data, setData] = useState<AdminStationPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const [dialogStation, setDialogStation] = useState<AdminRadioStation | null>(null);
  const [dialogMode, setDialogMode] = useState<DialogMode>("edit");
  const [dialogBusy, setDialogBusy] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [createBusy, setCreateBusy] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  /** Bumped to force a refetch after a mutation. */
  const [revision, setRevision] = useState(0);

  const q = query.trim();

  useEffect(() => {
    let cancelled = false;

    const handle = setTimeout(() => {
      getAdminRadioStationsAction({ query: q, filter, page }).then((res) => {
        if (cancelled) return;
        if (res.success && res.data) setData(res.data);
        else toast.error(res.error ?? "Could not load stations");
        setLoading(false);
      });
    }, q ? SEARCH_DEBOUNCE_MS : 0);

    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [q, filter, page, revision]);

  const refresh = useCallback(() => setRevision((r) => r + 1), []);

  const totalPages = useMemo(
    () => (data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1),
    [data]
  );

  /* ── Mutations ───────────────────────────────────────────────────────── */

  const toggleActive = useCallback(
    async (station: AdminRadioStation) => {
      setPendingId(station.id);
      const next = !station.isActive;
      const res = await updateRadioStationAction(station.id, { isActive: next });
      setPendingId(null);

      if (res.success) {
        toast.success(next ? `Enabled “${station.name}”` : `Disabled “${station.name}”`);
        refresh();
      } else {
        toast.error(res.error ?? "Could not update station");
      }
    },
    [refresh]
  );

  const toggleBroken = useCallback(
    async (station: AdminRadioStation) => {
      setPendingId(station.id);
      const next = !station.isBroken;
      const res = await updateRadioStationAction(station.id, { isBroken: next });
      setPendingId(null);

      if (res.success) {
        toast.success(next ? "Marked as not working" : "Marked as working");
        refresh();
      } else {
        toast.error(res.error ?? "Could not update station");
      }
    },
    [refresh]
  );

  const toggleRecommended = useCallback(
    async (station: AdminRadioStation) => {
      setPendingId(station.id);
      const next = !station.isRecommended;
      const res = await updateRadioStationAction(station.id, { isRecommended: next });
      setPendingId(null);

      if (res.success) {
        toast.success(
          next ? `“${station.name}” added to Recommended` : `“${station.name}” removed from Recommended`
        );
        refresh();
      } else {
        toast.error(res.error ?? "Could not update station");
      }
    },
    [refresh]
  );

  const handleSave = useCallback(
    async (patch: { name: string; url: string }) => {
      if (!dialogStation) return;
      setDialogBusy(true);
      setDialogError(null);

      const res = await updateRadioStationAction(dialogStation.id, patch);
      setDialogBusy(false);

      if (res.success) {
        setDialogStation(null);
        toast.success("Station updated");
        refresh();
      } else {
        setDialogError(res.error ?? "Could not save changes");
      }
    },
    [dialogStation, refresh]
  );

  const handleDelete = useCallback(async () => {
    if (!dialogStation) return;
    setDialogBusy(true);
    setDialogError(null);

    const res = await deleteRadioStationAction(dialogStation.id);
    setDialogBusy(false);

    if (res.success) {
      toast.success(`Deleted “${dialogStation.name}”`);
      setDialogStation(null);
      refresh();
    } else {
      setDialogError(res.error ?? "Could not delete station");
    }
  }, [dialogStation, refresh]);

  const handleCreate = useCallback(
    async (input: NewStationInput) => {
      setCreateBusy(true);
      setCreateError(null);

      const res = await createRadioStationAction(input);
      setCreateBusy(false);

      if (res.success && res.data) {
        setCreateOpen(false);
        toast.success(`Added “${res.data.name}”`, {
          description: `Filed under ${res.data.categoryName}.`,
        });
        refresh();
      } else {
        setCreateError(res.error ?? "Could not add station");
      }
    },
    [refresh]
  );

  const openDialog = useCallback((station: AdminRadioStation, mode: DialogMode) => {
    setDialogStation(station);
    setDialogMode(mode);
    setDialogError(null);
  }, []);

  /* ── Render ──────────────────────────────────────────────────────────── */

  return (
    <motion.section
      initial={reduceMotion ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="mt-8 rounded-2xl border border-white/6 bg-surface/40 p-6 sm:p-8"
    >
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-xl border border-purple-500/25 bg-purple-950/40">
            <RadioIcon className="size-4.5 text-purple-300" />
          </div>
          <div>
            <h2 className="font-display text-lg font-bold">Radio Stations</h2>
            <p className="text-xs text-muted">
              {data
                ? `${data.counts.total.toLocaleString()} cached · ${data.counts.recommended} recommended · ${data.counts.disabled} disabled · ${data.counts.broken} reported`
                : "Loading catalogue…"}
            </p>
          </div>
        </div>

        <motion.button
          type="button"
          onClick={() => {
            setCreateError(null);
            setCreateOpen(true);
          }}
          whileHover={reduceMotion ? undefined : { scale: 1.04, y: -1 }}
          whileTap={reduceMotion ? undefined : { scale: 0.96 }}
          transition={{ type: "spring", stiffness: 440, damping: 26 }}
          className="flex flex-none cursor-pointer items-center gap-1.5 rounded-lg bg-linear-to-r from-purple-600 to-fuchsia-600 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:from-purple-500 hover:to-fuchsia-500"
        >
          <Plus className="size-3.5" />
          Add station
        </motion.button>
      </div>

      {/* Search + filters */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-52 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted" />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search stations by name…"
            aria-label="Search stations"
            className="w-full rounded-lg border border-white/8 bg-surface py-2 pl-9 pr-8 text-sm outline-none transition-colors placeholder:text-muted focus:border-purple-500/60"
          />
          <AnimatePresence>
            {query && (
              <motion.button
                type="button"
                onClick={() => {
                  setQuery("");
                  setPage(1);
                }}
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.7 }}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer rounded p-1 text-muted hover:text-white"
              >
                <X className="size-3" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        <div className="flex items-center gap-1">
          {FILTERS.map((f) => {
            const active = filter === f.id;
            return (
              <motion.button
                key={f.id}
                type="button"
                onClick={() => {
                  setFilter(f.id);
                  setPage(1);
                }}
                whileHover={reduceMotion ? undefined : { y: -1 }}
                whileTap={reduceMotion ? undefined : { scale: 0.95 }}
                className={`relative cursor-pointer rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                  active ? "text-white" : "text-fg-secondary hover:text-white"
                }`}
              >
                {active && (
                  <motion.span
                    layoutId={reduceMotion ? undefined : "radio-admin-filter"}
                    className="absolute inset-0 -z-10 rounded-lg bg-linear-to-r from-purple-600 to-fuchsia-600"
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  />
                )}
                {!active && <span className="absolute inset-0 -z-10 rounded-lg border border-white/6 bg-surface" />}
                {f.label}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Rows */}
      {loading && !data ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <motion.div
              key={i}
              className="h-14 rounded-xl border border-white/6 bg-surface/40"
              animate={reduceMotion ? { opacity: 0.45 } : { opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.06 }}
            />
          ))}
        </div>
      ) : !data || data.stations.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted">
          No stations match this filter.
        </p>
      ) : (
        <motion.div layout={!reduceMotion} className="space-y-2">
          <AnimatePresence mode="popLayout">
            {data.stations.map((station) => (
              <motion.div
                key={station.id}
                layout={!reduceMotion}
                initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? undefined : { opacity: 0, scale: 0.97 }}
                transition={{ type: "spring", stiffness: 420, damping: 32 }}
                className={`flex flex-wrap items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors ${
                  station.isActive
                    ? "border-white/6 bg-surface/50"
                    : "border-white/6 bg-surface/20 opacity-60"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold text-white">{station.name}</span>
                    {station.isRecommended && <Badge tone="star">Recommended</Badge>}
                    {!station.isActive && <Badge tone="muted">Disabled</Badge>}
                    {station.isBroken && (
                      <Badge tone="warn">Reported ×{station.reportCount ?? 0}</Badge>
                    )}
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted">
                    <span className="rounded bg-white/6 px-1.5 py-0.5">{station.categoryName}</span>
                    <a
                      href={station.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex min-w-0 items-center gap-1 truncate font-mono hover:text-fg-secondary"
                    >
                      <span className="truncate">{station.url}</span>
                      <ExternalLink className="size-2.5 flex-none" />
                    </a>
                  </div>
                </div>

                <div className="flex flex-none items-center gap-1">
                  {pendingId === station.id ? (
                    <Loader2 className="mx-3 size-4 animate-spin text-purple-400" />
                  ) : (
                    <>
                      <RowAction
                        label={
                          station.isRecommended
                            ? "Remove from Recommended"
                            : "Add to Recommended"
                        }
                        onClick={() => toggleRecommended(station)}
                        tone={station.isRecommended ? "star" : "default"}
                      >
                        <Star
                          className={`size-3.5 ${station.isRecommended ? "fill-current" : ""}`}
                        />
                      </RowAction>
                      <RowAction
                        label={station.isActive ? "Disable station" : "Enable station"}
                        onClick={() => toggleActive(station)}
                        tone={station.isActive ? "default" : "success"}
                      >
                        <Power className="size-3.5" />
                      </RowAction>
                      <RowAction
                        label={station.isBroken ? "Mark as working" : "Mark not working"}
                        onClick={() => toggleBroken(station)}
                        tone={station.isBroken ? "warn" : "default"}
                      >
                        <Flag className="size-3.5" />
                      </RowAction>
                      <RowAction label="Edit station" onClick={() => openDialog(station, "edit")}>
                        <Pencil className="size-3.5" />
                      </RowAction>
                      <RowAction
                        label="Delete station"
                        tone="danger"
                        onClick={() => openDialog(station, "delete")}
                      >
                        <Trash2 className="size-3.5" />
                      </RowAction>
                    </>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Pagination */}
      {data && data.total > data.pageSize && (
        <div className="mt-5 flex items-center justify-between gap-3">
          <span className="text-xs text-muted">
            {(data.page - 1) * data.pageSize + 1}–
            {Math.min(data.page * data.pageSize, data.total)} of {data.total.toLocaleString()}
          </span>
          <div className="flex items-center gap-1.5">
            <PageButton
              disabled={data.page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              label="Previous page"
            >
              <ChevronLeft className="size-4" />
            </PageButton>
            <span className="px-2 text-xs tabular-nums text-fg-secondary">
              {data.page} / {totalPages}
            </span>
            <PageButton
              disabled={data.page >= totalPages || loading}
              onClick={() => setPage((p) => p + 1)}
              label="Next page"
            >
              <ChevronRight className="size-4" />
            </PageButton>
          </div>
        </div>
      )}

      <StationCreateDialog
        open={createOpen}
        busy={createBusy}
        error={createError}
        onCreate={handleCreate}
        onClose={() => !createBusy && setCreateOpen(false)}
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
    </motion.section>
  );
}

/* ── Pieces ────────────────────────────────────────────────────────────── */

function Badge({
  tone,
  children,
}: {
  tone: "muted" | "warn" | "star";
  children: React.ReactNode;
}) {
  const tones = {
    warn: "border-amber-500/30 bg-amber-500/10 text-amber-300",
    star: "border-purple-400/40 bg-purple-500/15 text-purple-200",
    muted: "border-white/10 bg-white/5 text-muted",
  };
  return (
    <span
      className={`flex-none rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

function RowAction({
  label,
  onClick,
  tone = "default",
  children,
}: {
  label: string;
  onClick: () => void;
  tone?: "default" | "danger" | "warn" | "success" | "star";
  children: React.ReactNode;
}) {
  const reduceMotion = useReducedMotion();
  const tones = {
    default: "text-fg-secondary hover:text-white hover:bg-white/8",
    danger: "text-red-400 hover:bg-red-500/12",
    warn: "text-amber-400 hover:bg-amber-500/12",
    success: "text-emerald-400 hover:bg-emerald-500/12",
    star: "text-amber-300 hover:bg-amber-500/12",
  };
  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      whileHover={reduceMotion ? undefined : { scale: 1.12 }}
      whileTap={reduceMotion ? undefined : { scale: 0.88 }}
      transition={{ type: "spring", stiffness: 500, damping: 20 }}
      className={`cursor-pointer rounded-lg p-2 transition-colors ${tones[tone]}`}
    >
      {children}
    </motion.button>
  );
}

function PageButton({
  disabled,
  onClick,
  label,
  children,
}: {
  disabled: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      whileHover={reduceMotion || disabled ? undefined : { scale: 1.08 }}
      whileTap={reduceMotion || disabled ? undefined : { scale: 0.9 }}
      className="cursor-pointer rounded-lg border border-white/8 bg-surface p-1.5 text-fg-secondary transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
    >
      {children}
    </motion.button>
  );
}
