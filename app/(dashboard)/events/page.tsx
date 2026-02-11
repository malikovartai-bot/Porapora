import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { deleteEvent } from './actions'

export default async function EventsPage() {
  const events = await prisma.event.findMany({
    orderBy: { startAt: 'desc' },
    include: {
      play: { select: { title: true } },
      venue: { select: { title: true } },
    },
  })

  const fmt = new Intl.DateTimeFormat('ru-RU', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">События</h1>
        <Link
          href="/events/new"
          className="px-3 py-2 rounded border text-sm hover:bg-neutral-50"
        >
          Создать событие
        </Link>
      </div>

      <div className="rounded border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50">
            <tr>
              <th className="p-3 text-left">Дата</th>
              <th className="p-3 text-left">Спектакль</th>
              <th className="p-3 text-left">Площадка</th>
              <th className="p-3 text-right">Действия</th>
            </tr>
          </thead>
          <tbody>
            {events.map((e) => (
              <tr key={e.id} className="border-t">
                <td className="p-3">{fmt.format(e.startAt)}</td>
                <td className="p-3">{e.play?.title ?? '—'}</td>
                <td className="p-3">{e.venue?.title ?? '—'}</td>
                <td className="p-3">
                  <div className="flex justify-end gap-2">
                    <Link
                      href={`/events/${e.id}`}
                      className="px-3 py-2 rounded border text-sm hover:bg-neutral-50"
                    >
                      Открыть
                    </Link>

                    <form action={deleteEvent}>
                      <input type="hidden" name="eventId" value={e.id} />
                      <button
                        type="submit"
                        className="px-3 py-2 rounded border text-sm hover:bg-red-50"
                      >
                        Удалить
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
