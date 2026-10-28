import Link from "next/link";
import { Star } from "lucide-react";
import IframePlayer from "@/components/player/IframePlayer";
import CastSection from "@/components/watch/CastSection";
import CollectionRow from "@/components/watch/CollectionRow";
import SeasonList from "@/components/watch/SeasonList";
import GlareHover from "@/components/reactbits/GlareHover";
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
  runtimeOf,
  scoreOf,
  seasonsOf,
  titleOf,
  votesOf,
  yearOf,
} from "./format";
import type { DetailLayoutProps } from "./types";
import styles from "./ConsoleLayout.module.css";

const MOVIE_TABS = [
  { id: "cast", label: "Cast" },
  { id: "facts", label: "Facts" },
  { id: "more", label: "More like this" },
] as const;

const TV_TABS = [
  { id: "episodes", label: "Episodes" },
  { id: "cast", label: "Cast" },
  { id: "facts", label: "Facts" },
  { id: "more", label: "More like this" },
] as const;

export default function ConsoleLayout({
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
  tabQuery,
  view,
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
  const tabs = isTV ? TV_TABS : MOVIE_TABS;
  const active = tabs.some((tab) => tab.id === view) ? view : tabs[0].id;
  const hrefFor = (id: string) => `?view=${id}${tabQuery ? `&${tabQuery}` : ""}`;

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
        <div className={styles.top}>
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

          <GlareHover
            className={styles.control}
            width="100%"
            height="auto"
            background="color-mix(in srgb, var(--color-card) 92%, transparent)"
            borderColor="var(--color-border)"
            borderRadius="var(--radius-xl)"
            glareColor="var(--color-accent)"
            glareOpacity={0.22}
            glareSize={26}
            variant="streak"
            mode="hover"
            rimGlint
          >
            <div className={styles.controlInner}>
              <span className={styles.kicker}>
                {isTV ? `Cinevo control · S${season} E${episode}` : "Cinevo control · Feature"}
              </span>
              <h1 className={styles.title}>{title}</h1>

              <div className={styles.metaRow}>
                {certificate && <span className={styles.metaChip}>{certificate}</span>}
                {yearOf(details) && <span>{yearOf(details)}</span>}
                <span>{isTV ? seasonsOf(details) : runtimeOf(details)}</span>
              </div>

              <div className={styles.stats}>
                <div className={styles.stat}>
                  <span className={styles.statLabel}>Score</span>
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
                <div className={styles.stat}>
                  <span className={styles.statLabel}>Votes</span>
                  <span className={styles.statValue}>
                    <CountUp to={votesOf(details)} format="compact" duration={1.3} />
                  </span>
                </div>
                <div className={styles.stat}>
                  <span className={styles.statLabel}>{isTV ? "Seasons" : "Runtime"}</span>
                  <span className={styles.statValue}>
                    {isTV ? details.number_of_seasons || "—" : runtimeOf(details) || "—"}
                  </span>
                </div>
              </div>

              <DetailActions
                details={details}
                mediaId={mediaId}
                mediaType={mediaType}
                watchProviders={watchProviders}
                wishlistExists={wishlistExists}
                className={styles.actions}
              />
            </div>
          </GlareHover>

          <div className={styles.story}>
            {details.tagline && <p className={styles.tagline}>{details.tagline}</p>}
            <p className={styles.overview}>{details.overview}</p>
            <div className={styles.genres}>
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
            {keywords.length > 0 && (
              <div className={styles.keywords}>
                {keywords.slice(0, 10).map((keyword) => (
                  <Link
                    key={keyword}
                    href={`/search?q=${encodeURIComponent(keyword)}`}
                    className={styles.keyword}
                  >
                    {keyword}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        <section className={styles.deck}>
          <nav className={styles.tabs} aria-label="Title sections">
            {tabs.map((tab) => (
              <Link
                key={tab.id}
                href={hrefFor(tab.id)}
                aria-current={active === tab.id ? "page" : undefined}
                className={`${styles.tab} ${active === tab.id ? styles.tabActive : ""}`}
              >
                {tab.label}
              </Link>
            ))}
          </nav>

          <div className={styles.panel}>
            {active === "episodes" && isTV && seasons.length > 0 && (
              <SeasonList
                seriesId={mediaId}
                seasons={seasons}
                currentSeason={season}
                currentEpisode={episode}
                backdropPath={details.backdrop_path}
                preview={preview}
              />
            )}

            {active === "cast" && <CastSection cast={cast} />}

            {active === "facts" && (
              <DetailFacts facts={facts} keywords={keywords} links={links} columns={2} />
            )}

            {active === "more" && (
              <div>
                {!isTV && details.belongs_to_collection && (
                  <div className={styles.collection}>
                    <CollectionRow
                      collectionId={details.belongs_to_collection.id}
                      name={details.belongs_to_collection.name}
                    />
                  </div>
                )}
                <SimilarTitles items={similar} mediaType={mediaType} />
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
