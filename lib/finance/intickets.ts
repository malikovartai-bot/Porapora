import * as XLSX from "xlsx";

export type InticketsReportMeta = {
  reportId?: string;
  documentId?: string;
  uuid?: string;
  accountId?: string;
  organizerId?: string;
  reportType?: string;
  eventId?: string;
  salesCount?: number;
  createdAt?: Date;
  grossSales?: number;
  serviceFee?: number;
  netToOrganizer?: number;
  reportNo?: string;
  contractNo?: string;
  reportDate?: Date;
  periodStart?: Date;
  periodEnd?: Date;
};

export type InticketsReportLine = {
  playTitle: string;
  sessionAt: Date;
  canceledInfo?: string | null;
  ticketsCount: number;
  grossAmount: number;
  servicePercent?: number | null;
  partnerPercent?: number | null;
};

function parseDateTimeRu(v: any): Date | null {
  if (!v) return null;
  if (v instanceof Date) return v;
  const s = String(v).trim();
  const m = /^(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(s);
  if (!m) return null;
  const dd = Number(m[1]);
  const mm = Number(m[2]) - 1;
  const yyyy = Number(m[3]);
  const HH = Number(m[4]);
  const MI = Number(m[5]);
  const SS = m[6] ? Number(m[6]) : 0;
  const d = new Date(yyyy, mm, dd, HH, MI, SS);
  return Number.isNaN(d.getTime()) ? null : d;
}

function toNumber(v: any): number | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return v;
  const s = String(v).replace(/\s/g, "").replace(",", ".");
  const n = Number(s);
  return Number.isNaN(n) ? null : n;
}

/**
 * Парсит типовой xlsx "Отчет" от Intickets.
 * Возвращает meta + строки по каждому сеансу.
 */
export function parseInticketsXlsx(buffer: ArrayBuffer): { meta: InticketsReportMeta; lines: InticketsReportLine[] } {
  const wb = XLSX.read(buffer, { type: "array" });
  const ws = wb.Sheets["Отчет"] ?? wb.Sheets[wb.SheetNames[0]];
  const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true });

  let headerIdx = -1;
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i] ?? [];
    if (r.includes("Мероприятие") && r.includes("Сеанс") && r.includes("Кол-во билетов")) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx === -1) return { meta: {}, lines: [] };

  const meta: InticketsReportMeta = {};
  const lines: InticketsReportLine[] = [];

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const r = rows[i] ?? [];
    const no = r[1];
    const playTitle = r[2];
    const sessionRaw = r[3];
    if (no === null || no === undefined || no === "") break;

    const noNum = typeof no === "number" ? no : Number(String(no).trim());
    if (!Number.isFinite(noNum)) break;

    const sessionAt = parseDateTimeRu(sessionRaw);
    if (!playTitle || !sessionAt) continue;

    const ticketsCount = toNumber(r[5]) ?? 0;
    const grossAmount = toNumber(r[6]) ?? 0;
    const servicePercent = toNumber(r[7]);
    const partnerPercent = toNumber(r[8]);

    lines.push({
      playTitle: String(playTitle).trim(),
      sessionAt,
      canceledInfo: r[4] ? String(r[4]).trim() : null,
      ticketsCount: Math.round(ticketsCount),
      grossAmount,
      servicePercent,
      partnerPercent,
    });
  }

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i] ?? [];
    const label = r[1] ? String(r[1]).trim() : "";
    if (label.startsWith("2.") && label.includes("Сумма реализованных билетов")) {
      const v = toNumber(r[6]);
      if (v !== null) meta.grossSales = v;
    }
    if (label.startsWith("3.") && label.includes("Вознаграждение составляет")) {
      const v = toNumber(r[6]);
      if (v !== null) meta.serviceFee = v;
    }
    if (
      label.startsWith("4.") &&
      (label.includes("Сумма, подлежащая перечислению") || label.includes("подлежащая перечислению"))
    ) {
      const v = toNumber(r[6]);
      if (v !== null) meta.netToOrganizer = v;
    }
  }

  return { meta, lines };
}
