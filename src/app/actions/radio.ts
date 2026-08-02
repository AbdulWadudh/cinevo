"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getOrCreateProfile } from "@/lib/auth";
import {
  classifySlug,
  isBrowsableSlug,
  prettifyName,
  FEATURED_SLUGS,
  type RadioGroup,
} from "@/lib/radio/categories";

export interface RadioCategoryData {
  id: string;
  name: string;
  slug: string;
  group: RadioGroup;
  /** Upstream station count — what the category *could* hold. */
  count: number;
  /** Stations actually cached locally. 0 until the category is hydrated. */
  cached: number;
}

export interface RadioStationData {
  id: string;
  name: string;
  url: string;
  categorySlug?: string;
  reportCount?: number;
  isBroken?: boolean;
  isActive?: boolean;
}

/** Listener reports needed before a station is flagged broken automatically. */
const BROKEN_REPORT_THRESHOLD = 3;

/** Upstream stations are capped per category so one playlist can't flood the DB. */
const MAX_STATIONS_PER_CATEGORY = 400;
const UPSTREAM_TIMEOUT_MS = 12_000;

type ActionResult<T> = { success: boolean; data: T; error?: string };

/* ── Categories ────────────────────────────────────────────────────────── */

/**
 * Every category worth browsing, already classified into sections. Noise slugs
 * from the upstream index (tag namespaces, scraper artefacts, tiny playlists)
 * are filtered out here rather than in the UI.
 */
export async function getRadioCategoriesAction(): Promise<ActionResult<RadioCategoryData[]>> {
  try {
    const categories = await db.radioCategory.findMany({
      orderBy: { count: "desc" },
      select: {
        id: true,
        name: true,
        slug: true,
        group: true,
        count: true,
        isCustom: true,
        _count: { select: { stations: true } },
      },
    });

    const data = categories
      // Admin-made categories always show; imported ones must clear the
      // noise/size threshold.
      .filter((c) => c.isCustom || isBrowsableSlug(c.slug, c.count))
      .map((c) => ({
        id: c.id,
        // Stored names came from an older seed; re-derive so casing is uniform.
        name: prettifyName(c.slug),
        slug: c.slug,
        group: classifySlug(c.slug),
        count: c.count,
        cached: c._count.stations,
      }));

    return { success: true, data };
  } catch (err) {
    console.error("Failed to fetch radio categories:", err);
    return { success: false, data: [], error: message(err, "Failed to load categories") };
  }
}

/** The hand-picked landing rail, ordered as listed in FEATURED_SLUGS. */
export async function getFeaturedCategoriesAction(): Promise<ActionResult<RadioCategoryData[]>> {
  const all = await getRadioCategoriesAction();
  if (!all.success) return all;

  const bySlug = new Map(all.data.map((c) => [c.slug, c]));
  const featured = FEATURED_SLUGS.map((s) => bySlug.get(s)).filter(
    (c): c is RadioCategoryData => Boolean(c)
  );

  return { success: true, data: featured };
}

/* ── Stations ──────────────────────────────────────────────────────────── */

/**
 * Stations for a category, hydrating from upstream on first access.
 *
 * Only a handful of categories are pre-seeded; the rest are pulled from the
 * m3u-rest-api the first time somebody opens them and cached in Postgres, so
 * every category in the index is playable without seeding ~1.1M rows up front.
 */
