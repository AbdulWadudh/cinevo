import React from "react";
import type { Metadata } from "next";
import Nav from "@/components/Nav";
import RevealClient from "@/components/reveal/RevealClient";
import type { RevealItem } from "@/components/reveal/HoloCard";
import { tmdb } from "@/lib/tmdb";

export const metadata: Metadata = {
  title: "Mystery Pack",
  description: "Reveal 5 random movies and TV series, one holographic card at a time.",
};

export default async function RevealPage() {
  // Build a varied pool from several sources; the client picks 5 at random.
  const [trMovies, trTV, topMovies, topTV] = await Promise.all([
    tmdb.getTrending("movie"),
    tmdb.getTrending("tv"),
    tmdb.getTopRated("movie"),
    tmdb.getTopRated("tv"),
  ]);

  const seen = new Set<string>();
  const pool: RevealItem[] = [];
  const add = (m: (typeof trMovies)[number], mediaType: "movie" | "tv") => {
    if (!m.poster_path) return;
    const key = `${mediaType}:${m.id}`;
    if (seen.has(key)) return;
    seen.add(key);
    pool.push({
      id: m.id,
      mediaType,
      title: m.title || m.name || "Untitled",
      poster: m.poster_path,
      rating: m.vote_average ?? 0,
      year: (m.release_date || m.first_air_date || "").split("-")[0] ?? "",
    });
  };
  trMovies.forEach((m) => add(m, "movie"));
  trTV.forEach((m) => add(m, "tv"));
  topMovies.forEach((m) => add(m, "movie"));
  topTV.forEach((m) => add(m, "tv"));

  return (
    <div className="flex-1 w-full bg-bg min-h-screen overflow-x-hidden">
      <Nav />
      <RevealClient pool={pool} />
    </div>
  );
}
