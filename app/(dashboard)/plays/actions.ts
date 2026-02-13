'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

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

export async function setBaseCast(playId: string, roleId: string, personId: string | null) {
  if (!playId) throw new Error('playId is required');
  if (!roleId) throw new Error('roleId is required');

  const role = await prisma.playRole.findUnique({
    where: { id: roleId },
    select: { id: true, playId: true },
  });

  if (!role || role.playId !== playId) {
    throw new Error('role does not belong to play');
  }

  if (!personId) {
    await prisma.playRoleCast.deleteMany({ where: { playId, playRoleId: roleId } });
    return;
  }

  const person = await prisma.person.findUnique({ where: { id: personId }, select: { id: true } });
  if (!person) throw new Error('person not found');

  await prisma.playRoleCast.upsert({
    where: { playRoleId: roleId },
    update: { playId, personId },
    create: { playId, playRoleId: roleId, personId },
  });
}

export async function setPlayRoleCast(formData: FormData) {
  const playId = String(formData.get('playId') ?? '').trim();
  const roleId = String(formData.get('roleId') ?? '').trim();
  const personId = String(formData.get('personId') ?? '').trim() || null;

  await setBaseCast(playId, roleId, personId);

  revalidatePath(`/plays/${playId}`);
  revalidatePath(`/plays/${playId}/edit`);
  revalidatePath(`/plays/${playId}/roles`);
  redirect(`/plays/${playId}/edit`);
}
