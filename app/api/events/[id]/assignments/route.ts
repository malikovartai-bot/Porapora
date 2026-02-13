import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireApiAuth } from '@/lib/access';
import { assignmentSchema } from '@/lib/schemas';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireApiAuth(['OWNER', 'MANAGER']);
  if ('error' in auth) return auth.error;

  const parsed = assignmentSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const body = parsed.data;

  const event = await prisma.event.findUnique({ where: { id: params.id } });
  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

  const person = await prisma.person.findUnique({ where: { id: body.personId } });
  if (!person) return NextResponse.json({ error: 'Person not found' }, { status: 404 });

  const role = await prisma.playRole.findUnique({ where: { id: body.roleId } });
  if (!role) return NextResponse.json({ error: 'Role not found' }, { status: 404 });
  if (event.playId && role.playId !== event.playId) {
    return NextResponse.json({ error: 'Role belongs to another play' }, { status: 400 });
  }

  const duplicate = await prisma.assignment.findFirst({
    where: { eventId: params.id, roleId: body.roleId }
  });
  if (duplicate) return NextResponse.json({ error: 'Role is already assigned in this event' }, { status: 409 });

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

  try {
    const assignment = await prisma.assignment.create({
      data: {
        eventId: params.id,
        personId: body.personId,
        roleId: body.roleId,
        jobTitle: body.jobTitle,
        notes: body.notes,
        callTime: body.callTime ? new Date(body.callTime) : null
      },
      include: { person: true, role: true }
    });

    return NextResponse.json({ assignment, warning: overlapping ? `Конфликт с сеансом: ${overlapping.event.title}` : null });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create assignment', details: String(error) }, { status: 500 });
  }
}
