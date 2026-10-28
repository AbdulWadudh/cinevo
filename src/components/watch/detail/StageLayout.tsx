import Link from "next/link";
import { Star } from "lucide-react";
import IframePlayer from "@/components/player/IframePlayer";
import CastSection from "@/components/watch/CastSection";
import CollectionRow from "@/components/watch/CollectionRow";
import SeasonList from "@/components/watch/SeasonList";
import SplitText from "@/components/reactbits/SplitText";
import CountUp from "@/components/reactbits/CountUp";
import SpotlightCard from "@/components/reactbits/SpotlightCard";
import DetailActions from "./DetailActions";
import DetailChrome from "./DetailChrome";
import DetailFacts from "./DetailFacts";
import SimilarTitles from "./SimilarTitles";
import StageBackdrop from "./StageBackdrop";
import {
  backdropUrl,
  certificationOf,
  factsOf,
  keywordsOf,
  linksOf,
  runtimeOf,
  scoreOf,
  seasonsOf,
  stillsOf,
  titleOf,
  votesOf,
  yearOf,
} from "./format";
import type { DetailLayoutProps } from "./types";
import styles from "./StageLayout.module.css";

export default function StageLayout({
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
  const certificate = certificationOf(details);
  const facts = factsOf(details, isTV);
  const keywords = keywordsOf(details).slice(0, 10);
  const links = linksOf(details);
  const stills = stillsOf(details);
  const seasons = isTV && details.seasons ? details.seasons.filter((item) => item.season_number > 0) : [];
  const gallery = Array.from(
    new Set(
      [
        backdropUrl(details.backdrop_path || details.poster_path),
        ...stills.map((still) => `https://image.tmdb.org/t/p/w1280${still.file_path}`),
      ].filter(Boolean),
    ),
  );

  return (
    <div className={`relative flex-1 w-full overflow-x-hidden pb-20 ${bgGradientClass}`}>
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

      <section className={styles.hero}>
        {gallery.length > 0 && <StageBackdrop images={gallery} />}
        <div className={styles.scrim} aria-hidden="true" />
        <div className={styles.inner}>
          <div className={styles.copy}>
            <p className={styles.kicker}>
              {isTV ? "Cinevo series presentation" : "Cinevo feature presentation"}
            </p>

            <SplitText
              tag="h1"
              text={title}
              className={`${styles.title} justify-center text-center`}
              splitType="words, chars"
              effect="rise"
              delay={0.12}
              duration={1}
              staggerFrom="center"
              trigger="load"
              textAlign="center"
            />

            <div className={styles.meta}>
              {scoreOf(details) !== "NR" ? (
                <span className={styles.score}>
                  <Star className="h-3.5 w-3.5 fill-black stroke-black" />
                  <CountUp to={details.vote_average} decimals={1} duration={1.2} />
                </span>
              ) : (
                <span className={styles.score}>NR</span>
              )}
              {votesOf(details) > 0 && (
                <span className={styles.votes}>
                  <CountUp to={votesOf(details)} format="compact" duration={1.4} /> votes
                </span>
              )}
              {certificate && <span className={styles.chip}>{certificate}</span>}
              {yearOf(details) && <span>{yearOf(details)}</span>}
              <span>{isTV ? seasonsOf(details) : runtimeOf(details)}</span>
            </div>

            {details.tagline && <p className={styles.tagline}>{details.tagline}</p>}
            <p className={styles.overview}>{details.overview}</p>

            <div className={`${styles.genres} justify-center`}>
              {details.genres.map((genre) => (
                <Link
                  key={genre.id}
                  href={`/?genre=${genre.id}&genreName=${encodeURIComponent(genre.name)}`}
                  className={`rounded-full border border-border bg-surface px-3.5 py-1 text-xs font-semibold text-fg-secondary transition-colors ${tagHoverClass}`}
                >
                  {genre.name}
                </Link>
              ))}
            </div>

            <DetailActions
              details={details}
              mediaId={mediaId}
              mediaType={mediaType}
              watchProviders={watchProviders}
              wishlistExists={wishlistExists}
              className={`${styles.actions} justify-center`}
            />
          </div>

          <div className={styles.player}>
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
          </div>
        </div>
      </section>

      <section className={styles.glance}>
        <SpotlightCard
          className={styles.glanceCard}
          shape="beam"
          intensity={0.12}
          spotlightColor="var(--color-accent)"
          borderGlow={0.7}
          padding="1.5rem"
        >
          <div className={styles.stats}>
            <div className={styles.stat}>
              <span className={styles.statLabel}>Audience score</span>
              <span className={styles.statValue}>{scoreOf(details)}</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statLabel}>Votes</span>
              <span className={styles.statValue}>
                <CountUp to={votesOf(details)} format="compact" />
              </span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statLabel}>{isTV ? "Seasons" : "Runtime"}</span>
              <span className={styles.statValue}>{isTV ? details.number_of_seasons || "—" : runtimeOf(details) || "—"}</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statLabel}>Certificate</span>
              <span className={styles.statValue}>{certificate || "NR"}</span>
            </div>
          </div>
          <DetailFacts
            facts={facts.slice(0, 6)}
            keywords={keywords}
            links={links}
            columns={2}
            className={styles.facts}
          />
        </SpotlightCard>
      </section>

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
        <section className="px-6 md:px-12 pt-10">
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
