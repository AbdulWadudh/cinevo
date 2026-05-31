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
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
