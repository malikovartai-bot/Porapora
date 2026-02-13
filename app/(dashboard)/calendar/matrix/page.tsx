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
function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
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

export default async function CalendarMatrixPage({
  searchParams,
}: {
  searchParams?: { from?: string; days?: string; role?: string; q?: string };
}) {
  const from = (() => {
    const s = searchParams?.from?.trim();
    if (!s) return startOfDay(new Date());
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (!m) return startOfDay(new Date());
    const dt = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return startOfDay(Number.isNaN(dt.getTime()) ? new Date() : dt);
  })();
  const days = Math.min(31, Math.max(7, Number(searchParams?.days ?? 14) || 14));
  const roleFilter = (searchParams?.role ?? "all").trim();
  const q = (searchParams?.q ?? "").trim();

  const to = endOfDay(addDays(from, days - 1));

  const [people, rolesDistinct, events, external] = await Promise.all([
    prisma.person.findMany({
      where: {
        ...(roleFilter !== "all" ? { role: roleFilter as any } : {}),
        ...(q ? { fullName: { contains: q, mode: "insensitive" } } : {}),
      },
      orderBy: { fullName: "asc" },
      select: { id: true, fullName: true, role: true },
    }),
    prisma.person.findMany({
      distinct: ["role"],
      select: { role: true },
      orderBy: { role: "asc" },
    }),
    prisma.event.findMany({
      where: { startAt: { gte: from, lte: to } },
      select: {
        id: true,
        title: true,
        startAt: true,
        endAt: true,
        assignments: { select: { personId: true } },
      },
    }),
    prisma.externalBooking.findMany({
      where: { startAt: { lte: to }, endAt: { gte: from } },
      select: { id: true, personId: true, title: true, startAt: true, endAt: true },
    }),
  ]);

  const roles = rolesDistinct
    .map((r) => r.role)
    .filter(Boolean) as unknown as string[];

  // Build busy map per person per day
  const busy = new Map<string, Map<string, string[]>>(); // personId -> date -> titles[]

  function mark(personId: string, dayKey: string, title: string) {
    const byDay = busy.get(personId) ?? new Map<string, string[]>();
    const arr = byDay.get(dayKey) ?? [];
    arr.push(title);
    byDay.set(dayKey, arr);
    busy.set(personId, byDay);
  }

  for (const e of events) {
    const dayKey = isoDate(e.startAt);
    for (const a of e.assignments) mark(a.personId, dayKey, e.title);
  }
  for (const b of external) {
    // mark all days of range
    let cur = startOfDay(b.startAt);
    const end = endOfDay(b.endAt ?? b.startAt);
    while (cur <= end) {
      const key = isoDate(cur);
      if (cur >= from && cur <= to) mark(b.personId, key, b.title);
      cur = addDays(cur, 1);
    }
  }

  const daysArr = Array.from({ length: days }, (_, i) => addDays(from, i));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Календарь — матрица занятости</h1>
        <Link href="/calendar" className="px-3 py-2 bg-black text-white rounded">
          ← По дням
        </Link>
      </div>

      <form className="flex flex-wrap items-center gap-3">
        <input
          type="date"
          name="from"
          defaultValue={isoDate(from)}
          className="border rounded px-2 py-1"
        />
        <input
          type="number"
          name="days"
          min={7}
          max={31}
          defaultValue={days}
          className="border rounded px-2 py-1 w-24"
        />
        <input
          type="text"
          name="q"
          placeholder="Поиск по имени"
          defaultValue={q}
          className="border rounded px-2 py-1"
        />
        <select name="role" defaultValue={roleFilter} className="border rounded px-2 py-1">
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

      {/*
        UX: при большом кол-ве дней появляется горизонтальный скролл.
        "ФИО" и "Должность" должны оставаться на месте, а даты/занятость — прокручиваться.
        Делаем первые 2 колонки sticky внутри скролл-контейнера.
      */}
      <div className="overflow-x-auto border rounded">
        <table className="min-w-[900px] w-full border-collapse">
          <thead>
            <tr className="border-b text-left">
              <th className="p-2 sticky left-0 z-30 bg-white w-[260px] min-w-[260px] border-r">
                ФИО
              </th>
              <th className="p-2 sticky left-[260px] z-30 bg-white w-[180px] min-w-[180px] border-r">
                Должность
              </th>
              {daysArr.map((d) => (
                <th key={isoDate(d)} className="p-2 whitespace-nowrap bg-white">
                  {isoDate(d).slice(5)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {people.map((p) => {
              const byDay = busy.get(p.id) ?? new Map<string, string[]>();
              return (
                <tr key={p.id} className="border-b">
                  <td className="p-2 whitespace-nowrap sticky left-0 z-20 bg-white w-[260px] min-w-[260px] border-r">
                    {p.fullName}
                  </td>
                  <td className="p-2 whitespace-nowrap sticky left-[260px] z-20 bg-white w-[180px] min-w-[180px] border-r">
                    {ruRole(String(p.role))}
                  </td>
                  {daysArr.map((d) => {
                    const key = isoDate(d);
                    const items = byDay.get(key) ?? [];
                    const isBusy = items.length > 0;
                    return (
                      <td key={key} className="p-2 text-center">
                        {isBusy ? (
                          <span title={items.join(", ")} className="text-red-700">
                            ●
                          </span>
                        ) : (
                          <span className="text-green-700">○</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
            {people.length === 0 && (
              <tr>
                <td className="p-4 text-gray-500" colSpan={2 + daysArr.length}>
                  Никого не найдено.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="text-sm text-gray-500">
        ● — занят (наведи мышь для деталей), ○ — свободен
      </div>
    </div>
  );
}
