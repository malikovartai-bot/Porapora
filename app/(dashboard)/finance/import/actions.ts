"use server";

import { prisma } from "@/lib/prisma";
import { parseInticketsXlsx } from "@/lib/finance/intickets";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import crypto from "crypto";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";

type MetaWithRefunds = ReturnType<typeof parseInticketsXlsx>['meta'] & {
  refundsAmount?: unknown;
};

function safeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "_");
}

function buildRedirectUrl(basePath: string, params: Record<string, string>) {
  const sp = new URLSearchParams(params);
  const join = basePath.includes("?") ? "&" : "?";
  return basePath + join + sp.toString();
}

function withinMinutes(d: Date, minutes: number) {
  const ms = minutes * 60 * 1000;
  return {
    gte: new Date(d.getTime() - ms),
    lte: new Date(d.getTime() + ms),
  };
}

function moneyToString(v: any): string {
  // Prisma Decimal or number -> "12345.67"
  if (v === null || v === undefined) return "0.00";
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n) || Number.isNaN(n)) return "0.00";
  return (Math.round(n * 100) / 100).toFixed(2);
}

/**
 * ВАЖНО: дедупликация НЕ по байтам файла (xlsx часто меняет байты при пересохранении),
 * а по "смыслу": meta + нормализованный набор строк сеансов.
 *
 * Требует поле в Prisma:
 *   contentHash String? @unique
 */
function computeSemanticHash(parsed: ReturnType<typeof parseInticketsXlsx>): string {
  const meta = {
    provider: "INTICKETS",
    reportNo: String(parsed.meta.reportNo ?? "").trim(),
    contractNo: String(parsed.meta.contractNo ?? "").trim(),
    reportDate: parsed.meta.reportDate ? new Date(parsed.meta.reportDate).toISOString().slice(0, 10) : "",
    periodStart: parsed.meta.periodStart ? new Date(parsed.meta.periodStart).toISOString().slice(0, 10) : "",
    periodEnd: parsed.meta.periodEnd ? new Date(parsed.meta.periodEnd).toISOString().slice(0, 10) : "",
    grossSales: moneyToString(parsed.meta.grossSales),
    serviceFee: moneyToString(parsed.meta.serviceFee),
    netToOrganizer: moneyToString(parsed.meta.netToOrganizer),
    refundsAmount: moneyToString((parsed.meta as MetaWithRefunds).refundsAmount),
  };

  const lines = parsed.lines
    .map((l) => ({
      playTitle: String(l.playTitle ?? "").trim().toLowerCase(),
      sessionAt: new Date(l.sessionAt).toISOString(), // точное время
      ticketsCount: l.ticketsCount ?? 0,
      grossAmount: moneyToString(l.grossAmount),
      servicePercent: l.servicePercent !== null && l.servicePercent !== undefined ? moneyToString(l.servicePercent) : "",
      partnerPercent: l.partnerPercent !== null && l.partnerPercent !== undefined ? moneyToString(l.partnerPercent) : "",
      canceledInfo: String(l.canceledInfo ?? "").trim().toLowerCase(),
    }))
    .sort((a, b) => (a.playTitle + a.sessionAt).localeCompare(b.playTitle + b.sessionAt));

  const payload = JSON.stringify({ meta, lines });
  return crypto.createHash("sha256").update(payload).digest("hex");
}

/**
 * Импорт отчёта Intickets:
 * - сохраняет файл в /public/uploads/finance (локально)
 * - создаёт FinanceReport (+ contentHash)
 * - если contentHash уже есть в базе — блокирует дубль (P2002)
 * - строки матчит по Play + sessionAt (±2 минуты), иначе создаёт Event
 *
 * FormData:
 * - file: File (.xlsx)
 * - redirectTo?: string
 */
