import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { updatePlayRole } from '@/app/(dashboard)/plays/actions';

export default async function EditPlayRolePage({
  params,
}: {
  params: Promise<{ id: string; roleId: string }>;
}) {
  const { id: playId, roleId } = await params;

  const play = await prisma.play.findUnique({
    where: { id: playId },
    select: { id: true, title: true },
  });

  if (!play) return notFound();

  const role = await prisma.playRole.findUnique({
    where: { id: roleId },
    select: { id: true, title: true, sortOrder: true, notes: true, playId: true },
  });

  if (!role || role.playId !== play.id) return notFound();

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div className="space-y-2">
        <Link href={`/plays/${play.id}/roles`} className="text-sm text-neutral-600 hover:underline">
          ← Назад к ролям
        </Link>
        <div>
          <h1 className="text-2xl font-semibold">Редактировать роль</h1>
          <p className="text-sm text-neutral-600">
            Спектакль: <span className="font-medium">{play.title}</span>
          </p>
        </div>
      </div>

      <form action={updatePlayRole} className="rounded border p-4 space-y-4">
        <input type="hidden" name="playId" value={play.id} />
        <input type="hidden" name="roleId" value={role.id} />

        <div className="space-y-1">
          <label className="text-sm font-medium" htmlFor="title">Название роли</label>
          <input
            id="title"
            name="title"
            defaultValue={role.title}
            className="w-full rounded border px-3 py-2 text-sm"
            required
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium" htmlFor="sortOrder">Порядок</label>
          <input
            id="sortOrder"
            name="sortOrder"
            type="number"
            defaultValue={role.sortOrder}
            className="w-full rounded border px-3 py-2 text-sm"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium" htmlFor="notes">Заметки (необязательно)</label>
          <textarea
            id="notes"
            name="notes"
            rows={4}
            defaultValue={role.notes ?? ''}
            className="w-full rounded border px-3 py-2 text-sm"
          />
        </div>

        <div className="flex gap-2">
          <button className="px-4 py-2 rounded bg-black text-white text-sm hover:opacity-90" type="submit">
            Сохранить
          </button>
          <Link className="px-4 py-2 rounded border text-sm hover:bg-neutral-50" href={`/plays/${play.id}/roles`}>
            Отмена
          </Link>
        </div>
      </form>
    </div>
  );
}
