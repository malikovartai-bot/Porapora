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

function normalizeCell(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v)
    .replace(/\s+/g, " ")
    .replace(/ё/g, "е")
    .trim()
    .toLowerCase();
}

function parseDateTimeRu(v: unknown): Date | null {
  if (!v) return null;
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v;

  if (typeof v === "number") {
    const excelEpoch = Date.UTC(1899, 11, 30);
    const day = Math.floor(v);
    const time = v - day;
    const totalSeconds = Math.round(time * 24 * 60 * 60);
    const d = new Date(excelEpoch + day * 86400000 + totalSeconds * 1000);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const s = String(v).trim();
  const withTime = /^(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(s);
  if (withTime) {
    const dd = Number(withTime[1]);
    const mm = Number(withTime[2]) - 1;
    const yyyy = Number(withTime[3]);
    const HH = Number(withTime[4]);
    const MI = Number(withTime[5]);
    const SS = withTime[6] ? Number(withTime[6]) : 0;
    const d = new Date(yyyy, mm, dd, HH, MI, SS);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const onlyDate = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(s);
  if (onlyDate) {
    const d = new Date(Number(onlyDate[3]), Number(onlyDate[2]) - 1, Number(onlyDate[1]));
    return Number.isNaN(d.getTime()) ? null : d;
  }

  return null;
}

function toNumber(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const s = String(v).replace(/\s/g, "").replace(",", ".");
  const n = Number(s);
  return Number.isNaN(n) ? null : n;
}

type HeaderColumns = {
  no: number;
  playTitle: number;
  sessionAt: number;
  canceledInfo: number;
  ticketsCount: number;
  grossAmount: number;
  servicePercent: number;
  partnerPercent: number;
};

function findHeaderColumns(rows: unknown[][]): { rowIndex: number; columns: HeaderColumns } | null {
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i] ?? [];
    const normalized = row.map((c) => normalizeCell(c));

    const no = normalized.findIndex((c) => c === "№ п/п" || c === "n п/п" || c === "nп/п");
    const playTitle = normalized.findIndex((c) => c.includes("мероприят"));
    const sessionAt = normalized.findIndex((c) => c.includes("сеанс"));
    const canceledInfo = normalized.findIndex((c) => c.includes("отмена") || c.includes("перенос") || c.includes("замена"));
    const ticketsCount = normalized.findIndex((c) => c.includes("кол-во билетов") || c.includes("количество билетов"));
    const grossAmount = normalized.findIndex((c) => c.includes("сумма реализованных билетов"));
    const servicePercent = normalized.findIndex((c) => c.includes("вознаграждение за услуги") && c.includes("%"));
    const partnerPercent = normalized.findIndex((c) => c.includes("вознаграждение за поручение") && c.includes("%"));

    if (playTitle >= 0 && sessionAt >= 0 && ticketsCount >= 0 && grossAmount >= 0) {
      return {
        rowIndex: i,
        columns: {
          no,
          playTitle,
          sessionAt,
          canceledInfo,
          ticketsCount,
          grossAmount,
          servicePercent,
          partnerPercent,
        },
      };
    }
  }

  return null;
}

/**
 * Парсит типовой xlsx "Отчет" от Intickets.
 * Возвращает meta + строки по каждому сеансу.
 */
export function parseInticketsXlsx(buffer: ArrayBuffer): { meta: InticketsReportMeta; lines: InticketsReportLine[] } {
  const wb = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheetByName = wb.SheetNames.find((name) => normalizeCell(name) === "отчет" || normalizeCell(name) === "отчёт");
  const ws = wb.Sheets[sheetByName ?? wb.SheetNames[0]];
  const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null });

  const header = findHeaderColumns(rows);
  if (!header) return { meta: {}, lines: [] };

  const { rowIndex: headerIdx, columns } = header;

  const meta: InticketsReportMeta = {};
  const lines: InticketsReportLine[] = [];

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const r = rows[i] ?? [];

    const noRaw = columns.no >= 0 ? r[columns.no] : i - headerIdx;
    const playTitleRaw = r[columns.playTitle];
    const sessionRaw = r[columns.sessionAt];

    const noNum = toNumber(noRaw);
    if (noNum === null || !Number.isFinite(noNum)) break;

    const playTitle = playTitleRaw ? String(playTitleRaw).trim() : "";
    const sessionAt = parseDateTimeRu(sessionRaw);
    if (!playTitle || !sessionAt) continue;

    const ticketsCount = toNumber(r[columns.ticketsCount]) ?? 0;
    const grossAmount = toNumber(r[columns.grossAmount]) ?? 0;
    const servicePercent = columns.servicePercent >= 0 ? toNumber(r[columns.servicePercent]) : null;
    const partnerPercent = columns.partnerPercent >= 0 ? toNumber(r[columns.partnerPercent]) : null;
    const canceledInfo = columns.canceledInfo >= 0 && r[columns.canceledInfo] ? String(r[columns.canceledInfo]).trim() : null;

    lines.push({
      playTitle,
      sessionAt,
      canceledInfo,
      ticketsCount: Math.round(ticketsCount),
      grossAmount,
      servicePercent,
      partnerPercent,
    });
  }

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i] ?? [];
    const label = normalizeCell(r[1]);
    if (label.startsWith("2.") && label.includes("сумма реализованных билетов")) {
      const v = toNumber(r[6]);
      if (v !== null) meta.grossSales = v;
    }
    if (label.startsWith("3.") && label.includes("вознаграждение составляет")) {
      const v = toNumber(r[6]);
      if (v !== null) meta.serviceFee = v;
    }
    if (label.startsWith("4.") && label.includes("подлежащая перечислению")) {
      const v = toNumber(r[6]);
      if (v !== null) meta.netToOrganizer = v;
    }
  }

  return { meta, lines };
}
