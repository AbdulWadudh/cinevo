"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { getOrCreateProfile } from "@/lib/auth";
import { db } from "@/lib/db";
import {
	isMissingSiteThemeTable,
	normalizeSiteTheme,
	SITE_THEME_ROW_ID,
	type SiteThemeState,
} from "@/lib/theme/site";

const MISSING_TABLE_MESSAGE =
	"Theme storage isn't set up yet. Apply the pending database migration, then try again.";

export interface SiteThemeAdminState {
	isAdmin: boolean;
	siteTheme: SiteThemeState | null;
	storageReady: boolean;
}

async function requireAdmin() {
	const profile = await getOrCreateProfile();
	if (profile?.role !== "admin") {
		throw new Error("Forbidden: admin access required");
	}
	return profile;
}

export async function getSiteThemeAdminState(): Promise<SiteThemeAdminState> {
	const profile = await getOrCreateProfile();
	if (profile?.role !== "admin") {
		return { isAdmin: false, siteTheme: null, storageReady: false };
	}

	try {
		const row = await db.siteTheme.findUnique({
			where: { id: SITE_THEME_ROW_ID },
		});
		return {
			isAdmin: true,
			siteTheme: row
				? normalizeSiteTheme({
						themeId: row.themeId,
						delta: row.delta,
						experience: row.experience,
						detailLayout: row.detailLayout,
					})
				: null,
			storageReady: true,
		};
	} catch {
		return { isAdmin: true, siteTheme: null, storageReady: false };
	}
}

export async function publishSiteTheme(input: {
	themeId: string;
	experience?: string;
	detailLayout?: string;
	delta?: Record<string, string | undefined>;
}): Promise<{ success: boolean; error?: string; siteTheme?: SiteThemeState }> {
	try {
		await requireAdmin();

		const normalized = normalizeSiteTheme(input);
		if (!normalized) {
			return {
				success: false,
				error: "That palette isn't one of the shipped presets.",
			};
		}

		await db.siteTheme.upsert({
			where: { id: SITE_THEME_ROW_ID },
			create: {
				id: SITE_THEME_ROW_ID,
				themeId: normalized.themeId,
				experience: normalized.experience,
				detailLayout: normalized.detailLayout,
				delta: normalized.delta,
			},
			update: {
				themeId: normalized.themeId,
				experience: normalized.experience,
				detailLayout: normalized.detailLayout,
				// `undefined` would leave the old overrides in place, so an
				// uncustomised preset has to write a database NULL explicitly.
				delta: normalized.delta ?? Prisma.DbNull,
			},
		});

		revalidatePath("/", "layout");
		return { success: true, siteTheme: normalized };
	} catch (error) {
		if (isMissingSiteThemeTable(error))
			return { success: false, error: MISSING_TABLE_MESSAGE };
		return { success: false, error: (error as Error).message };
	}
}

export async function clearSiteTheme(): Promise<{
	success: boolean;
	error?: string;
}> {
	try {
		await requireAdmin();
		await db.siteTheme.deleteMany({ where: { id: SITE_THEME_ROW_ID } });
		revalidatePath("/", "layout");
		return { success: true };
	} catch (error) {
		if (isMissingSiteThemeTable(error))
			return { success: false, error: MISSING_TABLE_MESSAGE };
		return { success: false, error: (error as Error).message };
	}
}
