"use client";

import type { ImageLoaderProps } from "next/image";

// Custom next/image loader — serves images straight from their origin CDN
// instead of routing them through Vercel's Image Optimization endpoint
// (/_next/image), which is metered and returns 402 Payment Required once the
// plan quota is exhausted.
//
// TMDb already exposes pre-optimized size buckets, so we map the width Next
// requests to the closest bucket — that preserves responsive srcset behaviour
// (smaller payloads on phones) while costing nothing on Vercel. Every other
// host (pravatar, YouTube thumbs, Google avatars, local /public assets) is
// passed through unchanged.

// TMDb's supported poster/profile widths, ascending. Anything larger -> original.
const TMDB_BUCKETS = [92, 154, 185, 342, 500, 780];

function tmdbSize(width: number): string {
  const bucket = TMDB_BUCKETS.find((b) => b >= width);
  return bucket ? `w${bucket}` : "original";
}

export default function cinevoImageLoader({ src, width }: ImageLoaderProps): string {
  // TMDb image URLs look like: https://image.tmdb.org/t/p/{size}/{path}
  const tmdb = src.match(/^(https:\/\/image\.tmdb\.org\/t\/p\/)([^/]+)(\/.+)$/);

  let url = src;
  if (tmdb) {
    url = `${tmdb[1]}${tmdbSize(width)}${tmdb[3]}`;
  }

  // Next.js development validation expects the returned URL to contain the width parameter.
  // We append it as a query parameter so that the Next.js warning does not trigger.
  // Static CDNs like TMDb will ignore this extra query parameter.
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}width=${width}`;
}
