import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // TMDB poster/backdrop host (and the placeholder fallback) for next/image.
    remotePatterns: [
      { protocol: "https", hostname: "image.tmdb.org" },
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "i.pravatar.cc" },
    ],
  },
};

export default nextConfig;
