-- AlterTable
-- Additive indexes for city-scoped ranking and viewport (bbox) map queries.

CREATE INDEX IF NOT EXISTS "projects_city_score_idx" ON "projects"("city", "score");

CREATE INDEX IF NOT EXISTS "projects_latitude_longitude_idx" ON "projects"("latitude", "longitude");

CREATE INDEX IF NOT EXISTS "projects_city_latitude_longitude_idx" ON "projects"("city", "latitude", "longitude");
