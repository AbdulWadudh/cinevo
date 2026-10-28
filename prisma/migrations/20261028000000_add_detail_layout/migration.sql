-- The details page layout rides the site theme beside its palette and experience.
ALTER TABLE "SiteTheme" ADD COLUMN IF NOT EXISTS "detailLayout" TEXT NOT NULL DEFAULT 'stage';
