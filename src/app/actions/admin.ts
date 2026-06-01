"use server";

import { db } from "@/lib/db";
import { getOrCreateProfile } from "@/lib/auth";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const profile = await getOrCreateProfile();
  if (!profile || profile.role !== "admin") throw new Error("Forbidden");
  return profile;
}

export interface AdminStats {
  users: number;
  admins: number;
  providers: number;
  providersEnabled: number;
  openReports: number;
  ratings: number;
  watchRecords: number;
  pushDevices: number;
}

export async function getAdminStats(): Promise<{ success: boolean; data?: AdminStats; error?: string }> {
  try {
    await requireAdmin();
    const [users, admins, providers, providersEnabled, openReports, ratings, watchRecords, pushDevices] =
      await Promise.all([
        db.profile.count(),
        db.profile.count({ where: { role: "admin" } }),
        db.provider.count(),
        db.provider.count({ where: { enabled: true } }),
        db.providerReport.count({ where: { resolved: false } }),
        db.rating.count(),
        db.watchProgress.count(),
        db.pushSubscription.count(),
      ]);
    return { success: true, data: { users, admins, providers, providersEnabled, openReports, ratings, watchRecords, pushDevices } };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

/** Promote/demote a user by email. */
export async function setUserRole(email: string, role: "admin" | "user") {
  try {
    await requireAdmin();
    const target = await db.profile.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (!target) return { success: false, error: `No user found with email "${email}"` };
    await db.profile.update({ where: { id: target.id }, data: { role } });
    revalidatePath("/profile");
    return { success: true, role };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}
