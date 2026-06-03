import React, { Suspense } from "react";
import type { Metadata } from "next";
import { Loader2 } from "lucide-react";
import Nav from "@/components/Nav";
import SearchClient from "@/components/search/SearchClient";

export const metadata: Metadata = { title: "Search" };

export default function SearchPage() {
  return (
    <div className="flex-1 w-full bg-bg min-h-screen">
      <Nav />
      <Suspense
        fallback={
          <div className="flex items-center justify-center min-h-screen gap-3">
            <Loader2 className="w-6 h-6 text-accent animate-spin" />
            <span className="text-sm text-fg-secondary">Loading search...</span>
          </div>
        }
      >
        <SearchClient />
      </Suspense>
    </div>
  );
}
