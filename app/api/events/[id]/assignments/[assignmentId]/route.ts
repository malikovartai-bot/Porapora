import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireApiAuth } from '@/lib/access';

export async function DELETE(_: NextRequest, { params }: { params: { id: string; assignmentId: string } }) {
  const auth = await requireApiAuth(['OWNER', 'MANAGER']);
  if ('error' in auth) return auth.error;
  await prisma.assignment.delete({ where: { id: params.assignmentId } });
  return NextResponse.json({ ok: true });
}
