import React, { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft, Film } from "lucide-react";
import Nav from "@/components/Nav";
import PersonalHub from "@/components/dashboard/PersonalHub";
import DailyFive from "@/components/dashboard/DailyFive";
import MediaCarousel from "@/components/dashboard/MediaCarousel";
import BrowseSection from "@/components/dashboard/BrowseSection";
import GenreSection from "@/components/dashboard/GenreSection";
import HeroCarousel from "@/components/dashboard/HeroCarousel";
import StudioHubs from "@/components/dashboard/StudioHubs";
import TopTenRow from "@/components/dashboard/TopTenRow";
import BrandRail from "@/components/dashboard/BrandRail";
import ExperienceFooter from "@/components/dashboard/ExperienceFooter";
import Billboard from "@/components/experience/Billboard";
import { tmdb, type TMDBMedia } from "@/lib/tmdb";
import { getActiveThemeState } from "@/lib/theme/active";

interface HomeProps {
  searchParams: Promise<{
    genre?: string;
    genreName?: string;
    company?: string;
    companyName?: string;
    language?: string;
    languageName?: string;
    theme?: string;
  }>;
}

function dailyScore(value: string) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash = Math.imul(hash ^ value.charCodeAt(i), 16777619);
  }
  return hash >>> 0;
}

