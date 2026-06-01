"use client";

import { useEffect, useRef } from "react";
import { updateWatchProgress } from "@/app/actions/progress";

interface TrackWatchProps {
  mediaId: string;
  mediaType: "movie" | "tv";
  title: string;
  posterPath?: string;
  season?: number;
  episode?: number;
}

/**
 * Invisible tracker — records (upserts) a watch-history entry when the watch
 * page is opened. Playback position can't be read from the cross-origin
 * provider iframes, so this captures *what* and *when* was watched. Re-runs
 * when the title or episode changes so each episode lands in history.
 */
export default function TrackWatch({
  mediaId, mediaType, title, posterPath, season, episode,
}: TrackWatchProps) {
  const lastKey = useRef<string>("");

  useEffect(() => {
    const key = `${mediaType}:${mediaId}:${season ?? 0}:${episode ?? 0}`;
    if (lastKey.current === key) return;
    lastKey.current = key;

    updateWatchProgress({
      mediaId,
      mediaType,
      title,
      posterPath,
      season,
      episode,
      progress: 0,
      duration: 0,
    }).catch(() => { /* tracking is best-effort; ignore failures */ });
  }, [mediaId, mediaType, title, posterPath, season, episode]);

  return null;
}
