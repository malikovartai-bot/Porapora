import Link from 'next/link';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { EventStatus, EventType } from '@prisma/client';
import { syncEventCastOnPlayChange } from '@/app/(dashboard)/events/actions';

/**
 * ЛОГИКА:
 * Event = показ/репетиция спектакля в конкретную дату.
 * Поэтому Play (спектакль) выбирается ОБЯЗАТЕЛЬНО при создании Event.
 * Название Event берём из Play.title (чтобы "событие" было именно спектаклем).
 *
 * Venue остаётся необязательным (null, если не выбрано).
 */

export default async function NewEventPage() {
  const venues = await prisma.venue.findMany({
    orderBy: { title: 'asc' },
    select: { id: true, title: true },
  });

  const plays = await prisma.play.findMany({
    orderBy: { title: 'asc' },
    select: { id: true, title: true },
  });

  async function createEvent(formData: FormData) {
    'use server';

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

    // пустая строка -> null
    const venueId = venueIdRaw.length ? venueIdRaw : null;
    const notes = notesRaw.length ? notesRaw : null;

    const created = await prisma.event.create({
      data: {
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

    await syncEventCastOnPlayChange(created.id, play.id);

    revalidatePath('/events');
    revalidatePath(`/events/${created.id}`);
    redirect(`/events/${created.id}`);
  }

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div className="space-y-2">
        <Link href="/events" className="text-sm text-neutral-600 hover:underline">
          ← Назад к событиям
        </Link>
        <h1 className="text-2xl font-semibold">Новое событие</h1>
        <p className="text-sm text-neutral-600">
          Событие — это показ/репетиция спектакля на конкретную дату.
        </p>
      </div>

      {plays.length === 0 ? (
        <div className="rounded border p-4 space-y-2">
          <div className="font-medium">Сначала нужно создать спектакль</div>
          <div className="text-sm text-neutral-600">
            Сейчас в базе нет ни одного спектакля, поэтому выбрать нечего.
          </div>
          <Link className="underline" href="/plays/new">
            Перейти в /plays/new
          </Link>
        </div>
      ) : (
        <form action={createEvent} className="space-y-4 rounded border p-4">
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="playId">
              Спектакль (обязательно)
            </label>
            <select
              id="playId"
              name="playId"
              className="w-full rounded border px-3 py-2 text-sm"
              required
              defaultValue={plays[0]?.id}
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
                defaultValue="SHOW"
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
                defaultValue="DRAFT"
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
              defaultValue=""
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
            <textarea id="notes" name="notes" rows={4} className="w-full rounded border px-3 py-2 text-sm" />
          </div>

          <div className="flex gap-2">
            <button className="px-4 py-2 rounded bg-black text-white text-sm hover:opacity-90" type="submit">
              Создать
            </button>
            <Link className="px-4 py-2 rounded border text-sm hover:bg-neutral-50" href="/events">
              Отмена
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}
