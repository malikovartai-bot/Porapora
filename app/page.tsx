import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function HomePage() {
  const upcoming = await prisma.event.findMany({
    where: { status: { not: "CANCELED" } },
    orderBy: { startAt: "asc" },
    take: 50,
    include: { play: true, venue: true },
  });

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const today = upcoming.filter((e: any) => {
    const d = new Date(e.startAt);
    d.setHours(0, 0, 0, 0);
    return d.getTime() === startOfToday.getTime();
  });

  const next = upcoming.filter((e: any) => new Date(e.startAt) > new Date()).slice(0, 10);

  return (
    <main className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">AmmA • Портал</h1>
          <p className="text-sm text-muted-foreground">
            Быстрый доступ к событиям, людям, площадкам и файлам.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/events"
            className="rounded-md border px-3 py-2 text-sm hover:bg-muted"
          >
            События
          </Link>
          <Link
            href="/calendar"
            className="rounded-md border px-3 py-2 text-sm hover:bg-muted"
          >
            Календарь
          </Link>
          <Link
            href="/files"
            className="rounded-md border px-3 py-2 text-sm hover:bg-muted"
          >
            Файлы
          </Link>
        </div>
      </div>

      <section className="rounded-xl border p-4">
        <h2 className="mb-3 text-lg font-medium">Сегодня</h2>
        {today.length === 0 ? (
          <p className="text-sm text-muted-foreground">На сегодня событий нет.</p>
        ) : (
          <ul className="space-y-2">
            {today.map((e: any) => (
              <li key={e.id} className="flex items-center justify-between">
                <div className="min-w-0">
                  <div className="font-medium truncate">{e.title}</div>
                  <div className="text-sm text-muted-foreground truncate">
                    {e.play?.title ? `Спектакль: ${e.play.title} · ` : ""}
                    {e.venue?.title ? `Площадка: ${e.venue.title}` : ""}
                  </div>
                </div>
                <Link
                  href={`/events/${e.id}`}
                  className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted"
                >
                  Открыть
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border p-4">
        <h2 className="mb-3 text-lg font-medium">Ближайшие события</h2>
        {next.length === 0 ? (
          <p className="text-sm text-muted-foreground">Ближайших событий нет.</p>
        ) : (
          <ul className="space-y-2">
            {next.map((e: any) => (
              <li key={e.id} className="flex items-center justify-between">
                <div className="min-w-0">
                  <div className="font-medium truncate">{e.title}</div>
                  <div className="text-sm text-muted-foreground truncate">
                    {new Date(e.startAt).toLocaleString("ru-RU")}
                    {e.play?.title ? ` · ${e.play.title}` : ""}
                    {e.venue?.title ? ` · ${e.venue.title}` : ""}
                  </div>
                </div>
                <Link
                  href={`/events/${e.id}`}
                  className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted"
                >
                  Открыть
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
