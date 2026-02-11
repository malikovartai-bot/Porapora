'use client';

import { useEffect, useState } from 'react';

export default function EventCard({ params }: { params: { id: string } }) {
  const [event, setEvent] = useState<any>(null);
  const [people, setPeople] = useState<any[]>([]);
  const [personId, setPersonId] = useState('');
  const [warning, setWarning] = useState('');

  const load = async () => {
    const [e, p] = await Promise.all([
      fetch(`/api/events/${params.id}`).then((r) => r.json()),
      fetch('/api/people').then((r) => (r.ok ? r.json() : []))
    ]);
    setEvent(e);
    setPeople(Array.isArray(p) ? p : []);
  };

  useEffect(() => { load(); }, [params.id]);

  if (!event) return <p>Загрузка...</p>;

  return (
    <main className="space-y-4">
      <h2 className="text-xl font-semibold">{event.title}</h2>
      <p>{new Date(event.startAt).toLocaleString('ru-RU')} — {event.endAt ? new Date(event.endAt).toLocaleString('ru-RU') : 'без окончания'}</p>
      <p>Статус: {event.status}</p>

      <section>
        <h3 className="font-semibold">Назначения</h3>
        <ul className="space-y-2">{event.assignments.map((a: any) => <li key={a.id} className="rounded border p-2">{a.person.fullName} · {a.jobTitle || '-'} <button className="ml-2 text-red-600" onClick={async () => { await fetch(`/api/events/${params.id}/assignments/${a.id}`, { method: 'DELETE' }); load(); }}>Удалить</button></li>)}</ul>

        {people.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            <select className="input max-w-sm" value={personId} onChange={(e) => setPersonId(e.target.value)}>
              <option value="">Выбрать участника</option>
              {people.map((p) => <option key={p.id} value={p.id}>{p.fullName}</option>)}
            </select>
            <button className="btn" onClick={async () => {
              const res = await fetch(`/api/events/${params.id}/assignments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ personId }) });
              const data = await res.json();
              setWarning(data.warning || '');
              setPersonId('');
              load();
            }}>Добавить</button>
          </div>
        )}
        {warning && <p className="text-amber-700">⚠ {warning}</p>}
      </section>
    </main>
  );
}
