import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { EventStatus, EventType } from '@prisma/client';

function toDateTimeLocalValue(date: Date | null): string {
  if (!date) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  const yyyy = date.getFullYear();
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const mi = pad(date.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

/**
 * ЛОГИКА:
 * Event = показ/репетиция спектакля на дату.
 * Поэтому Play выбирается ОБЯЗАТЕЛЬНО (если в базе есть спектакли).
 * При смене Play — title события автоматически синхронизируем с Play.title
 * (чтобы "событие" было "тем самым спектаклем").
 */
export default async function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const event = await prisma.event.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      type: true,
      status: true,
      startAt: true,
      endAt: true,
      notes: true,
      playId: true,
      venueId: true,
    },
  });

  if (!event) return notFound();

  const venues = await prisma.venue.findMany({
    orderBy: { title: 'asc' },
    select: { id: true, title: true },
  });

  const plays = await prisma.play.findMany({
    orderBy: { title: 'asc' },
    select: { id: true, title: true },
  });

  async function updateEvent(formData: FormData) {
    'use server';

    const eventId = String(formData.get('eventId') ?? '').trim();
    if (!eventId) throw new Error('eventId is required');

    const playIdRaw = String(formData.get('playId') ?? '').trim();
    if (!playIdRaw) throw new Error('playId is required');

    const play = await prisma.play.findUnique({
      where: { id: playIdRaw },
      select: { id: true, title: true },
    });
    if (!play) throw new Error('play not found');

    const type = String(formData.get('type') ?? 'SHOW') as EventType;
    const status = String(formData.get('status') ?? 'DRAFT') as EventStatus;

    const startAtRaw = String(formData.get('startAt') ?? '').trim();
    const endAtRaw = String(formData.get('endAt') ?? '').trim();

    const venueIdRaw = String(formData.get('venueId') ?? '').trim();
    const notesRaw = String(formData.get('notes') ?? '').trim();

    if (!startAtRaw) throw new Error('startAt is required');

    const startAt = new Date(startAtRaw);
    if (Number.isNaN(startAt.getTime())) throw new Error('startAt is invalid');

    const endAt = endAtRaw ? new Date(endAtRaw) : null;
    if (endAtRaw && endAt && Number.isNaN(endAt.getTime())) throw new Error('endAt is invalid');

    const venueId = venueIdRaw.length ? venueIdRaw : null;
    const notes = notesRaw.length ? notesRaw : null;

    await prisma.event.update({
      where: { id: eventId },
      data: {
        // ✅ синхронизация названия с выбранным спектаклем
        title: play.title,
        playId: play.id,
        type,
        status,
        startAt,
        endAt,
        venueId,
        notes,
      },
      select: { id: true },
    });

    revalidatePath(`/events/${eventId}`);
    revalidatePath('/events');
    redirect(`/events/${eventId}`);
  }

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div className="space-y-2">
        <Link href={`/events/${event.id}`} className="text-sm text-neutral-600 hover:underline">
          ← Назад к событию
        </Link>
        <h1 className="text-2xl font-semibold">Редактирование события</h1>
      </div>

      {plays.length === 0 ? (
        <div className="rounded border p-4 space-y-2">
          <div className="font-medium">Нет спектаклей</div>
          <div className="text-sm text-neutral-600">
            Сначала создай спектакль, чтобы привязать событие к спектаклю.
          </div>
          <Link className="underline" href="/plays/new">
            Перейти в /plays/new
          </Link>
        </div>
      ) : (
        <form action={updateEvent} className="space-y-4 rounded border p-4">
          <input type="hidden" name="eventId" value={event.id} />

          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="playId">
              Спектакль (обязательно)
            </label>
            <select
              id="playId"
              name="playId"
              defaultValue={event.playId ?? plays[0]?.id}
              className="w-full rounded border px-3 py-2 text-sm"
              required
            >
              {plays.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
            <div className="text-xs text-neutral-500">
              Название события будет равно названию выбранного спектакля.
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="type">
                Тип
              </label>
              <select
                id="type"
                name="type"
                defaultValue={event.type}
                className="w-full rounded border px-3 py-2 text-sm"
              >
                <option value="SHOW">SHOW</option>
                <option value="REHEARSAL">REHEARSAL</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="status">
                Статус
              </label>
              <select
                id="status"
                name="status"
                defaultValue={event.status}
                className="w-full rounded border px-3 py-2 text-sm"
              >
                <option value="DRAFT">DRAFT</option>
                <option value="CONFIRMED">CONFIRMED</option>
                <option value="CANCELED">CANCELED</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="startAt">
                Начало
              </label>
              <input
                id="startAt"
                name="startAt"
                type="datetime-local"
                defaultValue={toDateTimeLocalValue(event.startAt)}
                className="w-full rounded border px-3 py-2 text-sm"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="endAt">
                Окончание (необязательно)
              </label>
              <input
                id="endAt"
                name="endAt"
                type="datetime-local"
                defaultValue={toDateTimeLocalValue(event.endAt)}
                className="w-full rounded border px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="venueId">
              Площадка (необязательно)
            </label>
            <select
              id="venueId"
              name="venueId"
              defaultValue={event.venueId ?? ''}
              className="w-full rounded border px-3 py-2 text-sm"
            >
              <option value="">—</option>
              {venues.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.title}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="notes">
              Заметки (необязательно)
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={4}
              defaultValue={event.notes ?? ''}
              className="w-full rounded border px-3 py-2 text-sm"
            />
          </div>

          <div className="flex gap-2">
            <button className="px-4 py-2 rounded bg-black text-white text-sm hover:opacity-90" type="submit">
              Сохранить
            </button>
            <Link className="px-4 py-2 rounded border text-sm hover:bg-neutral-50" href={`/events/${event.id}`}>
              Отмена
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}
