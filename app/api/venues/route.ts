import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireApiAuth } from '@/lib/access';
import { venueSchema } from '@/lib/schemas';

export async function GET() {
  const auth = await requireApiAuth(['OWNER', 'MANAGER']);
  if ('error' in auth) return auth.error;
  return NextResponse.json(await prisma.venue.findMany({ orderBy: { createdAt: 'desc' } }));
}

export async function POST(req: NextRequest) {
  const auth = await requireApiAuth(['OWNER', 'MANAGER']);
  if ('error' in auth) return auth.error;
  const parsed = venueSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  return NextResponse.json(await prisma.venue.create({ data: parsed.data }));
}
