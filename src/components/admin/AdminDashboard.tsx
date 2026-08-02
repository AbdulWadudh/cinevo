"use client";

import React from "react";
import { motion, useReducedMotion } from "motion/react";
import { Users, Server, Flag, Star, Clock, BellRing, ShieldCheck } from "lucide-react";
import type { AdminStats } from "@/app/actions/admin";

const cards: { key: keyof AdminStats; label: string; icon: React.ReactNode }[] = [
  { key: "users", label: "Users", icon: <Users className="w-4 h-4 text-accent" /> },
  { key: "admins", label: "Admins", icon: <ShieldCheck className="w-4 h-4 text-accent" /> },
  { key: "providersEnabled", label: "Active providers", icon: <Server className="w-4 h-4 text-accent" /> },
  { key: "openReports", label: "Open reports", icon: <Flag className="w-4 h-4 text-accent" /> },
  { key: "ratings", label: "Ratings", icon: <Star className="w-4 h-4 text-accent" /> },
  { key: "watchRecords", label: "Watch records", icon: <Clock className="w-4 h-4 text-accent" /> },
  { key: "pushDevices", label: "Push devices", icon: <BellRing className="w-4 h-4 text-accent" /> },
];

export default function AdminDashboard({ stats }: { stats: AdminStats }) {
  const reduceMotion = useReducedMotion();

  return (
    <div className="bg-surface/40 border border-white/6 rounded-2xl p-6 sm:p-8">
      <div className="flex items-center gap-2.5 mb-5">
        <div className="w-9 h-9 rounded-xl bg-accent/15 border border-accent/25 flex items-center justify-center">
          <ShieldCheck className="w-4.5 h-4.5 text-accent" />
        </div>
        <div>
          <h2 className="font-display text-lg font-bold leading-tight">Admin Overview</h2>
          <p className="text-xs text-muted">Counts as of this page load</p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {cards.map((c, i) => (
          <motion.div
            key={c.key}
            initial={reduceMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut", delay: reduceMotion ? 0 : i * 0.04 }}
            className="bg-bg/40 border border-white/6 rounded-xl p-4 transition-colors hover:border-white/10"
          >
            <div className="flex items-center gap-1.5 text-muted mb-1">
              {c.icon}
              <span className="text-[10px] font-bold uppercase tracking-widest">{c.label}</span>
            </div>
            <div className="text-2xl font-extrabold font-display tabular-nums text-fg">{stats[c.key]}</div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
