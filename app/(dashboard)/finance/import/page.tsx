import Link from "next/link";
import { importInticketsXlsxGlobal } from "./actions";

export default async function FinanceImportPage({
  searchParams,
}: {
  searchParams?: { ok?: string; error?: string; lines?: string; plays?: string; events?: string; reportId?: string; eventId?: string; redirectTo?: string; existingReportId?: string };
}) {
  const ok = searchParams?.ok === "1";
  const error = searchParams?.error ? decodeURIComponent(searchParams.error) : null;

  const eventId = (searchParams?.eventId ?? "").trim();
  const redirectTo = (searchParams?.redirectTo ?? "").trim();
  const backHref = eventId
    ? `/events/${eventId}/finance`
    : redirectTo && redirectTo.startsWith("/")
      ? redirectTo
      : "/calendar";
  const backLabel = eventId ? "← К событию" : redirectTo && redirectTo.startsWith("/") ? "← Назад" : "← К календарю";

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Импорт финансового отчёта (Intickets)</h1>
          <p className="text-sm text-neutral-600">
            Загружаешь один Excel → портал сам создаёт недостающие спектакли (Play) и события (Event) и привязывает строки.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link className="px-3 py-2 rounded border text-sm hover:bg-neutral-50" href={backHref}>
            {backLabel}
          </Link>
          <Link className="px-3 py-2 rounded border text-sm hover:bg-neutral-50" href="/dds">
            ДДС
          </Link>
        </div>
      </div>

      {error ? (
        <div className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800 space-y-1">
          <div>{error}</div>
          {searchParams?.existingReportId ? (
            <div className="text-xs text-red-900">
              Уже загружен отчёт: <code>{searchParams.existingReportId}</code>
            </div>
          ) : null}
        </div>
      ) : null}

      {ok ? (
        <div className="rounded border border-green-300 bg-green-50 p-3 text-sm text-green-800 space-y-1">
          <div><b>Импорт выполнен.</b></div>
          <div>
            Строк: <b>{searchParams?.lines ?? "—"}</b> · Создано спектаклей: <b>{searchParams?.plays ?? "0"}</b> · Создано
            событий: <b>{searchParams?.events ?? "0"}</b>
          </div>
          <div className="text-xs text-green-900">
            Если что-то не сматчилось как надо — мы добавим экран “Сопоставление” (ручная правка привязки строк к событию).
          </div>
        </div>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Загрузить файл</h2>
        <form
          action={async (fd) => {
            "use server";
            await importInticketsXlsxGlobal(fd);
          }}
          className="flex flex-wrap items-center gap-3"
        >
          <input type="hidden" name="redirectTo" value={eventId ? `/events/${eventId}/finance` : redirectTo || "/finance/import"} />
          {eventId ? <input type="hidden" name="eventId" value={eventId} /> : null}
          <input type="file" name="file" accept=".xlsx" className="text-sm" required />
          <button className="px-3 py-2 rounded border text-sm hover:bg-neutral-50" type="submit">
            Импортировать
          </button>
          <div className="text-xs text-neutral-500">
            Файл сохранится в <code>/public/uploads/finance</code> (локально).
          </div>
        </form>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Что произойдёт при импорте</h2>
        <ul className="list-disc pl-5 text-sm text-neutral-700 space-y-1">
          <li>Создастся <b>FinanceReport</b> (одна запись на один файл)</li>
          <li>Каждая строка “Мероприятие / Сеанс” станет <b>FinanceReportLine</b></li>
          <li>Для каждой строки портал найдёт или создаст <b>Play</b> (по названию)</li>
          <li>И найдёт или создаст <b>Event</b> (по Play + дате/времени сеанса)</li>
        </ul>
      </section>
    </div>
  );
}