export async function getRadioStationsAction(
  categorySlug: string
): Promise<ActionResult<RadioStationData[]>> {
  const slug = categorySlug.toLowerCase().trim();

  try {
    const category = await db.radioCategory.findUnique({
      where: { slug },
      select: { id: true, url: true, hydratedAt: true },
    });

    if (!category) {
      return { success: false, data: [], error: "Category not found" };
    }

    if (!category.hydratedAt) {
      await hydrateCategory(category.id, category.url);
    }

    const stations = await db.radioStation.findMany({
      // Disabled stations are hidden from listeners entirely; ones merely
      // reported broken still show, since reports are unverified and a station
      // can come back — they just sink to the bottom.
      where: { categoryId: category.id, isActive: true },
      orderBy: [{ isBroken: "asc" }, { name: "asc" }],
      select: { id: true, name: true, url: true, reportCount: true, isBroken: true },
    });

    return {
      success: true,
      data: stations.map((s) => ({ ...s, categorySlug: slug })),
    };
  } catch (err) {
    console.error(`Failed to fetch radio stations for ${slug}:`, err);
    return { success: false, data: [], error: message(err, "Failed to load stations") };
  }
}

/**
 * Pull a category's playlist from upstream and cache it.
 *
 * Marked hydrated even when upstream returns nothing usable, so a dead or
 * empty playlist isn't re-fetched on every single visit.
 */
async function hydrateCategory(categoryId: string, url: string): Promise<void> {
  let items: { name?: string; url?: string }[] = [];

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Cinevo/1.0" },
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      // Upstream is a static GitHub Pages JSON; a day-long cache is plenty.
      next: { revalidate: 86_400 },
    });
    if (res.ok) {
      const json = (await res.json()) as { items?: { name?: string; url?: string }[] };
      items = Array.isArray(json.items) ? json.items : [];
    } else {
      console.error(`Upstream ${res.status} hydrating radio category ${categoryId}`);
    }
  } catch (err) {
    console.error(`Upstream fetch failed hydrating radio category ${categoryId}:`, err);
  }

  // Dedupe by stream URL — upstream playlists repeat the same stream under
  // several names, and the unique index would reject the batch otherwise.
  const seen = new Set<string>();
  const rows: { name: string; url: string; categoryId: string }[] = [];

  for (const item of items) {
    const streamUrl = item.url?.trim();
    if (!streamUrl || !/^https?:\/\//i.test(streamUrl)) continue;
    if (seen.has(streamUrl)) continue;
    seen.add(streamUrl);
    rows.push({
      name: item.name?.trim() || "Unknown Station",
      url: streamUrl,
      categoryId,
    });
    if (rows.length >= MAX_STATIONS_PER_CATEGORY) break;
  }

  if (rows.length > 0) {
    // skipDuplicates guards the race where two visitors hydrate at once.
    await db.radioStation.createMany({ data: rows, skipDuplicates: true });
  }

  await db.radioCategory.update({
    where: { id: categoryId },
    data: { hydratedAt: new Date() },
  });
}

/**
 * Every cached station, across all categories, as a single browsable list.
 *
 * Capped rather than exhaustive: this reads what has already been hydrated
 * locally, so it grows as categories get visited.
 */
export async function getAllRadioStationsAction(
  limit = 800
): Promise<ActionResult<RadioStationData[]>> {
  try {
    const stations = await db.radioStation.findMany({
      where: { isActive: true },
      orderBy: [{ isBroken: "asc" }, { name: "asc" }],
      take: limit,
      select: {
        id: true,
        name: true,
        url: true,
        reportCount: true,
        isBroken: true,
        category: { select: { slug: true } },
      },
    });

    return {
      success: true,
      data: stations.map((s) => ({
        id: s.id,
        name: s.name,
        url: s.url,
        reportCount: s.reportCount,
        isBroken: s.isBroken,
        categorySlug: s.category.slug,
      })),
    };
  } catch (err) {
    console.error("Failed to fetch all radio stations:", err);
    return { success: false, data: [], error: message(err, "Failed to load stations") };
  }
}

/* ── Search ────────────────────────────────────────────────────────────── */

