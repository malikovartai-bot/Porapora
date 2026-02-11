import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { PersonRole } from '@prisma/client';
import { PERSON_ROLE_LABELS } from '../../_roleLabels';

export default async function EditPersonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const person = await prisma.person.findUnique({
    where: { id },
    select: { id: true, fullName: true, role: true, phone: true, email: true, notes: true },
  });

  if (!person) return notFound();

  async function updatePerson(formData: FormData) {
    'use server';

    const personId = String(formData.get('personId') ?? '').trim();
    const fullName = String(formData.get('fullName') ?? '').trim();
    const role = String(formData.get('role') ?? '').trim() as PersonRole;
    const phoneRaw = String(formData.get('phone') ?? '').trim();
    const emailRaw = String(formData.get('email') ?? '').trim();
    const notesRaw = String(formData.get('notes') ?? '').trim();

    if (!personId) throw new Error('personId is required');
    if (!fullName) throw new Error('fullName is required');
    if (!role) throw new Error('role is required');

    const phone = phoneRaw.length ? phoneRaw : null;
    const email = emailRaw.length ? emailRaw : null;
    const notes = notesRaw.length ? notesRaw : null;

    await prisma.person.update({
      where: { id: personId },
      data: { fullName, role, phone, email, notes },
      select: { id: true },
    });

    revalidatePath('/people');
    revalidatePath(`/people/${personId}`);
    redirect(`/people/${personId}`);
  }

  const roleEntries = Object.entries(PERSON_ROLE_LABELS) as Array<[PersonRole, string]>;

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div className="space-y-2">
        <Link href={`/people/${person.id}`} className="text-sm text-neutral-600 hover:underline">
          ← Назад к карточке
        </Link>
        <h1 className="text-2xl font-semibold">Редактировать человека</h1>
      </div>

      <form action={updatePerson} className="rounded border p-4 space-y-4">
        <input type="hidden" name="personId" value={person.id} />

        <div className="space-y-1">
          <label className="text-sm font-medium" htmlFor="fullName">ФИО</label>
          <input
            id="fullName"
            name="fullName"
            defaultValue={person.fullName}
            className="w-full rounded border px-3 py-2 text-sm"
            required
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium" htmlFor="role">Должность</label>
          <select
            id="role"
            name="role"
            className="w-full rounded border px-3 py-2 text-sm"
            required
            defaultValue={person.role}
          >
            {roleEntries.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="phone">Телефон (необязательно)</label>
            <input
              id="phone"
              name="phone"
              defaultValue={person.phone ?? ''}
              className="w-full rounded border px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="email">Email (необязательно)</label>
            <input
              id="email"
              name="email"
              type="email"
              defaultValue={person.email ?? ''}
              className="w-full rounded border px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium" htmlFor="notes">Заметки (необязательно)</label>
          <textarea
            id="notes"
            name="notes"
            rows={4}
            defaultValue={person.notes ?? ''}
            className="w-full rounded border px-3 py-2 text-sm"
          />
        </div>

        <div className="flex gap-2">
          <button className="px-4 py-2 rounded bg-black text-white text-sm hover:opacity-90" type="submit">
            Сохранить
          </button>
          <Link className="px-4 py-2 rounded border text-sm hover:bg-neutral-50" href={`/people/${person.id}`}>
            Отмена
          </Link>
        </div>
      </form>
    </div>
  );
}
