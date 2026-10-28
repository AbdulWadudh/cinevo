-- The hero carousel is its own Studio axis, independent of the card effect.
ALTER TABLE "SiteTheme" ADD COLUMN IF NOT EXISTS "heroEffect" TEXT NOT NULL DEFAULT 'none';
