import Link from "next/link";
import { prisma } from "@/lib/prisma";

function isoDate(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}
function endOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

function ruRole(raw: string) {
  const map: Record<string, string> = {
    ACTOR: "Актер",
    DIRECTOR: "Режиссер",
    SOUND: "Звук",
    LIGHT: "Свет",
    STAGEMAN: "Машинист",
    PROPS: "Реквизит",
    COSTUME: "Костюм",
    ASM: "Помреж",
    ADMIN: "Администратор",
    TECH: "Тех.",
    OTHER: "Другое",
  };
  return map[raw] ?? raw;
}

export default async function CalendarDayPage({
  searchParams,
}: {
  searchParams?: { date?: string; role?: string; q?: string };
}) {
  const selected = (() => {
    const s = searchParams?.date?.trim();
    if (!s) return new Date();
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (!m) return new Date();
    const y = Number(m[1]);
    const mo = Number(m[2]) - 1;
    const d = Number(m[3]);
    const dt = new Date(y, mo, d);
    return Number.isNaN(dt.getTime()) ? new Date() : dt;
  })();

  const roleFilter = (searchParams?.role ?? "all").trim();
  const q = (searchParams?.q ?? "").trim();

  const dayStart = startOfDay(selected);
  const dayEnd = endOfDay(selected);

  const [people, events, external, rolesDistinct] = await Promise.all([
    prisma.person.findMany({
      where: {
        ...(roleFilter !== "all" ? { role: roleFilter as any } : {}),
        ...(q ? { fullName: { contains: q, mode: "insensitive" } } : {}),
      },
      orderBy: { fullName: "asc" },
      select: { id: true, fullName: true, role: true },
    }),
    prisma.event.findMany({
      where: { startAt: { lte: dayEnd }, AND: [{ startAt: { gte: dayStart } }] },
      orderBy: { startAt: "asc" },
      select: {
        id: true,
        title: true,
        startAt: true,
        endAt: true,
        assignments: { select: { personId: true } },
      },
    }),
    prisma.externalBooking.findMany({
      where: {
        OR: [
          { startAt: { lte: dayEnd }, endAt: { gte: dayStart } },
          { startAt: { gte: dayStart, lte: dayEnd } },
        ],
      },
      select: { id: true, personId: true, title: true, startAt: true, endAt: true },
    }),
    prisma.person.findMany({
      distinct: ["role"],
      select: { role: true },
      orderBy: { role: "asc" },
    }),
  ]);

  const busyByPerson = new Map<string, { kind: "event" | "external"; title: string }[]>();

  for (const e of events) {
    for (const a of e.assignments) {
      const arr = busyByPerson.get(a.personId) ?? [];
      arr.push({ kind: "event", title: e.title });
      busyByPerson.set(a.personId, arr);
    }
  }
  for (const b of external) {
    const arr = busyByPerson.get(b.personId) ?? [];
    arr.push({ kind: "external", title: b.title });
    busyByPerson.set(b.personId, arr);
  }

  const roles = rolesDistinct
    .map((r) => r.role)
    .filter(Boolean) as unknown as string[];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">
          Календарь — занятость по дате
        </h1>
        <Link
          href="/calendar/matrix"
          className="px-3 py-2 bg-black text-white rounded"
        >
          Матрица занятости →
        </Link>
      </div>

      <form className="flex flex-wrap items-center gap-3">
        <input
          type="date"
          name="date"
          defaultValue={isoDate(selected)}
          className="border rounded px-2 py-1"
        />
        <input
          type="text"
          name="q"
          placeholder="Поиск по имени"
          defaultValue={q}
          className="border rounded px-2 py-1"
        />
        <select
          name="role"
          defaultValue={roleFilter}
          className="border rounded px-2 py-1"
        >
          <option value="all">Все должности</option>
          {roles.map((r) => (
            <option key={r} value={r}>
              {ruRole(r)}
            </option>
          ))}
        </select>
        <button className="px-3 py-2 bg-black text-white rounded" type="submit">
          Применить
        </button>
      </form>

      <div className="max-w-xl">
        <table className="w-full border-collapse">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2">ФИО</th>
              <th className="py-2">Должность</th>
              <th className="py-2">Статус</th>
            </tr>
          </thead>
          <tbody>
            {people.map((p) => {
              const busy = busyByPerson.get(p.id) ?? [];
              const isBusy = busy.length > 0;
              return (
                <tr key={p.id} className="border-b">
                  <td className="py-2">{p.fullName}</td>
                  <td className="py-2">{ruRole(String(p.role))}</td>
                  <td className="py-2">
                    {isBusy ? (
                      <div className="text-red-700">
                        Занят:{" "}
                        <span className="text-red-700">
                          {busy.map((x) => x.title).join(", ")}
                        </span>
                      </div>
                    ) : (
                      <span className="text-green-700">Свободен</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {people.length === 0 && (
              <tr>
                <td className="py-4 text-gray-500" colSpan={3}>
                  Никого не найдено.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
