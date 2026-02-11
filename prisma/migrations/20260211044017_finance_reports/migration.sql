-- CreateEnum
CREATE TYPE "FinanceProvider" AS ENUM ('INTICKETS', 'OTHER');

-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('HONORARIUM', 'DELIVERY', 'BUFFET', 'RENT', 'PROPS', 'COSTUME', 'MARKETING', 'OTHER');

-- CreateTable
CREATE TABLE "FinanceReport" (
    "id" TEXT NOT NULL,
    "provider" "FinanceProvider" NOT NULL DEFAULT 'INTICKETS',
    "reportNo" TEXT,
    "contractNo" TEXT,
    "reportDate" TIMESTAMP(3),
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "grossSales" DECIMAL(12,2),
    "serviceFee" DECIMAL(12,2),
    "refundsAmount" DECIMAL(12,2),
    "netToOrganizer" DECIMAL(12,2),
    "fileOriginalName" TEXT NOT NULL,
    "fileStoragePath" TEXT NOT NULL,
    "mimeType" TEXT,
    "size" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinanceReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinanceReportLine" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "playTitle" TEXT NOT NULL,
    "sessionAt" TIMESTAMP(3) NOT NULL,
    "canceledInfo" TEXT,
    "ticketsCount" INTEGER NOT NULL,
    "grossAmount" DECIMAL(12,2) NOT NULL,
    "servicePercent" DECIMAL(5,2),
    "partnerPercent" DECIMAL(5,2),
    "eventId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinanceReportLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventExpense" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "category" "ExpenseCategory" NOT NULL,
    "title" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventExpense_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FinanceReportLine_sessionAt_idx" ON "FinanceReportLine"("sessionAt");

-- CreateIndex
CREATE INDEX "FinanceReportLine_eventId_idx" ON "FinanceReportLine"("eventId");

-- CreateIndex
CREATE INDEX "EventExpense_eventId_idx" ON "EventExpense"("eventId");

-- CreateIndex
CREATE INDEX "EventExpense_category_idx" ON "EventExpense"("category");

-- AddForeignKey
ALTER TABLE "FinanceReportLine" ADD CONSTRAINT "FinanceReportLine_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "FinanceReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceReportLine" ADD CONSTRAINT "FinanceReportLine_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventExpense" ADD CONSTRAINT "EventExpense_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
