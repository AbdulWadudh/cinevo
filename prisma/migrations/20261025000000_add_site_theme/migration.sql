-- Published studio theme served to visitors who have not saved their own.
CREATE TABLE IF NOT EXISTS "SiteTheme" (
    "id" TEXT NOT NULL DEFAULT 'active',
    "themeId" TEXT NOT NULL,
    "delta" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SiteTheme_pkey" PRIMARY KEY ("id")
);
