"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Route error:", error);
  }, [error]);

  return (
    <div className="flex-1 w-full bg-bg min-h-screen flex flex-col items-center justify-center text-center p-6">
      <div className="w-16 h-16 rounded-2xl bg-accent/15 border border-accent/25 flex items-center justify-center mb-5">
        <AlertTriangle className="w-8 h-8 text-accent" />
      </div>
      <h1 className="font-display text-2xl md:text-3xl font-extrabold tracking-tight mb-2">Something went wrong</h1>
      <p className="text-sm text-fg-secondary max-w-sm mb-6">
        An unexpected error occurred. You can try again, or head back home.
      </p>
      <div className="flex items-center gap-3">
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-accent text-white hover:bg-accent-hover transition-all cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" /> Try again
        </button>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-white/[0.05] border border-white/[0.1] text-fg-secondary hover:text-fg transition-all"
        >
          <Home className="w-4 h-4" /> Home
        </Link>
      </div>
    </div>
  );
}
