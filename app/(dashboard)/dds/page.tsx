import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { importInticketsXlsxGlobal } from "../finance/import/actions";

function rub(amount: number) {
  return new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB" }).format(amount);
}

function moneyClass(v: number, kind: "income" | "expense" | "profit" = "income") {
  if (kind === "expense") return "text-red-700";
  if (kind === "profit") return v >= 0 ? "text-green-700" : "text-red-700";
  return "text-green-700";
}

function toNumber(v: any): number {
  if (v === null || v === undefined) return 0;
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = Number(v.replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  }
  // Prisma Decimal
  try {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

function clampDateParam(v: string | string[] | undefined): string | null {
  if (!v) return null;
  const s = Array.isArray(v) ? v[0] : v;
  // expecting YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  return s;
}

export default async function DDSPage({
  searchParams,
}: {
  searchParams?: { from?: string; to?: string; playId?: string };
}) {
  const from = clampDateParam(searchParams?.from);
  const to = clampDateParam(searchParams?.to);
  const playId = (searchParams?.playId ?? "").trim() || "";

  const where: any = {};
  if (from || to) {
    where.startAt = {};
    if (from) where.startAt.gte = new Date(from + "T00:00:00");
    if (to) where.startAt.lte = new Date(to + "T23:59:59");
  }
  if (playId) where.playId = playId;

  const [plays, events] = await Promise.all([
    prisma.play.findMany({ orderBy: { title: "asc" } }),
    prisma.event.findMany({
      where,
      include: { play: true },
      orderBy: { startAt: "desc" },
      take: 300,
    }),
  ]);

  const reports = await prisma.financeReport.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      fileOriginalName: true,
      fileStoragePath: true,
      createdAt: true,
      grossSales: true,
      serviceFee: true,
      netToOrganizer: true,
      _count: { select: { lines: true } },
    },
  });

  const eventIds = events.map((e) => e.id);

  const [lines, expenses] = await Promise.all([
    eventIds.length
      ? prisma.financeReportLine.findMany({
          where: { eventId: { in: eventIds } },
          select: { eventId: true, grossAmount: true, servicePercent: true },
        })
      : Promise.resolve([]),
    eventIds.length
      ? prisma.eventExpense.findMany({
          where: { eventId: { in: eventIds } },
          select: { eventId: true, amount: true },
        })
      : Promise.resolve([]),
  ]);

  const byEvent = new Map<
    string,
    { gross: number; commission: number; net: number; manualExpenses: number; profit: number }
  >();

  for (const id of eventIds) {
    byEvent.set(id, { gross: 0, commission: 0, net: 0, manualExpenses: 0, profit: 0 });
  }

  // импорт: gross + commission (gross * servicePercent/100), net = gross - commission
  for (const l of lines) {
    const id = l.eventId;
    if (!id) continue;
    const row = byEvent.get(id);
    if (!row) continue;

    const gross = toNumber(l.grossAmount);
    const percent = toNumber(l.servicePercent); // 5 => 5%
    const commission = percent ? gross * (percent / 100) : 0;

    row.gross += gross;
    row.commission += commission;
  }

  // ручные расходы
  for (const e of expenses) {
    const row = byEvent.get(e.eventId);
    if (!row) continue;
    row.manualExpenses += toNumber(e.amount);
  }

  // финализация
  for (const [id, row] of byEvent) {
    row.net = row.gross - row.commission;
    row.profit = row.net - row.manualExpenses;
  }

  const totals = events.reduce(
    (acc, ev) => {
      const s = byEvent.get(ev.id) || { gross: 0, commission: 0, net: 0, manualExpenses: 0, profit: 0 };
      acc.gross += s.gross;
      acc.commission += s.commission;
      acc.net += s.net;
      acc.manualExpenses += s.manualExpenses;
      acc.profit += s.profit;
      return acc;
    },
    { gross: 0, commission: 0, net: 0, manualExpenses: 0, profit: 0 }
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">ДДС</h1>
          <div className="text-sm text-neutral-500">
            Свод по всем событиям: доход (net) − ручные расходы = прибыль
          </div>
        </div>

        <div className="flex gap-2">
          <Link href="/finance/import?redirectTo=%2Fdds" className="rounded-md border px-3 py-2 text-sm hover:bg-neutral-50">
            Импорт отчёта
          </Link>
          <Link href="/events" className="rounded-md border px-3 py-2 text-sm hover:bg-neutral-50">
            События
          </Link>
        </div>
      </div>

      {/* Filters */}
      <form className="rounded-md border p-4 grid gap-3 md:grid-cols-12" method="get">
        <div className="md:col-span-3">
          <label className="mb-1 block text-xs text-neutral-500">С</label>
          <input
            type="date"
            name="from"
            defaultValue={from ?? ""}
            className="w-full rounded-md border px-3 py-2 text-sm"
          />
        </div>

        <div className="md:col-span-3">
          <label className="mb-1 block text-xs text-neutral-500">По</label>
          <input
            type="date"
            name="to"
            defaultValue={to ?? ""}
            className="w-full rounded-md border px-3 py-2 text-sm"
          />
        </div>

        <div className="md:col-span-5">
          <label className="mb-1 block text-xs text-neutral-500">Спектакль</label>
          <select
            name="playId"
            defaultValue={playId}
            className="w-full rounded-md border px-3 py-2 text-sm"
          >
            <option value="">Все</option>
            {plays.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-1 flex items-end">
          <button type="submit" className="w-full rounded-md border px-3 py-2 text-sm hover:bg-neutral-50">
            ОК
          </button>
        </div>
      </form>


      {/* Import */}
      <section className="rounded-md border p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold">Импорт отчёта (Intickets)</h2>
          <div className="text-xs text-neutral-500">Импорт сразу распределит строки по событиям</div>
        </div>

        <form
          action={async (fd) => {
            "use server";
            fd.set("redirectTo", "/dds");
            await importInticketsXlsxGlobal(fd);
          }}
          className="flex flex-wrap items-center gap-3"
        >
          <input type="file" name="file" accept=".xlsx" className="text-sm" required />
          <button className="px-3 py-2 rounded border text-sm hover:bg-neutral-50" type="submit">
            Импортировать
          </button>
        </form>
      </section>


      {/* Reports list */}
      <section className="rounded-md border p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold">Загруженные отчёты</h2>
          <div className="text-xs text-neutral-500">последние {reports.length} (можно удалять)</div>
        </div>

        {reports.length === 0 ? (
          <div className="text-sm text-neutral-600">Отчётов пока нет.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[900px] w-full text-sm">
              <thead className="text-left text-xs text-neutral-500">
                <tr className="border-b">
                  <th className="py-2 pr-3">Файл</th>
                  <th className="py-2 pr-3">Дата загрузки</th>
                  <th className="py-2 pr-3">Строк</th>
                  <th className="py-2 pr-3">Вал</th>
                  <th className="py-2 pr-3">Комиссия</th>
                  <th className="py-2 pr-3">К перечислению</th>
                  <th className="py-2 pr-3 w-[1%]"></th>
                </tr>
              </thead>
              <tbody>
                {reports.map((r) => (
                  <tr key={r.id} className="border-b last:border-b-0">
                    <td className="py-2 pr-3">
                      <a className="underline" href={r.fileStoragePath} target="_blank" rel="noreferrer">
                        {r.fileOriginalName}
                      </a>
                    </td>
                    <td className="py-2 pr-3 text-neutral-600">
                      {new Date(r.createdAt).toLocaleString("ru-RU", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="py-2 pr-3">{r._count.lines}</td>
                    <td className="py-2 pr-3 font-medium"><span className={moneyClass(toNumber(r.grossSales), "income")}>{rub(toNumber(r.grossSales))}</span></td>
                    <td className="py-2 pr-3 font-medium">{rub(toNumber(r.serviceFee))}</td>
                    <td className="py-2 pr-3 font-medium"><span className={moneyClass(toNumber(r.netToOrganizer), "income")}>{rub(toNumber(r.netToOrganizer))}</span></td>
                    <td className="py-2 pr-3">
                      <form
                        action={async (fd) => {
                          "use server";
                          const reportId = String(fd.get("reportId") ?? "").trim();
                          if (!reportId) return;
                          await prisma.$transaction([
                            prisma.financeReportLine.deleteMany({ where: { reportId } }),
                            prisma.financeReport.delete({ where: { id: reportId } }),
                          ]);
                          revalidatePath("/dds");
                          redirect("/dds");
                        }}
                      >
                        <input type="hidden" name="reportId" value={r.id} />
                        <button className="text-xs underline text-red-700" type="submit">
                          удалить
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Totals */}
      <div className="grid gap-3 rounded-md border p-4 sm:grid-cols-2 lg:grid-cols-5">
        <div>
          <div className="text-xs text-neutral-500">Вал (gross)</div>
          <div className="text-lg font-semibold"><span className={moneyClass(totals.gross, "income")}>{rub(totals.gross)}</span></div>
        </div>
        <div>
          <div className="text-xs text-neutral-500">Комиссия</div>
          <div className="text-lg font-semibold">{rub(totals.commission)}</div>
        </div>
        <div>
          <div className="text-xs text-neutral-500">Доход (net)</div>
          <div className="text-lg font-semibold"><span className={moneyClass(totals.net, "income")}>{rub(totals.net)}</span></div>
        </div>
        <div>
          <div className="text-xs text-neutral-500">Расходы (ручные)</div>
          <div className="text-lg font-semibold"><span className={moneyClass(totals.manualExpenses, "expense")}>{rub(totals.manualExpenses)}</span></div>
        </div>
        <div>
          <div className="text-xs text-neutral-500">Прибыль</div>
          <div className="text-lg font-semibold"><span className={moneyClass(totals.profit, "profit")}>{rub(totals.profit)}</span></div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">События</h2>
          <div className="text-xs text-neutral-500">{events.length ? `строк: ${events.length}` : "нет событий"}</div>
        </div>

        {events.length === 0 ? (
          <div className="text-sm text-neutral-600">По выбранным фильтрам событий нет.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[1100px] w-full text-sm">
              <thead className="text-left text-xs text-neutral-500">
                <tr className="border-b">
                  <th className="py-2 pr-3">Дата</th>
                  <th className="py-2 pr-3">Событие</th>
                  <th className="py-2 pr-3">Спектакль</th>
                  <th className="py-2 pr-3">Вал</th>
                  <th className="py-2 pr-3">Комиссия</th>
                  <th className="py-2 pr-3">Доход (net)</th>
                  <th className="py-2 pr-3">Расходы</th>
                  <th className="py-2 pr-3">Прибыль</th>
                  <th className="py-2 pr-3 w-[1%]"></th>
                </tr>
              </thead>
              <tbody>
                {events.map((ev) => {
                  const s = byEvent.get(ev.id) || { gross: 0, commission: 0, net: 0, manualExpenses: 0, profit: 0 };
                  return (
                    <tr key={ev.id} className="border-b last:border-b-0">
                      <td className="py-2 pr-3">
                        {new Date(ev.startAt).toLocaleString("ru-RU", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="py-2 pr-3">{ev.title}</td>
                      <td className="py-2 pr-3 text-neutral-600">{ev.play?.title ?? "—"}</td>
                      <td className="py-2 pr-3 font-medium"><span className={moneyClass(s.gross, "income")}>{rub(s.gross)}</span></td>
                      <td className="py-2 pr-3 font-medium">{rub(s.commission)}</td>
                      <td className="py-2 pr-3 font-medium"><span className={moneyClass(s.net, "income")}>{rub(s.net)}</span></td>
                      <td className="py-2 pr-3 font-medium"><span className={moneyClass(s.manualExpenses, "expense")}>{rub(s.manualExpenses)}</span></td>
                      <td className="py-2 pr-3 font-semibold"><span className={moneyClass(s.profit, "profit")}>{rub(s.profit)}</span></td>
                      <td className="py-2 pr-3">
                        <Link
                          href={`/events/${ev.id}/finance`}
                          className="rounded-md border px-2 py-1 text-xs hover:bg-neutral-50"
                        >
                          Финансы
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="text-xs text-neutral-500">
        Примечание: “Доход (net)” считается как сумма валовых продаж по строкам отчёта − комиссия (gross * service%).
        Если у события нет импортированных строк — доход 0, но ручные расходы всё равно учитываются.
      </div>
    </div>
  );
}
