import { randomUUID } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireApiAuth } from '@/lib/access';

export async function POST(req: Request) {
  const auth = await requireApiAuth(['OWNER', 'MANAGER']);
  if ('error' in auth) return auth.error;

  const form = await req.formData();
  const file = form.get('file') as File;
  if (!file) return NextResponse.json({ error: 'file is required' }, { status: 400 });

  const visibility = (form.get('visibility') as string) || 'INTERNAL';
  const playId = (form.get('playId') as string) || null;
  const eventId = (form.get('eventId') as string) || null;

  await mkdir(path.join(process.cwd(), 'uploads'), { recursive: true });
  const filename = `${Date.now()}-${randomUUID()}-${file.name}`;
  const storagePath = path.join('uploads', filename);
  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(process.cwd(), storagePath), bytes);

  const attachment = await prisma.attachment.create({
    data: {
      filename,
      originalName: file.name,
      mimeType: file.type || 'application/octet-stream',
      size: file.size,
      storagePath,
      visibility: visibility as any,
      playId,
      eventId,
      uploadedByUserId: auth.session!.user.id
    }
  });

  return NextResponse.json(attachment);
}
