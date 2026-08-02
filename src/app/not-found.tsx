import React from "react";
import Link from "next/link";
import { Compass, Home, Search } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex-1 w-full bg-bg min-h-screen flex flex-col items-center justify-center text-center p-6">
      <div className="w-16 h-16 rounded-2xl bg-accent/15 border border-accent/25 flex items-center justify-center mb-5">
        <Compass className="w-8 h-8 text-accent" />
      </div>
      <p className="text-[11px] font-extrabold uppercase tracking-widest text-accent mb-2">404</p>
      <h1 className="font-display text-2xl md:text-3xl font-extrabold tracking-tight mb-2">Page not found</h1>
      <p className="text-sm text-fg-secondary max-w-sm mb-6">
        The page you&apos;re looking for doesn&apos;t exist or may have moved.
      </p>
      <div className="flex items-center gap-3">
        <Link href="/" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-accent-strong text-white hover:bg-accent-strong-hover transition-all">
          <Home className="w-4 h-4" /> Home
        </Link>
        <Link href="/search" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-white/[0.05] border border-white/[0.1] text-fg-secondary hover:text-fg transition-all">
          <Search className="w-4 h-4" /> Search
        </Link>
      </div>
    </div>
  );
}