/** Search cached stations across every category. */
export async function searchRadioStationsAction(
  query: string,
  limit = 120
): Promise<ActionResult<RadioStationData[]>> {
  const q = query.trim();
  if (q.length < 2) return { success: true, data: [] };

  try {
    const stations = await db.radioStation.findMany({
      where: { name: { contains: q, mode: "insensitive" }, isActive: true },
      orderBy: [{ isBroken: "asc" }, { name: "asc" }],
      take: limit,
      select: {
        id: true,
        name: true,
        url: true,
        reportCount: true,
        isBroken: true,
        category: { select: { slug: true } },
      },
    });

    return {
      success: true,
      data: stations.map((s) => ({
        id: s.id,
        name: s.name,
        url: s.url,
        reportCount: s.reportCount,
        isBroken: s.isBroken,
        categorySlug: s.category.slug,
      })),
    };
  } catch (err) {
    console.error(`Radio station search failed for "${q}":`, err);
    return { success: false, data: [], error: message(err, "Search failed") };
  }
}

/* ── Reporting & moderation ────────────────────────────────────────────── */

/** True when the current user may edit or delete stations. */
export async function isRadioAdminAction(): Promise<boolean> {
  try {
    const profile = await getOrCreateProfile();
    return profile?.role === "admin";
  } catch {
    return false;
  }
}

async function requireAdmin() {
  const profile = await getOrCreateProfile();
  if (!profile || profile.role !== "admin") {
    throw new Error("Forbidden: admin access required");
  }
  return profile;
}

/**
 * Flags a station as not working. Open to any visitor — a dead stream is
 * something only a listener can notice — but a single report just increments
 * the counter; the station is hidden away only once several people agree.
 */
export async function reportRadioStationAction(
  stationId: string
): Promise<ActionResult<{ reportCount: number; isBroken: boolean } | null>> {
  try {
    const station = await db.radioStation.update({
      where: { id: stationId },
      data: { reportCount: { increment: 1 } },
      select: { id: true, reportCount: true, isBroken: true, category: { select: { slug: true } } },
    });

    let isBroken = station.isBroken;
    if (!isBroken && station.reportCount >= BROKEN_REPORT_THRESHOLD) {
      await db.radioStation.update({ where: { id: stationId }, data: { isBroken: true } });
      isBroken = true;
    }

    return { success: true, data: { reportCount: station.reportCount, isBroken } };
  } catch (err) {
    console.error(`Failed to report radio station ${stationId}:`, err);
    return { success: false, data: null, error: message(err, "Failed to report station") };
  }
}

/** Admin: rename a station, repoint its stream, or flip its flags. */
export async function updateRadioStationAction(
  stationId: string,
  patch: { name?: string; url?: string; isBroken?: boolean; isActive?: boolean }
): Promise<ActionResult<RadioStationData | null>> {
  try {
    await requireAdmin();

    const data: {
      name?: string;
      url?: string;
      isBroken?: boolean;
      isActive?: boolean;
      reportCount?: number;
    } = {};

    if (patch.isActive !== undefined) data.isActive = patch.isActive;

    if (patch.name !== undefined) {
      const name = patch.name.trim();
      if (!name) return { success: false, data: null, error: "Name cannot be empty" };
      data.name = name;
    }

    if (patch.url !== undefined) {
      const url = patch.url.trim();
      if (!/^https?:\/\/\S+$/i.test(url)) {
        return { success: false, data: null, error: "Stream URL must be a valid http(s) address" };
      }
      data.url = url;
    }

    if (patch.isBroken !== undefined) {
      data.isBroken = patch.isBroken;
      // Clearing the flag also resets the tally, so old reports don't
      // immediately re-trip the threshold.
      if (!patch.isBroken) data.reportCount = 0;
    }

    if (Object.keys(data).length === 0) {
      return { success: false, data: null, error: "Nothing to update" };
    }

    const station = await db.radioStation.update({
      where: { id: stationId },
      data,
      select: {
        id: true,
        name: true,
        url: true,
        reportCount: true,
        isBroken: true,
        category: { select: { slug: true } },
      },
    });

    revalidatePath("/radio");

    return {
      success: true,
      data: {
        id: station.id,
        name: station.name,
        url: station.url,
        reportCount: station.reportCount,
        isBroken: station.isBroken,
        categorySlug: station.category.slug,
      },
    };
  } catch (err) {
    console.error(`Failed to update radio station ${stationId}:`, err);
    // A duplicate URL trips the (categoryId, url) unique index.
    const raw = message(err, "Failed to update station");
    const friendly = raw.includes("Unique constraint")
      ? "Another station in this category already uses that URL"
      : raw;
    return { success: false, data: null, error: friendly };
  }
}

