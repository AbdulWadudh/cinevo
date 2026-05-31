/**
 * Resolves the public site URL for building OAuth/email redirect targets.
 *
 * Order of preference:
 *  1. NEXT_PUBLIC_SITE_URL  — set this in production (e.g. https://cinevo.k79.space)
 *  2. the request's Origin header — works for local dev
 *  3. http://localhost:3000 — final fallback
 *
 * Relying on the Origin header alone breaks behind reverse proxies (the header
 * can be stripped), which makes Supabase fall back to its dashboard Site URL.
 */
export function getSiteURL(originHeader?: string | null): string {
  let url = process.env.NEXT_PUBLIC_SITE_URL || originHeader || "http://localhost:3000";
  // Ensure a protocol and no trailing slash.
  if (!url.startsWith("http")) url = `https://${url}`;
  return url.replace(/\/+$/, "");
}
