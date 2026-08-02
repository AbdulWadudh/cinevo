import { NextRequest, NextResponse } from "next/server";

/**
 * Resolves a radio playlist reference to a directly playable stream URL.
 *
 * Many stations in the m3u-rest-api index point at a `.pls` or `.m3u` wrapper
 * rather than the audio stream itself. Browsers can't follow those, and the
 * playlists are usually served without CORS headers, so the hop is made here.
 */

const TIMEOUT_MS = 6_000;
/** Playlists are small; refuse to buffer anything that clearly isn't one. */
const MAX_BYTES = 256 * 1024;

/**
 * Blocks requests aimed at the deployment's own network. Without this the
 * endpoint is an open SSRF proxy, since the URL comes from the client.
 */
function isPrivateHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");

  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".internal")) return true;
  if (host === "::1" || host === "0.0.0.0") return true;
  // IPv6 unique-local / link-local.
  if (/^f[cd][0-9a-f]{2}:/i.test(host) || /^fe80:/i.test(host)) return true;

  const v4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!v4) return false;

  const [a, b] = [Number(v4[1]), Number(v4[2])];
  if ([a, Number(v4[2]), Number(v4[3]), Number(v4[4])].some((n) => n > 255)) return true;

  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127) ||
    a >= 224
  );
}

/** `.m3u8` is HLS and must be handed to the player intact, not unwrapped. */
function playlistKind(pathname: string): "pls" | "m3u" | null {
  const p = pathname.toLowerCase();
  if (p.endsWith(".pls")) return "pls";
  if (p.endsWith(".m3u8")) return null;
  if (p.endsWith(".m3u")) return "m3u";
  return null;
}

function firstStreamUrl(body: string, kind: "pls" | "m3u"): string | null {
  if (kind === "pls") {
    const match = body.match(/^\s*File\d+\s*=\s*(\S+)/im);
    return match?.[1]?.trim() ?? null;
  }

  for (const rawLine of body.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    if (/^https?:\/\//i.test(line)) return line;
  }
  return null;
}

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("url");
  if (!raw) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return NextResponse.json({ error: "Invalid url parameter" }, { status: 400 });
  }

  if (target.protocol !== "http:" && target.protocol !== "https:") {
    return NextResponse.json({ error: "Unsupported protocol" }, { status: 400 });
  }
  if (isPrivateHost(target.hostname)) {
    return NextResponse.json({ error: "Refused" }, { status: 403 });
  }

  const kind = playlistKind(target.pathname);
  // Not a wrapper we can unwrap (direct stream, or HLS the player handles).
  if (!kind) {
    return NextResponse.json({ resolvedUrl: target.toString() });
  }

  try {
    const res = await fetch(target, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; Cinevo/1.0)" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      redirect: "follow",
    });

    if (!res.ok) throw new Error(`Upstream responded ${res.status}`);

    const declared = Number(res.headers.get("content-length") ?? 0);
    if (declared > MAX_BYTES) throw new Error("Playlist too large");

    const body = (await res.text()).slice(0, MAX_BYTES);
    const resolved = firstStreamUrl(body, kind);

    if (!resolved) {
      return NextResponse.json({ resolvedUrl: target.toString() });
    }

    // The extracted entry must itself be a safe, absolute URL.
    let resolvedUrl: URL;
    try {
      resolvedUrl = new URL(resolved, target);
    } catch {
      return NextResponse.json({ resolvedUrl: target.toString() });
    }

    if (
      (resolvedUrl.protocol !== "http:" && resolvedUrl.protocol !== "https:") ||
      isPrivateHost(resolvedUrl.hostname)
    ) {
      return NextResponse.json({ resolvedUrl: target.toString() });
    }

    return NextResponse.json({ resolvedUrl: resolvedUrl.toString() });
  } catch (err) {
    // Fall back to the original URL — some players cope with the wrapper.
    console.error("Failed to resolve radio playlist url:", err);
    return NextResponse.json({ resolvedUrl: target.toString() });
  }
}
