-- Server-side radio favourites, so a signed-in listener's picks follow them
-- between devices instead of living only in one browser's localStorage.

CREATE TABLE IF NOT EXISTS "RadioFavorite" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RadioFavorite_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "RadioFavorite_profileId_stationId_key"
    ON "RadioFavorite"("profileId", "stationId");
CREATE INDEX IF NOT EXISTS "RadioFavorite_profileId_idx" ON "RadioFavorite"("profileId");
CREATE INDEX IF NOT EXISTS "RadioFavorite_stationId_idx" ON "RadioFavorite"("stationId");

DO $$
BEGIN
    ALTER TABLE "RadioFavorite"
        ADD CONSTRAINT "RadioFavorite_profileId_fkey"
        FOREIGN KEY ("profileId") REFERENCES "Profile"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE "RadioFavorite"
        ADD CONSTRAINT "RadioFavorite_stationId_fkey"
        FOREIGN KEY ("stationId") REFERENCES "RadioStation"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
