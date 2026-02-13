'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

/**
 * Создать роль спектакля (PlayRole)
 * sortOrder назначается автоматически: max(sortOrder)+1 в рамках спектакля.
 *
 * form fields:
 * - playId (hidden)
 * - title
 * - notes (optional)
 */
export async function createPlayRole(formData: FormData) {
  const playId = String(formData.get('playId') ?? '').trim();
  const titleRaw = formData.get('title');
  const notesRaw = formData.get('notes');

  if (!playId) throw new Error('playId is required');
  const title = typeof titleRaw === 'string' ? titleRaw.trim() : '';
  if (!title) throw new Error('title is required');

  const notes = typeof notesRaw === 'string' && notesRaw.trim().length ? notesRaw.trim() : null;

  const agg = await prisma.playRole.aggregate({
    where: { playId },
    _max: { sortOrder: true },
  });

  const nextSortOrder = (agg._max.sortOrder ?? 0) + 1;

  await prisma.playRole.create({
    data: {
      playId,
      title,
      sortOrder: nextSortOrder,
      notes,
    },
    select: { id: true },
  });

  revalidatePath(`/plays/${playId}`);
  revalidatePath(`/plays/${playId}/roles`);
  redirect(`/plays/${playId}/roles`);
}

/**
 * Обновить роль спектакля (PlayRole)
 * form fields:
 * - playId (hidden)
 * - roleId (hidden)
 * - title
 * - sortOrder (optional number)
 * - notes (optional)
 */
export async function updatePlayRole(formData: FormData) {
  const playId = String(formData.get('playId') ?? '').trim();
  const roleId = String(formData.get('roleId') ?? '').trim();
  const titleRaw = formData.get('title');
  const sortOrderRaw = formData.get('sortOrder');
  const notesRaw = formData.get('notes');

  if (!playId) throw new Error('playId is required');
  if (!roleId) throw new Error('roleId is required');

  const title = typeof titleRaw === 'string' ? titleRaw.trim() : '';
  if (!title) throw new Error('title is required');

  const sortOrder =
    typeof sortOrderRaw === 'string' && sortOrderRaw.trim().length ? Number(sortOrderRaw) : 0;

  const notes = typeof notesRaw === 'string' && notesRaw.trim().length ? notesRaw.trim() : null;

  await prisma.playRole.update({
    where: { id: roleId },
    data: {
      title,
      sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
      notes,
    },
    select: { id: true },
  });

  revalidatePath(`/plays/${playId}`);
  revalidatePath(`/plays/${playId}/roles`);
  redirect(`/plays/${playId}/roles`);
}

/**
 * Удалить роль спектакля (PlayRole)
 * form fields:
 * - playId (hidden)
 * - roleId (hidden)
 */
export async function deletePlayRole(formData: FormData) {
  const playId = String(formData.get('playId') ?? '').trim();
  const roleId = String(formData.get('roleId') ?? '').trim();

  if (!playId) throw new Error('playId is required');
  if (!roleId) throw new Error('roleId is required');

  await prisma.playRole.delete({ where: { id: roleId } });

  revalidatePath(`/plays/${playId}`);
  revalidatePath(`/plays/${playId}/roles`);
  redirect(`/plays/${playId}/roles`);
}

/**
 * В текущей Prisma-схеме отдельной модели "базового состава" нет.
 * Экшен оставлен как no-op для совместимости маршрутов.
 */
export async function setPlayRoleCast(formData: FormData) {
  const playId = String(formData.get('playId') ?? '').trim();

  if (!playId) throw new Error('playId is required');

  revalidatePath(`/plays/${playId}`);
  revalidatePath(`/plays/${playId}/edit`);
  revalidatePath(`/plays/${playId}/roles`);
  redirect(`/plays/${playId}/edit`);
}
