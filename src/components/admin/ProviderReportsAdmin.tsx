"use client";

import React, { useState, useTransition } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Check, RotateCcw, Trash2, Loader2, AlertTriangle } from "lucide-react";
import {
  resolveProviderReport, deleteProviderReport,
  type ProviderReportRow,
} from "@/app/actions/reports";

interface Props {
  /** Owned by the panel, so a tab switch doesn't discard resolved reports. */
  rows: ProviderReportRow[];
  setRows: React.Dispatch<React.SetStateAction<ProviderReportRow[]>>;
  counts: { providerKey: string; count: number }[];
}

export default function ProviderReportsAdmin({ rows, setRows, counts }: Props) {
  const [, startTransition] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);

  const toggle = (id: string, resolved: boolean) => {
    setBusy(id);
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, resolved } : r)));
    startTransition(async () => {
      await resolveProviderReport(id, resolved);
      setBusy(null);
    });
  };

  const remove = (id: string) => {
    setBusy(id);
    setRows((prev) => prev.filter((r) => r.id !== id));
    startTransition(async () => {
      await deleteProviderReport(id);
      setBusy(null);
    });
  };

  return (
    <>
      {/* Per-provider tally of open reports */}
      {counts.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {counts.map((c) => (
            <span key={c.providerKey} className="inline-flex items-center gap-1.5 text-[11px] font-bold bg-orange-500/10 text-orange-300 border border-orange-500/20 px-2.5 py-1 rounded-full">
              <AlertTriangle className="w-3 h-3" /> {c.providerKey}: {c.count}
            </span>
          ))}
        </div>
      )}

      {rows.length === 0 ? (
        <p className="text-sm text-muted py-8 text-center">No reports — every provider is behaving.</p>
      ) : (
        // Up to 200 reports come back at once, so the rows own the scrollbar
        // rather than pushing the rest of the page down.
        <div className="flex max-h-[60vh] flex-col gap-2 overflow-y-auto overscroll-contain pr-1">
          <AnimatePresence initial={false}>
            {rows.map((r) => (
              <motion.div
                key={r.id}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.18 }}
                className={`flex items-center gap-3 bg-bg/40 border rounded-xl px-4 py-2.5 ${r.resolved ? "border-white/[0.04] opacity-55" : "border-white/[0.07]"}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-fg">{r.providerLabel || r.providerKey}</span>
                    <span className="text-[10px] font-mono text-muted bg-white/[0.05] px-1.5 py-0.5 rounded">{r.mediaType}/{r.mediaId}</span>
                    {r.resolved && <span className="text-[9px] font-extrabold uppercase tracking-widest text-emerald-400">resolved</span>}
                  </div>
                  <p className="text-[11px] text-muted truncate mt-0.5">
                    {r.title || "Untitled"} &bull; {new Date(r.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 flex-none">
                  <button
                    onClick={() => toggle(r.id, !r.resolved)}
                    disabled={busy === r.id}
                    title={r.resolved ? "Mark unresolved" : "Mark resolved"}
                    className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/[0.05] border border-white/[0.1] text-fg-secondary hover:text-emerald-400 hover:border-emerald-500/40 transition-all cursor-pointer"
                  >
                    {busy === r.id ? <Loader2 className="w-4 h-4 animate-spin" /> : r.resolved ? <RotateCcw className="w-3.5 h-3.5" /> : <Check className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => remove(r.id)}
                    disabled={busy === r.id}
                    title="Delete report"
                    className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/[0.05] border border-white/[0.1] text-fg-secondary hover:text-red-400 hover:border-red-500/40 transition-all cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </>
  );
}
