"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronDown, Play } from "lucide-react";
import { getSeasonDetailsAction } from "@/app/actions/tmdb-actions";
import { useWatchHistory } from "@/lib/watchStore";

interface Season {
  id: number;
  name: string;
  season_number: number;
  episode_count: number;
  air_date: string | null;
}

interface Episode {
  id: number;
  name: string;
  episode_number: number;
  overview: string;
  still_path: string | null;
  runtime: number | null;
  air_date: string | null;
}

interface EpisodesBrowserProps {
  seriesId: string;
  seasons: Season[];
  currentSeason: number;
  currentEpisode: number;
  preview?: boolean;
}

/**
 * Service-native episode picker: one season at a time with a native dropdown
 * and Netflix-shaped rows, instead of Cinevo's expandable season cards.
 */
export default function EpisodesBrowser({
  seriesId,
  seasons,
  currentSeason,
  currentEpisode,
  preview = false,
}: EpisodesBrowserProps) {
  const validSeasons = useMemo(
    () =>
      seasons
        .filter((s) => s.season_number > 0)
        .sort((a, b) => a.season_number - b.season_number),
    [seasons],
  );

  const [seasonNumber, setSeasonNumber] = useState(
    validSeasons.some((s) => s.season_number === currentSeason)
      ? currentSeason
      : validSeasons[0]?.season_number ?? 1,
  );
  const [episodesBySeason, setEpisodesBySeason] = useState<Record<number, Episode[]>>({});

  useEffect(() => {
    if (episodesBySeason[seasonNumber]) return;
    let active = true;
    void getSeasonDetailsAction(seriesId, seasonNumber).then((res) => {
      if (!active) return;
      setEpisodesBySeason((prev) =>
        prev[seasonNumber]
          ? prev
          : { ...prev, [seasonNumber]: res.success && res.data ? (res.data.episodes ?? []) : [] },
      );
    });
    return () => {
      active = false;
    };
  }, [episodesBySeason, seasonNumber, seriesId]);

  const history = useWatchHistory();
  const watched = useMemo(() => {
    const set = new Set<string>();
    for (const entry of history) {
      if (entry.mediaType === "tv" && entry.mediaId === seriesId) {
        set.add(`${entry.season}:${entry.episode}`);
      }
    }
    return set;
  }, [history, seriesId]);

  const episodes = episodesBySeason[seasonNumber];
  const loading = !episodes;
  const previewParam = preview ? "&preview=1" : "";
  const activeSeason = validSeasons.find((s) => s.season_number === seasonNumber);

  return (
    <section data-xp-episodes className="xp-episodes">
      <div className="xp-episodes-head">
        <h2>Episodes</h2>
        <div className="xp-episodes-picker">
          <select
            aria-label="Choose a season"
            value={seasonNumber}
            onChange={(e) => setSeasonNumber(Number(e.target.value))}
            className="xp-episodes-select"
          >
            {validSeasons.map((s) => (
              <option key={s.id} value={s.season_number}>
                {s.name}
              </option>
            ))}
          </select>
          <ChevronDown className="xp-episodes-chevron" aria-hidden="true" />
        </div>
      </div>

      {activeSeason && (
        <p className="xp-episodes-sub">
          {activeSeason.episode_count} episodes
          {activeSeason.air_date ? ` · ${activeSeason.air_date.split("-")[0]}` : ""}
        </p>
      )}

      <div className="xp-ep-list" aria-busy={loading}>
        {loading && !episodes &&
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="xp-ep-skeleton" aria-hidden="true">
              <span className="xp-ep-skeleton-num" />
              <span className="xp-ep-skeleton-thumb" />
              <span className="xp-ep-skeleton-copy">
                <span />
                <span />
              </span>
            </div>
          ))}

        {episodes?.map((ep, index) => {
          const isCurrent =
            seasonNumber === currentSeason && ep.episode_number === currentEpisode;
          const isWatched = watched.has(`${seasonNumber}:${ep.episode_number}`);
          const href = `/watch/tv/${seriesId}?season=${seasonNumber}&episode=${ep.episode_number}${previewParam}`;
          const still = ep.still_path
            ? `https://image.tmdb.org/t/p/w400${ep.still_path}`
            : "https://picsum.photos/seed/cinevoep/400/225";

          return (
            <Link
              key={ep.id}
              href={href}
              className={`xp-ep-row ${isCurrent ? "xp-ep-row-current" : ""}`}
              style={{ animationDelay: `${index * 30}ms` }}
            >
              <span className="xp-ep-num">{ep.episode_number}</span>
              <span className="xp-ep-thumb">
                <Image src={still} alt="" fill sizes="(max-width: 640px) 112px, 160px" className="object-cover" />
                <span className="xp-ep-thumb-play">
                  <Play className="h-4 w-4 fill-white" />
                </span>
              </span>
              <span className="xp-ep-copy">
                <span className="xp-ep-head">
                  <span className="xp-ep-title">{ep.name || `Episode ${ep.episode_number}`}</span>
                  {isCurrent && <span className="xp-ep-now">Now playing</span>}
                  {isWatched && !isCurrent && <span className="xp-ep-watched">Watched</span>}
                </span>
                <span className="xp-ep-meta">
                  {ep.air_date ? `${ep.air_date.split("-")[0]} · ` : ""}
                  {ep.runtime ? `${ep.runtime}m` : activeSeason ? `${activeSeason.episode_count} in season` : ""}
                </span>
                <span className="xp-ep-overview">{ep.overview || "No episode description available."}</span>
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
