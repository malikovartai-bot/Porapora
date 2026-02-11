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

  const person = await prisma.$transaction(async (tx) => {
    const updated = await tx.person.update({ where: { id: params.id }, data: personData });
    await tx.user.updateMany({ where: { personId: params.id }, data: { personId: null } });
    if (userId) await tx.user.update({ where: { id: userId }, data: { personId: params.id } });
    return updated;
  });

  return NextResponse.json(person);
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireApiAuth(['OWNER', 'MANAGER']);
  if ('error' in auth) return auth.error;

  try {
    await prisma.$transaction(async (tx) => {
      await tx.user.updateMany({ where: { personId: params.id }, data: { personId: null } });
      await tx.assignment.deleteMany({ where: { personId: params.id } });
      await tx.externalBooking.deleteMany({ where: { personId: params.id } });
      await tx.person.delete({ where: { id: params.id } });
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete person', details: String(error) }, { status: 500 });
  }
}
