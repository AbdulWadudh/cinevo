"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { X, Loader2, Save, Trash2, AlertTriangle } from "lucide-react";
import type { RadioStationData } from "@/app/actions/radio";

export type DialogMode = "edit" | "delete";

interface StationEditDialogProps {
  station: RadioStationData | null;
  mode: DialogMode;
  busy: boolean;
  error: string | null;
  onSave: (patch: { name: string; url: string }) => void;
  onConfirmDelete: () => void;
  onClose: () => void;
}

/** Admin dialog for renaming/repointing a station, or confirming its removal. */
export default function StationEditDialog({
  station,
  mode,
  busy,
  error,
  onSave,
  onConfirmDelete,
  onClose,
}: StationEditDialogProps) {
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!station) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [station, busy, onClose]);

  return (
    <AnimatePresence>
      {station && (
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
            aria-label={mode === "delete" ? "Delete station" : "Edit station"}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.94, y: 12 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-bg-elevated shadow-2xl shadow-black/70"
          >
            <div className="flex items-center justify-between border-b border-white/6 px-5 py-3.5">
              <h3 className="font-display text-sm font-bold text-white">
                {mode === "delete" ? "Delete station" : "Edit station"}
              </h3>
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

            {/* Keyed on the station so the form re-initialises by remounting,
                rather than syncing props into state from an effect. */}
            <DialogBody
              key={`${station.id}:${mode}`}
              station={station}
              mode={mode}
              busy={busy}
              error={error}
              onSave={onSave}
              onConfirmDelete={onConfirmDelete}
              onClose={onClose}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function DialogBody({
  station,
  mode,
  busy,
  error,
  onSave,
  onConfirmDelete,
  onClose,
}: StationEditDialogProps & { station: RadioStationData }) {
  const reduceMotion = useReducedMotion();
  const [name, setName] = useState(station.name);
  const [url, setUrl] = useState(station.url);

  const dirty = name.trim() !== station.name || url.trim() !== station.url;
  const saveDisabled = busy || (mode === "edit" && (!dirty || !name.trim() || !url.trim()));

  return (
    <>
      <div className="space-y-4 px-5 py-5">
        {mode === "delete" ? (
          <div className="flex gap-3">
            <div className="flex size-9 flex-none items-center justify-center rounded-lg bg-red-500/15 text-red-400">
              <AlertTriangle className="size-4.5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm text-fg">
                Permanently remove <span className="font-semibold text-white">{station.name}</span> from
                the catalogue?
              </p>
              <p className="mt-1 text-xs text-muted">
                It will come back the next time this category is re-seeded from upstream.
              </p>
            </div>
          </div>
        ) : (
          <>
            <Field label="Station name">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={busy}
                autoFocus
                className="w-full rounded-lg border border-white/8 bg-surface px-3 py-2 text-sm text-fg outline-none transition-colors focus:border-purple-500/60 disabled:opacity-50"
              />
            </Field>
            <Field label="Stream URL">
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={busy}
                spellCheck={false}
                className="w-full rounded-lg border border-white/8 bg-surface px-3 py-2 font-mono text-xs text-fg outline-none transition-colors focus:border-purple-500/60 disabled:opacity-50"
              />
            </Field>
          </>
        )}

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
            mode === "delete" ? onConfirmDelete() : onSave({ name: name.trim(), url: url.trim() })
          }
          disabled={saveDisabled}
          whileHover={reduceMotion || saveDisabled ? undefined : { scale: 1.03 }}
          whileTap={reduceMotion || saveDisabled ? undefined : { scale: 0.96 }}
          className={`flex cursor-pointer items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
            mode === "delete"
              ? "bg-red-600 hover:bg-red-500"
              : "bg-linear-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500"
          }`}
        >
          {busy ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : mode === "delete" ? (
            <Trash2 className="size-3.5" />
          ) : (
            <Save className="size-3.5" />
          )}
          {mode === "delete" ? "Delete" : "Save changes"}
        </motion.button>
      </div>
    </>
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
