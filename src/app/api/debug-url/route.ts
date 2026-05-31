import { NextResponse } from "next/server";
import { getSiteURL } from "@/lib/site-url";

/**
 * Debug helper — visit /api/debug-url (in prod and locally) to see what the
 * server resolves as the public site URL, and which signals it used.
 * Remove this route once OAuth redirects are confirmed working.
 */
export async function GET(request: Request) {
  const h = request.headers;
  const resolved = getSiteURL(h);

  return NextResponse.json({
    resolvedSiteURL: resolved,
    expectedOAuthRedirect: `${resolved}/auth/callback`,
    signals: {
      "env.SITE_URL": process.env.SITE_URL ?? null,
      "env.NEXT_PUBLIC_SITE_URL": process.env.NEXT_PUBLIC_SITE_URL ?? null,
      "header.x-forwarded-host": h.get("x-forwarded-host"),
      "header.x-forwarded-proto": h.get("x-forwarded-proto"),
      "header.host": h.get("host"),
      "header.origin": h.get("origin"),
      "url.origin": new URL(request.url).origin,
    },
  });
}
