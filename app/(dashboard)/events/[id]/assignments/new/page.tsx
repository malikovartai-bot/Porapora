import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

type Props = {
  params: { id: string };
};

export default async function NewAssignmentPage({ params }: Props) {
  const event = await prisma.event.findUnique({
    where: { id: params.id },
    select: { id: true, title: true, startAt: true },
  });

  if (!event) {
    return <div style={{ padding: 40 }}>Событие не найдено</div>;
  }

  const people = await prisma.person.findMany({
    orderBy: { fullName: "asc" },
    select: { id: true, fullName: true, role: true },
  });

  async function action(formData: FormData) {
    "use server";

    const personId = (formData.get("personId") as string | null)?.trim();
    if (!personId) return;

    const jobTitleRaw = (formData.get("jobTitle") as string | null)?.trim() ?? "";
    const callTimeRaw = (formData.get("callTime") as string | null)?.trim() ?? "";
    const notesRaw = (formData.get("notes") as string | null)?.trim() ?? "";

    try {
      await prisma.assignment.create({
        data: {
          eventId: params.id,
          personId,
          jobTitle: jobTitleRaw === "" ? null : jobTitleRaw,
          callTime: callTimeRaw === "" ? null : new Date(callTimeRaw),
          notes: notesRaw === "" ? null : notesRaw,
        },
      });
    } catch (e: any) {
      // Если человек уже назначен на событие (@@unique([eventId, personId]))
      // Просто возвращаемся на страницу события без падения.
    }

    redirect(`/events/${params.id}`);
  }

  return (
    <div style={{ padding: 40 }}>
      <Link href={`/events/${params.id}`}>← Назад к событию</Link>

      <h1 style={{ marginTop: 20 }}>Добавить человека в событие</h1>
      <p style={{ marginTop: 8, opacity: 0.8 }}>
        <strong>{event.title}</strong>
      </p>

      <form
        action={action}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 10,
          maxWidth: 520,
          marginTop: 16,
        }}
      >
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span>Человек</span>
          <select name="personId" required defaultValue={people[0]?.id ?? ""}>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.fullName} — {p.role}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span>Должность (jobTitle)</span>
          <input name="jobTitle" placeholder="Например: режиссёр, актёр, звукорежиссёр..." />
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span>Сбор (callTime, опционально)</span>
          <input name="callTime" type="datetime-local" />
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span>Заметки</span>
          <textarea name="notes" rows={4} placeholder="Любые комментарии..." />
        </label>

        <button type="submit" disabled={people.length === 0}>
          Добавить
        </button>

        {people.length === 0 ? (
          <p style={{ marginTop: 6 }}>
            Сначала добавь людей в разделе <Link href="/people">Люди</Link>.
          </p>
        ) : null}
      </form>
    </div>
  );
}
