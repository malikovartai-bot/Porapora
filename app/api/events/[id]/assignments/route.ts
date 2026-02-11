import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireApiAuth } from '@/lib/access';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireApiAuth(['OWNER', 'MANAGER']);
  if ('error' in auth) return auth.error;

  const body = await req.json();
  const event = await prisma.event.findUnique({ where: { id: params.id } });
  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

  const overlapping = await prisma.assignment.findFirst({
    where: {
      personId: body.personId,
      eventId: { not: params.id },
      event: {
        startAt: { lt: event.endAt ?? new Date(event.startAt.getTime() + 2 * 60 * 60 * 1000) },
        OR: [{ endAt: null }, { endAt: { gt: event.startAt } }]
      }
    },
    include: { event: true }
  });

  const assignment = await prisma.assignment.create({
    data: {
      eventId: params.id,
      personId: body.personId,
      jobTitle: body.jobTitle,
      notes: body.notes,
      callTime: body.callTime ? new Date(body.callTime) : null
    },
    include: { person: true }
  });

  return NextResponse.json({ assignment, warning: overlapping ? `Конфликт с сеансом: ${overlapping.event.title}` : null });
}
