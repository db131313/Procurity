-- Additive indexes for city-scoped ranking and viewport (bbox) map queries.
-- Table name is "Project" (PascalCase), matching 20260820000000_init.

CREATE INDEX IF NOT EXISTS "Project_city_score_idx" ON "Project"("city", "score");

CREATE INDEX IF NOT EXISTS "Project_latitude_longitude_idx" ON "Project"("latitude", "longitude");

CREATE INDEX IF NOT EXISTS "Project_city_latitude_longitude_idx" ON "Project"("city", "latitude", "longitude");