export interface AdminRadioStation extends RadioStationData {
  categoryName: string;
}

export interface RadioCategoryOption {
  slug: string;
  name: string;
  stationCount: number;
  isCustom: boolean;
}

/**
 * Admin: categories matching a query, for the add-station picker. Searches the
 * whole index — including categories with no cached stations yet — so an admin
 * can file a station under any of them.
 */
export async function searchRadioCategoriesAction(
  query: string,
  limit = 20
): Promise<ActionResult<RadioCategoryOption[]>> {
  try {
    await requireAdmin();
    const q = query.trim();

    const categories = await db.radioCategory.findMany({
      where: q ? { slug: { contains: q.toLowerCase().replace(/\s+/g, "_") } } : {},
      // Ones already carrying stations are the likeliest targets.
      orderBy: [{ isCustom: "desc" }, { count: "desc" }],
      take: limit,
      select: {
        slug: true,
        isCustom: true,
        _count: { select: { stations: true } },
      },
    });

    return {
      success: true,
      data: categories.map((c) => ({
        slug: c.slug,
        name: prettifyName(c.slug),
        stationCount: c._count.stations,
        isCustom: c.isCustom,
      })),
    };
  } catch (err) {
    console.error("Failed to search radio categories:", err);
    return { success: false, data: [], error: message(err, "Failed to load categories") };
  }
}

/**
 * Admin: add a station, either to an existing category or to a brand new one
 * created on the spot.
 */
export async function createRadioStationAction(input: {
  name: string;
  url: string;
  /** Existing category to file it under. */
  categorySlug?: string;
  /** Display name for a category to create, when no existing one fits. */
  newCategoryName?: string;
}): Promise<ActionResult<AdminRadioStation | null>> {
  try {
    await requireAdmin();

    const name = input.name.trim();
    const url = input.url.trim();

    if (!name) return { success: false, data: null, error: "Station name is required" };
    if (!/^https?:\/\/\S+$/i.test(url)) {
      return { success: false, data: null, error: "Stream URL must be a valid http(s) address" };
    }

    /* Resolve the target category. */
    let category: { id: string; slug: string } | null = null;

    if (input.categorySlug) {
      category = await db.radioCategory.findUnique({
        where: { slug: input.categorySlug.toLowerCase().trim() },
        select: { id: true, slug: true },
      });
      if (!category) return { success: false, data: null, error: "Category not found" };
    } else {
      const label = (input.newCategoryName ?? "").trim();
      if (!label) {
        return { success: false, data: null, error: "Pick a category or name a new one" };
      }

      // Match the upstream slug convention so the classifier can read it.
      const slug = label
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");

      if (!slug) return { success: false, data: null, error: "That category name isn't usable" };

      const existing = await db.radioCategory.findUnique({
        where: { slug },
        select: { id: true, slug: true },
      });

      category =
        existing ??
        (await db.radioCategory.create({
          data: {
            name: prettifyName(slug),
            slug,
            // No upstream playlist backs a hand-made category, and marking it
            // hydrated stops the lazy loader reaching for one.
            url: "",
            hydratedAt: new Date(),
            isCustom: true,
            group: classifySlug(slug),
            count: 0,
          },
          select: { id: true, slug: true },
        }));
    }

    const duplicate = await db.radioStation.findFirst({
      where: { categoryId: category.id, url },
      select: { id: true },
    });
    if (duplicate) {
      return { success: false, data: null, error: "That stream is already in this category" };
    }

    const station = await db.radioStation.create({
      data: { name, url, categoryId: category.id },
      select: { id: true, name: true, url: true, reportCount: true, isBroken: true, isActive: true },
    });

    // Keep the displayed count honest for hand-made categories, whose `count`
    // has no upstream figure to inherit.
    const total = await db.radioStation.count({ where: { categoryId: category.id } });
    await db.radioCategory.updateMany({
      where: { id: category.id, isCustom: true },
      data: { count: total },
    });

    revalidatePath("/radio");

    return {
      success: true,
      data: {
        ...station,
        categorySlug: category.slug,
        categoryName: prettifyName(category.slug),
      },
    };
  } catch (err) {
    console.error("Failed to create radio station:", err);
    return { success: false, data: null, error: message(err, "Failed to add station") };
  }
}

