import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { PERSON_ROLE_LABELS } from '../_roleLabels';

export default async function PersonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const person = await prisma.person.findUnique({
    where: { id },
    select: {
      id: true,
      fullName: true,
      role: true,
      phone: true,
      email: true,
      notes: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { assignments: true } },
    },
  });

  if (!person) return notFound();

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <Link href="/people" className="text-sm text-neutral-600 hover:underline">
            ← Назад к людям
          </Link>
          <h1 className="text-2xl font-semibold">{person.fullName}</h1>
          <div className="text-sm text-neutral-600">
            Должность: <span className="font-medium">{PERSON_ROLE_LABELS[person.role]}</span>
          </div>
          <div className="text-xs text-neutral-500">
            Назначений: {person._count.assignments}
          </div>
        </div>

        <div className="flex gap-2">
          <Link href={`/people/${person.id}/schedule`} className="px-3 py-2 rounded border text-sm hover:bg-neutral-50">
            Занятость
          </Link>
          <Link href={`/people/${person.id}/edit`} className="px-3 py-2 rounded border text-sm hover:bg-neutral-50">
            Редактировать
          </Link>
        </div>
      </div>

      <div className="rounded border p-4 space-y-2 text-sm">
        <div><span className="text-neutral-600">Телефон:</span> {person.phone ?? '—'}</div>
        <div><span className="text-neutral-600">Email:</span> {person.email ?? '—'}</div>
        <div><span className="text-neutral-600">Заметки:</span> {person.notes ?? '—'}</div>
      </div>

      <div className="text-xs text-neutral-500 font-mono">personId: {person.id}</div>
    </div>
  );
}
