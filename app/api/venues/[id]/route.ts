import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireApiAuth } from '@/lib/access';
import { venueSchema } from '@/lib/schemas';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireApiAuth(['OWNER', 'MANAGER']);
  if ('error' in auth) return auth.error;
  const parsed = venueSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  return NextResponse.json(await prisma.venue.update({ where: { id: params.id }, data: parsed.data }));
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireApiAuth(['OWNER', 'MANAGER']);
  if ('error' in auth) return auth.error;
  await prisma.venue.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
