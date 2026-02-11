'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

/**
 * Внешняя занятость (другие проекты)
 *
 * form fields:
 * - personId
 * - title
 * - startAt (datetime-local)
 * - endAt (datetime-local, optional)
 * - notes (optional)
 */
export async function createExternalBooking(formData: FormData) {
  const personId = String(formData.get('personId') ?? '').trim();
  const title = String(formData.get('title') ?? '').trim();
  const startAtRaw = String(formData.get('startAt') ?? '').trim();
  const endAtRaw = String(formData.get('endAt') ?? '').trim();
  const notesRaw = String(formData.get('notes') ?? '').trim();

  if (!personId) throw new Error('personId is required');
  if (!title) throw new Error('title is required');
  if (!startAtRaw) throw new Error('startAt is required');

  const startAt = new Date(startAtRaw);
  if (Number.isNaN(startAt.getTime())) throw new Error('startAt is invalid');

  const endAt = endAtRaw ? new Date(endAtRaw) : null;
  if (endAtRaw && endAt && Number.isNaN(endAt.getTime())) throw new Error('endAt is invalid');

  const notes = notesRaw.length ? notesRaw : null;

  await prisma.externalBooking.create({
    data: {
      personId,
      title,
      startAt,
      endAt,
      notes,
    },
    select: { id: true },
  });

  revalidatePath(`/people/${personId}/schedule`);
  redirect(`/people/${personId}/schedule`);
}

/**
 * Удалить внешнюю занятость
 *
 * form fields:
 * - personId
 * - bookingId
 */
export async function deleteExternalBooking(formData: FormData) {
  const personId = String(formData.get('personId') ?? '').trim();
  const bookingId = String(formData.get('bookingId') ?? '').trim();

  if (!personId) throw new Error('personId is required');
  if (!bookingId) throw new Error('bookingId is required');

  await prisma.externalBooking.delete({ where: { id: bookingId } });

  revalidatePath(`/people/${personId}/schedule`);
  redirect(`/people/${personId}/schedule`);
}
