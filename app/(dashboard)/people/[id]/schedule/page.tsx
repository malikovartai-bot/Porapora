import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { createExternalBooking, deleteExternalBooking } from '@/app/(dashboard)/people/actions';

type TimelineItemBase = {
  id: string;
  kind: 'internal' | 'external';
  startAt: Date;
  endAt: Date | null;
};

type InternalItem = TimelineItemBase & {
  kind: 'internal';
  title: string;
  subtitle: string;
  venue: string | null;
  roleTitle: string | null;
  eventId: string;
};

type ExternalItem = TimelineItemBase & {
  kind: 'external';
  title: string;
  notes: string | null;
};

type TimelineItem = InternalItem | ExternalItem;

const FALLBACK_DURATION_MINUTES = 180; // если у записи нет endAt, считаем +3 часа

function effectiveEndAt(item: TimelineItem): Date {
  if (item.endAt) return item.endAt;
  return new Date(item.startAt.getTime() + FALLBACK_DURATION_MINUTES * 60 * 1000);
}

function overlaps(a: TimelineItem, b: TimelineItem): boolean {
  const aStart = a.startAt.getTime();
  const aEnd = effectiveEndAt(a).getTime();
  const bStart = b.startAt.getTime();
  const bEnd = effectiveEndAt(b).getTime();
  // пересечение интервалов [start, end)
  return aStart < bEnd && bStart < aEnd;
}

