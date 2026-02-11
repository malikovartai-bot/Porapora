'use client';

import { useEffect, useState } from 'react';

export function PeopleClient() {
  const [people, setPeople] = useState<any[]>([]);
  const [form, setForm] = useState<any>({ role: 'ACTOR' });

  const load = async () => setPeople(await fetch('/api/people').then((r) => r.json()));
  useEffect(() => { load(); }, []);

  return (
    <main className="space-y-4">
      <h2 className="text-xl font-semibold">Участники</h2>
      <form className="grid gap-2 md:grid-cols-3" onSubmit={async (e) => { e.preventDefault(); await fetch('/api/people', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) }); setForm({ role: 'ACTOR' }); load(); }}>
        <input className="input" placeholder="ФИО" value={form.fullName || ''} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
        <select className="input" value={form.role || 'ACTOR'} onChange={(e) => setForm({ ...form, role: e.target.value })}><option>ACTOR</option><option>TECH</option><option>OTHER</option></select>
        <input className="input" placeholder="ID пользователя (опц.)" value={form.userId || ''} onChange={(e) => setForm({ ...form, userId: e.target.value })} />
        <button className="btn btn-gold">Создать</button>
      </form>
      <ul className="space-y-2">{people.map((p) => <li key={p.id} className="rounded border p-3">{p.fullName} · {p.role} {p.user ? `· привязан к ${p.user.email}` : ''}</li>)}</ul>
    </main>
  );
}
