"use client";

import React, { useState } from "react";
import { Trash2, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { fullSync } from "@/lib/watchSyncClient";
import { clearGenresCache } from "@/lib/genres";

/**
 * Dedicated control to clear locally-cached data and reconcile with the server:
 *  1. pushes any pending watch-history changes to the DB (and pulls the latest),
 *  2. drops the cached TMDB genre lists so they refetch fresh on next use.
 */
export default function ClearCacheButton() {
  const [state, setState] = useState<"idle" | "working" | "done">("idle");

  const run = async () => {
    if (state === "working") return;
    setState("working");
    try {
      // Flush/pull watch history first so nothing pending is lost, then clear caches.
      await fullSync();
      clearGenresCache();
      setState("done");
      toast.success("Cache cleared & data synced");
      setTimeout(() => setState("idle"), 2500);
    } catch {
      setState("idle");
      toast.error("Couldn't clear cache — try again");
    }
  };

  return (
    <button
      onClick={run}
      disabled={state === "working"}
      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-white/[0.05] border border-white/[0.1] text-fg-secondary hover:text-fg hover:bg-white/[0.09] transition-all cursor-pointer disabled:opacity-60"
    >
      {state === "done"
        ? <><Check className="w-4 h-4 text-emerald-400" /> Done</>
        : state === "working"
          ? <><Loader2 className="w-4 h-4 animate-spin" /> Clearing…</>
          : <><Trash2 className="w-4 h-4" /> Clear cache &amp; sync</>}
    </button>
  );
}
