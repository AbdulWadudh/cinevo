"use client";

import React, { useRef, useState, useTransition } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Plus, Server, Trash2 } from "lucide-react";
import ProviderAdmin, { type ProviderAdminHandle } from "./ProviderAdmin";
import ProviderReportsAdmin from "./ProviderReportsAdmin";
import { clearResolvedReports, type ProviderReportRow } from "@/app/actions/reports";
import type { PlayerProvider } from "@/lib/providers";

type Tab = "providers" | "reports";

interface ProvidersPanelProps {
  providers: PlayerProvider[];
  reports: ProviderReportRow[];
  reportCounts: { providerKey: string; count: number }[];
}

const SPRING = { type: "spring", stiffness: 380, damping: 32 } as const;

/**
 * Stream providers and the trouble reports filed against them, in one panel —
 * they're the same subject, and splitting them meant two near-identical cards.
 * Laid out like the radio catalogue: header with the contextual action, filter
 * tabs, then a list that owns its own scrollbar.
 */
export default function ProvidersPanel({
  providers: initialProviders,
  reports: initialReports,
  reportCounts,
}: ProvidersPanelProps) {
  const reduceMotion = useReducedMotion();
  const [tab, setTab] = useState<Tab>("providers");

  // Both lists live here rather than in the panes: the panes unmount on a tab
  // switch, and re-seeding them from the server props would discard a provider
  // just added or a report just resolved.
  const [providers, setProviders] = useState(initialProviders);
  const [reports, setReports] = useState(initialReports);
  const [, startTransition] = useTransition();

  const providerPane = useRef<ProviderAdminHandle>(null);
  const openReports = reports.filter((r) => !r.resolved).length;
  const hasResolved = reports.some((r) => r.resolved);

  const clearResolved = () => {
    setReports((prev) => prev.filter((r) => !r.resolved));
    startTransition(async () => {
      await clearResolvedReports();
    });
  };

  const TABS: { id: Tab; label: string; badge: number }[] = [
    { id: "providers", label: "Providers", badge: providers.length },
    { id: "reports", label: "Reports", badge: openReports },
  ];

  return (
    <motion.section
      initial={reduceMotion ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="rounded-2xl border border-white/6 bg-surface/40 p-6 sm:p-8"
    >
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 flex-none items-center justify-center rounded-xl border border-accent/25 bg-accent/15">
            <Server className="size-4.5 text-accent" />
          </div>
          <div>
            <h2 className="font-display text-lg leading-tight font-bold">Stream Providers</h2>
            <p className="text-xs text-muted">
              {providers.length} configured · {openReports} open report{openReports === 1 ? "" : "s"}
            </p>
          </div>
        </div>

        {/* The header action follows the tab, the way "Add station" does on radio. */}
        <AnimatePresence mode="wait" initial={false}>
          {tab === "providers" ? (
            <HeaderAction
              key="add"
              onClick={() => providerPane.current?.openNew()}
              reduceMotion={reduceMotion}
              tone="accent"
            >
              <Plus className="size-3.5" />
              Add provider
            </HeaderAction>
          ) : hasResolved ? (
            <HeaderAction
              key="clear"
              onClick={clearResolved}
              reduceMotion={reduceMotion}
              tone="muted"
            >
              <Trash2 className="size-3.5" />
              Clear resolved
            </HeaderAction>
          ) : null}
        </AnimatePresence>
      </div>

      {/* Tabs — outside the pane transition, so the pill slides between them. */}
      <div
        role="tablist"
        aria-label="Provider sections"
        className="mb-4 flex items-center gap-1"
      >
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <motion.button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.id)}
              whileHover={reduceMotion ? undefined : { y: -1 }}
              whileTap={reduceMotion ? undefined : { scale: 0.95 }}
              className={`relative flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                active ? "text-white" : "text-fg-secondary hover:text-white"
              }`}
            >
              {active && (
                <motion.span
                  layoutId={reduceMotion ? undefined : "provider-admin-tab"}
                  className="absolute inset-0 -z-10 rounded-lg bg-accent"
                  transition={SPRING}
                />
              )}
              {!active && (
                <span className="absolute inset-0 -z-10 rounded-lg border border-white/6 bg-surface" />
              )}
              {t.label}
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-extrabold tabular-nums ${
                  active ? "bg-black/25 text-white" : "bg-white/8 text-muted"
                }`}
              >
                {t.badge}
              </span>
            </motion.button>
          );
        })}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={tab}
          initial={reduceMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          {tab === "providers" ? (
            <ProviderAdmin
              ref={providerPane}
              providers={providers}
              setProviders={setProviders}
            />
          ) : (
            <ProviderReportsAdmin rows={reports} setRows={setReports} counts={reportCounts} />
          )}
        </motion.div>
      </AnimatePresence>
    </motion.section>
  );
}

function HeaderAction({
  onClick,
  reduceMotion,
  tone,
  children,
}: {
  onClick: () => void;
  reduceMotion: boolean | null;
  tone: "accent" | "muted";
  children: React.ReactNode;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={reduceMotion ? false : { opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.9 }}
      whileHover={reduceMotion ? undefined : { scale: 1.04, y: -1 }}
      whileTap={reduceMotion ? undefined : { scale: 0.96 }}
      transition={{ type: "spring", stiffness: 440, damping: 26 }}
      className={`flex flex-none cursor-pointer items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors ${
        tone === "accent"
          ? "bg-accent text-white hover:bg-accent-hover"
          : "border border-white/10 bg-white/5 text-fg-secondary hover:text-fg"
      }`}
    >
      {children}
    </motion.button>
  );
}
