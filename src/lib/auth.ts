import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { site } from "@/config";
import type { User } from "@supabase/supabase-js";

/** Returns the currently authenticated Supabase user, or null. */
export async function getCurrentUser(): Promise<User | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/**
 * Ensures a Prisma Profile row exists for the current Supabase user
 * (Profile.id === auth user id). Returns null when signed out.
 */
export async function getOrCreateProfile() {
  const user = await getCurrentUser();
  if (!user) return null;

  const email = user.email ?? `${user.id}@${site.localEmailDomain}`;
  const meta = user.user_metadata ?? {};
  const username =
    meta.full_name || meta.name || user.email?.split("@")[0] || site.defaultUsername;
  const avatarUrl = meta.avatar_url || meta.picture || null;

  return db.profile.upsert({
    where: { id: user.id },
    update: { email }, // keep email fresh; don't clobber user-edited username/avatar
    create: { id: user.id, email, username, avatarUrl },
  });
}

/** What the nav shell needs to render its account area on the first pass. */
export interface NavViewer {
  id: string;
  avatarUrl: string | null;
  initial: string;
  isAdmin: boolean;
}

/**
 * Read-only counterpart to `getProfileBrief` for server rendering: a fresh
 * sign-in may not have a Profile row yet, so it falls back to the Supabase
 * metadata instead of creating one on every page request.
 */
export async function getNavViewer(): Promise<NavViewer | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const meta = user.user_metadata ?? {};
  const fallbackName = meta.full_name || meta.name || user.email || "U";
  const fallback: NavViewer = {
    id: user.id,
    avatarUrl: meta.avatar_url || meta.picture || null,
    initial: String(fallbackName).charAt(0).toUpperCase(),
    isAdmin: false,
  };

  try {
    const profile = await db.profile.findUnique({
      where: { id: user.id },
      select: { role: true, avatarUrl: true, username: true, email: true },
    });
    if (!profile) return fallback;

    return {
      id: user.id,
      avatarUrl: profile.avatarUrl || fallback.avatarUrl,
      initial: String(profile.username || profile.email || "U").charAt(0).toUpperCase(),
      isAdmin: profile.role === "admin",
    };
  } catch {
    // A database hiccup shouldn't take the whole page down over an avatar.
    return fallback;
  }
}
