import WishlistButton from "@/components/wishlist/WishlistButton";
import ShareButton from "@/components/watch/ShareButton";
import WatchProviders from "@/components/watch/WatchProviders";
import type { TMDBDetails, TMDBWatchProviders } from "@/lib/tmdb";

interface DetailActionsProps {
  details: TMDBDetails;
  mediaId: string;
  mediaType: "movie" | "tv";
  watchProviders: TMDBWatchProviders | null;
  wishlistExists: boolean;
  className?: string;
}

export default function DetailActions({
  details,
  mediaId,
  mediaType,
  watchProviders,
  wishlistExists,
  className = "",
}: DetailActionsProps) {
  return (
    <div className={`flex flex-wrap items-center gap-2.5 ${className}`.trim()}>
      <WishlistButton
        mediaId={mediaId}
        mediaType={mediaType}
        title={details.title || details.name || ""}
        posterPath={details.poster_path || undefined}
        rating={details.vote_average}
        releaseDate={details.release_date || details.first_air_date || undefined}
        initialExists={wishlistExists}
      />
      <ShareButton title={details.title || details.name || ""} />
      <WatchProviders providers={watchProviders} bare />
    </div>
  );
}