export async function importInticketsXlsxGlobal(formData: FormData) {
  const redirectToRaw = String(formData.get("redirectTo") ?? "").trim();
  const redirectTo = redirectToRaw && redirectToRaw.startsWith("/") ? redirectToRaw : "/finance/import";

  const file = formData.get("file") as File | null;
  if (!file) throw new Error("Файл не выбран");

  const bytes = await file.arrayBuffer();
  const parsed = parseInticketsXlsx(bytes);

  if (!parsed.lines.length) {
    redirect(
      buildRedirectUrl(redirectTo, {
        error: encodeURIComponent("Не нашёл таблицу сеансов в файле (проверь лист 'Отчет')."),
      })
    );
  }

  // SEMANTIC HASH for dedupe
  const contentHash = computeSemanticHash(parsed);

  // save file locally
  const uploadsDir = path.join(process.cwd(), "public", "uploads", "finance");
  await mkdir(uploadsDir, { recursive: true });

  const rand = crypto.randomBytes(8).toString("hex");
  const storedName = `${Date.now()}_${rand}_${safeFilename(file.name)}`;
  const storagePath = `/uploads/finance/${storedName}`;
  await writeFile(path.join(uploadsDir, storedName), Buffer.from(bytes));

  let createdPlays = 0;
  let createdEvents = 0;

  // Create report (unique by contentHash)
  let report: { id: string };
  try {
    report = await prisma.financeReport.create({
      data: {
        provider: "INTICKETS",
        fileOriginalName: file.name,
        fileStoragePath: storagePath,
        mimeType: file.type || null,
        size: file.size || null,

        contentHash,

        grossSales: parsed.meta.grossSales ?? null,
        serviceFee: parsed.meta.serviceFee ?? null,
        netToOrganizer: parsed.meta.netToOrganizer ?? null,
        refundsAmount: (parsed.meta as MetaWithRefunds).refundsAmount as Prisma.Decimal | null | undefined ?? null,
        reportNo: parsed.meta.reportNo ?? null,
        contractNo: parsed.meta.contractNo ?? null,
        reportDate: parsed.meta.reportDate ?? null,
        periodStart: parsed.meta.periodStart ?? null,
        periodEnd: parsed.meta.periodEnd ?? null,
      },
      select: { id: true },
    });
  } catch (e: any) {
    const msg = String(e?.message ?? e);

    if (e?.code === "P2002") {
      // Try to find existing by hash for nicer UX (optional)
      const existing = await prisma.financeReport.findFirst({
        where: { contentHash },
        select: { id: true, fileOriginalName: true },
      });
      redirect(
        buildRedirectUrl(redirectTo, {
          error: encodeURIComponent(
            `Этот отчёт уже импортирован (дубликат по содержимому).${existing?.fileOriginalName ? ` Ранее: "${existing.fileOriginalName}".` : ""}`
          ),
          ...(existing?.id ? { existingReportId: existing.id } : {}),
        })
      );
    }

    if (msg.includes("Unknown argument") && msg.includes("contentHash")) {
      redirect(
        buildRedirectUrl(redirectTo, {
          error: encodeURIComponent(
            "Дедупликация включена, но миграция не применена. Запусти: npx prisma migrate dev -n add_finance_report_content_hash"
          ),
        })
      );
    }

    redirect(
      buildRedirectUrl(redirectTo, {
        error: encodeURIComponent("Ошибка при создании отчёта: " + msg),
      })
    );
  }

  // Lines -> Play/Event -> FinanceReportLine
  for (const l of parsed.lines) {
    let play = await prisma.play.findFirst({ where: { title: l.playTitle }, select: { id: true } });
    if (!play) {
      play = await prisma.play.create({ data: { title: l.playTitle }, select: { id: true } });
      createdPlays++;
    }

    const range = withinMinutes(l.sessionAt, 2);
    let event = await prisma.event.findFirst({
      where: { playId: play.id, startAt: range },
      select: { id: true },
    });

    if (!event) {
      event = await prisma.event.create({
        data: {
          type: "SHOW",
          title: l.playTitle,
          startAt: l.sessionAt,
          status: "CONFIRMED",
          playId: play.id,
        },
        select: { id: true },
      });
      createdEvents++;
    }

    await prisma.financeReportLine.create({
      data: {
        reportId: report.id,
        playTitle: l.playTitle,
        sessionAt: l.sessionAt,
        canceledInfo: l.canceledInfo ?? null,
        ticketsCount: l.ticketsCount,
        grossAmount: l.grossAmount,
        servicePercent: l.servicePercent ?? null,
        partnerPercent: l.partnerPercent ?? null,
        eventId: event.id,
      },
    });
  }

  redirect(
    buildRedirectUrl(redirectTo, {
      ok: "1",
      reportId: report.id,
      lines: String(parsed.lines.length),
      plays: String(createdPlays),
      events: String(createdEvents),
    })
  );
}
