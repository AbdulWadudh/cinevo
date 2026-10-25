import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Play } from "lucide-react";
import type { TMDBCast, TMDBDetails, TMDBMedia } from "@/lib/tmdb";
import Nav from "@/components/Nav";
import FloatingBackButton from "@/components/watch/FloatingBackButton";
import WishlistButton from "@/components/wishlist/WishlistButton";
import DetailTrailerButton from "@/components/experience/DetailTrailerButton";
import EpisodesBrowser from "@/components/experience/EpisodesBrowser";

export type DetailVariant = "netflix" | "disney-hotstar" | "apple-tv";

interface DetailPageProps {
  variant: DetailVariant;
  details: TMDBDetails;
  cast: TMDBCast[];
  similar: TMDBMedia[];
  mediaId: string;
  mediaType: "movie" | "tv";
  season: number;
  episode: number;
  preview?: boolean;
  wishlistExists: boolean;
  /** The sandboxed player, assembled by the page so playback wiring stays put. */
  children: React.ReactNode;
}

const VARIANT_COPY: Record<
  DetailVariant,
  {
    kicker: string;
    play: string;
    trailer: string;
    list: { add: string; added: string };
    moreHeading: string;
    episodesHeading?: string;
  }
> = {
  netflix: {
    kicker: "CINEVO FILM",
    play: "Play",
    trailer: "Trailer",
    list: { add: "My List", added: "In My List" },
    moreHeading: "More Like This",
  },
  "disney-hotstar": {
    kicker: "CINEVO ORIGINAL",
    play: "Watch now",
    trailer: "Trailer",
    list: { add: "Watchlist", added: "In Watchlist" },
    moreHeading: "More Like This",
    episodesHeading: "Episodes",
  },
  "apple-tv": {
    kicker: "A CINEVO ORIGINAL",
    play: "Watch now",
    trailer: "Watch Trailer",
    list: { add: "Add to Up Next", added: "In Up Next" },
    moreHeading: "You May Also Like",
    episodesHeading: "Episodes",
  },
};

function yearOf(details: TMDBDetails): string {
  const raw = details.release_date || details.first_air_date || "";
  return raw ? raw.split("-")[0] : "";
}

