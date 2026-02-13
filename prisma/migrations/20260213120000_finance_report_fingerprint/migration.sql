-- Add canonical deduplication fields for imported finance reports
ALTER TABLE "FinanceReport"
  ADD COLUMN "source" TEXT NOT NULL DEFAULT 'INTICKETS',
  ADD COLUMN "fingerprint" TEXT,
  ADD COLUMN "originalFileName" TEXT,
  ADD COLUMN "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Backfill fields for existing rows
UPDATE "FinanceReport"
SET
  "originalFileName" = COALESCE("originalFileName", "fileOriginalName"),
  "fingerprint" = COALESCE(
    "fingerprint",
    "contentHash",
    md5(
      COALESCE("provider"::text, '') || '|' ||
      COALESCE("fileOriginalName", '') || '|' ||
      COALESCE("createdAt"::text, '') || '|' ||
      "id"
    )
  ),
  "source" = COALESCE(NULLIF("source", ''), 'INTICKETS');

ALTER TABLE "FinanceReport"
  ALTER COLUMN "fingerprint" SET NOT NULL;

CREATE UNIQUE INDEX "FinanceReport_fingerprint_key" ON "FinanceReport"("fingerprint");
