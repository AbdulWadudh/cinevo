import { Spinner } from "@/components/ui/Loader";

// Player-shaped skeleton shown while the watch page fetches its data.
export default function Loading() {
  return (
    <div className="flex-1 w-full bg-bg min-h-screen pb-16">
      <section className="pt-[72px] w-full px-0 sm:px-6 md:px-12">
        {/* Player area */}
        <div className="relative w-full aspect-video max-h-[70vh] bg-surface/60 rounded-t-xl overflow-hidden flex items-center justify-center">
          <Spinner className="w-12 h-12" />
        </div>
        {/* Controls bar */}
        <div className="w-full h-[58px] bg-surface/40 rounded-b-xl animate-pulse" />
      </section>

      {/* Metadata */}
      <div className="px-6 md:px-12 pt-8 grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-8 lg:gap-12">
        <div className="flex flex-col gap-4">
          <div className="h-10 w-2/3 bg-surface/60 rounded-lg animate-pulse" />
          <div className="h-4 w-1/3 bg-surface/40 rounded animate-pulse" />
          <div className="flex gap-2">
            <div className="h-6 w-16 bg-surface/40 rounded-full animate-pulse" />
            <div className="h-6 w-16 bg-surface/40 rounded-full animate-pulse" />
            <div className="h-6 w-16 bg-surface/40 rounded-full animate-pulse" />
          </div>
          <div className="h-24 w-full max-w-2xl bg-surface/30 rounded-lg animate-pulse" />
          <div className="flex gap-2.5">
            <div className="h-11 w-32 bg-surface/40 rounded-lg animate-pulse" />
            <div className="h-11 w-28 bg-surface/40 rounded-lg animate-pulse" />
          </div>
        </div>
        <div className="lg:border-l border-border lg:pl-8">
          <div className="w-full aspect-video bg-surface/50 rounded-xl animate-pulse" />
        </div>
      </div>
    </div>
  );
}
