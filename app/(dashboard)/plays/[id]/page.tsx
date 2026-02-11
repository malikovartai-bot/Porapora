import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';

export default async function PlayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const play = await prisma.play.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      description: true,
      createdAt: true,
      updatedAt: true,
      roles: {
        orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
        select: { id: true, title: true, sortOrder: true },
      },
      events: {
        orderBy: { startAt: 'desc' },
        take: 10,
        select: { id: true, startAt: true, type: true, status: true, venue: { select: { title: true } } },
      },
      _count: {
        select: { roles: true, events: true },
      },
    },
  });

  if (!play) return notFound();

  const fmt = new Intl.DateTimeFormat('ru-RU', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <Link href="/plays" className="text-sm text-neutral-600 hover:underline">
            ← Назад к спектаклям
          </Link>
          <div>
            <h1 className="text-2xl font-semibold">{play.title}</h1>
            <div className="text-sm text-neutral-600">{play.description ?? '—'}</div>
            <div className="text-xs text-neutral-500">
              Ролей: {play._count.roles} · Событий: {play._count.events}
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Link href={`/plays/${play.id}/roles`} className="px-3 py-2 rounded border text-sm hover:bg-neutral-50">
            Роли
          </Link>
          <Link href={`/plays/${play.id}/edit`} className="px-3 py-2 rounded border text-sm hover:bg-neutral-50">
            Редактировать
          </Link>
        </div>
      </div>

      <hr />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Роли</h2>

        {play.roles.length === 0 ? (
          <div className="text-sm">
            Ролей пока нет. Добавь роли тут:{' '}
            <Link className="underline" href={`/plays/${play.id}/roles`}>
              /plays/{play.id}/roles
            </Link>
          </div>
        ) : (
          <div className="max-w-3xl rounded border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50">
                <tr>
                  <th className="text-left p-3">Порядок</th>
                  <th className="text-left p-3">Роль</th>
                </tr>
              </thead>
              <tbody>
                {play.roles.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="p-3 text-neutral-600">{r.sortOrder}</td>
                    <td className="p-3">{r.title}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Последние события</h2>
          <Link href="/events/new" className="px-3 py-2 rounded border text-sm hover:bg-neutral-50">
            Создать событие
          </Link>
        </div>

        {play.events.length === 0 ? (
          <div className="text-sm">Пока нет событий по этому спектаклю.</div>
        ) : (
          <div className="max-w-4xl rounded border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50">
                <tr>
                  <th className="text-left p-3">Дата</th>
                  <th className="text-left p-3">Тип</th>
                  <th className="text-left p-3">Статус</th>
                  <th className="text-left p-3">Площадка</th>
                  <th className="text-right p-3">Открыть</th>
                </tr>
              </thead>
              <tbody>
                {play.events.map((e) => (
                  <tr key={e.id} className="border-t">
                    <td className="p-3">{fmt.format(e.startAt)}</td>
                    <td className="p-3">{e.type}</td>
                    <td className="p-3">{e.status}</td>
                    <td className="p-3 text-neutral-700">{e.venue?.title ?? '—'}</td>
                    <td className="p-3 text-right">
                      <Link className="hover:underline" href={`/events/${e.id}`}>
                        открыть →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="text-xs text-neutral-500">
          Показано 10 последних событий. Полный список — в разделе «События».
        </div>
      </section>
    </div>
  );
}
