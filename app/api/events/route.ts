import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireApiAuth } from '@/lib/access';
import { eventSchema } from '@/lib/schemas';

export async function GET(req: NextRequest) {
  const auth = await requireApiAuth(['OWNER', 'MANAGER', 'TECH', 'ACTOR']);
  if ('error' in auth) return auth.error;
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type') || undefined;
  const status = searchParams.get('status') || undefined;
  const from = searchParams.get('from') ? new Date(searchParams.get('from')!) : undefined;
  const to = searchParams.get('to') ? new Date(searchParams.get('to')!) : undefined;
  const where: any = {
    ...(type ? { type } : {}),
    ...(status ? { status } : {}),
    ...(from || to ? { startAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {})
  };
  if (auth.role === 'ACTOR') where.assignments = { some: { personId: (auth.session!.user as any).personId || '' } };
  return NextResponse.json(await prisma.event.findMany({ where, include: { play: true, venue: true, assignments: { include: { person: true } } }, orderBy: { startAt: 'asc' } }));
}

export async function POST(req: NextRequest) {
  const auth = await requireApiAuth(['OWNER', 'MANAGER']);
  if ('error' in auth) return auth.error;
  const parsed = eventSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const data = parsed.data;
  return NextResponse.json(await prisma.event.create({ data: { ...data, startAt: new Date(data.startAt), endAt: data.endAt ? new Date(data.endAt) : null, playId: data.playId || null, venueId: data.venueId || null } }));
}
