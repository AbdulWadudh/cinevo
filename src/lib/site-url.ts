/**
 * Resolves the public site URL for building OAuth/email redirect targets.
 *
 * Order of preference:
 *  1. SITE_URL / NEXT_PUBLIC_SITE_URL env var (set in production)
 *  2. the proxy-forwarded host headers (x-forwarded-host / host) — works behind
 *     a reverse proxy without any env var
 *  3. http://localhost:3000 — final fallback
 *
 * Note: NEXT_PUBLIC_* vars are inlined at BUILD time, so on a self-hosted
 * server a runtime-only value won't be picked up — that's why SITE_URL
 * (a plain server runtime var) is checked first, and header detection exists.
 */
type HeaderGetter = { get(name: string): string | null };

function fromHeaders(h?: HeaderGetter | null): string | null {
  if (!h) return null;
  const host = h.get("x-forwarded-host") || h.get("host");
  if (!host) return null;
  const proto = h.get("x-forwarded-proto") || "https";
  return `${proto}://${host}`;
}

export function getSiteURL(h?: HeaderGetter | null): string {
  const env = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL;
  let url = env || fromHeaders(h) || "http://localhost:3000";
  if (!url.startsWith("http")) url = `https://${url}`;
  return url.replace(/\/+$/, "");
}
