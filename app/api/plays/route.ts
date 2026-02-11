import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireApiAuth } from '@/lib/access';
import { playSchema } from '@/lib/schemas';

export async function GET() {
  const auth = await requireApiAuth(['OWNER', 'MANAGER']);
  if ('error' in auth) return auth.error;
  return NextResponse.json(await prisma.play.findMany({ orderBy: { createdAt: 'desc' } }));
}

export async function POST(req: NextRequest) {
  const auth = await requireApiAuth(['OWNER', 'MANAGER']);
  if ('error' in auth) return auth.error;
  const parsed = playSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  return NextResponse.json(await prisma.play.create({ data: parsed.data }));
}
