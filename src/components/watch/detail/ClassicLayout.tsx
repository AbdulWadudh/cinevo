import Link from "next/link";
import { Star } from "lucide-react";
import IframePlayer from "@/components/player/IframePlayer";
import CastSection from "@/components/watch/CastSection";
import CollectionRow from "@/components/watch/CollectionRow";
import SeasonList from "@/components/watch/SeasonList";
import DetailActions from "./DetailActions";
import DetailChrome from "./DetailChrome";
import SimilarTitles from "./SimilarTitles";
import { fullDateOf, runtimeOf, titleOf } from "./format";
import type { DetailLayoutProps } from "./types";

export default function ClassicLayout({
  details,
  cast,
  similar,
  watchProviders,
  mediaId,
  mediaType,
  season,
  episode,
  preview,
  initialTime,
  initialSourceKey,
  initialSandbox,
  wishlistExists,
  bgGradientClass,
  backButtonBorderClass,
  tagHoverClass,
}: DetailLayoutProps) {
  const isTV = mediaType === "tv";
  const title = titleOf(details);
  const seasons = isTV && details.seasons ? details.seasons.filter((item) => item.season_number > 0) : [];
  const durationText = isTV
    ? `${details.number_of_seasons} Seasons`
    : runtimeOf(details);

  return (
    <div className={`relative flex-1 w-full overflow-x-hidden pb-16 ${bgGradientClass}`}>
      <DetailChrome
        mediaId={mediaId}
        mediaType={mediaType}
        title={title}
        posterPath={details.poster_path || details.backdrop_path || undefined}
        season={isTV ? season : undefined}
        episode={isTV ? episode : undefined}
        preview={preview}
        backButtonBorderClass={backButtonBorderClass}
      />

      <section className="relative z-20 w-full px-3 pt-16 sm:px-6 md:px-12 md:pt-18">
        <IframePlayer
          mediaId={mediaId}
          mediaType={mediaType}
          title={title}
          posterPath={details.backdrop_path || details.poster_path || undefined}
          season={isTV ? season : undefined}
          episode={isTV ? episode : undefined}
          initialProgress={initialTime}
          initialSourceKey={initialSourceKey}
          initialSandbox={initialSandbox}
          seasons={isTV && seasons.length ? seasons : undefined}
          runtimeMinutes={details.runtime || undefined}
          preview={preview}
        />
      </section>

      <div className="px-6 md:px-12 pt-8">
        <h1 className="font-display text-3xl md:text-5xl font-extrabold leading-tight tracking-tight mb-4">
          {title}
        </h1>

        <div className="flex items-center gap-3 text-xs sm:text-sm font-semibold mb-6 flex-wrap">
          <span className="bg-gold text-black font-extrabold px-2.5 py-0.75 rounded flex items-center gap-1 shadow-sm">
            <Star className="w-3.5 h-3.5 fill-black stroke-black" />
            {details.vote_average ? details.vote_average.toFixed(1) : "N/A"}
          </span>
          {fullDateOf(details) && <span className="text-fg-secondary">{fullDateOf(details)}</span>}
          {durationText && (
            <>
              <span>&bull;</span>
              <span className="text-fg-secondary">{durationText}</span>
            </>
          )}
        </div>

        <div className="flex gap-2 flex-wrap mb-6">
          {details.genres.map((genre) => (
            <Link
              key={genre.id}
              href={`/?genre=${genre.id}&genreName=${encodeURIComponent(genre.name)}`}
              className={`px-3.5 py-1 rounded-full text-xs font-semibold bg-surface border border-border text-fg-secondary transition-colors cursor-pointer ${tagHoverClass}`}
            >
              {genre.name}
            </Link>
          ))}
        </div>

        <p className="text-sm md:text-base text-fg-secondary leading-relaxed max-w-3xl mb-6">
          {details.overview}
        </p>

        <DetailActions
          details={details}
          mediaId={mediaId}
          mediaType={mediaType}
          watchProviders={watchProviders}
          wishlistExists={wishlistExists}
          className="gap-3"
        />
      </div>

      {isTV && seasons.length > 0 && (
        <SeasonList
          seriesId={mediaId}
          seasons={seasons}
          currentSeason={season}
          currentEpisode={episode}
          backdropPath={details.backdrop_path}
          preview={preview}
        />
      )}

      <CastSection cast={cast} />

      {!isTV && details.belongs_to_collection && (
        <section className="px-6 md:px-12 pt-12">
          <CollectionRow
            collectionId={details.belongs_to_collection.id}
            name={details.belongs_to_collection.name}
          />
        </section>
      )}

      <SimilarTitles items={similar} mediaType={mediaType} />
    </div>
  );
}
