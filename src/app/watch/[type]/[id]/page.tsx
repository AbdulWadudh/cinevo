/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Film } from "lucide-react";
import { tmdb } from "@/lib/tmdb";
import RadioAutoPause from "@/components/watch/RadioAutoPause";
import IframePlayer from "@/components/player/IframePlayer";
import TrackWatch from "@/components/watch/TrackWatch";
import { getSingleWatchProgress } from "@/app/actions/progress";
import { checkWishlistStatus } from "@/app/actions/wishlist";
import DetailPage, { type DetailVariant } from "@/components/experience/DetailPage";
import {
  ClassicLayout,
  ConsoleLayout,
  DossierLayout,
  StageLayout,
} from "@/components/watch/detail";
import { getActiveThemeState } from "@/lib/theme/active";
import { site } from "@/config";

interface PageProps {
  params: Promise<{ type: string; id: string }>;
  searchParams: Promise<{ season?: string; episode?: string; t?: string; source?: string; sandbox?: string; theme?: string; preview?: string; view?: string }>;
}

const LAYOUT_COMPONENTS = {
  classic: ClassicLayout,
  stage: StageLayout,
  dossier: DossierLayout,
  console: ConsoleLayout,
} as const;

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

  // Fetch details, similar titles, progress, providers and the theme in parallel.
  const [
    details,
    similar,
    progressRes,
    wishlistRes,
    watchProviders,
    themeState,
  ] = await Promise.all([
    tmdb.getDetails(id, mediaType),
    tmdb.getSimilar(id, mediaType),
    getSingleWatchProgress(id, mediaType, isTV ? season : undefined, isTV ? episode : undefined),
    checkWishlistStatus(id, mediaType),
    tmdb.getWatchProviders(id, mediaType, isTV ? season : undefined),
    getActiveThemeState(),
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

  // `getDetails` now carries the credits, so the separate /credits round-trip is
  // gone. `CastSection` does its own trimming.
  const cast = details.credits?.cast ?? [];
  const theme = search.theme;

  // Console tabs are server-rendered `?view=` links; every other query key has
  // to survive the hop or the player would reset its season, provider or time.
  const tabParams = new URLSearchParams();
  for (const key of ["season", "episode", "t", "source", "sandbox", "theme", "preview"] as const) {
    const value = search[key];
    if (value) tabParams.set(key, value);
  }
  const tabQuery = tabParams.toString();

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

  // The clone experiences get their own title page: service-native backdrop,
  // actions and metadata, then episodes / More Like This / About. Cinevo keeps
  // the layout below untouched.
  if (themeState.experience !== "cinevo") {
    return (
      <DetailPage
        variant={themeState.experience as DetailVariant}
        details={details}
        cast={cast}
        similar={similar}
        mediaId={id}
        mediaType={mediaType}
        season={season}
        episode={episode}
        preview={preview}
        wishlistExists={wishlistRes.exists}
      >
        <RadioAutoPause />
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
      </DetailPage>
    );
  }

  const Layout = LAYOUT_COMPONENTS[themeState.detailLayout];

  return (
    <Layout
      details={details}
      cast={cast}
      similar={similar}
      watchProviders={watchProviders}
      mediaId={id}
      mediaType={mediaType}
      season={season}
      episode={episode}
      preview={preview}
      initialTime={initialTime}
      initialSourceKey={initialSourceKey}
      initialSandbox={initialSandbox}
      wishlistExists={wishlistRes.exists}
      tabQuery={tabQuery}
      view={search.view ?? "story"}
      bgGradientClass={bgGradientClass}
      backButtonBorderClass={backButtonBorderClass}
      tagHoverClass={tagHoverClass}
    />
  );
}
