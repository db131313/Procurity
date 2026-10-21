-- Public demo leads + lightweight analytics (no PII on events until lead_submitted)

CREATE TABLE IF NOT EXISTS "DemoLead" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL DEFAULT '',
    "shopName" TEXT NOT NULL DEFAULT '',
    "city" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DemoLead_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "DemoLead_createdAt_idx" ON "DemoLead"("createdAt");
CREATE INDEX IF NOT EXISTS "DemoLead_email_idx" ON "DemoLead"("email");

CREATE TABLE IF NOT EXISTS "DemoEvent" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "city" TEXT NOT NULL DEFAULT '',
    "step" TEXT,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DemoEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "DemoEvent_createdAt_idx" ON "DemoEvent"("createdAt");
CREATE INDEX IF NOT EXISTS "DemoEvent_type_idx" ON "DemoEvent"("type");
CREATE INDEX IF NOT EXISTS "DemoEvent_city_idx" ON "DemoEvent"("city");
