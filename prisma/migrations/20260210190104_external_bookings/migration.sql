/*
  Warnings:

  - The values [DIRECTOR,SOUND,LIGHT,STAGE_MACHINIST,PROPS,COSTUME,ASSISTANT_DIRECTOR,ADMINISTRATOR] on the enum `PersonRole` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the `PlayRoleCast` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "PersonRole_new" AS ENUM ('ACTOR', 'TECH', 'OTHER');
ALTER TABLE "Person" ALTER COLUMN "role" TYPE "PersonRole_new" USING ("role"::text::"PersonRole_new");
ALTER TYPE "PersonRole" RENAME TO "PersonRole_old";
ALTER TYPE "PersonRole_new" RENAME TO "PersonRole";
DROP TYPE "PersonRole_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "PlayRoleCast" DROP CONSTRAINT "PlayRoleCast_personId_fkey";

-- DropForeignKey
ALTER TABLE "PlayRoleCast" DROP CONSTRAINT "PlayRoleCast_playRoleId_fkey";

-- DropTable
DROP TABLE "PlayRoleCast";

-- CreateTable
CREATE TABLE "ExternalBooking" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExternalBooking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExternalBooking_personId_startAt_idx" ON "ExternalBooking"("personId", "startAt");

-- AddForeignKey
ALTER TABLE "ExternalBooking" ADD CONSTRAINT "ExternalBooking_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
