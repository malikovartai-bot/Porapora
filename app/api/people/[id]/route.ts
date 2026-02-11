import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireApiAuth } from '@/lib/access';
import { personSchema } from '@/lib/schemas';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireApiAuth(['OWNER', 'MANAGER']);
  if ('error' in auth) return auth.error;
  const parsed = personSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { userId, ...personData } = parsed.data;
  const person = await prisma.person.update({ where: { id: params.id }, data: personData });
  await prisma.user.updateMany({ where: { personId: params.id }, data: { personId: null } });
  if (userId) await prisma.user.update({ where: { id: userId }, data: { personId: params.id } });
  return NextResponse.json(person);
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireApiAuth(['OWNER', 'MANAGER']);
  if ('error' in auth) return auth.error;
  await prisma.person.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
