import crypto from "crypto";
import type { parseInticketsXlsx } from "@/lib/finance/intickets";

type ParsedReport = ReturnType<typeof parseInticketsXlsx>;

type ParsedMeta = ParsedReport["meta"] & {
  reportId?: string | number | null;
  documentId?: string | number | null;
  uuid?: string | number | null;
  accountId?: string | number | null;
  organizerId?: string | number | null;
  reportType?: string | number | null;
  eventId?: string | number | null;
  salesCount?: number | string | null;
  createdAt?: Date | string | null;
};

function normalizeDate(v: Date | string | null | undefined): string {
  if (!v) return "";
  const d = v instanceof Date ? v : new Date(v);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString();
}

function normalizeMoney(v: unknown): string {
  if (v === null || v === undefined || v === "") return "";
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return "";
  return (Math.round(n * 100) / 100).toFixed(2);
}

function normalizeString(v: unknown): string {
  return String(v ?? "").trim().toLowerCase();
}

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function buildStableFallbackJson(parsed: ParsedReport): string {
  const meta = parsed.meta as ParsedMeta;
  const metaNormalized = {
    reportNo: normalizeString(meta.reportNo),
    contractNo: normalizeString(meta.contractNo),
    reportDate: normalizeDate(meta.reportDate),
    periodStart: normalizeDate(meta.periodStart),
    periodEnd: normalizeDate(meta.periodEnd),
    grossSales: normalizeMoney(meta.grossSales),
    serviceFee: normalizeMoney(meta.serviceFee),
    netToOrganizer: normalizeMoney(meta.netToOrganizer),
  };

  const lines = parsed.lines
    .map((line) => ({
      playTitle: normalizeString(line.playTitle),
      sessionAt: normalizeDate(line.sessionAt),
      canceledInfo: normalizeString(line.canceledInfo),
      ticketsCount: Number(line.ticketsCount ?? 0),
      grossAmount: normalizeMoney(line.grossAmount),
      servicePercent: normalizeMoney(line.servicePercent),
      partnerPercent: normalizeMoney(line.partnerPercent),
    }))
    .sort((a, b) => `${a.playTitle}_${a.sessionAt}`.localeCompare(`${b.playTitle}_${b.sessionAt}`));

  return JSON.stringify({ source: "INTICKETS", meta: metaNormalized, lines });
}

export function computeReportFingerprint(parsed: ParsedReport): string {
  const meta = parsed.meta as ParsedMeta;

  const preferredId = meta.reportId ?? meta.documentId ?? meta.uuid;
  if (preferredId) {
    return sha256(`v1|source:INTICKETS|metaId:${normalizeString(preferredId)}`);
  }

  if ((meta.accountId || meta.organizerId) && meta.periodStart && meta.periodEnd) {
    return sha256(
      [
        "v1",
        "source:INTICKETS",
        `account:${normalizeString(meta.accountId)}`,
        `organizer:${normalizeString(meta.organizerId)}`,
        `periodStart:${normalizeDate(meta.periodStart)}`,
        `periodEnd:${normalizeDate(meta.periodEnd)}`,
        `reportType:${normalizeString(meta.reportType)}`,
      ].join("|")
    );
  }

  if (meta.eventId || meta.createdAt || meta.salesCount) {
    return sha256(
      [
        "v1",
        "source:INTICKETS",
        `eventId:${normalizeString(meta.eventId)}`,
        `salesCount:${Number(meta.salesCount ?? 0)}`,
        `gross:${normalizeMoney(meta.grossSales)}`,
        `net:${normalizeMoney(meta.netToOrganizer)}`,
        `createdAt:${normalizeDate(meta.createdAt)}`,
      ].join("|")
    );
  }

  return sha256(buildStableFallbackJson(parsed));
}
