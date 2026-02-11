import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireApiAuth } from '@/lib/access';
import { personSchema } from '@/lib/schemas';

export async function GET() {
  const auth = await requireApiAuth(['OWNER', 'MANAGER']);
  if ('error' in auth) return auth.error;
  return NextResponse.json(await prisma.person.findMany({ include: { user: true }, orderBy: { createdAt: 'desc' } }));
}

export async function POST(req: NextRequest) {
  const auth = await requireApiAuth(['OWNER', 'MANAGER']);
  if ('error' in auth) return auth.error;
  const parsed = personSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { userId, ...personData } = parsed.data;
  const person = await prisma.person.create({ data: personData });
  if (userId) await prisma.user.update({ where: { id: userId }, data: { personId: person.id } });
  return NextResponse.json(person);
}
