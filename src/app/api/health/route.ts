import { NextResponse } from "next/server";

// Liveness probe for container platforms (Coolify's health check, the image's
// own HEALTHCHECK). It deliberately touches nothing external: if the probe
// queried Postgres or Supabase, a wobbling upstream would read as an unhealthy
// container and Coolify would restart a server that was answering requests
// fine. Reaching this handler already proves the Node process is up and routing.
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    { ok: true, service: "cinevo" },
    { headers: { "cache-control": "no-store" } }
  );
}
