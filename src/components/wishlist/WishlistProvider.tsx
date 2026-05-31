"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getWishlistKeys, toggleWishlist, type WishlistItemInput } from "@/app/actions/wishlist";

const keyOf = (mediaType: string, mediaId: string) => `${mediaType}:${mediaId}`;

interface WishlistContextValue {
  has: (mediaType: string, mediaId: string) => boolean;
  toggle: (item: WishlistItemInput) => void;
}

const WishlistContext = createContext<WishlistContextValue | null>(null);

export function useWishlist(): WishlistContextValue {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used within a WishlistProvider");
  return ctx;
}

export default function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [keys, setKeys] = useState<Set<string>>(new Set());
  const router = useRouter();

  // Load the user's wishlist keys once (empty for signed-out users).
  useEffect(() => {
    let active = true;
    getWishlistKeys().then((res) => {
      if (active && res.success) setKeys(new Set(res.data));
    });
    return () => {
      active = false;
    };
  }, []);

  const has = useCallback((mediaType: string, mediaId: string) => keys.has(keyOf(mediaType, mediaId)), [keys]);

  const toggle = useCallback(
    (item: WishlistItemInput) => {
      const k = keyOf(item.mediaType, item.mediaId);
      const wasIn = keys.has(k);

      // Optimistic update.
      setKeys((prev) => {
        const next = new Set(prev);
        if (wasIn) next.delete(k);
        else next.add(k);
        return next;
      });

      toggleWishlist(item).then((res) => {
        if (!res.success) {
          // Revert on failure.
          setKeys((prev) => {
            const next = new Set(prev);
            if (wasIn) next.add(k);
            else next.delete(k);
            return next;
          });
          if ("requiresAuth" in res && res.requiresAuth) {
            router.push("/login");
          }
        }
      });
    },
    [keys, router]
  );

  return <WishlistContext.Provider value={{ has, toggle }}>{children}</WishlistContext.Provider>;
}
