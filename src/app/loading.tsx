import { FullScreenLoader } from "@/components/ui/Loader";

// Shown during navigation/data-fetch for any route without its own loading.tsx.
export default function Loading() {
  return <FullScreenLoader />;
}
