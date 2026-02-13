import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

type Props = {
  params: { id: string };
};

export default async function NewAssignmentPage({ params }: Props) {
  const event = await prisma.event.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      title: true,
      playId: true,
      play: { select: { roles: { orderBy: [{ sortOrder: "asc" }, { title: "asc" }], select: { id: true, title: true } } } },
    },
  });

  if (!event) return <div style={{ padding: 40 }}>Событие не найдено</div>;

  const people = await prisma.person.findMany({
    orderBy: { fullName: "asc" },
    select: { id: true, fullName: true, role: true },
  });

  async function action(formData: FormData) {
    "use server";

    const personId = (formData.get("personId") as string | null)?.trim();
    const roleId = (formData.get("roleId") as string | null)?.trim();
    if (!personId || !roleId) return;

    try {
      await prisma.assignment.create({
        data: {
          eventId: params.id,
          personId,
          roleId,
        },
      });
    } catch {
      // ignore duplicate unique(eventId, roleId)
    }

    redirect(`/events/${params.id}`);
  }

  return (
    <div style={{ padding: 40 }}>
      <Link href={`/events/${params.id}`}>← Назад к событию</Link>

      <h1 style={{ marginTop: 20 }}>Добавить назначение</h1>
      <p style={{ marginTop: 8, opacity: 0.8 }}>
        <strong>{event.title}</strong>
      </p>

      <form action={action} style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 520, marginTop: 16 }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span>Роль</span>
          <select name="roleId" required defaultValue={event.play?.roles[0]?.id ?? ""}>
            {event.play?.roles.map((r) => (
              <option key={r.id} value={r.id}>{r.title}</option>
            ))}
          </select>
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span>Человек</span>
          <select name="personId" required defaultValue={people[0]?.id ?? ""}>
            {people.map((p) => (
              <option key={p.id} value={p.id}>{p.fullName} — {p.role}</option>
            ))}
          </select>
        </label>

        <button type="submit" disabled={people.length === 0 || !event.play || event.play.roles.length === 0}>Добавить</button>
      </form>
    </div>
  );
}
