"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";

/**
 * These actions are designed to be called from a Server Component page like:
 * <form action={async (fd) => { "use server"; await createEventExpense(event.id, fd); }}>
 *
 * IMPORTANT:
 * - EventExpense schema (as in your schema.prisma):
 *   category: ExpenseCategory (enum)
 *   title: String (required)
 *   amount: Decimal(12,2)
 *   notes: String?
 */

function parseAmount(input: FormDataEntryValue | null): Prisma.Decimal {
  const raw = String(input ?? "").trim();
  const normalized = raw.replace(/\s/g, "").replace(",", ".");
  const num = Number(normalized);
  if (!Number.isFinite(num) || Number.isNaN(num) || num <= 0) {
    throw new Error("Сумма должна быть числом больше 0");
  }
  // Keep 2 decimals
  const fixed = Math.round(num * 100) / 100;
  return new Prisma.Decimal(fixed);
}

export async function createEventExpense(eventId: string, formData: FormData) {
  const category = String(formData.get("category") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!eventId) throw new Error("eventId is required");
  if (!category) throw new Error("Категория обязательна");
  if (!title) throw new Error("Название/получатель обязательны");

  const amount = parseAmount(formData.get("amount"));

  await prisma.eventExpense.create({
    data: {
      eventId,
      category: category as any,
      title,
      amount,
      notes,
    },
  });

  revalidatePath(`/events/${eventId}/finance`);
  // Redirect forces refresh in all cases (so user always sees the new row)
  redirect(`/events/${eventId}/finance`);
}

export async function deleteEventExpense(eventId: string, expenseId: string) {
  if (!eventId) throw new Error("eventId is required");
  if (!expenseId) throw new Error("expenseId is required");

  await prisma.eventExpense.delete({ where: { id: expenseId } });

  revalidatePath(`/events/${eventId}/finance`);
  redirect(`/events/${eventId}/finance`);
}

export async function deleteFinanceReport(eventId: string, reportId: string) {
  if (!eventId) throw new Error("eventId is required");
  if (!reportId) throw new Error("reportId is required");

  // Report can contain lines for multiple events. We delete the report fully.
  // If FK cascade is not configured, we delete lines first.
  await prisma.$transaction([
    prisma.financeReportLine.deleteMany({ where: { reportId } }),
    prisma.financeReport.delete({ where: { id: reportId } }),
  ]);

  revalidatePath(`/events/${eventId}/finance`);
  revalidatePath(`/dds`);
  redirect(`/events/${eventId}/finance`);
}
