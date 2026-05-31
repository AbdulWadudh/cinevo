import React from "react";
import Nav from "@/components/Nav";
import WishlistGrid from "@/components/wishlist/WishlistGrid";
import { Heart } from "lucide-react";

export const metadata = {
  title: "My List — Cinevo",
  description: "Manage your bookmarked movies and TV shows with immediate optimistic playlist UI syncing.",
};

export default function WishlistPage() {
  return (
    <div className="flex-1 w-full bg-bg min-h-screen pb-16 overflow-x-hidden">
      {/* Fixed navigation */}
      <Nav />

      {/* Main Container */}
      <main className="max-w-[1400px] mx-auto px-6 md:px-12 pt-28">
        <header className="flex items-center gap-3 mb-8 border-b border-border pb-6 animate-fade-in">
          <div className="p-3.5 bg-accent/10 border border-accent/20 rounded-2xl">
            <Heart className="w-6 h-6 text-accent fill-accent" />
          </div>
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-extrabold tracking-tight">
              My Playlist
            </h1>
            <p className="text-xs md:text-sm text-fg-secondary mt-0.5">
              Your curated catalog of movies and TV series, instantly synced.
            </p>
          </div>
        </header>

        {/* Optimistic Wishlist Grid Component */}
        <section className="w-full">
          <WishlistGrid />
        </section>
      </main>
    </div>
  );
}
