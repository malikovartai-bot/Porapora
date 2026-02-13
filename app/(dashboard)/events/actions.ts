'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

async function rebuildEventCastFromBase(eventId: string, playId: string) {
  await prisma.$transaction(async (tx) => {
    const roles = await tx.playRole.findMany({
      where: { playId },
      select: { id: true },
    })

    const roleIds = roles.map((r) => r.id)

    await tx.assignment.deleteMany({ where: { eventId } })

    if (roleIds.length === 0) return

    const baseCast = await tx.playRoleCast.findMany({
      where: { playId, playRoleId: { in: roleIds } },
      select: { playRoleId: true, personId: true },
    })

    if (baseCast.length === 0) return

    await tx.assignment.createMany({
      data: baseCast.map((item) => ({
        eventId,
        roleId: item.playRoleId,
        personId: item.personId,
      })),
      skipDuplicates: true,
    })
  })
}

export async function deleteEvent(formData: FormData) {
  const id = String(formData.get('eventId') ?? '').trim()
  if (!id) throw new Error('eventId is required')

  await prisma.event.delete({ where: { id } })
  revalidatePath('/events')
}

export async function fillEventFromDefaultCast(formData: FormData) {
  const eventId = String(formData.get('eventId') ?? '').trim()
  if (!eventId) throw new Error('eventId is required')

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, playId: true },
  })

  if (!event) throw new Error('event not found')
  if (!event.playId) {
    revalidatePath(`/events/${eventId}`)
    redirect(`/events/${eventId}`)
  }

  await rebuildEventCastFromBase(event.id, event.playId)

  revalidatePath(`/events/${eventId}`)
  redirect(`/events/${eventId}`)
}

export async function updateEventCast(eventId: string, roleId: string, personId: string | null) {
  if (!eventId) throw new Error('eventId is required')
  if (!roleId) throw new Error('roleId is required')

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, playId: true },
  })

  if (!event) throw new Error('event not found')

  const role = await prisma.playRole.findUnique({
    where: { id: roleId },
    select: { id: true, playId: true },
  })

  if (!role) throw new Error('role not found')
  if (!event.playId || role.playId !== event.playId) {
    throw new Error('role belongs to another play')
  }

  if (!personId) {
    await prisma.assignment.deleteMany({ where: { eventId, roleId } })
    return
  }

  const person = await prisma.person.findUnique({ where: { id: personId }, select: { id: true } })
  if (!person) throw new Error('person not found')

  await prisma.assignment.upsert({
    where: { eventId_roleId: { eventId, roleId } },
    update: { personId },
    create: { eventId, roleId, personId },
  })
}

export async function setEventRoleAssignment(formData: FormData) {
  const eventId = String(formData.get('eventId') ?? '').trim()
  const roleId = String(formData.get('roleId') ?? '').trim()
  const personId = String(formData.get('personId') ?? '').trim() || null

  await updateEventCast(eventId, roleId, personId)

  revalidatePath(`/events/${eventId}`)
  redirect(`/events/${eventId}`)
}

export async function syncEventCastOnPlayChange(eventId: string, newPlayId: string) {
  if (!eventId) throw new Error('eventId is required')
  if (!newPlayId) throw new Error('newPlayId is required')
  await rebuildEventCastFromBase(eventId, newPlayId)
}
