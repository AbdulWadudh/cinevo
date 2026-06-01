"use client";

import { useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { getWatchProgressList, syncWatchProgress } from "@/app/actions/progress";
import { getDirty, markSynced, mergeFromDb, entryKey, type WatchEntry } from "@/lib/watchStore";

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
    const dirty = getDirty();
    if (dirty.length === 0) return;
    const stamped = dirty.map((e) => ({ key: entryKey(e), updatedAt: e.updatedAt }));
    const res = await syncWatchProgress(
      dirty.map((e) => ({
        mediaId: e.mediaId,
        mediaType: e.mediaType,
        title: e.title,
        posterPath: e.posterPath ?? undefined,
        season: e.mediaType === "tv" ? e.season : undefined,
        episode: e.mediaType === "tv" ? e.episode : undefined,
        progress: e.progress,
        duration: e.duration,
      }))
    );
    if (res.success) markSynced(stamped);
  }, []);

  const pull = useCallback(async () => {
    if (!authedRef.current) return;
    const res = await getWatchProgressList();
    if (res.success && res.data) {
      const rows: Omit<WatchEntry, "dirty">[] = res.data.map((i: any) => ({
        mediaId: i.mediaId,
        mediaType: i.mediaType === "tv" ? "tv" : "movie",
        title: i.title,
        posterPath: i.posterPath ?? null,
        season: i.season ?? 0,
        episode: i.episode ?? 0,
        progress: i.progress ?? 0,
        duration: i.duration ?? 0,
        updatedAt: new Date(i.updatedAt).getTime(),
      }));
      mergeFromDb(rows);
    }
    // Push anything local that the DB didn't already have / that's newer.
    flush();
  }, [flush]);

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
