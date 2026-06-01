import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendPush } from "@/lib/push";
import { computeEpisodeNotifications } from "@/lib/episodeNotifications";

// Sends Web Push for newly-aired episodes of wishlisted shows. Protected by
// PUSH_CRON_SECRET. Intended to run daily (Vercel cron / external scheduler).
// Each (user, episode) is pushed at most once via the SentPush dedupe log.

export const dynamic = "force-dynamic";

function authorized(req: NextRequest): boolean {
  // Accept either our own PUSH_CRON_SECRET or Vercel's CRON_SECRET, via the
  // Authorization: Bearer header (Vercel cron) or a ?secret= query (manual).
  const secrets = [process.env.PUSH_CRON_SECRET, process.env.CRON_SECRET].filter(Boolean);
  if (secrets.length === 0) return false;
  const fromQuery = req.nextUrl.searchParams.get("secret");
  const fromHeader = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  return secrets.includes(fromQuery ?? undefined as never) || secrets.includes(fromHeader ?? undefined as never);
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Distinct profiles that have at least one push subscription.
    const subs = await db.pushSubscription.findMany();
    const byProfile = new Map<string, typeof subs>();
    for (const s of subs) {
      const arr = byProfile.get(s.profileId) ?? [];
      arr.push(s);
      byProfile.set(s.profileId, arr);
    }

    let sent = 0;
    for (const [profileId, profileSubs] of byProfile) {
      const notifs = (await computeEpisodeNotifications(profileId)).filter((n) => n.kind === "new");
      for (const n of notifs) {
        // Dedupe: skip if already pushed to this user.
        try {
          await db.sentPush.create({ data: { profileId, episodeId: n.id } });
        } catch {
          continue; // unique violation → already sent
        }
        for (const s of profileSubs) {
          const res = await sendPush(
            { endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth },
            {
              title: `New episode: ${n.title}`,
              body: `S${n.season} E${n.episode} · ${n.episodeName}`,
              url: `/watch/tv/${n.mediaId}?season=${n.season}&episode=${n.episode}`,
              tag: n.id,
            }
          );
          if (res === "gone") await db.pushSubscription.delete({ where: { id: s.id } }).catch(() => {});
          else if (res === "ok") sent++;
        }
      }
    }

    return NextResponse.json({ ok: true, profiles: byProfile.size, sent });
  } catch (error) {
    console.error("Push cron failed:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
