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

function isFingerprintUniqueConflict(error: unknown) {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return false;
  if (error.code !== "P2002") return false;

  const target = error.meta?.target;
  if (!Array.isArray(target)) return false;

  return target.includes("fingerprint") || target.includes("contentHash");
}

function isUnknownFinanceReportFieldError(error: unknown, field: string) {
  if (!(error instanceof Error)) return false;
  return (
    error.message.includes(`Unknown argument \`${field}\``) ||
    error.message.includes(`Unknown field \`${field}\``) ||
    error.message.includes(`column "${field}" does not exist`)
  );
}

function isUnknownFingerprintError(error: unknown) {
  return isUnknownFinanceReportFieldError(error, "fingerprint");
}

async function detectFingerprintSupport() {
  try {
    await prisma.financeReport.findFirst({
      take: 1,
      select: { id: true, fingerprint: true } as never,
    } as never);
    return true;
  } catch (error) {
    if (isUnknownFingerprintError(error)) return false;
    throw error;
  }
}


type TimestampField = "importedAt" | "createdAt" | null;

async function detectReportTimestampField(): Promise<TimestampField> {
  try {
    await prisma.financeReport.findFirst({
      take: 1,
      select: { id: true, importedAt: true } as never,
    } as never);
    return "importedAt";
  } catch (error) {
    if (!isUnknownFinanceReportFieldError(error, "importedAt")) throw error;
  }

  try {
    await prisma.financeReport.findFirst({
      take: 1,
      select: { id: true, createdAt: true } as never,
    } as never);
    return "createdAt";
  } catch (error) {
    if (!isUnknownFinanceReportFieldError(error, "createdAt")) throw error;
  }

  return null;
}

function getImportedAtIso(value: unknown, timestampField: TimestampField) {
  if (!timestampField) return "";
  const ts = (value as Record<string, unknown> | null | undefined)?.[timestampField];
  return ts instanceof Date ? ts.toISOString() : "";
}
async function findExistingByHash(hash: string, hasFingerprint: boolean, timestampField: TimestampField) {
  const baseSelect = {
    id: true,
    originalFileName: true,
    ...(timestampField ? { [timestampField]: true } : {}),
  } as never;

  if (hasFingerprint) {
    return prisma.financeReport.findFirst({
      where: {
        OR: [{ fingerprint: hash } as never, { contentHash: hash }],
      } as never,
      select: { ...baseSelect, fingerprint: true } as never,
    } as never);
  }

  return prisma.financeReport.findFirst({
    where: { contentHash: hash },
    select: baseSelect,
  });
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
  const hasFingerprint = await detectFingerprintSupport();
  const timestampField = await detectReportTimestampField();

  const existing = await findExistingByHash(fingerprint, hasFingerprint, timestampField);

  if (existing) {
    redirect(
      buildRedirectUrl(redirectTo, {
        status: "duplicate",
        fingerprint,
        existingReportId: existing.id,
        importedAt: getImportedAtIso(existing, timestampField),
        originalFileName: existing.originalFileName ?? "",
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
      const createData: Record<string, unknown> = {
        provider: "INTICKETS",
        source: "INTICKETS",
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
      };

      if (hasFingerprint) {
        createData.fingerprint = fingerprint;
      }

      const report = await tx.financeReport.create({
        data: createData as never,
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
  } catch (e: unknown) {
    if (isFingerprintUniqueConflict(e)) {
      const conflict = await findExistingByHash(fingerprint, hasFingerprint, timestampField);
      redirect(
        buildRedirectUrl(redirectTo, {
          status: "duplicate",
          fingerprint,
          existingReportId: conflict?.id ?? "",
          importedAt: getImportedAtIso(conflict, timestampField),
          originalFileName: conflict?.originalFileName ?? "",
        })
      );
    }

    redirect(
      buildRedirectUrl(redirectTo, {
        status: "error",
        error: "Не удалось импортировать: " + String(e instanceof Error ? e.message : e),
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
