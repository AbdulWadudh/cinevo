import Nav from "@/components/Nav";
import DetailSkeleton, {
  type DetailSkeletonVariant,
} from "@/components/watch/detail/DetailSkeleton";
import { getActiveThemeState } from "@/lib/theme/active";

// Shaped like the layout the page will paint: a single Classic-shaped
// placeholder used to swap itself out for Stage, Dossier or Console.
export default async function Loading() {
  const themeState = await getActiveThemeState();
  const layout: DetailSkeletonVariant =
    themeState.experience === "cinevo" ? themeState.detailLayout : "experience";

  return (
    <>
      <Nav />
      <DetailSkeleton layout={layout} />
    </>
  );
}
