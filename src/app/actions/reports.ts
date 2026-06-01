"use server";

import { db } from "@/lib/db";
import { getOrCreateProfile } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export interface ReportInput {
  providerKey: string;
  providerLabel?: string;
  mediaId: string;
  mediaType: "movie" | "tv";
  title?: string;
}

/** Submit a "provider not working" report (works signed-in or out). */
export async function reportProvider(input: ReportInput) {
  try {
    const profile = await getOrCreateProfile();
    await db.providerReport.create({
      data: {
        providerKey: input.providerKey,
        providerLabel: input.providerLabel || null,
        mediaId: input.mediaId,
        mediaType: input.mediaType,
        title: input.title || null,
        profileId: profile?.id ?? null,
      },
    });
    revalidatePath("/profile");
    return { success: true };
  } catch (error) {
    console.error("Failed to submit provider report:", error);
    return { success: false, error: "Failed to submit report" };
  }
}

async function requireAdmin() {
  const profile = await getOrCreateProfile();
  if (!profile || profile.role !== "admin") throw new Error("Forbidden");
  return profile;
}

export interface ProviderReportRow {
  id: string;
  providerKey: string;
  providerLabel: string | null;
  mediaId: string;
  mediaType: string;
  title: string | null;
  resolved: boolean;
  createdAt: string;
}

/** Admin: list reports (unresolved first), plus a per-provider tally. */
export async function getProviderReports(): Promise<{
  success: boolean;
  data: ProviderReportRow[];
  counts: { providerKey: string; count: number }[];
  error?: string;
}> {
  try {
    await requireAdmin();
    const rows = await db.providerReport.findMany({
      orderBy: [{ resolved: "asc" }, { createdAt: "desc" }],
      take: 200,
    });
    const grouped = await db.providerReport.groupBy({
      by: ["providerKey"],
      where: { resolved: false },
      _count: { providerKey: true },
    });
    return {
      success: true,
      data: rows.map((r) => ({
        id: r.id,
        providerKey: r.providerKey,
        providerLabel: r.providerLabel,
        mediaId: r.mediaId,
        mediaType: r.mediaType,
        title: r.title,
        resolved: r.resolved,
        createdAt: r.createdAt.toISOString(),
      })),
      counts: grouped
        .map((g) => ({ providerKey: g.providerKey, count: g._count.providerKey }))
        .sort((a, b) => b.count - a.count),
    };
  } catch (error) {
    return { success: false, data: [], counts: [], error: (error as Error).message };
  }
}

export async function resolveProviderReport(id: string, resolved: boolean) {
  try {
    await requireAdmin();
    await db.providerReport.update({ where: { id }, data: { resolved } });
    revalidatePath("/profile");
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

export async function deleteProviderReport(id: string) {
  try {
    await requireAdmin();
    await db.providerReport.delete({ where: { id } });
    revalidatePath("/profile");
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

/** Admin: clear all resolved reports. */
export async function clearResolvedReports() {
  try {
    await requireAdmin();
    const res = await db.providerReport.deleteMany({ where: { resolved: true } });
    revalidatePath("/profile");
    return { success: true, count: res.count };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}
