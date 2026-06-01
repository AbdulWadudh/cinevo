"use client";

import React, { useState, useTransition } from "react";
import { Users, Server, Flag, Star, Clock, BellRing, ShieldCheck, Loader2, UserCog } from "lucide-react";
import { setUserRole, type AdminStats } from "@/app/actions/admin";

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
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const run = (role: "admin" | "user") => {
    if (!email.trim()) return;
    setMsg(null);
    startTransition(async () => {
      const res = await setUserRole(email.trim(), role);
      if (res.success) setMsg({ ok: true, text: `${email} is now ${res.role}.` });
      else setMsg({ ok: false, text: res.error || "Failed" });
    });
  };

  return (
    <div className="bg-surface/40 border border-white/[0.06] rounded-2xl p-6 sm:p-8 mt-6">
      <div className="flex items-center gap-2.5 mb-5">
        <div className="w-9 h-9 rounded-xl bg-accent/15 border border-accent/25 flex items-center justify-center">
          <ShieldCheck className="w-4.5 h-4.5 text-accent" />
        </div>
        <h2 className="font-display text-lg font-bold">Admin Overview</h2>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-7">
        {cards.map((c) => (
          <div key={c.key} className="bg-bg/40 border border-white/[0.06] rounded-xl p-4">
            <div className="flex items-center gap-1.5 text-muted mb-1">{c.icon}<span className="text-[10px] font-bold uppercase tracking-widest">{c.label}</span></div>
            <div className="text-2xl font-extrabold font-display text-fg">{stats[c.key]}</div>
          </div>
        ))}
      </div>

      {/* Promote / demote */}
      <div className="border-t border-white/[0.06] pt-5">
        <div className="flex items-center gap-2 mb-3">
          <UserCog className="w-4 h-4 text-accent" />
          <h3 className="text-sm font-bold">Manage roles</h3>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@email.com"
            className="flex-1 min-w-[200px] bg-bg/60 border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-fg placeholder-muted outline-none focus:border-accent/60 transition-colors"
          />
          <button
            onClick={() => run("admin")}
            disabled={pending}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold bg-accent text-white hover:bg-accent-hover transition-all cursor-pointer disabled:opacity-60"
          >
            {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />} Make admin
          </button>
          <button
            onClick={() => run("user")}
            disabled={pending}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-white/[0.05] border border-white/[0.1] text-fg-secondary hover:text-fg transition-all cursor-pointer disabled:opacity-60"
          >
            Demote
          </button>
        </div>
        {msg && (
          <p className={`text-xs mt-3 ${msg.ok ? "text-emerald-400" : "text-red-400"}`}>{msg.text}</p>
        )}
      </div>
    </div>
  );
}
