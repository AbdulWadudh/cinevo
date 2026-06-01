"use client";

import { useEffect, useRef } from "react";
import { touchWatch } from "@/lib/watchStore";

interface TrackWatchProps {
  mediaId: string;
  mediaType: "movie" | "tv";
  title: string;
  posterPath?: string;
  season?: number;
  episode?: number;
}

/**
 * Records a watch-history entry into the local store when the watch page opens.
 * Writes are local-only (instant, no API call) — the background WatchSync flushes
 * them to the DB every ~10 minutes and on tab hide.
 */
export default function TrackWatch({
  mediaId, mediaType, title, posterPath, season, episode,
}: TrackWatchProps) {
  const lastKey = useRef<string>("");

  useEffect(() => {
    const key = `${mediaType}:${mediaId}:${season ?? 0}:${episode ?? 0}`;
    if (lastKey.current === key) return;
    lastKey.current = key;
    touchWatch({ mediaId, mediaType, title, posterPath, season, episode });
  }, [mediaId, mediaType, title, posterPath, season, episode]);

  return null;
}