export interface AdminStationPage {
  stations: AdminRadioStation[];
  total: number;
  page: number;
  pageSize: number;
  counts: { total: number; disabled: number; broken: number };
}

export type AdminStationFilter = "all" | "active" | "disabled" | "broken";

const ADMIN_PAGE_SIZE = 25;

/**
 * Admin: paginated station listing for the management panel. Unlike the
 * listener-facing queries this includes disabled stations.
 */
export async function getAdminRadioStationsAction(opts: {
  query?: string;
  filter?: AdminStationFilter;
  page?: number;
}): Promise<ActionResult<AdminStationPage | null>> {
  try {
    await requireAdmin();

    const page = Math.max(1, Math.floor(opts.page ?? 1));
    const q = (opts.query ?? "").trim();
    const filter = opts.filter ?? "all";

    const where = {
      ...(q ? { name: { contains: q, mode: "insensitive" as const } } : {}),
      ...(filter === "active" ? { isActive: true, isBroken: false } : {}),
      ...(filter === "disabled" ? { isActive: false } : {}),
      ...(filter === "broken" ? { isBroken: true } : {}),
    };

    const [stations, total, totalAll, disabled, broken] = await Promise.all([
      db.radioStation.findMany({
        where,
        orderBy: [{ isActive: "asc" }, { isBroken: "desc" }, { name: "asc" }],
        skip: (page - 1) * ADMIN_PAGE_SIZE,
        take: ADMIN_PAGE_SIZE,
        select: {
          id: true,
          name: true,
          url: true,
          reportCount: true,
          isBroken: true,
          isActive: true,
          category: { select: { slug: true, name: true } },
        },
      }),
      db.radioStation.count({ where }),
      db.radioStation.count(),
      db.radioStation.count({ where: { isActive: false } }),
      db.radioStation.count({ where: { isBroken: true } }),
    ]);

    return {
      success: true,
      data: {
        stations: stations.map((s) => ({
          id: s.id,
          name: s.name,
          url: s.url,
          reportCount: s.reportCount,
          isBroken: s.isBroken,
          isActive: s.isActive,
          categorySlug: s.category.slug,
          categoryName: prettifyName(s.category.slug),
        })),
        total,
        page,
        pageSize: ADMIN_PAGE_SIZE,
        counts: { total: totalAll, disabled, broken },
      },
    };
  } catch (err) {
    console.error("Failed to load admin radio stations:", err);
    return { success: false, data: null, error: message(err, "Failed to load stations") };
  }
}

/** Admin: permanently remove a station from the catalogue. */
export async function deleteRadioStationAction(
  stationId: string
): Promise<ActionResult<{ id: string } | null>> {
  try {
    await requireAdmin();
    await db.radioStation.delete({ where: { id: stationId } });
    revalidatePath("/radio");
    return { success: true, data: { id: stationId } };
  } catch (err) {
    console.error(`Failed to delete radio station ${stationId}:`, err);
    return { success: false, data: null, error: message(err, "Failed to delete station") };
  }
}

function message(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}
