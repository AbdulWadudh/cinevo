import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateProfile } from "@/lib/auth";
import { getSiteURL } from "@/lib/site-url";

/** OAuth + email-confirmation callback: exchanges the code for a session. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  // Behind a proxy, request.url's origin can be the internal host — resolve the
  // public site URL from env/forwarded headers so we don't bounce to localhost.
  const base = getSiteURL(request.headers);

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      await getOrCreateProfile();
      return NextResponse.redirect(`${base}${next}`);
    }
  }

  return NextResponse.redirect(`${base}/login?error=Could not sign you in`);
}
