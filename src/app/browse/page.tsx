import React from "react";
import type { Metadata } from "next";
import Nav from "@/components/Nav";
import BrowseFilters from "@/components/browse/BrowseFilters";

export const metadata: Metadata = { title: "Browse" };

export default function BrowsePage() {
  return (
    <div className="flex-1 w-full bg-bg min-h-screen pb-16">
      <Nav />
      <section className="pt-24 md:pt-28 px-6 md:px-12 max-w-[1600px] mx-auto">
        <h1 className="font-display text-2xl md:text-3xl font-extrabold tracking-tight mb-6">Browse</h1>
        <BrowseFilters />
      </section>
    </div>
  );
}
