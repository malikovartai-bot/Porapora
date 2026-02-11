/*
  Warnings:

  - The values [TECH,OTHER] on the enum `PersonRole` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "PersonRole_new" AS ENUM ('ACTOR', 'DIRECTOR', 'SOUND', 'LIGHT', 'STAGE_MACHINIST', 'PROPS', 'COSTUME', 'ASSISTANT_DIRECTOR', 'ADMINISTRATOR');
ALTER TABLE "Person" ALTER COLUMN "role" TYPE "PersonRole_new" USING ("role"::text::"PersonRole_new");
ALTER TYPE "PersonRole" RENAME TO "PersonRole_old";
ALTER TYPE "PersonRole_new" RENAME TO "PersonRole";
DROP TYPE "PersonRole_old";
COMMIT;
