"use client";

import React, { useState } from "react";
import { Share2, Check } from "lucide-react";

interface ShareButtonProps {
  title: string;
}

export default function ShareButton({ title }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const shareData = { title, text: `Watch ${title} on CineVo`, url };

    // Prefer the native share sheet where available (mobile / supported browsers).
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        // User dismissed the sheet or it failed — fall through to clipboard.
      }
    }

    // Fallback: copy the link to the clipboard and show confirmation.
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable (e.g. insecure context) — nothing more we can do.
    }
  };

  return (
    <button
      onClick={handleShare}
      aria-label="Share"
      className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold bg-transparent text-fg-secondary border border-border hover:border-fg-secondary hover:text-fg transition-all cursor-pointer"
    >
      {copied ? (
        <>
          <Check className="w-4 h-4 text-emerald-400" /> Link copied!
        </>
      ) : (
        <>
          <Share2 className="w-4 h-4" /> Share
        </>
      )}
    </button>
  );
}
