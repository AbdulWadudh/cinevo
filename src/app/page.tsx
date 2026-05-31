import React, { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft, Film } from "lucide-react";
import Nav from "@/components/Nav";
import ContinueWatching from "@/components/dashboard/ContinueWatching";
import MediaCarousel from "@/components/dashboard/MediaCarousel";
import BrowseSection from "@/components/dashboard/BrowseSection";
import GenreSection from "@/components/dashboard/GenreSection";
import HeroCarousel from "@/components/dashboard/HeroCarousel";
import { tmdb } from "@/lib/tmdb";

interface HomeProps {
  searchParams: Promise<{ genre?: string; genreName?: string }>;
}

export default async function Home({ searchParams }: HomeProps) {
  const { genre, genreName } = await searchParams;

  // ── Genre-focused browse view (e.g. /?genre=12&genreName=Adventure) ──
  if (genre) {
    const [movieData, showData] = await Promise.all([
      tmdb.getByGenrePaged(genre, "movie", 1),
      tmdb.getByGenrePaged(genre, "tv", 1),
    ]);
    const empty = movieData.results.length === 0 && showData.results.length === 0;

    return (
      <div className="flex-1 w-full bg-bg pb-12 overflow-x-hidden">
        <Nav />

        <section className="pt-24 md:pt-28 px-6 md:px-12 mb-10">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-fg-secondary bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] hover:text-fg px-3.5 py-2 rounded-lg transition-all mb-6"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Home</span>
          </Link>
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-accent mb-2">
            <span className="w-6 h-[2px] bg-accent rounded-full" />
            Genre
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-extrabold tracking-tight">
            {genreName || "Genre"}
          </h1>
          <p className="text-sm text-fg-secondary mt-2">
            {empty ? "No titles found in this genre" : "Browse movies & shows in this genre"}
          </p>
        </section>

        {empty ? (
          <div className="px-6 md:px-12 py-28 flex flex-col items-center justify-center text-center">
            <Film className="w-12 h-12 text-accent/70 mb-4" />
            <p className="text-sm text-fg-secondary">No titles found for this genre.</p>
            <Link href="/" className="mt-5 text-xs font-semibold text-accent hover:opacity-80 transition-opacity">
              &larr; Back to browsing
            </Link>
          </div>
        ) : (
          <div className="pb-16">
            <GenreSection
              title="Movies"
              genreId={genre}
              mediaType="movie"
              initialItems={movieData.results}
              totalPages={movieData.totalPages}
            />
            <GenreSection
              title="TV Shows"
              genreId={genre}
              mediaType="tv"
              initialItems={showData.results}
              totalPages={showData.totalPages}
            />
          </div>
        )}
      </div>
    );
  }

  // ── Default home dashboard ──
  // Fetch movie data parallelly using Promise.all for high performance!
  const [
    trendingMovies,
    trendingTV,
    newReleases,
    topRated,
    marvel,
    dc,
    bollywood,
    tollywood
  ] = await Promise.all([
    tmdb.getTrending("movie"),
    tmdb.getTrending("tv"),
    tmdb.getNewReleases("movie"),
    tmdb.getTopRated("movie"),
    tmdb.getByCompany("420|7505", "movie"),       // Marvel Studios / Marvel Entertainment
    tmdb.getByCompany("9993|429|128064", "movie"), // DC Entertainment / DC Comics / DC Films
    tmdb.getByLanguage("hi", "movie"),             // Bollywood (Hindi)
    tmdb.getByLanguage("te", "movie")              // Tollywood (Telugu)
  ]);

  // Fetch trailer keys for the hero slides so the banner can play them inline.
  const heroItems = trendingMovies.slice(0, 6);
  const heroTrailerKeys = await Promise.all(
    heroItems.map((m) => tmdb.getVideos(String(m.id), (m.media_type as "movie" | "tv") || "movie"))
  );
  const heroTrailers: Record<number, string | null> = {};
  heroItems.forEach((m, i) => { heroTrailers[m.id] = heroTrailerKeys[i]; });

  return (
    <div className="flex-1 w-full bg-bg pb-12 overflow-x-hidden">
      {/* Dynamic fixed navigation */}
      <Nav />

      {/* Dynamic Cinematic Hero Carousel */}
      <HeroCarousel items={trendingMovies} trailers={heroTrailers} />

      {/* Continuous Watch Progress Dashboard */}
      <ContinueWatching />

      {/* TMDb-powered dynamic carousels */}
      <MediaCarousel title="Trending Now" items={trendingMovies} mediaType="movie" badge="trend" source={{ kind: "trending", mediaType: "movie" }} />
      <MediaCarousel title="New Releases" items={newReleases} mediaType="movie" badge="new" source={{ kind: "newReleases", mediaType: "movie" }} />
      <MediaCarousel title="Popular TV Series" items={trendingTV} mediaType="tv" source={{ kind: "trending", mediaType: "tv" }} />
      <MediaCarousel title="Top Rated of All Time" items={topRated} mediaType="movie" badge="top" source={{ kind: "topRated", mediaType: "movie" }} />

      {/* Studio collections & regional cinema */}
      <MediaCarousel title="Marvel Universe" items={marvel} mediaType="movie" source={{ kind: "company", value: "420|7505", mediaType: "movie" }} />
      <MediaCarousel title="DC Universe" items={dc} mediaType="movie" source={{ kind: "company", value: "9993|429|128064", mediaType: "movie" }} />
      <MediaCarousel title="Bollywood" items={bollywood} mediaType="movie" source={{ kind: "language", value: "hi", mediaType: "movie" }} />
      <MediaCarousel title="Tollywood" items={tollywood} mediaType="movie" source={{ kind: "language", value: "te", mediaType: "movie" }} />

      {/* Stateful Filter Browse Grid */}
      <div className="w-full mt-10">
        <div className="px-6 md:px-12 mb-2">
          <h2 className="font-display text-lg md:text-xl font-bold tracking-tight text-fg">
            Explore Categories
          </h2>
        </div>
        <Suspense fallback={<div className="h-[300px] bg-surface/50 animate-pulse rounded-2xl mx-6 md:mx-12 animate-pulse" />}>
          <BrowseSection initialTrending={trendingMovies} />
        </Suspense>
      </div>

      {/* Sleek Footer */}
      <footer className="px-6 md:px-12 py-5 border-t border-border mt-12">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <span className="text-[11px] text-muted">&copy; 2026 Cinevo. All rights reserved.</span>
            <Link href="/privacy" className="text-[11px] text-muted hover:text-fg-secondary transition-colors">Privacy</Link>
            <Link href="/terms" className="text-[11px] text-muted hover:text-fg-secondary transition-colors">Terms</Link>
          </div>
          <img src="/full_logo.png" alt="Cinevo" className="h-6 w-auto opacity-90" />
        </div>
      </footer>
    </div>
  );
}
