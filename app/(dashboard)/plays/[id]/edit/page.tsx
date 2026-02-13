import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { setPlayRoleCast } from '@/app/(dashboard)/plays/actions';

export default async function EditPlayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [play, people] = await Promise.all([
    prisma.play.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        description: true,
        roles: {
          orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
          select: {
            id: true,
            title: true,
            sortOrder: true,
            baseCast: { select: { personId: true } },
          },
        },
      },
    }),
    prisma.person.findMany({ orderBy: { fullName: 'asc' }, select: { id: true, fullName: true } }),
  ]);

  if (!play) return notFound();

  async function updatePlay(formData: FormData) {
    'use server';

    const playId = String(formData.get('playId') ?? '').trim();
    const title = String(formData.get('title') ?? '').trim();
    const descriptionRaw = String(formData.get('description') ?? '').trim();
    const description = descriptionRaw.length ? descriptionRaw : null;

    if (!playId) throw new Error('playId is required');
    if (!title) throw new Error('title is required');

    await prisma.play.update({
      where: { id: playId },
      data: { title, description },
      select: { id: true },
    });

    revalidatePath('/plays');
    revalidatePath(`/plays/${playId}`);
    revalidatePath(`/plays/${playId}/roles`);
    revalidatePath(`/plays/${playId}/edit`);
    redirect(`/plays/${playId}`);
  }

  return (
    <div className="p-6 space-y-8">
      <div className="space-y-2">
        <Link href={`/plays/${play.id}`} className="text-sm text-neutral-600 hover:underline">
          ← Назад к спектаклю
        </Link>
        <h1 className="text-2xl font-semibold">Редактирование спектакля</h1>
      </div>

      <section className="max-w-2xl">
        <form action={updatePlay} className="rounded border p-4 space-y-4">
          <input type="hidden" name="playId" value={play.id} />

          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="title">
              Название
            </label>
            <input
              id="title"
              name="title"
              defaultValue={play.title}
              className="w-full rounded border px-3 py-2 text-sm"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="description">
              Описание (необязательно)
            </label>
            <input
              id="description"
              name="description"
              defaultValue={play.description ?? ''}
              className="w-full rounded border px-3 py-2 text-sm"
            />
          </div>

          <div className="flex gap-2">
            <button className="px-4 py-2 rounded bg-black text-white text-sm hover:opacity-90" type="submit">
              Сохранить
            </button>
            <Link className="px-4 py-2 rounded border text-sm hover:bg-neutral-50" href={`/plays/${play.id}`}>
              Отмена
            </Link>
            <Link className="px-4 py-2 rounded border text-sm hover:bg-neutral-50" href={`/plays/${play.id}/roles`}>
              Роли
            </Link>
          </div>
        </form>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Базовый состав</h2>
          <Link
            href={`/plays/${play.id}/roles`}
            className="px-3 py-2 rounded border text-sm hover:bg-neutral-50"
            title="Сначала добавь роли, если их ещё нет"
          >
            Управлять ролями
          </Link>
        </div>

        {play.roles.length === 0 ? (
          <div className="text-sm">
            У спектакля пока нет ролей. Сначала добавь роли:{' '}
            <Link className="underline" href={`/plays/${play.id}/roles`}>
              /plays/{play.id}/roles
            </Link>
          </div>
        ) : (
          <div className="rounded border overflow-hidden max-w-4xl">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50">
                <tr>
                  <th className="p-3 text-left">Роль</th>
                  <th className="p-3 text-left">Человек</th>
                  <th className="p-3 text-right">Действие</th>
                </tr>
              </thead>
              <tbody>
                {play.roles.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="p-3 font-medium">{r.title}</td>
                    <td className="p-3">
                      <form action={setPlayRoleCast} className="flex items-center gap-2">
                        <input type="hidden" name="playId" value={play.id} />
                        <input type="hidden" name="roleId" value={r.id} />
                        <select
                          name="personId"
                          defaultValue={r.baseCast?.personId ?? ''}
                          className="w-full max-w-sm rounded border px-2 py-1"
                        >
                          <option value="">— не назначен —</option>
                          {people.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.fullName}
                            </option>
                          ))}
                        </select>
                        <button className="px-3 py-1 rounded border hover:bg-neutral-50" type="submit">
                          Сохранить
                        </button>
                      </form>
                    </td>
                    <td className="p-3 text-right text-neutral-500">Шаблон для новых событий</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
