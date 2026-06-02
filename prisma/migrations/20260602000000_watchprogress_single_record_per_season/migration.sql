-- Collapse WatchProgress to a single record PER SEASON (was per episode).
-- Episode becomes a mutable column holding the season's last-watched episode.

-- 1. De-duplicate existing rows: keep the most recently updated row for each
--    (profileId, mediaId, mediaType, season); delete the older episode rows.
--    NULLDISTINCT-safe via IS NOT DISTINCT FROM so movie rows (season NULL) group.
DELETE FROM "WatchProgress" a
USING "WatchProgress" b
WHERE a."profileId" = b."profileId"
  AND a."mediaId" = b."mediaId"
  AND a."mediaType" = b."mediaType"
  AND a."season" IS NOT DISTINCT FROM b."season"
  AND a."id" <> b."id"
  AND (
    a."updatedAt" < b."updatedAt"
    OR (a."updatedAt" = b."updatedAt" AND a."id" < b."id")
  );

-- 2. Swap the unique constraint from episode-level to season-level.
DROP INDEX "WatchProgress_profileId_mediaId_mediaType_season_episode_key";

CREATE UNIQUE INDEX "WatchProgress_profileId_mediaId_mediaType_season_key"
  ON "WatchProgress" ("profileId", "mediaId", "mediaType", "season");
