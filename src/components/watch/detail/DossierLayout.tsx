import Link from "next/link";
import { Star } from "lucide-react";
import IframePlayer from "@/components/player/IframePlayer";
import CastSection from "@/components/watch/CastSection";
import CollectionRow from "@/components/watch/CollectionRow";
import SeasonList from "@/components/watch/SeasonList";
import TiltedCard from "@/components/reactbits/TiltedCard";
import BlurText from "@/components/reactbits/BlurText";
import CountUp from "@/components/reactbits/CountUp";
import DetailActions from "./DetailActions";
import DetailChrome from "./DetailChrome";
import DetailFacts from "./DetailFacts";
import SimilarTitles from "./SimilarTitles";
import {
  certificationOf,
  factsOf,
  keywordsOf,
  linksOf,
  posterUrl,
  runtimeOf,
  scoreOf,
  seasonsOf,
  titleOf,
  votesOf,
  yearOf,
} from "./format";
import type { DetailLayoutProps } from "./types";
import styles from "./DossierLayout.module.css";

export default function DossierLayout({
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
  const keywords = keywordsOf(details);
  const links = linksOf(details);
  const facts = factsOf(details, isTV);
  const seasons = isTV && details.seasons ? details.seasons.filter((item) => item.season_number > 0) : [];

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

      <div className={styles.page}>
        <header className={styles.masthead}>
          <span className={styles.kicker}>
            Cinevo dossier — No. {String(details.id).padStart(4, "0")}
          </span>
          <h1 className={styles.title}>{title}</h1>
          {details.tagline && <p className={styles.tagline}>{details.tagline}</p>}
        </header>

        <div className={styles.columns}>
          <aside className={styles.rail}>
            <div className={styles.posterWrap}>
              <TiltedCard
                imageSrc={posterUrl(details.poster_path)}
                altText={title}
                captionText="Flip for the file"
                containerWidth="100%"
                containerHeight="100%"
                imageWidth="100%"
                imageHeight="100%"
                radius="var(--radius-xl)"
                rotateAmplitude={10}
                glare={0.35}
                shadow={0.4}
                floating={false}
                backContent={
                  <div className={styles.posterBack}>
                    <span className={styles.backKicker}>The file</span>
                    <p className={styles.backTitle}>{title}</p>
                    <div className={styles.backKeywords}>
                      {keywords.slice(0, 6).map((keyword) => (
                        <span key={keyword} className={styles.backKeyword}>
                          {keyword}
                        </span>
                      ))}
                    </div>
                    <span className={styles.backHint}>Tap again to return</span>
                  </div>
                }
              />
            </div>

            <div className={styles.railStats}>
              <div className={styles.railStat}>
                <span className={styles.statLabel}>Audience</span>
                <span className={styles.statValue}>
                  {scoreOf(details) === "NR" ? (
                    "NR"
                  ) : (
                    <>
                      <Star className="mr-1 inline h-3.5 w-3.5 fill-gold stroke-gold" />
                      <CountUp to={details.vote_average} decimals={1} duration={1.1} />
                    </>
                  )}
                </span>
              </div>
              <div className={styles.railStat}>
                <span className={styles.statLabel}>Votes</span>
                <span className={styles.statValue}>
                  <CountUp to={votesOf(details)} format="compact" duration={1.3} />
                </span>
              </div>
            </div>

            <div className={styles.railActions}>
              <DetailActions
                details={details}
                mediaId={mediaId}
                mediaType={mediaType}
                watchProviders={watchProviders}
                wishlistExists={wishlistExists}
              />
            </div>
          </aside>

          <article className={styles.body}>
            <div className={styles.metaRow}>
              {certificate && <span className={styles.metaChip}>{certificate}</span>}
              {yearOf(details) && <span>{yearOf(details)}</span>}
              <span>{isTV ? seasonsOf(details) : runtimeOf(details)}</span>
              {details.status && <span className={styles.status}>{details.status}</span>}
            </div>

            <div className={`${styles.genres}`}>
              {details.genres.map((genre) => (
                <Link
                  key={genre.id}
                  href={`/?genre=${genre.id}&genreName=${encodeURIComponent(genre.name)}`}
                  className={`rounded-full border border-border bg-surface px-3 py-0.5 text-[11px] font-semibold text-fg-secondary transition-colors ${tagHoverClass}`}
                >
                  {genre.name}
                </Link>
              ))}
            </div>

            <BlurText
              text={details.overview}
              className={styles.overview}
              animateBy="words"
              effect="blur"
              trigger="load"
              delay={18}
              focusOnHover
            />

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

            <DetailFacts
              facts={facts}
              keywords={keywords.slice(0, 12)}
              links={links}
              columns={2}
              className={styles.facts}
            />
          </article>
        </div>
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
