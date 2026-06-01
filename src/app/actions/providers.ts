"use server";

import { db } from "@/lib/db";
import { getOrCreateProfile } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import {
  DEFAULT_PROVIDERS,
  type PlayerProvider,
  type ProviderInput,
} from "@/lib/providers";

/** Map a Prisma Source row to the serializable PlayerProvider shape. */
function toProvider(s: {
  id: string;
  key: string;
  label: string;
  sub: string | null;
  movieUrl: string;
  tvUrl: string;
  sandboxEnabled: boolean;
  enabled: boolean;
  isDefault: boolean;
  sortOrder: number;
}): PlayerProvider {
  return {
    id: s.id,
    key: s.key,
    label: s.label,
    sub: s.sub,
    movieUrl: s.movieUrl,
    tvUrl: s.tvUrl,
    sandboxEnabled: s.sandboxEnabled,
    enabled: s.enabled,
    isDefault: s.isDefault,
    sortOrder: s.sortOrder,
  };
}

/** Throws unless the current user is an admin; returns the admin profile. */
async function requireAdmin() {
  const profile = await getOrCreateProfile();
  if (!profile || profile.role !== "admin") {
    throw new Error("Forbidden: admin access required");
  }
  return profile;
}

/** True when the current user is an admin (no throw — for UI gating). */
export async function isAdmin(): Promise<boolean> {
  const profile = await getOrCreateProfile();
  return profile?.role === "admin";
}

/**
 * Public list of *enabled* providers, ordered for the player. Seeds the table
 * with DEFAULT_PROVIDERS the first time it's empty so the app works out of the box.
 */
export async function getPublicProviders(): Promise<PlayerProvider[]> {
  try {
    const count = await db.provider.count();
    if (count === 0) {
      await db.provider.createMany({ data: DEFAULT_PROVIDERS, skipDuplicates: true });
    }
    const rows = await db.provider.findMany({
      where: { enabled: true },
      orderBy: { sortOrder: "asc" },
    });
    return rows.map(toProvider);
  } catch (error) {
    console.error("Failed to load providers:", error);
    // Fall back to seed data so the player never ends up empty.
    return DEFAULT_PROVIDERS.filter((p) => p.enabled).map((p, i) => ({ ...p, id: `seed-${i}` }));
  }
}

/** Full list (incl. disabled) for the admin manager. */
export async function getAllProviders(): Promise<{ success: boolean; data: PlayerProvider[]; error?: string }> {
  try {
    await requireAdmin();
    const rows = await db.provider.findMany({ orderBy: { sortOrder: "asc" } });
    return { success: true, data: rows.map(toProvider) };
  } catch (error) {
    console.error("Failed to load all providers:", error);
    return { success: false, data: [], error: (error as Error).message };
  }
}

function normalize(input: ProviderInput) {
  return {
    key: input.key.trim().toLowerCase(),
    label: input.label.trim(),
    sub: input.sub?.trim() || null,
    movieUrl: input.movieUrl.trim(),
    tvUrl: input.tvUrl.trim(),
    sandboxEnabled: !!input.sandboxEnabled,
    enabled: !!input.enabled,
    isDefault: !!input.isDefault,
    sortOrder: Number.isFinite(input.sortOrder) ? input.sortOrder : 0,
  };
}

function validate(data: ReturnType<typeof normalize>): string | null {
  if (!data.key) return "Key is required";
  if (!/^[a-z0-9-]+$/.test(data.key)) return "Key may only contain lowercase letters, numbers and dashes";
  if (!data.label) return "Label is required";
  if (!data.movieUrl.includes("{id}")) return "Movie URL must include the {id} placeholder";
  if (!data.tvUrl.includes("{id}")) return "TV URL must include the {id} placeholder";
  return null;
}

export async function createProvider(input: ProviderInput) {
  try {
    await requireAdmin();
    const data = normalize(input);
    const err = validate(data);
    if (err) return { success: false, error: err };

    const exists = await db.provider.findUnique({ where: { key: data.key } });
    if (exists) return { success: false, error: `A provider with key "${data.key}" already exists` };

    // Only one provider may be the default — clear the others in the same tx.
    const [, created] = await db.$transaction([
      db.provider.updateMany({
        where: data.isDefault ? {} : { id: "__none__" },
        data: { isDefault: false },
      }),
      db.provider.create({ data }),
    ]);
    revalidatePath("/profile");
    return { success: true, data: toProvider(created) };
  } catch (error) {
    console.error("Failed to create provider:", error);
    return { success: false, error: (error as Error).message };
  }
}

export async function updateProvider(id: string, input: ProviderInput) {
  try {
    await requireAdmin();
    const data = normalize(input);
    const err = validate(data);
    if (err) return { success: false, error: err };

    // Ensure the key stays unique across other rows.
    const clash = await db.provider.findFirst({ where: { key: data.key, NOT: { id } } });
    if (clash) return { success: false, error: `A provider with key "${data.key}" already exists` };

    // When marking this one default, clear the flag on every other provider.
    const [, updated] = await db.$transaction([
      db.provider.updateMany({
        where: data.isDefault ? { NOT: { id } } : { id: "__none__" },
        data: { isDefault: false },
      }),
      db.provider.update({ where: { id }, data }),
    ]);
    revalidatePath("/profile");
    return { success: true, data: toProvider(updated) };
  } catch (error) {
    console.error("Failed to update provider:", error);
    return { success: false, error: (error as Error).message };
  }
}

export async function deleteProvider(id: string) {
  try {
    await requireAdmin();
    await db.provider.delete({ where: { id } });
    revalidatePath("/profile");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete provider:", error);
    return { success: false, error: (error as Error).message };
  }
}

/** Mark exactly one provider as the default; clears the flag on all others. */
export async function setDefaultProvider(id: string) {
  try {
    await requireAdmin();
    await db.$transaction([
      db.provider.updateMany({ where: { NOT: { id } }, data: { isDefault: false } }),
      db.provider.update({ where: { id }, data: { isDefault: true } }),
    ]);
    revalidatePath("/profile");
    const rows = await db.provider.findMany({ orderBy: { sortOrder: "asc" } });
    return { success: true, data: rows.map(toProvider) };
  } catch (error) {
    console.error("Failed to set default provider:", error);
    return { success: false, error: (error as Error).message };
  }
}

/** Persist a new ordering. `ids` is the desired order; index becomes sortOrder. */
export async function reorderProviders(ids: string[]) {
  try {
    await requireAdmin();
    await db.$transaction(
      ids.map((id, index) => db.provider.update({ where: { id }, data: { sortOrder: index } }))
    );
    revalidatePath("/profile");
    return { success: true };
  } catch (error) {
    console.error("Failed to reorder providers:", error);
    return { success: false, error: (error as Error).message };
  }
}
