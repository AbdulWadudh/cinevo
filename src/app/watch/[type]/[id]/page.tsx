import React from "react";
import Link from "next/link";
import { Star, ArrowLeft, Film } from "lucide-react";
import { tmdb } from "@/lib/tmdb";
import Nav from "@/components/Nav";
import IframePlayer from "@/components/player/IframePlayer";
import { sourceIndexFromKey, SOURCE_KEYS } from "@/lib/sources";
import WishlistButton from "@/components/wishlist/WishlistButton";
import { getSingleWatchProgress } from "@/app/actions/progress";
import { checkWishlistStatus } from "@/app/actions/wishlist";
import CastSection from "@/components/watch/CastSection";
import ShareButton from "@/components/watch/ShareButton";
import TrailerPlayer from "@/components/watch/TrailerPlayer";
import SeasonList from "@/components/watch/SeasonList";

interface PageProps {
  params: Promise<{ type: string; id: string }>;
  searchParams: Promise<{ season?: string; episode?: string; t?: string; source?: string; sandbox?: string }>;
}

export default async function WatchPage({ params, searchParams }: PageProps) {
  const { type, id } = await params;
  const search = await searchParams;

  const season = search.season ? parseInt(search.season) : 1;
  const episode = search.episode ? parseInt(search.episode) : 1;
  const queryTime = search.t ? parseInt(search.t) : undefined;
  const initialSource = sourceIndexFromKey(search.source); // by name, defaults to VidCore
  // Sandbox defaults ON for every source except VidCore; an explicit ?sandbox= wins.
  const sandboxDisabled = search.sandbox
    ? search.sandbox === "off"
    : SOURCE_KEYS[initialSource] === "vidcore";

  // Verify parameters
  const isTV = type === "tv";
  const mediaType: "movie" | "tv" = isTV ? "tv" : "movie";

  // Fetch details, cast, similar movies, progress, and wishlist parallelly!
  const [
    details,
    cast,
    similar,
    progressRes,
    wishlistRes,
    trailerKey
  ] = await Promise.all([
    tmdb.getDetails(id, mediaType),
    tmdb.getCast(id, mediaType),
    tmdb.getSimilar(id, mediaType),
    getSingleWatchProgress(id, mediaType, isTV ? season : undefined, isTV ? episode : undefined),
    checkWishlistStatus(id, mediaType),
    tmdb.getVideos(id, mediaType)
  ]);

  if (!details) {
    return (
      <div className="flex-1 w-full bg-bg min-h-screen flex flex-col items-center justify-center text-center p-6">
        <Film className="w-16 h-16 text-accent mb-4 animate-bounce" />
        <h1 className="text-2xl font-bold font-display mb-2">Content Not Found</h1>
        <p className="text-sm text-fg-secondary mb-6">The requested title details could not be loaded from our database.</p>
        <Link href="/" className="bg-accent text-white px-6 py-3 rounded-lg font-semibold hover:bg-accent-hover transition-colors">
          Return Home
        </Link>
      </div>
    );
  }

  // Resolve initial playback timestamp (prioritize URL query, fallback to Prisma watch progress, default to 0)
  const savedProgress = progressRes.success && progressRes.data ? progressRes.data.progress : 0;
  const initialTime = queryTime !== undefined ? queryTime : savedProgress;

  const releaseYear = details.release_date 
    ? details.release_date.split("-")[0] 
    : details.first_air_date 
      ? details.first_air_date.split("-")[0] 
      : "";

  const durationText = isTV 
    ? `${details.number_of_seasons} Seasons` 
    : details.runtime 
      ? `${Math.floor(details.runtime / 60)}h ${details.runtime % 60}m` 
      : "";

  return (
    <div className="flex-1 w-full bg-bg pb-16 overflow-x-hidden">
      {/* Scroll responsive transparent nav */}
      <Nav />

      {/* Embedded Iframe Player Container */}
      <section className="pt-[72px] w-full px-0 sm:px-6 md:px-12">
        <div className="mb-4 hidden sm:flex items-center gap-2">
          <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-fg-secondary bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] hover:text-fg px-3.5 py-2 rounded-lg transition-all">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Browse</span>
          </Link>
        </div>

        {/* Sandboxed Video Player Component */}
        <IframePlayer
          mediaId={id}
          mediaType={mediaType}
          title={details.title || details.name || ""}
          posterPath={details.backdrop_path || details.poster_path || undefined}
          season={isTV ? season : undefined}
          episode={isTV ? episode : undefined}
          initialProgress={initialTime}
          initialSource={initialSource}
          sandboxDisabled={sandboxDisabled}
          seasons={isTV && details.seasons ? (details.seasons as any[]).filter((s: any) => s.season_number > 0) : undefined}
        />
      </section>

      {/* Content & Metadata Layout */}
      <main className="px-6 md:px-12 pt-8 grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-8 lg:gap-12">
        <div>
          <h1 className="font-display text-3xl md:text-5xl font-extrabold leading-tight tracking-tight mb-4">
            {details.title || details.name}
          </h1>

          <div className="flex items-center gap-2.5 flex-wrap mb-4 text-xs sm:text-sm font-medium">
            <span className="bg-gold text-black font-extrabold px-2.5 py-[3px] rounded flex items-center gap-1 shadow-sm">
              <Star className="w-3.5 h-3.5 fill-black stroke-black" />
              {details.vote_average ? details.vote_average.toFixed(1) : "N/A"}
            </span>
            <span className="text-fg-secondary">{releaseYear}</span>
            <span>&bull;</span>
            <span className="text-fg-secondary">{durationText}</span>
          </div>

          {/* Genres Tags */}
          <div className="flex gap-2 flex-wrap mb-6">
            {details.genres.map((g) => (
              <Link 
                key={g.id} 
                href={`/?genre=${g.id}&genreName=${encodeURIComponent(g.name)}`}
                className="px-3.5 py-1 rounded-full text-xs font-semibold bg-surface border border-border text-fg-secondary hover:border-accent hover:text-accent transition-colors cursor-pointer"
              >
                {g.name}
              </Link>
            ))}
          </div>

          <p className="text-sm md:text-base text-fg-secondary leading-relaxed mb-6 max-w-2xl">
            {details.overview}
          </p>

          {/* Action buttons (Optimistic Wishlist + Download/Share) */}
          <div className="flex gap-2.5 flex-wrap mb-10">
            <WishlistButton
              mediaId={id}
              mediaType={mediaType}
              title={details.title || details.name || ""}
              posterPath={details.poster_path || undefined}
              rating={details.vote_average}
              releaseDate={details.release_date || details.first_air_date || undefined}
              initialExists={wishlistRes.exists}
            />

            <ShareButton title={details.title || details.name || ""} />
          </div>
        </div>

        {/* Sidebar: Trailer */}
        <div className="pt-2 border-t lg:border-t-0 lg:border-l border-border lg:pl-8">
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted mb-2.5">Trailer</div>
          <TrailerPlayer
            trailerKey={trailerKey}
            poster={details.backdrop_path ? `https://image.tmdb.org/t/p/w780${details.backdrop_path}` : undefined}
            title={details.title || details.name || ""}
          />
        </div>
      </main>

      {/* Dynamic Seasons & Episodes List matching reference */}
      {isTV && details.seasons && (
        <SeasonList
          seriesId={id}
          seasons={details.seasons as any}
          currentSeason={season}
          currentEpisode={episode}
          backdropPath={details.backdrop_path}
        />
      )}

      {/* Interactive Cast Section showing Person Filmographies */}
      <CastSection cast={cast} />

      {/* Similar Titles */}
      {similar.length > 0 && (
        <section className="px-6 md:px-12 pt-12">
          <h2 className="font-display text-xl md:text-2xl font-bold mb-5">More Like This</h2>
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x">
            {similar.slice(0, 24).map((m) => (
              <div 
                key={m.id}
                className="flex-none w-[130px] sm:w-[160px] snap-start group"
              >
                <Link href={`/watch/${m.media_type || mediaType}/${m.id}`} className="block cursor-pointer">
                  <div className="relative w-full aspect-[2/3] rounded-lg overflow-hidden bg-surface border border-white/[0.04]">
                    <img 
                      src={m.poster_path ? `https://image.tmdb.org/t/p/w300${m.poster_path}` : "https://picsum.photos/seed/similar/300/450"} 
                      alt={m.title || m.name} 
                      className="w-full h-full object-cover transition duration-400 group-hover:scale-105"
                      loading="lazy"
                    />
                  </div>
                  <div className="pt-2 px-0.5">
                    <div className="text-xs font-semibold truncate text-fg group-hover:text-accent transition-colors">{m.title || m.name}</div>
                    <div className="text-[10px] text-muted mt-0.5">
                      {m.release_date ? m.release_date.split("-")[0] : m.first_air_date ? m.first_air_date.split("-")[0] : ""}
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
