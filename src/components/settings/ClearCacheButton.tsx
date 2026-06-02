"use client";

import React, { useState } from "react";
import { RotateCcw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { flushWatch } from "@/lib/watchSyncClient";
import { getDirty } from "@/lib/watchStore";
import { safeStorage } from "@/lib/safeStorage";

const APP_CACHE_PREFIX = "cinevo:";

/**
 * Full reset & resync: pushes any pending watch-history changes to the DB,
 * clears the local app cache (watch store + cached genre lists), then reloads
 * so everything is re-sourced from the DB (via WatchSync) and TMDB.
 *
 * Safeguards:
 *  - flushes first and aborts if anything is still un-synced (no data loss),
 *  - only clears `cinevo:*` keys, leaving the Supabase auth session intact,
 *  - when signed out (history is local-only, with no DB copy), it keeps the
 *    watch history and only refreshes the genre cache.
 */
export default function ClearCacheButton() {
  const [working, setWorking] = useState(false);

  const run = async () => {
    if (working) return;
    setWorking(true);
    try {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      const authed = !!data.user;

      if (authed) {
        // Push pending changes, then confirm the local store is fully synced
        // before wiping it — otherwise un-pushed edits would be lost.
        await flushWatch();
        if (getDirty().length > 0) {
          setWorking(false);
          toast.error("Couldn't sync pending changes — not cleared");
          return;
        }
        safeStorage.removeByPrefix(APP_CACHE_PREFIX);
        toast.success("Resyncing from your account…");
      } else {
        // Signed out: the only copy of history is local — don't wipe it.
        safeStorage.remove(`${APP_CACHE_PREFIX}genres:v1`);
        toast.success("Refreshing cached data…");
      }

      // Reload so the dashboard/history re-pull from the DB and TMDB.
      setTimeout(() => window.location.reload(), 350);
    } catch {
      setWorking(false);
      toast.error("Reset failed — try again");
    }
  };

  return (
    <button
      onClick={run}
      disabled={working}
      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-white/[0.05] border border-white/[0.1] text-fg-secondary hover:text-fg hover:bg-white/[0.09] transition-all cursor-pointer disabled:opacity-60"
    >
      {working
        ? <><Loader2 className="w-4 h-4 animate-spin" /> Resyncing…</>
        : <><RotateCcw className="w-4 h-4" /> Reset &amp; resync</>}
    </button>
  );
}
