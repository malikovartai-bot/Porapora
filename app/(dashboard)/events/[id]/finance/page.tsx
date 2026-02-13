import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { createEventExpense, deleteEventExpense, deleteFinanceReport } from "./actions";

const CATEGORY_LABELS: Record<string, string> = {
  HONORARIUM: "Гонорары",
  DELIVERY: "Доставка/логистика",
  BUFFET: "Буфет/кейтеринг",
  RENT: "Аренда",
  PROPS: "Реквизит/материалы",
  COSTUME: "Костюм",
  MARKETING: "Реклама",
  OTHER: "Прочее",
};

function rub(n: any) {
  const v = typeof n === "number" ? n : Number(n ?? 0);
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 2,
  }).format(v);
}

function pctToRate(p: any) {
  const v = p === null || p === undefined ? 0 : Number(p);
  if (!Number.isFinite(v)) return 0;
  return v / 100;
}

export default async function EventFinancePage({ params }: { params: { id: string } }) {
  const event = await prisma.event.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      title: true,
      startAt: true,
      play: { select: { title: true } },
      financeReportLines: {
        orderBy: { sessionAt: "asc" },
        select: {
          id: true,
          playTitle: true,
          sessionAt: true,
          ticketsCount: true,
          grossAmount: true,
          servicePercent: true,
          partnerPercent: true,
          report: {
            select: {
              id: true,
              fileOriginalName: true,
              fileStoragePath: true,
              grossSales: true,
              serviceFee: true,
              refundsAmount: true,
              netToOrganizer: true,
              createdAt: true,
            },
          },
        },
      },
      expenses: {
        orderBy: { createdAt: "desc" },
        select: { id: true, category: true, title: true, amount: true, notes: true, createdAt: true },
      },
    },
  });

  if (!event) return <div className="p-6">Событие не найдено</div>;

  // Уникальные отчёты, которые затронули это событие
  const reportMap = new Map<string, any>();
  for (const l of event.financeReportLines) reportMap.set(l.report.id, l.report);
  const reports = Array.from(reportMap.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  // Доход по строкам (НЕТТО): сумма - комиссия(услуги)
  const incomeGross = event.financeReportLines.reduce((s, l) => s + Number(l.grossAmount ?? 0), 0);
  const incomeServiceFee = event.financeReportLines.reduce((s, l) => {
    const gross = Number(l.grossAmount ?? 0);
    const fee = gross * pctToRate(l.servicePercent);
    return s + fee;
  }, 0);
  const incomeNet = incomeGross - incomeServiceFee;

  const totalExpenses = event.expenses.reduce((s, x) => s + Number(x.amount ?? 0), 0);

  const fmt = new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="p-6 space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Финансы события</h1>
          <div className="text-sm text-neutral-600">
            {event.play?.title ?? event.title} · {fmt.format(event.startAt)}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link className="px-3 py-2 rounded border text-sm hover:bg-neutral-50" href={`/events/${event.id}`}>
            ← к событию
          </Link>
          <Link className="px-3 py-2 rounded border text-sm hover:bg-neutral-50" href={`/dds`}>
            ДДС →
          </Link>
        </div>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Доход (из импортированных отчётов)</h2>
          <Link className="text-sm underline" href={`/finance/import?eventId=${event.id}&redirectTo=${encodeURIComponent(`/events/${event.id}/finance`)}`}>
            импортировать отчёт →
          </Link>
        </div>

        {event.financeReportLines.length === 0 ? (
          <div className="text-sm text-neutral-600">Для этого события строк отчёта пока нет.</div>
        ) : (
          <>
            {reports.length ? (
              <div className="space-y-2">
                {reports.map((r) => (
                  <div key={r.id} className="rounded border p-3 text-sm space-y-1">
                    <div className="font-medium">
                      {r.fileOriginalName}{" "}
                      <a className="underline text-neutral-700" href={r.fileStoragePath} target="_blank" rel="noreferrer">
                        (открыть)
                      </a>
                    </div>
                    <div className="text-neutral-700 flex flex-wrap gap-4">
                      <div>
                        Вал отчёта: <b>{rub(Number(r.grossSales ?? 0))}</b>
                      </div>
                      <div>
                        Комиссия: <b>{rub(Number(r.serviceFee ?? 0))}</b>
                      </div>
                      <div>
                        К перечислению: <b>{rub(Number(r.netToOrganizer ?? 0))}</b>
                      </div>
                    </div>
                    <div className="mt-2">
                      <form
                        action={async () => {
                          "use server";
                          await deleteFinanceReport(event.id, r.id);
                        }}
                      >
                        <button className="text-xs underline text-red-700" type="submit">
                          удалить отчёт
                        </button>
                      </form>
                    </div>

                  </div>
                ))}
              </div>
            ) : null}

            <div className="rounded border overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-neutral-50">
                  <tr>
                    <th className="p-2 text-left">Мероприятие</th>
                    <th className="p-2 text-left">Сеанс</th>
                    <th className="p-2 text-right">Билеты</th>
                    <th className="p-2 text-right">Сумма</th>
                    <th className="p-2 text-right">Услуги %</th>
                    <th className="p-2 text-right">Комиссия</th>
                    <th className="p-2 text-right">Доход (нетто)</th>
                  </tr>
                </thead>
                <tbody>
                  {event.financeReportLines.map((l) => {
                    const gross = Number(l.grossAmount ?? 0);
                    const fee = gross * pctToRate(l.servicePercent);
                    const net = gross - fee;
                    return (
                      <tr key={l.id} className="border-t">
                        <td className="p-2">{l.playTitle}</td>
                        <td className="p-2">{fmt.format(l.sessionAt)}</td>
                        <td className="p-2 text-right">{l.ticketsCount}</td>
                        <td className="p-2 text-right">{rub(gross)}</td>
                        <td className="p-2 text-right">
  {l.servicePercent == null ? "—" : String(l.servicePercent)}
</td>
                        <td className="p-2 text-right">{rub(fee)}</td>
                        <td className="p-2 text-right">
                          <b>{rub(net)}</b>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        <div className="text-sm text-neutral-700 grid gap-1">
          <div>
            Вал по строкам: <b>{rub(incomeGross)}</b>
          </div>
          <div>
            Комиссия (услуги): <b>{rub(incomeServiceFee)}</b>
          </div>
          <div>
            Доход (нетто): <b>{rub(incomeNet)}</b>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Расходы (вручную)</h2>

        <form
          action={async (fd) => {
            "use server";
            await createEventExpense(event.id, fd);
          }}
          className="grid gap-2 max-w-2xl"
        >
          <div className="flex flex-wrap gap-2">
            <select name="category" className="rounded border px-3 py-2 text-sm">
              {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>

            <input
              name="title"
              placeholder="Например: гонорар актёрам"
              className="flex-1 rounded border px-3 py-2 text-sm"
            />
            <input name="amount" placeholder="Сумма" className="w-40 rounded border px-3 py-2 text-sm" />
          </div>

          <textarea
            name="notes"
            placeholder="Комментарий (необязательно)"
            className="rounded border px-3 py-2 text-sm"
            rows={2}
          />

          <div>
            <button className="px-3 py-2 rounded border text-sm hover:bg-neutral-50" type="submit">
              Добавить расход
            </button>
          </div>
        </form>

        <div className="text-sm text-neutral-700">
          Итого расходов: <b>{rub(totalExpenses)}</b>
        </div>

        {event.expenses.length === 0 ? (
          <div className="text-sm text-neutral-600">Расходов пока нет.</div>
        ) : (
          <div className="rounded border overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50">
                <tr>
                  <th className="p-2 text-left">Категория</th>
                  <th className="p-2 text-left">Название</th>
                  <th className="p-2 text-right">Сумма</th>
                  <th className="p-2 text-left">Комментарий</th>
                  <th className="p-2 text-right">Действия</th>
                </tr>
              </thead>
              <tbody>
                {event.expenses.map((x) => (
                  <tr key={x.id} className="border-t">
                    <td className="p-2">{CATEGORY_LABELS[String(x.category)] ?? String(x.category)}</td>
                    <td className="p-2">{x.title}</td>
                    <td className="p-2 text-right">{rub(Number(x.amount))}</td>
                    <td className="p-2 text-neutral-600">{x.notes ?? "—"}</td>
                    <td className="p-2 text-right">
                      <form
                        action={async () => {
                          "use server";
                          await deleteEventExpense(event.id, x.id);
                        }}
                      >
                        <button className="text-sm underline text-red-700" type="submit">
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

      <section className="rounded border p-3">
        <h3 className="font-medium mb-2">Сводка (быстро)</h3>
        <div className="text-sm grid gap-1">
          <div>
            Доход (нетто): <b>{rub(incomeNet)}</b>
          </div>
          <div>
            Расходы (вручную): <b>{rub(totalExpenses)}</b>
          </div>
          <div>
            Прибыль (нетто - расходы): <b>{rub(incomeNet - totalExpenses)}</b>
          </div>
        </div>
        <div className="text-xs text-neutral-500 mt-2">
          “Доход (нетто)” = сумма строк отчёта − комиссия по колонке “Вознаграждение за услуги, %”.
        </div>
      </section>
    </div>
  );
}
