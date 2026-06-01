"use client";

import { useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { flushWatch, pullWatch } from "@/lib/watchSyncClient";

const SYNC_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Invisible background syncer for the local-first watch store. Pulls the DB
 * copy in on load (cross-device merge), then pushes dirty local entries to the
 * DB every 10 minutes and whenever the tab is hidden/closed. Mounted once in
 * the root layout. No-op when signed out (history still lives in localStorage).
 */
export default function WatchSync() {
  const authedRef = useRef(false);

  const flush = useCallback(async () => {
    if (!authedRef.current) return;
    await flushWatch();
  }, []);

  const pull = useCallback(async () => {
    if (!authedRef.current) return;
    await pullWatch();
    // Push anything local that the DB didn't already have / that's newer.
    await flushWatch();
  }, []);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data }) => {
      authedRef.current = !!data.user;
      if (data.user) pull();
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      const was = authedRef.current;
      authedRef.current = !!session?.user;
      if (!was && authedRef.current) pull();
    });

    const interval = setInterval(flush, SYNC_INTERVAL_MS);
    const onHide = () => { if (document.visibilityState === "hidden") flush(); };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", flush);

    return () => {
      sub.subscription.unsubscribe();
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", flush);
    };
  }, [pull, flush]);

  return null;
}
