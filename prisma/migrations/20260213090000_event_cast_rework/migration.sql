-- Remove legacy assignments without role before making role mandatory
DELETE FROM "Assignment" WHERE "roleId" IS NULL;

-- Assignment.roleId must be required and protected by role FK
ALTER TABLE "Assignment" DROP CONSTRAINT IF EXISTS "Assignment_roleId_fkey";
ALTER TABLE "Assignment" ALTER COLUMN "roleId" SET NOT NULL;
ALTER TABLE "Assignment"
  ADD CONSTRAINT "Assignment_roleId_fkey"
  FOREIGN KEY ("roleId") REFERENCES "PlayRole"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- PlayRoleCast table existed in earlier migration, normalize it to the new contract
ALTER TABLE "PlayRoleCast" ADD COLUMN IF NOT EXISTS "playId" TEXT;
UPDATE "PlayRoleCast" prc
SET "playId" = pr."playId"
FROM "PlayRole" pr
WHERE prc."playRoleId" = pr."id" AND prc."playId" IS NULL;
ALTER TABLE "PlayRoleCast" ALTER COLUMN "playId" SET NOT NULL;

ALTER TABLE "PlayRoleCast" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3);
UPDATE "PlayRoleCast" SET "updatedAt" = NOW() WHERE "updatedAt" IS NULL;
ALTER TABLE "PlayRoleCast" ALTER COLUMN "updatedAt" SET NOT NULL;

ALTER TABLE "PlayRoleCast" DROP COLUMN IF EXISTS "notes";

DROP INDEX IF EXISTS "PlayRoleCast_personId_idx";
DROP INDEX IF EXISTS "PlayRoleCast_playRoleId_key";
CREATE UNIQUE INDEX "PlayRoleCast_playRoleId_key" ON "PlayRoleCast"("playRoleId");
CREATE INDEX "PlayRoleCast_playId_idx" ON "PlayRoleCast"("playId");
CREATE INDEX "PlayRoleCast_personId_idx" ON "PlayRoleCast"("personId");

ALTER TABLE "PlayRoleCast" DROP CONSTRAINT IF EXISTS "PlayRoleCast_playRoleId_fkey";
ALTER TABLE "PlayRoleCast" DROP CONSTRAINT IF EXISTS "PlayRoleCast_personId_fkey";
ALTER TABLE "PlayRoleCast" DROP CONSTRAINT IF EXISTS "PlayRoleCast_playId_fkey";

ALTER TABLE "PlayRoleCast"
  ADD CONSTRAINT "PlayRoleCast_playId_fkey"
  FOREIGN KEY ("playId") REFERENCES "Play"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PlayRoleCast"
  ADD CONSTRAINT "PlayRoleCast_playRoleId_fkey"
  FOREIGN KEY ("playRoleId") REFERENCES "PlayRole"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PlayRoleCast"
  ADD CONSTRAINT "PlayRoleCast_personId_fkey"
  FOREIGN KEY ("personId") REFERENCES "Person"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
