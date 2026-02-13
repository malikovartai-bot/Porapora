import Link from 'next/link'
import { notFound } from 'next/navigation'

import { prisma } from '@/lib/prisma'
import { setEventRoleAssignment } from '@/app/(dashboard)/events/actions'

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

  const [event, people] = await Promise.all([
    prisma.event.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        type: true,
        status: true,
        startAt: true,
        endAt: true,
        notes: true,
        play: {
          select: {
            id: true,
            title: true,
            roles: {
              orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
              select: {
                id: true,
                title: true,
                assignments: {
                  where: { eventId: id },
                  select: { personId: true, person: { select: { id: true, fullName: true } } },
                  take: 1,
                },
              },
            },
          },
        },
        venue: { select: { id: true, title: true } },
      },
    }),
    prisma.person.findMany({ orderBy: { fullName: 'asc' }, select: { id: true, fullName: true } }),
  ])

  if (!event) return notFound()

  const endAtEff = effectiveEndAt(event.startAt, event.endAt)

  const assignedPersonIds = Array.from(
    new Set(
      (event.play?.roles
        .map((r) => r.assignments[0]?.personId)
        .filter((v): v is string => Boolean(v)) ?? []),
    ),
  )

  const busyReasons = await getBusyReasonsForPeople({
    eventId: event.id,
    personIds: assignedPersonIds,
    startAt: event.startAt,
    endAt: endAtEff,
  })

  const anyConflictsOnAssigned = assignedPersonIds.some((personId) => busyReasons.has(personId))

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
        <h2 className="text-lg font-semibold">Состав события</h2>

        {!event.play ? (
          <div className="text-sm text-gray-600">Событие не привязано к спектаклю.</div>
        ) : event.play.roles.length === 0 ? (
          <div className="text-sm text-gray-600">У спектакля нет ролей.</div>
        ) : (
          <div className="rounded border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50">
                <tr>
                  <th className="p-3 text-left">Роль</th>
                  <th className="p-3 text-left">Актёр</th>
                  <th className="p-3 text-left">Замена</th>
                </tr>
              </thead>
              <tbody>
                {event.play.roles.map((role) => {
                  const selectedPerson = role.assignments[0]?.person
                  const reasons = selectedPerson ? busyReasons.get(selectedPerson.id) ?? [] : []
                  return (
                    <tr key={role.id} className="border-t align-top">
                      <td className="p-3 font-medium">{role.title}</td>
                      <td className="p-3">
                        <form action={setEventRoleAssignment} className="flex items-center gap-2">
                          <input type="hidden" name="eventId" value={event.id} />
                          <input type="hidden" name="roleId" value={role.id} />
                          <select
                            name="personId"
                            defaultValue={selectedPerson?.id ?? ''}
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
                      <td className="p-3">
                        {reasons.length > 0 ? (
                          <div className="text-red-700">
                            <div className="font-medium">Нужна замена</div>
                            {reasons.map((reason, idx) => (
                              <div key={idx}>{reason}</div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-green-700">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
