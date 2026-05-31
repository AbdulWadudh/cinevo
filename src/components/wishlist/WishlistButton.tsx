"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Check } from "lucide-react";
import { toggleWishlist } from "@/app/actions/wishlist";

interface WishlistButtonProps {
  mediaId: string;
  mediaType: "movie" | "tv";
  title: string;
  posterPath?: string;
  rating?: number;
  releaseDate?: string;
  initialExists: boolean;
}

export default function WishlistButton({
  mediaId,
  mediaType,
  title,
  posterPath,
  rating,
  releaseDate,
  initialExists
}: WishlistButtonProps) {
  const [exists, setExists] = useState(initialExists);
  const router = useRouter();

  const handleToggle = async () => {
    // Optimistic toggle
    setExists((prev) => !prev);

    const res = await toggleWishlist({
      mediaId,
      mediaType,
      title,
      posterPath,
      rating,
      releaseDate
    });

    if (!res.success) {
      // Revert if failed
      setExists((prev) => !prev);
      // Not signed in → send them to login.
      if ("requiresAuth" in res && res.requiresAuth) {
        router.push(`/login?redirect=/watch/${mediaType}/${mediaId}`);
      }
    }
  };

  return (
    <button 
      onClick={handleToggle}
      className={`inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold transition-all border cursor-pointer ${
        exists 
          ? "border-emerald-500 text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/15" 
          : "border-border text-fg-secondary bg-transparent hover:border-fg hover:text-fg"
      }`}
    >
      {exists ? (
        <>
          <Check className="w-4 h-4" />
          <span>Added to List</span>
        </>
      ) : (
        <>
          <Plus className="w-4 h-4" />
          <span>My List</span>
        </>
      )}
    </button>
  );
}
