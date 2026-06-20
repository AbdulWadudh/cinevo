import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Bypass Vercel's metered Image Optimization (/_next/image, which 402s once
    // the plan quota is hit) by serving images straight from their origin CDN.
    // See src/lib/imageLoader.ts — TMDb images are mapped to their native size
    // buckets, everything else passes through.
    loader: "custom",
    loaderFile: "./src/lib/imageLoader.ts",
    // Kept for documentation / in case the built-in optimizer is re-enabled;
    // ignored while a custom loader is active.
    remotePatterns: [
      { protocol: "https", hostname: "image.tmdb.org" },
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "i.pravatar.cc" },
      { protocol: "https", hostname: "img.youtube.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "*.googleusercontent.com" },
    ],
  },
};

export default nextConfig;
