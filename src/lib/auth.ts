import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
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

  const email = user.email ?? `${user.id}@cinevo.local`;
  const meta = user.user_metadata ?? {};
  const username =
    meta.full_name || meta.name || user.email?.split("@")[0] || "Cinevo User";
  const avatarUrl = meta.avatar_url || meta.picture || null;

  return db.profile.upsert({
    where: { id: user.id },
    update: { email }, // keep email fresh; don't clobber user-edited username/avatar
    create: { id: user.id, email, username, avatarUrl },
  });
}
