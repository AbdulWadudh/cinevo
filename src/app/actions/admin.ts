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

/* ── User management ─────────────────────────────────────────────────────── */

export interface AdminUser {
  id: string;
  email: string;
  username: string | null;
  avatarUrl: string | null;
  role: string;
  /** Formatted server-side — a client-side Intl call would desync hydration. */
  joined: string;
  counts: {
    watch: number;
    wishlist: number;
    ratings: number;
    favorites: number;
    devices: number;
  };
}

export interface AdminUserPage {
  users: AdminUser[];
  total: number;
  page: number;
  pageSize: number;
  counts: { total: number; admins: number; members: number };
}

export type AdminUserFilter = "all" | "admins" | "members";

const USER_PAGE_SIZE = 20;

const JOINED_FORMAT = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

/** Admin: paginated, searchable user directory with per-user activity counts. */
export async function getAdminUsersAction(opts: {
  query?: string;
  filter?: AdminUserFilter;
  page?: number;
}): Promise<{ success: boolean; data?: AdminUserPage; error?: string }> {
  try {
    await requireAdmin();

    const page = Math.max(1, Math.floor(opts.page ?? 1));
    const q = (opts.query ?? "").trim();
    const filter = opts.filter ?? "all";

    const where = {
      ...(q
        ? {
            OR: [
              { email: { contains: q, mode: "insensitive" as const } },
              { username: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
      ...(filter === "admins" ? { role: "admin" } : {}),
      ...(filter === "members" ? { role: { not: "admin" } } : {}),
    };

    const [users, total, totalAll, admins] = await Promise.all([
      db.profile.findMany({
        where,
        // "admin" sorts before "user", so admins lead the list.
        orderBy: [{ role: "asc" }, { createdAt: "desc" }],
        skip: (page - 1) * USER_PAGE_SIZE,
        take: USER_PAGE_SIZE,
        select: {
          id: true,
          email: true,
          username: true,
          avatarUrl: true,
          role: true,
          createdAt: true,
          _count: {
            select: {
              watchProgress: true,
              wishlists: true,
              ratings: true,
              radioFavorites: true,
              pushSubs: true,
            },
          },
        },
      }),
      db.profile.count({ where }),
      db.profile.count(),
      db.profile.count({ where: { role: "admin" } }),
    ]);

    return {
      success: true,
      data: {
        users: users.map((u) => ({
          id: u.id,
          email: u.email,
          username: u.username,
          avatarUrl: u.avatarUrl,
          role: u.role,
          joined: JOINED_FORMAT.format(u.createdAt),
          counts: {
            watch: u._count.watchProgress,
            wishlist: u._count.wishlists,
            ratings: u._count.ratings,
            favorites: u._count.radioFavorites,
            devices: u._count.pushSubs,
          },
        })),
        total,
        page,
        pageSize: USER_PAGE_SIZE,
        counts: { total: totalAll, admins, members: totalAll - admins },
      },
    };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Promote or demote a user.
 *
 * Changing your own role is refused: demoting yourself is an instant lockout
 * with no way back through the UI, and since it's the only way the admin count
 * could reach zero, blocking it also guarantees at least one admin survives.
 */
export async function setUserRoleAction(id: string, role: "admin" | "user") {
  try {
    const me = await requireAdmin();
    if (id === me.id) return { success: false, error: "You can't change your own role." };

    const target = await db.profile.findUnique({ where: { id }, select: { id: true } });
    if (!target) return { success: false, error: "That user no longer exists." };

    await db.profile.update({ where: { id }, data: { role } });
    return { success: true, role };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Wipe a user's library — watch history, wishlist, ratings, radio favourites,
 * push devices and the episode-push dedupe log — leaving the account itself
 * intact. `SentPush` has no foreign key to Profile, so it's cleared by hand.
 */
export async function resetUserDataAction(id: string) {
  try {
    await requireAdmin();

    const target = await db.profile.findUnique({ where: { id }, select: { id: true } });
    if (!target) return { success: false, error: "That user no longer exists." };

    await db.$transaction([
      db.watchProgress.deleteMany({ where: { profileId: id } }),
      db.wishlist.deleteMany({ where: { profileId: id } }),
      db.rating.deleteMany({ where: { profileId: id } }),
      db.radioFavorite.deleteMany({ where: { profileId: id } }),
      db.pushSubscription.deleteMany({ where: { profileId: id } }),
      db.sentPush.deleteMany({ where: { profileId: id } }),
    ]);

    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Delete a user's profile and everything cascading from it.
 *
 * This does **not** revoke their sign-in: the Supabase Auth user lives in a
 * separate system that needs a service-role key we don't hold here, so signing
 * in again rebuilds an empty profile (see `getOrCreateProfile`). Treat it as
 * "forget this user's data", not as a ban. Self-deletion is refused because the
 * rebuilt profile would come back with the default `user` role — a lockout.
 */
export async function deleteUserProfileAction(id: string) {
  try {
    const me = await requireAdmin();
    if (id === me.id) return { success: false, error: "You can't delete your own account here." };

    const target = await db.profile.findUnique({ where: { id }, select: { id: true } });
    if (!target) return { success: false, error: "That user no longer exists." };

    await db.$transaction([
      db.sentPush.deleteMany({ where: { profileId: id } }),
      db.profile.delete({ where: { id } }),
    ]);

    revalidatePath("/profile");
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}
