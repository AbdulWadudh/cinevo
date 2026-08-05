import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Renamed from the deprecated `middleware` convention to `proxy` (Next.js 16).
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for static assets and image files.
     *
     * api/health is excluded too: this proxy calls Supabase `getUser()` on every
     * matched request, and a health check firing every 30s shouldn't spend a
     * network round-trip — or fail, and get the container restarted — because
     * Supabase is briefly unreachable.
     */
    "/((?!_next/static|_next/image|api/health|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
