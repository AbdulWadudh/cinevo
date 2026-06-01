"use client";

import React, { useState } from "react";
import { RefreshCw, Check } from "lucide-react";
import { toast } from "sonner";
import { fullSync } from "@/lib/watchSyncClient";

/** Profile control to immediately reconcile local watch history with the DB. */
export default function ForceSyncButton() {
  const [state, setState] = useState<"idle" | "syncing" | "done">("idle");

  const run = async () => {
    if (state === "syncing") return;
    setState("syncing");
    try {
      await fullSync();
      setState("done");
      toast.success("Watch history synced");
      setTimeout(() => setState("idle"), 2500);
    } catch {
      setState("idle");
      toast.error("Sync failed — try again");
    }
  };

  return (
    <button
      onClick={run}
      disabled={state === "syncing"}
      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-white/[0.05] border border-white/[0.1] text-fg-secondary hover:text-fg hover:bg-white/[0.09] transition-all cursor-pointer disabled:opacity-60"
    >
      {state === "done"
        ? <><Check className="w-4 h-4 text-emerald-400" /> Synced</>
        : <><RefreshCw className={`w-4 h-4 ${state === "syncing" ? "animate-spin" : ""}`} /> {state === "syncing" ? "Syncing…" : "Sync watch history"}</>}
    </button>
  );
}