function fullDateOf(details: TMDBDetails): string {
  const raw = details.release_date || details.first_air_date || "";
  if (!raw) return "";
  return new Date(raw).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export default function DetailPage({
  variant,
  details,
  cast,
  similar,
  mediaId,
  mediaType,
  season,
  episode,
  preview = false,
  wishlistExists,
  children,
}: DetailPageProps) {
  const copy = VARIANT_COPY[variant];
  const isTV = mediaType === "tv";
  const title = details.title || details.name || "";
  const year = yearOf(details);
  const match = Math.max(50, Math.round((details.vote_average || 0) * 10));
  const maturity =
    variant === "disney-hotstar" ? "U/A 13+" : variant === "apple-tv" ? "TV-14" : "13+";
  const kicker = isTV ? copy.kicker.replace("FILM", "SERIES") : copy.kicker.replace("SERIES", "FILM");
  const duration = isTV
    ? `${details.number_of_seasons ?? 1} Season${(details.number_of_seasons ?? 1) === 1 ? "" : "s"}`
    : details.runtime
      ? `${Math.floor(details.runtime / 60)}h ${details.runtime % 60}m`
      : "";
  const genreNames = details.genres.map((g) => g.name);
  const castNames = cast.slice(0, 8).map((c) => c.name).join(", ");
  const backdrop = details.backdrop_path
    ? `https://image.tmdb.org/t/p/original${details.backdrop_path}`
    : details.poster_path
      ? `https://image.tmdb.org/t/p/original${details.poster_path}`
      : "https://picsum.photos/seed/cinevo/1920/1080";
  const moreItems = similar.slice(0, variant === "netflix" ? 9 : 12);

  return (
    <div data-xp-detail={variant} className="xp-detail">
      <Nav />
      <FloatingBackButton />

      <header className="xp-detail-hero">
        {variant === "netflix" ? (
          // The Netflix layout gives the artwork its own band, so that band is
          // the player itself instead of a decorative backdrop.
          <section
            id="watch-player"
            data-xp-detail-player
            className="xp-detail-player xp-detail-player-hero"
          >
            {children}
          </section>
        ) : (
          <div className="xp-detail-art" aria-hidden="true">
            <div className="xp-detail-backdrop">
              <Image src={backdrop} alt="" fill priority sizes="100vw" className="object-cover" />
            </div>
            <div className="xp-detail-scrim" />
          </div>
        )}

        <div className="xp-detail-inner">
          <p className="xp-detail-kicker">{kicker}</p>
          <h1 className="xp-detail-title">{title}</h1>

          <div className="xp-detail-meta">
            <span className="xp-detail-match">{match}% Match</span>
            {year && <span>{year}</span>}
            <span className="xp-detail-chip">{maturity}</span>
            {duration && <span>{duration}</span>}
            <span className="xp-detail-chip">HD</span>
          </div>

          <p className="xp-detail-overview">{details.overview}</p>

          <div className="xp-detail-actions">
            <a href="#watch-player" className="xp-detail-play">
              <Play className="h-4 w-4 fill-current" />
              <span>{copy.play}</span>
            </a>
            <span data-xp-detail-list className="xp-detail-list">
              <WishlistButton
                mediaId={mediaId}
                mediaType={mediaType}
                title={title}
                posterPath={details.poster_path || undefined}
                rating={details.vote_average}
                releaseDate={details.release_date || details.first_air_date || undefined}
                initialExists={wishlistExists}
                labels={copy.list}
              />
            </span>
            <DetailTrailerButton
              id={mediaId}
              mediaType={mediaType}
              title={title}
              rating={details.vote_average}
              date={details.release_date || details.first_air_date || undefined}
              label={copy.trailer}
            />
          </div>
        </div>
      </header>

      {variant !== "netflix" && (
        <section id="watch-player" data-xp-detail-player className="xp-detail-player">
          {children}
        </section>
      )}

      {isTV && details.seasons && details.seasons.length > 0 && (
        <div className="xp-detail-section">
          <EpisodesBrowser
            seriesId={mediaId}
            seasons={details.seasons}
            currentSeason={season}
            currentEpisode={episode}
            preview={preview}
          />
        </div>
      )}

      {moreItems.length > 0 && (
        <section data-xp-more className="xp-detail-section xp-detail-more">
          <h2 className="xp-detail-heading">{copy.moreHeading}</h2>
          <div className={variant === "netflix" ? "xp-mlt-grid" : "xp-mlt-rail"}>
            {moreItems.map((item) => {
              const itemTitle = item.title || item.name || "";
              const itemYear = (item.release_date || item.first_air_date || "").split("-")[0];
              const itemMatch = Math.max(50, Math.round((item.vote_average || 0) * 10));
              const art = item.backdrop_path
                ? `https://image.tmdb.org/t/p/w780${item.backdrop_path}`
                : item.poster_path
                  ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
                  : "https://picsum.photos/seed/cinevomlt/800/450";

              return (
                <Link
                  key={item.id}
                  href={`/watch/${item.media_type || mediaType}/${item.id}`}
                  className="xp-mlt-card"
                >
                  <span className="xp-mlt-art">
                    <Image
                      src={art}
                      alt=""
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 45vw, 360px"
                      className="object-cover"
                    />
                    <span className="xp-mlt-play">
                      <Play className="h-5 w-5 fill-black" />
                    </span>
                  </span>
                  <span className="xp-mlt-body">
                    <span className="xp-mlt-meta">
                      <span className="xp-mlt-match">{itemMatch}% Match</span>
                      {itemYear && <span>{itemYear}</span>}
                      <span className="xp-detail-chip">HD</span>
                    </span>
                    <span className="xp-mlt-title">{itemTitle}</span>
                    {item.overview && <span className="xp-mlt-overview">{item.overview}</span>}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <section data-xp-about className="xp-detail-section xp-detail-about">
        <h2 className="xp-detail-heading">About {title}</h2>

        <div className="xp-about-meta">
          {year && <span>{year}</span>}
          <span className="xp-detail-chip">{maturity}</span>
          {duration && <span>{duration}</span>}
          <span className="xp-detail-chip">HD</span>
        </div>

        <p className="xp-about-lead">{details.overview}</p>

        <dl className="xp-about-facts">
          {castNames && (
            <div>
              <dt>Cast</dt>
              <dd>{castNames}</dd>
            </div>
          )}
          {genreNames.length > 0 && (
            <div>
              <dt>Genres</dt>
              <dd>{genreNames.join(", ")}</dd>
            </div>
          )}
          <div>
            <dt>This {isTV ? "series" : "film"} is</dt>
            <dd>{details.tagline || genreNames.join(", ")}</dd>
          </div>
          <div>
            <dt>Maturity rating</dt>
            <dd>
              <span className="xp-detail-chip">{maturity}</span> Recommended for ages 13 and up
            </dd>
          </div>
          {details.status && (
            <div>
              <dt>Status</dt>
              <dd>{details.status}</dd>
            </div>
          )}
          {fullDateOf(details) && (
            <div>
              <dt>{isTV ? "First aired" : "Released"}</dt>
              <dd>{fullDateOf(details)}</dd>
            </div>
          )}
        </dl>

        {isTV && details.seasons && details.seasons.length > 0 && (
          <p className="xp-about-seasons">
            {details.number_of_seasons ?? details.seasons.length} season
            {(details.number_of_seasons ?? details.seasons.length) === 1 ? "" : "s"} ·{" "}
            {details.number_of_episodes ?? ""} episodes
          </p>
        )}

        <p className="xp-about-watch">
          <a href={`#watch-player`}>Start watching {title}</a>
          {preview ? " · Preview mode — this view stays out of your history." : ""}
        </p>
      </section>
    </div>
  );
}
