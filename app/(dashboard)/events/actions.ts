'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

/**
 * Удаление события (из шага про /events)
 */
export async function deleteEvent(formData: FormData) {
  const id = String(formData.get('eventId') ?? '').trim()
  if (!id) throw new Error('eventId is required')

  await prisma.event.delete({ where: { id } })
  revalidatePath('/events')
}

/**
 * Заполнить назначениями событие из "базового состава" спектакля.
 *
 * В текущей схеме Prisma отдельной сущности дефолтного каста нет,
 * поэтому автосоздание назначений не выполняется.
 */
export async function fillEventFromDefaultCast(formData: FormData) {
  const eventId = String(formData.get('eventId') ?? '').trim()
  if (!eventId) throw new Error('eventId is required')

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      playId: true,
      play: {
        select: {
          id: true,
          roles: { select: { id: true } },
        },
      },
      assignments: { select: { roleId: true } },
    },
  })

  if (!event) throw new Error('event not found')
  if (!event.playId || !event.play) {
    redirect(`/events/${eventId}`)
  }

  void new Set(
    event.assignments
      .map((a: { roleId: string | null }) => a.roleId)
      .filter((roleId: string | null): roleId is string => Boolean(roleId)),
  )

  revalidatePath(`/events/${eventId}`)
  redirect(`/events/${eventId}`)
}

/**
 * Назначить (или снять) человека на конкретную роль в конкретном событии.
 *
 * - если personId пустой -> удаляем Assignment для (eventId, roleId)
 * - иначе upsert по уникальному ключу @@unique([eventId, roleId])
 *
 * form fields:
 * - eventId
 * - roleId
 * - personId (может быть пустым)
 */
export async function setEventRoleAssignment(formData: FormData) {
  const eventId = String(formData.get('eventId') ?? '').trim()
  const roleId = String(formData.get('roleId') ?? '').trim()
  const personId = String(formData.get('personId') ?? '').trim()

  if (!eventId) throw new Error('eventId is required')
  if (!roleId) throw new Error('roleId is required')

  if (!personId) {
    await prisma.assignment.deleteMany({
      where: { eventId, roleId },
    })
  } else {
    await prisma.assignment.upsert({
      where: {
        eventId_roleId: { eventId, roleId },
      },
      update: { personId },
      create: { eventId, roleId, personId },
    })
  }

  revalidatePath(`/events/${eventId}`)
  redirect(`/events/${eventId}`)
}
