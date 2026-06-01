"use client";

import React, { useState, useTransition } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Flag, Check, RotateCcw, Trash2, Loader2, AlertTriangle } from "lucide-react";
import {
  resolveProviderReport, deleteProviderReport, clearResolvedReports,
  type ProviderReportRow,
} from "@/app/actions/reports";

interface Props {
  initial: ProviderReportRow[];
  counts: { providerKey: string; count: number }[];
}

export default function ProviderReportsAdmin({ initial, counts }: Props) {
  const [rows, setRows] = useState<ProviderReportRow[]>(initial);
  const [, startTransition] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);

  const unresolved = rows.filter((r) => !r.resolved).length;

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

  const clearResolved = () => {
    setRows((prev) => prev.filter((r) => !r.resolved));
    startTransition(async () => { await clearResolvedReports(); });
  };

  return (
    <div className="bg-surface/40 border border-white/[0.06] rounded-2xl p-6 sm:p-8 mt-6">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-orange-500/15 border border-orange-500/25 flex items-center justify-center">
            <Flag className="w-4.5 h-4.5 text-orange-400" />
          </div>
          <div>
            <h2 className="font-display text-lg font-bold leading-tight">Provider Reports</h2>
            <p className="text-xs text-muted">{unresolved} open &bull; {rows.length} total</p>
          </div>
        </div>
        {rows.some((r) => r.resolved) && (
          <button
            onClick={clearResolved}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white/[0.05] border border-white/[0.1] text-fg-secondary hover:text-fg transition-all cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" /> Clear resolved
          </button>
        )}
      </div>

      {/* Per-provider tally of open reports */}
      {counts.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-5">
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
        <div className="flex flex-col gap-2">
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
    </div>
  );
}
