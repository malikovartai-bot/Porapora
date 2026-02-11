import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireApiAuth } from '@/lib/access';

export async function DELETE(_: NextRequest, { params }: { params: { id: string; assignmentId: string } }) {
  const auth = await requireApiAuth(['OWNER', 'MANAGER']);
  if ('error' in auth) return auth.error;

  const assignment = await prisma.assignment.findFirst({
    where: { id: params.assignmentId, eventId: params.id },
    select: { id: true }
  });

  if (!assignment) {
    return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
  }

  await prisma.assignment.delete({ where: { id: params.assignmentId } });
  return NextResponse.json({ ok: true });
}
