'use client';

import { eachDayOfInterval, endOfMonth, format, startOfMonth } from 'date-fns';
import { useEffect, useMemo, useState } from 'react';

export default function CalendarPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [selected, setSelected] = useState<string>('');
  const current = new Date();

  useEffect(() => { fetch('/api/events').then((r) => r.json()).then(setEvents); }, []);

  const days = useMemo(() => eachDayOfInterval({ start: startOfMonth(current), end: endOfMonth(current) }), []);
  const selectedEvents = events.filter((e) => format(new Date(e.startAt), 'yyyy-MM-dd') === selected);

  return (
    <main className="space-y-4">
      <h2 className="text-xl font-semibold">Календарь</h2>
      <div className="grid grid-cols-7 gap-2">
        {days.map((d) => {
          const key = format(d, 'yyyy-MM-dd');
          const count = events.filter((e) => format(new Date(e.startAt), 'yyyy-MM-dd') === key).length;
          return <button key={key} onClick={() => setSelected(key)} className="rounded border p-2 text-left hover:border-gold">{format(d, 'd')}<br /><span className="text-xs">{count} сеанс.</span></button>;
        })}
      </div>
      <section>
        <h3 className="font-semibold">Сеансы на {selected || '—'}</h3>
        <ul className="space-y-2">{selectedEvents.map((e) => <li key={e.id} className="rounded border p-2">{e.title}</li>)}</ul>
      </section>
    </main>
  );
}
