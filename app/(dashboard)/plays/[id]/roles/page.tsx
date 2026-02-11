import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { createPlayRole, deletePlayRole } from '@/app/(dashboard)/plays/actions';

export default async function PlayRolesPage({
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
      roles: {
        orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
        select: { id: true, title: true, sortOrder: true, notes: true, createdAt: true },
      },
    },
  });

  if (!play) return notFound();

  return (
    <div className="p-6 space-y-6">
      <div className="space-y-2">
        <Link href={`/plays/${play.id}`} className="text-sm text-neutral-600 hover:underline">
          ← Назад к спектаклю
        </Link>
        <div>
          <h1 className="text-2xl font-semibold">Роли спектакля</h1>
          <p className="text-sm text-neutral-600">
            Спектакль: <span className="font-medium">{play.title}</span>
          </p>
        </div>
      </div>

      <section className="max-w-2xl rounded border p-4 space-y-3">
        <div className="text-sm text-neutral-600">Добавить роль</div>
        <form action={createPlayRole} className="grid gap-3">
          <input type="hidden" name="playId" value={play.id} />

          <div className="grid gap-1">
            <label className="text-sm font-medium" htmlFor="title">
              Название роли
            </label>
            <input
              id="title"
              name="title"
              placeholder='например: "Марат", "Лика", "Леонидик"...'
              className="rounded border px-3 py-2 text-sm"
              required
            />
            <div className="text-xs text-neutral-500">
              Порядок назначится автоматически. Менять можно в редактировании роли.
            </div>
          </div>

          <div className="grid gap-1">
            <label className="text-sm font-medium" htmlFor="notes">
              Заметки (необязательно)
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={3}
              className="rounded border px-3 py-2 text-sm"
              placeholder="например: дублёр, особенности, костюм..."
            />
          </div>

          <div className="flex gap-2">
            <button className="px-4 py-2 rounded bg-black text-white text-sm hover:opacity-90">
              Добавить
            </button>
          </div>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Список ролей</h2>

        {play.roles.length === 0 ? (
          <div className="text-sm">Пока ролей нет. Добавь первую роль выше.</div>
        ) : (
          <div className="max-w-3xl space-y-2">
            {play.roles.map((r) => (
              <div key={r.id} className="rounded border p-3 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="font-medium">{r.title}</div>
                  <div className="text-sm text-neutral-600">
                    sortOrder: {r.sortOrder}
                    {r.notes ? <> · {r.notes}</> : null}
                  </div>
                  <div className="text-xs text-neutral-500 font-mono">roleId: {r.id}</div>
                </div>

                <div className="flex gap-2">
                  <Link
                    href={`/plays/${play.id}/roles/${r.id}/edit`}
                    className="px-3 py-2 rounded border text-sm hover:bg-neutral-50"
                  >
                    Редактировать
                  </Link>

                  <form action={deletePlayRole}>
                    <input type="hidden" name="playId" value={play.id} />
                    <input type="hidden" name="roleId" value={r.id} />
                    <button className="px-3 py-2 rounded border text-sm hover:bg-red-50">
                      Удалить
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
