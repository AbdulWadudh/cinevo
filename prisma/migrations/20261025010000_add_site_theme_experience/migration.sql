-- Published experience rides the site theme so visitors without a personal
-- cookie get the same structural chrome as its palette.
ALTER TABLE "SiteTheme" ADD COLUMN IF NOT EXISTS "experience" TEXT NOT NULL DEFAULT 'cinevo';
