import Nav from "@/components/Nav";
import FloatingBackButton from "@/components/watch/FloatingBackButton";
import RadioAutoPause from "@/components/watch/RadioAutoPause";
import TrackWatch from "@/components/watch/TrackWatch";

interface DetailChromeProps {
  mediaId: string;
  mediaType: "movie" | "tv";
  title: string;
  posterPath?: string;
  season?: number;
  episode?: number;
  preview: boolean;
  backButtonBorderClass: string;
}

export default function DetailChrome({
  mediaId,
  mediaType,
  title,
  posterPath,
  season,
  episode,
  preview,
  backButtonBorderClass,
}: DetailChromeProps) {
  return (
    <>
      <Nav />
      <FloatingBackButton accentClass={backButtonBorderClass} />
      <RadioAutoPause />
      <TrackWatch
        mediaId={mediaId}
        mediaType={mediaType}
        title={title}
        posterPath={posterPath}
        season={season}
        episode={episode}
        preview={preview}
      />
    </>
  );
}
