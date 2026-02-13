"use server";

import { prisma } from "@/lib/prisma";
import { parseInticketsXlsx } from "@/lib/finance/intickets";
import { computeReportFingerprint } from "@/lib/finance/reportFingerprint";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import crypto from "crypto";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";

type MetaWithRefunds = ReturnType<typeof parseInticketsXlsx>["meta"] & {
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

/**
 * Импорт отчёта Intickets:
 * - вычисляет fingerprint из содержимого отчёта
 * - если fingerprint уже есть в базе, возвращает duplicate
 * - иначе импортирует отчёт + строки в транзакции
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
        status: "error",
        error: "Не нашёл таблицу сеансов в файле (проверь лист 'Отчет').",
      })
    );
  }

  const fingerprint = computeReportFingerprint(parsed);

  const existing = await prisma.financeReport.findUnique({
    where: { fingerprint },
    select: { id: true, fingerprint: true, importedAt: true, originalFileName: true, fileOriginalName: true },
  });

  if (existing) {
    redirect(
      buildRedirectUrl(redirectTo, {
        status: "duplicate",
        fingerprint: existing.fingerprint,
        existingReportId: existing.id,
        importedAt: existing.importedAt.toISOString(),
        originalFileName: existing.originalFileName ?? existing.fileOriginalName,
      })
    );
  }

  const uploadsDir = path.join(process.cwd(), "public", "uploads", "finance");
  await mkdir(uploadsDir, { recursive: true });

  const rand = crypto.randomBytes(8).toString("hex");
  const storedName = `${Date.now()}_${rand}_${safeFilename(file.name)}`;
  const storagePath = `/uploads/finance/${storedName}`;
  await writeFile(path.join(uploadsDir, storedName), Buffer.from(bytes));

  let reportId = "";
  let createdPlays = 0;
  let createdEvents = 0;

  try {
    await prisma.$transaction(async (tx) => {
      const report = await tx.financeReport.create({
        data: {
          provider: "INTICKETS",
          source: "INTICKETS",
          fingerprint,
          originalFileName: file.name,
          fileOriginalName: file.name,
          fileStoragePath: storagePath,
          mimeType: file.type || null,
          size: file.size || null,

          contentHash: fingerprint,

          grossSales: parsed.meta.grossSales ?? null,
          serviceFee: parsed.meta.serviceFee ?? null,
          netToOrganizer: parsed.meta.netToOrganizer ?? null,
          refundsAmount: ((parsed.meta as MetaWithRefunds).refundsAmount as Prisma.Decimal | null | undefined) ?? null,
          reportNo: parsed.meta.reportNo ?? null,
          contractNo: parsed.meta.contractNo ?? null,
          reportDate: parsed.meta.reportDate ?? null,
          periodStart: parsed.meta.periodStart ?? null,
          periodEnd: parsed.meta.periodEnd ?? null,
        },
        select: { id: true },
      });

      reportId = report.id;

      for (const l of parsed.lines) {
        let play = await tx.play.findFirst({ where: { title: l.playTitle }, select: { id: true } });
        if (!play) {
          play = await tx.play.create({ data: { title: l.playTitle }, select: { id: true } });
          createdPlays++;
        }

        const range = withinMinutes(l.sessionAt, 2);
        let event = await tx.event.findFirst({
          where: { playId: play.id, startAt: range },
          select: { id: true },
        });

        if (!event) {
          event = await tx.event.create({
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

        await tx.financeReportLine.create({
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
    });
  } catch (e: any) {
    if (e?.code === "P2002") {
      const conflict = await prisma.financeReport.findUnique({
        where: { fingerprint },
        select: { id: true, fingerprint: true, importedAt: true, originalFileName: true, fileOriginalName: true },
      });
      redirect(
        buildRedirectUrl(redirectTo, {
          status: "duplicate",
          fingerprint,
          existingReportId: conflict?.id ?? "",
          importedAt: conflict?.importedAt?.toISOString?.() ?? "",
          originalFileName: conflict?.originalFileName ?? conflict?.fileOriginalName ?? "",
        })
      );
    }

    redirect(
      buildRedirectUrl(redirectTo, {
        status: "error",
        error: "Не удалось импортировать: " + String(e?.message ?? e),
      })
    );
  }

  redirect(
    buildRedirectUrl(redirectTo, {
      status: "success",
      reportId,
      lines: String(parsed.lines.length),
      plays: String(createdPlays),
      events: String(createdEvents),
      fingerprint,
    })
  );
}
