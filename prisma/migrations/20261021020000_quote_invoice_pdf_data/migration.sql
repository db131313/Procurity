-- Store PDF bytes in Neon (not data: URLs). pdfUrl holds the API route path.
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "pdfData" BYTEA;
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "pdfData" BYTEA;
