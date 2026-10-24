import { Suspense } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import BecauseYouWatched from "@/components/dashboard/BecauseYouWatched";
import ContinueWatching from "@/components/dashboard/ContinueWatching";
import WishlistEpisodeAlerts from "@/components/dashboard/WishlistEpisodeAlerts";

export default function PersonalHub() {
  return (
    <section
      aria-labelledby="personal-hub-title"
      className="mb-12 hidden border-y border-white/6 bg-linear-to-r from-accent/6 via-surface/30 to-transparent py-6 has-[section]:block [&>section:last-child]:mb-0"
    >
      <div className="mb-6 flex items-end justify-between gap-4 px-6 md:px-12">
        <div>
          <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-accent">
            Personal hub
          </p>
          <h2
            id="personal-hub-title"
            className="font-display text-2xl font-extrabold tracking-tight md:text-3xl"
          >
            Your Cinevo
          </h2>
          <p className="mt-1 text-sm text-fg-secondary">
            Resume your stories and discover what to watch next.
          </p>
        </div>
        <Link
          href="/wishlist"
          className="group inline-flex min-h-11 shrink-0 items-center gap-1.5 text-sm font-semibold text-accent"
        >
          <span className="hidden sm:inline">Wishlist</span>
          <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </Link>
      </div>

      <ContinueWatching />
      <WishlistEpisodeAlerts />
      <Suspense fallback={null}>
        <BecauseYouWatched />
      </Suspense>
    </section>
  );
}
