"use server";

import { db } from "@/lib/db";
import { getOrCreateProfile } from "@/lib/auth";
import { sendPush } from "@/lib/push";
import { site } from "@/config";

export interface BrowserSubscription {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

/** Persist a browser push subscription for the current user. */
export async function savePushSubscription(sub: BrowserSubscription) {
  try {
    const profile = await getOrCreateProfile();
    if (!profile) return { success: false, requiresAuth: true };
    await db.pushSubscription.upsert({
      where: { endpoint: sub.endpoint },
      update: { profileId: profile.id, p256dh: sub.keys.p256dh, auth: sub.keys.auth },
      create: { profileId: profile.id, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth },
    });
    return { success: true };
  } catch (error) {
    console.error("Failed to save push subscription:", error);
    return { success: false, error: "Failed to enable notifications" };
  }
}

/** Remove a subscription (when the user disables notifications on a device). */
export async function removePushSubscription(endpoint: string) {
  try {
    await db.pushSubscription.deleteMany({ where: { endpoint } });
    return { success: true };
  } catch (error) {
    console.error("Failed to remove push subscription:", error);
    return { success: false };
  }
}

/** Send a test push to all of the current user's devices. */
export async function sendTestPush() {
  try {
    const profile = await getOrCreateProfile();
    if (!profile) return { success: false, requiresAuth: true };
    const subs = await db.pushSubscription.findMany({ where: { profileId: profile.id } });
    if (subs.length === 0) return { success: false, error: "No devices subscribed" };
    await Promise.all(
      subs.map(async (s) => {
        const res = await sendPush(
          { endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth },
          { title: site.name, body: "Push notifications are working 🎉", url: "/" }
        );
        if (res === "gone") await db.pushSubscription.delete({ where: { id: s.id } });
      })
    );
    return { success: true };
  } catch (error) {
    console.error("Failed to send test push:", error);
    return { success: false, error: "Failed to send test notification" };
  }
}
