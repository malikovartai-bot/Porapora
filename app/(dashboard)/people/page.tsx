import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { PERSON_ROLE_LABELS } from './_roleLabels';

export default async function PeoplePage() {
  const people = await prisma.person.findMany({
    orderBy: { fullName: 'asc' },
    select: { id: true, fullName: true, role: true, phone: true, email: true },
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Люди</h1>
        <Link href="/people/new" className="px-3 py-2 rounded border text-sm hover:bg-neutral-50">
          Добавить человека
        </Link>
      </div>

      <div className="rounded border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50">
            <tr>
              <th className="p-3 text-left">ФИО</th>
              <th className="p-3 text-left">Должность</th>
              <th className="p-3 text-left">Телефон</th>
              <th className="p-3 text-left">Email</th>
              <th className="p-3 text-right">Действия</th>
            </tr>
          </thead>
          <tbody>
            {people.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="p-3">
                  <Link className="hover:underline font-medium" href={`/people/${p.id}`}>
                    {p.fullName}
                  </Link>
                </td>
                <td className="p-3">{PERSON_ROLE_LABELS[p.role]}</td>
                <td className="p-3 text-neutral-700">{p.phone ?? '—'}</td>
                <td className="p-3 text-neutral-700">{p.email ?? '—'}</td>
                <td className="p-3 text-right">
                  <Link className="px-3 py-2 rounded border text-sm hover:bg-neutral-50" href={`/people/${p.id}/edit`}>
                    Редактировать
                  </Link>
                </td>
              </tr>
            ))}
            {people.length === 0 ? (
              <tr>
                <td className="p-6 text-sm text-neutral-600" colSpan={5}>
                  Пока никого нет. Нажми «Добавить человека».
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