export default async function Home({ searchParams }: HomeProps) {
  const { genre, genreName, company, companyName, language, languageName, theme } = await searchParams;

  const isBrowseMode = genre || company || language;

  // ── Unified Category/Franchise/Language browse view ──
  if (isBrowseMode) {
    let movieItems: TMDBMedia[] = [];
    let tvItems: TMDBMedia[] = [];
    let totalPages = 1;
    let title = "Browse";
    let subtitle = "Explore titles";

    if (genre) {
      const [movieData, showData] = await Promise.all([
        tmdb.getByGenrePaged(genre, "movie", 1),
        tmdb.getByGenrePaged(genre, "tv", 1),
      ]);
      movieItems = movieData.results;
      tvItems = showData.results;
      totalPages = Math.max(movieData.totalPages, showData.totalPages);
      title = genreName || "Genre";
      subtitle = "Browse movies & shows in this category";
    } else if (company) {
      const [moviesData, tvShowsData] = await Promise.all([
        tmdb.fetchMediaPage({ kind: "company", value: company, mediaType: "movie" }, 1),
        tmdb.fetchMediaPage({ kind: "company", value: company, mediaType: "tv" }, 1),
      ]);
      movieItems = moviesData.results;
      tvItems = tvShowsData.results;
      totalPages = Math.max(moviesData.totalPages, tvShowsData.totalPages);
      title = companyName || "Studio";
      subtitle = `Popular releases from ${companyName || "production studios"}`;
    } else if (language) {
      const [moviesData, tvShowsData] = await Promise.all([
        tmdb.fetchMediaPage({ kind: "language", value: language, mediaType: "movie" }, 1),
        tmdb.fetchMediaPage({ kind: "language", value: language, mediaType: "tv" }, 1),
      ]);
      movieItems = moviesData.results;
      tvItems = tvShowsData.results;
      totalPages = Math.max(moviesData.totalPages, tvShowsData.totalPages);
      title = languageName || "Language";
      subtitle = `Popular releases in ${languageName || "this language"}`;
    }

    const empty = movieItems.length === 0 && tvItems.length === 0;

    const bgGradientClass = 
      theme === "marvel" ? "bg-[#0c0202] bg-linear-to-b from-red-600/10 to-transparent" :
      theme === "dc" ? "bg-[#02060b] bg-linear-to-b from-sky-600/12 to-transparent" :
      theme === "hbo" ? "bg-[#090b0d] bg-linear-to-b from-slate-500/10 to-transparent" :
      theme === "animation" ? "bg-[#06020a] bg-linear-to-b from-purple-600/12 to-transparent" :
      theme === "bollywood" ? "bg-[#0a0702] bg-linear-to-b from-amber-600/10 to-transparent" :
      "bg-bg";

    const accentBorderClass = 
      theme === "marvel" ? "border-red-500/20 hover:border-red-500/40 hover:text-red-500 hover:bg-red-500/5 bg-red-950/10 text-fg-secondary" :
      theme === "dc" ? "border-sky-500/20 hover:border-sky-500/40 hover:text-sky-450 hover:bg-sky-950/10 bg-sky-950/10 text-fg-secondary" :
      theme === "hbo" ? "border-white/10 hover:border-white/20 hover:text-white hover:bg-white/5 bg-white/5 text-fg-secondary" :
      theme === "animation" ? "border-purple-500/20 hover:border-purple-500/40 hover:text-purple-400 hover:bg-purple-950/10 bg-purple-950/10 text-fg-secondary" :
      theme === "bollywood" ? "border-amber-500/20 hover:border-amber-500/40 hover:text-amber-550 hover:bg-amber-950/10 bg-amber-950/10 text-fg-secondary" :
      "border-white/[0.06] hover:border-accent/40 hover:text-fg hover:bg-white/[0.08] bg-white/[0.04] text-fg-secondary";

    const headerTextClass = 
      theme === "marvel" ? "text-red-500" :
      theme === "dc" ? "text-sky-400" :
      theme === "hbo" ? "text-slate-100" :
      theme === "animation" ? "text-purple-400" :
      theme === "bollywood" ? "text-amber-500" :
      "text-fg";

    const dotClass = 
      theme === "marvel" ? "bg-red-500" :
      theme === "dc" ? "bg-sky-400" :
      theme === "hbo" ? "bg-white" :
      theme === "animation" ? "bg-purple-400" :
      theme === "bollywood" ? "bg-amber-500" :
      "bg-accent-strong";

    return (
      <div className={`flex-1 w-full pb-12 overflow-x-hidden ${bgGradientClass}`}>
        <Nav />

        <section className="pt-32 md:pt-40 px-6 md:px-12 mb-8">
          <Link
            href="/"
            className={`fixed top-[76px] md:top-[96px] left-6 md:left-12 z-30 inline-flex items-center gap-1.5 text-xs border px-3.5 py-2 rounded-lg transition-all shadow-md backdrop-blur-md bg-bg/80 cursor-pointer ${accentBorderClass}`}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Home</span>
          </Link>
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-fg-secondary mb-2">
            <span className={`w-6 h-0.5 rounded-full ${dotClass}`} />
            {theme ? "Collection" : "Genre"}
          </div>
          <h1 className={`font-display text-4xl md:text-5xl font-extrabold tracking-tight ${headerTextClass}`}>
            {title}
          </h1>
          <p className="text-sm text-fg-secondary mt-2">
            {empty ? "No titles found in this category" : subtitle}
          </p>
        </section>

        {empty ? (
          <div className="px-6 md:px-12 py-28 flex flex-col items-center justify-center text-center">
            <Film className="w-12 h-12 text-accent/70 mb-4" />
            <p className="text-sm text-fg-secondary">No titles found.</p>
            <Link href="/" className="mt-5 text-xs font-semibold text-accent hover:opacity-80 transition-opacity">
              &larr; Back to browsing
            </Link>
          </div>
        ) : (
          <div className="pb-16">
            <GenreSection
              title="Movies"
              source={
                genre ? { kind: "genre", value: genre, mediaType: "movie" } :
                  company ? { kind: "company", value: company, mediaType: "movie" } :
                    { kind: "language", value: language!, mediaType: "movie" }
              }
              initialItems={movieItems}
              totalPages={totalPages}
            />
            <GenreSection
              title="TV Shows"
              source={
                genre ? { kind: "genre", value: genre, mediaType: "tv" } :
                  company ? { kind: "company", value: company, mediaType: "tv" } :
                    { kind: "language", value: language!, mediaType: "tv" }
              }
              initialItems={tvItems}
              totalPages={totalPages}
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
    airingToday,
    marvel,
    dc,
    bollywood
  ] = await Promise.all([
    tmdb.getTrending("movie"),
    tmdb.getTrending("tv"),
    tmdb.getAiringToday(),                          // TV series airing today
    tmdb.getByCompany("420|7505", "movie"),       // Marvel Studios / Marvel Entertainment
    tmdb.getByCompany("9993|429|128064", "movie"), // DC Entertainment / DC Comics / DC Films
    tmdb.getByLanguage("hi", "movie")              // Bollywood (Hindi)
  ]);

  // Fetch trailer keys for the hero slides so the banner can play them inline.
  const heroItems = trendingMovies.slice(0, 6);
  const heroTrailerKeys = await Promise.all(
    heroItems.map((m) => tmdb.getVideos(String(m.id), (m.media_type as "movie" | "tv") || "movie"))
  );
  const heroTrailers: Record<number, string | null> = {};
  heroItems.forEach((m, i) => { heroTrailers[m.id] = heroTrailerKeys[i]; });

  const day = new Date().toISOString().slice(0, 10);
  const dailyPool = [
    ...trendingMovies.slice(6).map((item) => ({ ...item, media_type: "movie" as const })),
    ...trendingTV.map((item) => ({ ...item, media_type: "tv" as const })),
  ].filter((item) => item.poster_path);
  const dailyPicks = dailyPool
    .map((item) => ({ item, score: dailyScore(`${day}:${item.media_type}:${item.id}`) }))
    .sort((a, b) => a.score - b.score)
    .slice(0, 5)
    .map(({ item }) => item);

  const { experience } = await getActiveThemeState();

  // ── Netflix shell ──
  // Same catalogue, different product: billboard, ranked row, landscape rails
  // and Netflix's footer instead of Cinevo's discovery widgets.
  if (experience === "netflix") {
    return (
      <div className="flex-1 w-full overflow-x-hidden bg-[#141414] pb-0">
        <Nav />
        <Billboard variant="netflix" items={trendingMovies} trailers={heroTrailers} />
        <TopTenRow items={trendingMovies} />
        <MediaCarousel title="Trending Now" items={trendingMovies} mediaType="movie" source={{ kind: "trending", mediaType: "movie" }} />
        <MediaCarousel title="Popular on Cinevo" items={trendingTV} mediaType="tv" source={{ kind: "trending", mediaType: "tv" }} />
        <MediaCarousel title="New Releases" items={airingToday} mediaType="tv" badge="new" source={{ kind: "airingToday", mediaType: "tv" }} />
        <MediaCarousel title="Action & Adventure" items={marvel} mediaType="movie" source={{ kind: "company", value: "420|7505", mediaType: "movie" }} />
        <MediaCarousel title="Sci-Fi & Fantasy" items={dc} mediaType="movie" source={{ kind: "company", value: "9993|429|128064", mediaType: "movie" }} />
        <MediaCarousel title="International Movies" items={bollywood} mediaType="movie" source={{ kind: "language", value: "hi", mediaType: "movie" }} />
        <ExperienceFooter />
      </div>
    );
  }

  // ── Disney+ Hotstar shell ──
  if (experience === "disney-hotstar") {
    return (
      <div className="flex-1 w-full overflow-x-hidden bg-[#0f1014] pb-0">
        <Nav />
        <Billboard variant="disney" items={trendingMovies} trailers={heroTrailers} />
        <BrandRail />
        <MediaCarousel title="Recommended For You" items={trendingMovies} mediaType="movie" source={{ kind: "trending", mediaType: "movie" }} />
        <MediaCarousel title="New on Cinevo" items={airingToday} mediaType="tv" badge="new" source={{ kind: "airingToday", mediaType: "tv" }} />
        <MediaCarousel title="Popular Series" items={trendingTV} mediaType="tv" source={{ kind: "trending", mediaType: "tv" }} />
        <MediaCarousel title="Superhero Universe" items={marvel} mediaType="movie" source={{ kind: "company", value: "420|7505", mediaType: "movie" }} />
        <MediaCarousel title="Cinevo Specials" items={bollywood} mediaType="movie" source={{ kind: "language", value: "hi", mediaType: "movie" }} />
        <ExperienceFooter />
      </div>
    );
  }

  // ── Apple TV+ shell ──
  if (experience === "apple-tv") {
    const acclaimed = [...trendingMovies, ...trendingTV]
      .filter((item) => item.vote_average > 0)
      .sort((a, b) => b.vote_average - a.vote_average)
      .slice(0, 18);

    return (
      <div className="flex-1 w-full overflow-x-hidden bg-black pb-0">
        <Nav />
        <Billboard variant="apple" items={trendingMovies} trailers={heroTrailers} />
        <MediaCarousel title="Cinevo Originals" items={trendingTV} mediaType="tv" source={{ kind: "trending", mediaType: "tv" }} />
        <MediaCarousel title="New Releases" items={trendingMovies} mediaType="movie" source={{ kind: "trending", mediaType: "movie" }} />
        <MediaCarousel title="Critically Acclaimed" items={acclaimed} mediaType="movie" />
        <MediaCarousel title="Coming Soon" items={airingToday} mediaType="tv" badge="new" source={{ kind: "airingToday", mediaType: "tv" }} />
        <ExperienceFooter />
      </div>
    );
  }

  return (
    <div className="flex-1 w-full bg-bg pb-12 overflow-x-hidden">
      {/* Dynamic fixed navigation */}
      <Nav />

      {/* Dynamic Cinematic Hero Carousel */}
      <HeroCarousel items={trendingMovies} trailers={heroTrailers} />

      <PersonalHub />

      <DailyFive items={dailyPicks} day={day} />

      {/* Branded Studios & Franchises portals */}
      <StudioHubs />

      {/* Interactive Explore (genre chips + carousel) — replaces the old Trending row */}
      <div className="w-full">
        <div className="px-6 md:px-12 mb-2">
          <h2 className="font-display text-lg md:text-xl font-bold tracking-tight text-fg">
            Explore Categories
          </h2>
        </div>
        <Suspense fallback={<div className="h-75 bg-surface/50 animate-pulse rounded-2xl mx-6 md:mx-12" />}>
          <BrowseSection initialTrending={trendingMovies} />
        </Suspense>
      </div>

      {/* TMDb-powered dynamic carousels */}
      <MediaCarousel title="Airing Today" items={airingToday} mediaType="tv" badge="new" source={{ kind: "airingToday", mediaType: "tv" }} />
      <MediaCarousel title="Popular TV Series" items={trendingTV} mediaType="tv" source={{ kind: "trending", mediaType: "tv" }} />

      {/* Studio collections & regional cinema */}
      <MediaCarousel title="Marvel Universe" items={marvel} mediaType="movie" source={{ kind: "company", value: "420|7505", mediaType: "movie" }} />
      <MediaCarousel title="DC Universe" items={dc} mediaType="movie" source={{ kind: "company", value: "9993|429|128064", mediaType: "movie" }} />
      <MediaCarousel title="Bollywood" items={bollywood} mediaType="movie" source={{ kind: "language", value: "hi", mediaType: "movie" }} />

      <ExperienceFooter />
    </div>
  );
}
