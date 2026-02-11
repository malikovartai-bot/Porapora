'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function EventsPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [filters, setFilters] = useState<any>({});
  const [form, setForm] = useState<any>({ type: 'SHOW', status: 'DRAFT' });

  const load = async () => {
    const qs = new URLSearchParams(filters).toString();
    setEvents(await fetch(`/api/events?${qs}`).then((r) => r.json()));
  };
  useEffect(() => { load(); }, []);

  return (
    <main className="space-y-4">
      <h2 className="text-xl font-semibold">Сеансы</h2>
      <div className="grid gap-2 md:grid-cols-4">
        <select className="input" onChange={(e) => setFilters({ ...filters, type: e.target.value })}><option value="">Тип</option><option>SHOW</option><option>REHEARSAL</option></select>
        <select className="input" onChange={(e) => setFilters({ ...filters, status: e.target.value })}><option value="">Статус</option><option>DRAFT</option><option>CONFIRMED</option><option>CANCELED</option></select>
        <button className="btn" onClick={load}>Фильтровать</button>
      </div>

      <form className="grid gap-2 md:grid-cols-3" onSubmit={async (e) => { e.preventDefault(); await fetch('/api/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) }); setForm({ type: 'SHOW', status: 'DRAFT' }); load(); }}>
        <input className="input" placeholder="Название" value={form.title || ''} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <input className="input" type="datetime-local" value={form.startAt || ''} onChange={(e) => setForm({ ...form, startAt: e.target.value })} />
        <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}><option>SHOW</option><option>REHEARSAL</option></select>
        <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option>DRAFT</option><option>CONFIRMED</option><option>CANCELED</option></select>
        <button className="btn btn-gold">Создать</button>
      </form>

      <ul className="space-y-2">{events.map((e) => <li key={e.id} className="rounded border p-3"><Link href={`/events/${e.id}`} className="underline">{e.title}</Link> · {new Date(e.startAt).toLocaleString('ru-RU')} · {e.status}</li>)}</ul>
    </main>
  );
}
