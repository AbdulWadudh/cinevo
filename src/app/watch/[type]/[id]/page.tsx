/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Star, Film } from "lucide-react";
import { tmdb } from "@/lib/tmdb";
import Nav from "@/components/Nav";
import FloatingBackButton from "@/components/watch/FloatingBackButton";
import RadioAutoPause from "@/components/watch/RadioAutoPause";
import WatchProviders from "@/components/watch/WatchProviders";
import IframePlayer from "@/components/player/IframePlayer";
import TrackWatch from "@/components/watch/TrackWatch";
import CollectionRow from "@/components/watch/CollectionRow";
import WishlistButton from "@/components/wishlist/WishlistButton";
import { getSingleWatchProgress } from "@/app/actions/progress";
import { checkWishlistStatus } from "@/app/actions/wishlist";
import CastSection from "@/components/watch/CastSection";
import ShareButton from "@/components/watch/ShareButton";
import WishlistHeart from "@/components/wishlist/WishlistHeart";
import SeasonList from "@/components/watch/SeasonList";
import { site } from "@/config";

interface PageProps {
  params: Promise<{ type: string; id: string }>;
  searchParams: Promise<{ season?: string; episode?: string; t?: string; source?: string; sandbox?: string; theme?: string; preview?: string }>;
}

// Sets the browser tab title to "{Title} · <app>" via the layout template
// (getDetails is cached).
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { type, id } = await params;
  const mediaType: "movie" | "tv" = type === "tv" ? "tv" : "movie";
  const details = await tmdb.getDetails(id, mediaType);
  const title = details?.title || details?.name;
  if (!title) return { title: { absolute: site.name } };

  const description = details?.overview?.slice(0, 200) || `Stream on ${site.name}.`;
  const image = details?.backdrop_path
    ? `https://image.tmdb.org/t/p/w1280${details.backdrop_path}`
    : details?.poster_path
      ? `https://image.tmdb.org/t/p/w780${details.poster_path}`
      : undefined;

  return {
    title,
    description,
    openGraph: {
      title: `${title} · ${site.name}`,
      description,
      type: mediaType === "tv" ? "video.tv_show" : "video.movie",
      images: image ? [image] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} · ${site.name}`,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function WatchPage({ params, searchParams }: PageProps) {
  const { type, id } = await params;
  const search = await searchParams;

  const season = search.season ? parseInt(search.season) : 1;
  const episode = search.episode ? parseInt(search.episode) : 1;
  const queryTime = search.t ? parseInt(search.t) : undefined;
  // `?preview=1` — opened to look at someone else's title (from the admin Users
  // panel), so nothing here should land in the viewer's own watch history.
  const preview = search.preview === "1";
  // Provider selection and sandbox state are resolved client-side once the
  // provider list loads (from localStorage / DB). We just forward the raw
  // ?source= key and explicit ?sandbox= preference (if any).
  const initialSourceKey = search.source;
  // Sandbox mode from the URL, with backward-compat for old on/off links.
  const sb = search.sandbox;
  const initialSandbox: "strict" | "balanced" | "off" | undefined =
    sb === "strict" || sb === "balanced" || sb === "off"
      ? sb
      : sb === "on"
        ? "strict"
        : undefined;

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
    watchProviders
  ] = await Promise.all([
    tmdb.getDetails(id, mediaType),
    tmdb.getCast(id, mediaType),
    tmdb.getSimilar(id, mediaType),
    getSingleWatchProgress(id, mediaType, isTV ? season : undefined, isTV ? episode : undefined),
    checkWishlistStatus(id, mediaType),
    tmdb.getWatchProviders(id, mediaType, isTV ? season : undefined)
  ]);

  if (!details) {
    return (
      <div className="flex-1 w-full bg-bg min-h-screen flex flex-col items-center justify-center text-center p-6">
        <Film className="w-16 h-16 text-accent mb-4 animate-bounce" />
        <h1 className="text-2xl font-bold font-display mb-2">Content Not Found</h1>
        <p className="text-sm text-fg-secondary mb-6">The requested title details could not be loaded from our database.</p>
        <Link href="/" className="bg-accent-strong text-white px-6 py-3 rounded-lg font-semibold hover:bg-accent-strong-hover transition-colors">
          Return Home
        </Link>
      </div>
    );
  }

  // Resolve initial playback timestamp (prioritize URL query, fallback to Prisma watch progress, default to 0)
  const savedProgress = progressRes.success && progressRes.data ? progressRes.data.progress : 0;
  const initialTime = queryTime !== undefined ? queryTime : savedProgress;

  // Full release date in moment's "ll" style (e.g. "Jun 2, 2026"); falls back
  // to just the year, then empty. Formatted in UTC to avoid off-by-one shifts.
  const rawReleaseDate = details.release_date || details.first_air_date || "";
  const releaseDateText = rawReleaseDate
    ? new Date(rawReleaseDate).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    })
    : "";

  const durationText = isTV
    ? `${details.number_of_seasons} Seasons`
    : details.runtime
      ? `${Math.floor(details.runtime / 60)}h ${details.runtime % 60}m`
      : "";
  const theme = search.theme;

  const bgGradientClass =
    theme === "marvel" ? "bg-[#0c0202] bg-linear-to-b from-red-600/10 to-transparent" :
      theme === "dc" ? "bg-[#02060b] bg-linear-to-b from-sky-600/12 to-transparent" :
        theme === "hbo" ? "bg-[#090b0d] bg-linear-to-b from-slate-500/10 to-transparent" :
          theme === "animation" ? "bg-[#06020a] bg-linear-to-b from-purple-600/12 to-transparent" :
            theme === "bollywood" ? "bg-[#0a0702] bg-linear-to-b from-amber-600/10 to-transparent" :
              "bg-bg";

  // Border and hover accents only — the pill's own translucent background is
  // what keeps it legible over the player, and a second `bg-*` here would
  // compete with it unpredictably.
  const backButtonBorderClass =
    theme === "marvel" ? "border-red-500/25 hover:border-red-500/50 hover:text-red-400" :
      theme === "dc" ? "border-sky-500/25 hover:border-sky-500/50 hover:text-sky-400" :
        theme === "hbo" ? "border-white/12 hover:border-white/25 hover:text-white" :
          theme === "animation" ? "border-purple-500/25 hover:border-purple-500/50 hover:text-purple-400" :
            theme === "bollywood" ? "border-amber-500/25 hover:border-amber-500/50 hover:text-amber-400" :
              "";

  const tagHoverClass =
    theme === "marvel" ? "hover:border-red-500 hover:text-red-500" :
      theme === "dc" ? "hover:border-sky-400 hover:text-sky-400" :
        theme === "hbo" ? "hover:border-white hover:text-white" :
          theme === "animation" ? "hover:border-purple-400 hover:text-purple-400" :
            theme === "bollywood" ? "hover:border-amber-500 hover:text-amber-500" :
              "hover:border-accent hover:text-accent";

  return (
    <div className={`flex-1 w-full pb-16 overflow-x-hidden ${bgGradientClass}`}>
      {/* Scroll responsive transparent nav */}
      <Nav />

      {/* Embedded Iframe Player Container (relative z-20 so the player's source/season/
          episode dropdowns render above the metadata section below) */}
      <FloatingBackButton accentClass={backButtonBorderClass} />
      <RadioAutoPause />

      <section className="relative z-20 w-full px-3 pt-16 sm:px-6 md:px-12 md:pt-18">

        {/* Records this view into the user's watch history (no-op when signed
            out, and no-op in preview — see `?preview=1` above) */}
        <TrackWatch
          mediaId={id}
          mediaType={mediaType}
          title={details.title || details.name || ""}
          posterPath={details.poster_path || details.backdrop_path || undefined}
          season={isTV ? season : undefined}
          episode={isTV ? episode : undefined}
          preview={preview}
        />

        {/* Sandboxed Video Player Component */}
        <IframePlayer
          mediaId={id}
          mediaType={mediaType}
          title={details.title || details.name || ""}
          posterPath={details.backdrop_path || details.poster_path || undefined}
          season={isTV ? season : undefined}
          episode={isTV ? episode : undefined}
          initialProgress={initialTime}
          initialSourceKey={initialSourceKey}
          initialSandbox={initialSandbox}
          seasons={isTV && details.seasons ? (details.seasons as any[]).filter((s: any) => s.season_number > 0) : undefined}
          runtimeMinutes={details.runtime || undefined}
          preview={preview}
        />
      </section>

      {/* Content & Metadata Layout — the `main` landmark lives in the root layout. */}
      <div className="px-6 md:px-12 pt-8">
        <h1 className="font-display text-3xl md:text-5xl font-extrabold leading-tight tracking-tight mb-4">
          {details.title || details.name}
        </h1>

        <div className="flex items-center gap-3 text-xs sm:text-sm font-semibold mb-6 flex-wrap">
          <span className="bg-gold text-black font-extrabold px-2.5 py-0.75 rounded flex items-center gap-1 shadow-sm">
            <Star className="w-3.5 h-3.5 fill-black stroke-black" />
            {details.vote_average ? details.vote_average.toFixed(1) : "N/A"}
          </span>
          <span className="text-fg-secondary">{releaseDateText}</span>
          <span>&bull;</span>
          <span className="text-fg-secondary">{durationText}</span>
        </div>

        {/* Genres Tags */}
        <div className="flex gap-2 flex-wrap mb-6">
          {details.genres.map((g) => (
            <Link
              key={g.id}
              href={`/?genre=${g.id}&genreName=${encodeURIComponent(g.name)}`}
              className={`px-3.5 py-1 rounded-full text-xs font-semibold bg-surface border border-border text-fg-secondary transition-colors cursor-pointer ${tagHoverClass}`}
            >
              {g.name}
            </Link>
          ))}
        </div>

        <p className="text-sm md:text-base text-fg-secondary leading-relaxed max-w-3xl mb-6">
          {details.overview}
        </p>

        {/* My List, Share and Where to watch — all inline */}
        <div className="flex items-center gap-3 flex-wrap">
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
          <WatchProviders providers={watchProviders} bare />
        </div>
      </div>

      {/* Dynamic Seasons & Episodes List matching reference */}
      {isTV && details.seasons && (
        <SeasonList
          seriesId={id}
          seasons={details.seasons as any}
          currentSeason={season}
          currentEpisode={episode}
          backdropPath={details.backdrop_path}
          preview={preview}
        />
      )}

      {/* Interactive Cast Section showing Person Filmographies */}
      <CastSection cast={cast} />

      {/* Franchise / collection row (movies that belong to a collection) */}
      {!isTV && details.belongs_to_collection && (
        <section className="px-6 md:px-12 pt-12">
          <CollectionRow
            collectionId={details.belongs_to_collection.id}
            name={details.belongs_to_collection.name}
          />
        </section>
      )}

      {/* Similar Titles */}
      {similar.length > 0 && (
        <section className="px-6 md:px-12 pt-12">
          <h2 className="font-display text-xl md:text-2xl font-bold mb-5">More Like This</h2>
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x">
            {similar.slice(0, 24).map((m) => (
              <div
                key={m.id}
                className="flex-none w-32.5 sm:w-40 snap-start group"
              >
                <Link href={`/watch/${m.media_type || mediaType}/${m.id}`} className="block cursor-pointer">
                  <div className="relative w-full aspect-2/3 rounded-lg overflow-hidden bg-surface border border-white/4">
                    <Image
                      src={m.poster_path ? `https://image.tmdb.org/t/p/w300${m.poster_path}` : "https://picsum.photos/seed/similar/300/450"}
                      alt={m.title || m.name || ""}
                      fill
                      sizes="(max-width: 640px) 130px, 160px"
                      className="object-cover transition duration-400 group-hover:scale-105"
                    />
                    <WishlistHeart item={m} mediaType={mediaType} />
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
