import webpush from "web-push";
import { site } from "@/config";

// Configure VAPID lazily so a missing key doesn't crash unrelated imports.
let configured = false;
function ensure(): boolean {
  if (configured) return true;
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || site.pushSubject;
  if (!pub || !priv) return false;
  webpush.setVapidDetails(subject, pub, priv);
  configured = true;
  return true;
}

export interface PushTarget {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

/**
 * Send a push to one subscription. Returns "gone" when the subscription is
 * expired/invalid (410/404) so the caller can prune it.
 */
export async function sendPush(
  target: PushTarget,
  payload: PushPayload
): Promise<"ok" | "gone" | "error"> {
  if (!ensure()) return "error";
  try {
    await webpush.sendNotification(
      { endpoint: target.endpoint, keys: { p256dh: target.p256dh, auth: target.auth } },
      JSON.stringify(payload)
    );
    return "ok";
  } catch (err) {
    const status = (err as { statusCode?: number })?.statusCode;
    if (status === 404 || status === 410) return "gone";
    console.error("Push send failed:", err);
    return "error";
  }
}
