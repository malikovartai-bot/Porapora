import Link from 'next/link'
import { notFound } from 'next/navigation'

import { prisma } from '@/lib/prisma'

// Если у события нет endAt — считаем длительность 3 часа
const FALLBACK_DURATION_MINUTES = 180

function effectiveEndAt(startAt: Date, endAt: Date | null) {
  if (endAt) return endAt
  return new Date(startAt.getTime() + FALLBACK_DURATION_MINUTES * 60 * 1000)
}

function formatDT(dt: Date) {
  return dt.toLocaleString('ru-RU', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

async function getBusyReasonsForPeople(args: {
  eventId: string
  personIds: string[]
  startAt: Date
  endAt: Date
}): Promise<Map<string, string[]>> {
  const { eventId, personIds, startAt, endAt } = args
  const map = new Map<string, string[]>()
  if (personIds.length === 0) return map

  const [otherAssignments, externalBookings] = await Promise.all([
    prisma.assignment.findMany({
      where: {
        personId: { in: personIds },
        eventId: { not: eventId },
        event: {
          startAt: { lt: endAt },
          OR: [{ endAt: { gt: startAt } }, { endAt: null }],
        },
      },
      select: {
        personId: true,
        event: {
          select: { id: true, title: true, startAt: true, endAt: true },
        },
      },
    }),
    prisma.externalBooking.findMany({
      where: {
        personId: { in: personIds },
        startAt: { lt: endAt },
        OR: [{ endAt: { gt: startAt } }, { endAt: null }],
      },
      select: { personId: true, title: true, startAt: true, endAt: true },
    }),
  ])

  const push = (personId: string, reason: string) => {
    const arr = map.get(personId) ?? []
    arr.push(reason)
    map.set(personId, arr)
  }

  for (const row of otherAssignments) {
    const e = row.event
    const eEnd = effectiveEndAt(e.startAt, e.endAt)
    const overlaps = e.startAt < endAt && eEnd > startAt
    if (!overlaps) continue
    push(row.personId, `Событие: ${e.title} (${formatDT(e.startAt)})`)
  }

  for (const row of externalBookings) {
    const eEnd = effectiveEndAt(row.startAt, row.endAt)
    const overlaps = row.startAt < endAt && eEnd > startAt
    if (!overlaps) continue
    push(row.personId, `Внешний проект: ${row.title} (${formatDT(row.startAt)})`)
  }

  return map
}

export default async function EventPage({ params }: { params: { id: string } }) {
  const { id } = params

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
      play: { select: { id: true, title: true } },
      venue: { select: { id: true, title: true } },
      assignments: {
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          createdAt: true,
          roleId: true,
          role: { select: { id: true, title: true, sortOrder: true } },
          person: { select: { id: true, fullName: true } },
        },
      },
    },
  })

  if (!event) return notFound()

  const endAtEff = effectiveEndAt(event.startAt, event.endAt)

  const assignedPersonIds = Array.from(
    new Set(event.assignments.map((a) => a.person?.id).filter(Boolean) as string[]),
  )

  const busyReasons = await getBusyReasonsForPeople({
    eventId: event.id,
    personIds: assignedPersonIds,
    startAt: event.startAt,
    endAt: endAtEff,
  })

  const anyConflictsOnAssigned = event.assignments.some((a) => busyReasons.has(a.person.id))

  const assignmentsSorted = [...event.assignments].sort((a, b) => {
    const ao = a.role?.sortOrder ?? 0
    const bo = b.role?.sortOrder ?? 0
    if (ao != bo) return ao - bo
    const at = a.role?.title ?? ''
    const bt = b.role?.title ?? ''
    return at.localeCompare(bt, 'ru')
  })

  return (
    <div className="p-6 space-y-6">
      <Link href="/events" className="text-sm underline">
        ← Назад к событиям
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{event.title}</h1>
          <div className="text-sm text-gray-600">
            Начало: {formatDT(event.startAt)}
            <br />
            Окончание: {event.endAt ? formatDT(event.endAt) : '—'}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/events/${event.id}/edit`}
            className="px-3 py-2 border rounded hover:bg-gray-50"
          >
            Редактировать
          </Link>
          <Link
            href={`/events/${event.id}/finance`}
            className="px-3 py-2 border rounded hover:bg-gray-50"
          >
            Финансы
          </Link>
        </div>
      </div>

      {anyConflictsOnAssigned ? (
        <div className="border border-red-200 bg-red-50 rounded p-3">
          <div className="font-semibold text-red-800">Есть конфликты занятости</div>
          <div className="text-sm text-red-900">
            У некоторых назначенных людей есть другие события/внешняя занятость в пересекающееся время.
          </div>
        </div>
      ) : null}

      <div className="space-y-1 text-sm">
        <div>
          <span className="font-semibold">Тип:</span> {String(event.type)}
        </div>
        <div>
          <span className="font-semibold">Статус:</span> {String(event.status)}
        </div>
        <div>
          <span className="font-semibold">Спектакль:</span> {event.play?.title ?? '—'}
        </div>
        <div>
          <span className="font-semibold">Площадка:</span> {event.venue?.title ?? '—'}
        </div>
        <div>
          <span className="font-semibold">Заметки:</span> {event.notes ?? '—'}
        </div>
      </div>

      <hr />

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Состав на дату</h2>

        {assignmentsSorted.length === 0 ? (
          <div className="text-sm text-gray-600">Пока никого не назначили.</div>
        ) : (
          <div className="space-y-2">
            {assignmentsSorted.map((a) => {
              const reasons = busyReasons.get(a.person.id) ?? []
              return (
                <div key={a.id} className="border rounded p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold">{a.role?.title ?? 'Роль'}</div>
                      <div className="text-sm text-gray-700">{a.person.fullName}</div>
                    </div>

                    {reasons.length ? (
                      <div className="text-sm text-red-700 text-right">
                        {reasons.map((r, idx) => (
                          <div key={idx}>{r}</div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-green-700">Свободен</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
