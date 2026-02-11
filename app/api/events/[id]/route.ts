import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireApiAuth } from '@/lib/access';
import { eventSchema } from '@/lib/schemas';

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireApiAuth(['OWNER', 'MANAGER', 'TECH', 'ACTOR']);
  if ('error' in auth) return auth.error;

  const event = await prisma.event.findUnique({
    where: { id: params.id },
    include: {
      play: true,
      venue: true,
      assignments: { include: { person: true, role: true }, orderBy: { createdAt: 'asc' } },
      attachments: true,
      expenses: { orderBy: { createdAt: 'desc' } }
    }
  });

  if (!event) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  }

  if (auth.role === 'ACTOR') {
    const personId = (auth.session?.user as any)?.personId;
    const hasAccess = !!personId && event.assignments.some((item) => item.personId === personId);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  return NextResponse.json(event);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireApiAuth(['OWNER', 'MANAGER']);
  if ('error' in auth) return auth.error;

  const parsed = eventSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const data = parsed.data;

  try {
    const updated = await prisma.event.update({
      where: { id: params.id },
      data: {
        ...data,
        startAt: new Date(data.startAt),
        endAt: data.endAt ? new Date(data.endAt) : null,
        playId: data.playId || null,
        venueId: data.venueId || null
      }
    });

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update event', details: String(error) }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireApiAuth(['OWNER', 'MANAGER']);
  if ('error' in auth) return auth.error;

  try {
    await prisma.event.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete event', details: String(error) }, { status: 500 });
  }
}
