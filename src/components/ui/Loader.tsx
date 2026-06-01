import React from "react";

/** Branded full-screen loader — spinning accent ring with the Cinevo mark. */
export function FullScreenLoader() {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-bg animate-fade-in">
      <div className="relative flex items-center justify-center">
        <div className="w-20 h-20 rounded-full border-2 border-white/10 border-t-accent animate-spin" />
        {/* eslint-disable-next-line @next/next/no-img-element -- tiny static logo mark */}
        <img
          src="/logo.png"
          alt="Cinevo"
          className="absolute w-9 h-9 animate-pulse"
        />
      </div>
    </div>
  );
}

/** Inline spinner for sections/buttons. */
export function Spinner({ className = "" }: { className?: string }) {
  return (
    <div
      className={`rounded-full border-2 border-white/10 border-t-accent animate-spin ${className || "w-6 h-6"}`}
      role="status"
      aria-label="Loading"
    />
  );
}
