import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';

export default async function EditPlayPage({
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
      roles: {
        orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
        select: {
          id: true,
          title: true,
          sortOrder: true,
        },
      },
    },
  });

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
          <h2 className="text-lg font-semibold">Базовый состав (роль → человек)</h2>
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
            У спектакля пока нет ролей. Сначала добавь роли: <Link className="underline" href={`/plays/${play.id}/roles`}>/plays/{play.id}/roles</Link>
          </div>
        ) : (
          <div className="rounded border overflow-hidden max-w-4xl">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50">
                <tr>
                  <th className="p-3 text-left">Порядок</th>
                  <th className="p-3 text-left">Роль</th>
                  <th className="p-3 text-left">Человек</th>
                  <th className="p-3 text-right">Действие</th>
                </tr>
              </thead>
              <tbody>
                {play.roles.map((r: { id: string; title: string; sortOrder: number }) => (
                  <tr key={r.id} className="border-t">
                    <td className="p-3 text-neutral-600">{r.sortOrder}</td>
                    <td className="p-3 font-medium">{r.title}</td>
                    <td className="p-3 text-neutral-600">—</td>
                    <td className="p-3 text-right text-neutral-600">недоступно в текущей схеме</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="text-xs text-neutral-500">
          Это &quot;состав по умолчанию&quot; для спектакля. На конкретную дату (событие) мы позже добавим возможность переопределять.
        </div>
      </section>
    </div>
  );
}
