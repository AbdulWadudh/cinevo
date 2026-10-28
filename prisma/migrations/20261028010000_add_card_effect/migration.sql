-- The home-card effect is a fourth site-theme axis beside palette, experience and detail layout.
ALTER TABLE "SiteTheme" ADD COLUMN IF NOT EXISTS "cardEffect" TEXT NOT NULL DEFAULT 'none';