export default async function PersonSchedulePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const person = await prisma.person.findUnique({
    where: { id },
    select: { id: true, fullName: true },
  });

  if (!person) return notFound();

  const [assignments, external] = await Promise.all([
    prisma.assignment.findMany({
      where: { personId: person.id },
      orderBy: [{ event: { startAt: 'asc' } }],
      select: {
        id: true,
        role: { select: { title: true } },
        event: {
          select: {
            id: true,
            title: true,
            startAt: true,
            endAt: true,
            type: true,
            status: true,
            play: { select: { title: true } },
            venue: { select: { title: true } },
          },
        },
      },
    }),
    prisma.externalBooking.findMany({
      where: { personId: person.id },
      orderBy: { startAt: 'asc' },
      select: { id: true, title: true, startAt: true, endAt: true, notes: true },
    }),
  ]);

  const internalItems: TimelineItem[] = assignments.map((a) => ({
    kind: 'internal',
    id: a.id,
    startAt: a.event.startAt,
    endAt: a.event.endAt ?? null,
    title: a.event.play?.title ?? a.event.title,
    subtitle: `${a.event.type} · ${a.event.status}`,
    venue: a.event.venue?.title ?? null,
    roleTitle: a.role?.title ?? null,
    eventId: a.event.id,
  }));

  const externalItems: TimelineItem[] = external.map((b) => ({
    kind: 'external',
    id: b.id,
    startAt: b.startAt,
    endAt: b.endAt ?? null,
    title: b.title,
    notes: b.notes ?? null,
  }));

  const allItems = [...internalItems, ...externalItems].sort(
    (a, b) => a.startAt.getTime() - b.startAt.getTime()
  );

  // Конфликты: item.id/kind -> список конфликтующих items
  const conflictMap = new Map<string, TimelineItem[]>();
  for (let i = 0; i < allItems.length; i++) {
    for (let j = i + 1; j < allItems.length; j++) {
      const a = allItems[i];
      const b = allItems[j];
      if (overlaps(a, b)) {
        const aKey = `${a.kind}:${a.id}`;
        const bKey = `${b.kind}:${b.id}`;
        conflictMap.set(aKey, [...(conflictMap.get(aKey) ?? []), b]);
        conflictMap.set(bKey, [...(conflictMap.get(bKey) ?? []), a]);
      }
    }
  }

  const now = new Date();
  const upcoming = allItems.filter((i) => i.startAt >= now);
  const past = allItems
    .filter((i) => i.startAt < now)
    .sort((a, b) => b.startAt.getTime() - a.startAt.getTime());

  const fmt = new Intl.DateTimeFormat('ru-RU', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

  function fmtRange(item: TimelineItem) {
    const start = fmt.format(item.startAt);
    const end = item.endAt ? fmt.format(item.endAt) : null;
    return end ? `${start} — ${end}` : `${start} — (+${Math.round(FALLBACK_DURATION_MINUTES / 60)}ч)`;
  }

  function renderRow(item: TimelineItem) {
    const key = `${item.kind}:${item.id}`;
    const conflicts = conflictMap.get(key) ?? [];
    const hasConflict = conflicts.length > 0;

    return (
      <tr key={key} className={`border-t ${hasConflict ? 'bg-red-50' : ''}`}>
        <td className="p-3 whitespace-nowrap">{fmtRange(item)}</td>
        <td className="p-3">
          <span className={item.kind === 'internal' ? 'text-green-700' : 'text-blue-700'}>
            {item.kind === 'internal' ? 'AmmA' : 'Внешнее'}
          </span>
          {hasConflict ? (
            <span className="ml-2 inline-flex items-center rounded bg-red-600 px-2 py-0.5 text-xs text-white">
              Конфликт
            </span>
          ) : null}
        </td>
        <td className="p-3">
          {item.kind === 'internal' ? (
            <div className="space-y-1">
              <div className="font-medium">{item.title}</div>
              <div className="text-xs text-neutral-500">
                {item.subtitle}
                {item.roleTitle ? ` · роль: ${item.roleTitle}` : ''}
                {item.venue ? ` · ${item.venue}` : ''}
              </div>
              {hasConflict ? (
                <div className="text-xs text-red-700">
                  Пересекается с: {conflicts
                    .slice(0, 3)
                    .map((c) => (c.kind === 'internal' ? 'AmmA' : 'Внешнее') + ' — ' + (c.kind === 'internal' ? c.title : c.title))
                    .join('; ')}
                  {conflicts.length > 3 ? '…' : ''}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="space-y-1">
              <div className="font-medium">{item.title}</div>
              <div className="text-xs text-neutral-500">{item.notes ?? ''}</div>
              {hasConflict ? (
                <div className="text-xs text-red-700">
                  Пересекается с: {conflicts
                    .slice(0, 3)
                    .map((c) => (c.kind === 'internal' ? 'AmmA' : 'Внешнее') + ' — ' + (c.kind === 'internal' ? c.title : c.title))
                    .join('; ')}
                  {conflicts.length > 3 ? '…' : ''}
                </div>
              ) : null}
            </div>
          )}
        </td>
        <td className="p-3 text-right">
          {item.kind === 'internal' ? (
            <Link className="hover:underline" href={`/events/${item.eventId}`}>
              открыть →
            </Link>
          ) : (
            <form action={deleteExternalBooking} className="inline">
              {person && <input type="hidden" name="personId" value={person.id} />}
              <input type="hidden" name="bookingId" value={item.id} />
              <button className="px-3 py-2 rounded border text-sm hover:bg-red-50" type="submit">
                Удалить
              </button>
            </form>
          )}
        </td>
      </tr>
    );
  }

  function renderTable(items: TimelineItem[]) {
    if (items.length === 0) {
      return <div className="text-sm text-neutral-600">Нет записей.</div>;
    }

    return (
      <div className="rounded border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50">
            <tr>
              <th className="p-3 text-left">Время</th>
              <th className="p-3 text-left">Источник</th>
              <th className="p-3 text-left">Описание</th>
              <th className="p-3 text-right">Действия</th>
            </tr>
          </thead>
          <tbody>{items.map(renderRow)}</tbody>
        </table>
      </div>
    );
  }

  const totalConflicts = Array.from(conflictMap.keys()).length;

  return (
    <div className="p-6 space-y-8">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <Link href={`/people/${person.id}`} className="text-sm text-neutral-600 hover:underline">
            ← Назад к карточке
          </Link>
          <div>
            <h1 className="text-2xl font-semibold">Занятость</h1>
            <p className="text-sm text-neutral-600">{person.fullName}</p>
            <p className="text-xs text-neutral-500">
              Конфликты подсвечиваются красным. Если у записи нет окончания — считаем длительность {Math.round(FALLBACK_DURATION_MINUTES / 60)} часа.
            </p>
          </div>
        </div>

        <Link href="/events/new" className="px-3 py-2 rounded border text-sm hover:bg-neutral-50" title="Создать событие">
          + Событие
        </Link>
      </div>

      {totalConflicts ? (
        <div className="max-w-3xl rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800">
          Найдено конфликтующих записей: <span className="font-semibold">{totalConflicts}</span>
        </div>
      ) : (
        <div className="max-w-3xl rounded border bg-neutral-50 p-3 text-sm text-neutral-700">
          Конфликтов не найдено.
        </div>
      )}

      <section className="max-w-3xl rounded border p-4 space-y-3">
        <div className="text-sm text-neutral-600">Добавить занятость в других проектах</div>

        <form action={createExternalBooking} className="grid gap-3">
          <input type="hidden" name="personId" value={person.id} />

          <div className="grid gap-1">
            <label className="text-sm font-medium" htmlFor="title">Проект / работа</label>
            <input
              id="title"
              name="title"
              placeholder='например: "Съемка", "Репетиция в другом театре", "Гастроли"...'
              className="rounded border px-3 py-2 text-sm"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1">
              <label className="text-sm font-medium" htmlFor="startAt">Начало</label>
              <input id="startAt" name="startAt" type="datetime-local" className="rounded border px-3 py-2 text-sm" required />
            </div>
            <div className="grid gap-1">
              <label className="text-sm font-medium" htmlFor="endAt">Окончание (необязательно)</label>
              <input id="endAt" name="endAt" type="datetime-local" className="rounded border px-3 py-2 text-sm" />
            </div>
          </div>

          <div className="grid gap-1">
            <label className="text-sm font-medium" htmlFor="notes">Заметки (необязательно)</label>
            <textarea id="notes" name="notes" rows={3} className="rounded border px-3 py-2 text-sm" />
          </div>

          <div>
            <button className="px-4 py-2 rounded bg-black text-white text-sm hover:opacity-90">Добавить</button>
          </div>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Предстоящие</h2>
        {renderTable(upcoming)}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Прошедшие</h2>
        {renderTable(past)}
      </section>

      <div className="text-xs text-neutral-500">
        Здесь объединены: назначения AmmA (Assignments) + внешняя занятость (ExternalBooking). Конфликт — пересечение по времени.
      </div>
    </div>
  );
}
