import React from "react";
import type { Metadata } from "next";
import Nav from "@/components/Nav";
import TrendingDome, { type DomeImage } from "@/components/trending/TrendingDome";
import { tmdb } from "@/lib/tmdb";

export const metadata: Metadata = {
  title: "Gallery - Cinevo",
  description: "Spin through the most popular movies and TV series in an interactive 3D gallery.",
};

export default async function GalleryPage() {
  const [trendingMovies, trendingTV] = await Promise.all([
    tmdb.getTrending("movie"),
    tmdb.getTrending("tv"),
  ]);

  const toImage = (
    m: (typeof trendingMovies)[number],
    mediaType: "movie" | "tv"
  ): DomeImage => ({
    src: `https://image.tmdb.org/t/p/w500${m.poster_path}`,
    alt: m.title || m.name || "",
    id: m.id,
    mediaType,
    title: m.title || m.name || "",
  });

  // Mix movies + shows (each list already popularity-ranked) for a varied dome.
  const images: DomeImage[] = [
    ...trendingMovies.filter((m) => m.poster_path).map((m) => toImage(m, "movie")),
    ...trendingTV.filter((m) => m.poster_path).map((m) => toImage(m, "tv")),
  ];

  return (
    <div className="relative w-full h-screen overflow-hidden bg-bg">
      <Nav />
      <TrendingDome images={images} />
    </div>
  );
}
