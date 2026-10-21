-- Durable scan bytes for Netlify (no local disk / no data: URLs).
ALTER TABLE "Scan" ADD COLUMN IF NOT EXISTS "fileData" BYTEA;
