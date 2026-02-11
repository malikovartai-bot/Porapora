/*
  Warnings:

  - A unique constraint covering the columns `[contentHash]` on the table `FinanceReport` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "FinanceReport" ADD COLUMN     "contentHash" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "FinanceReport_contentHash_key" ON "FinanceReport"("contentHash");
