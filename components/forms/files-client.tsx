'use client';

import { useEffect, useState } from 'react';

export default function FilesPage() {
  const [files, setFiles] = useState<any[]>([]);
  const [filter, setFilter] = useState<any>({});
  const [form, setForm] = useState<any>({ visibility: 'CAST_TECH' });

  const load = async () => {
    const qs = new URLSearchParams(filter).toString();
    setFiles(await fetch(`/api/files?${qs}`).then((r) => r.json()));
  };
  useEffect(() => { load(); }, []);

  const upload = async (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData();
    fd.append('file', form.file);
    fd.append('visibility', form.visibility);
    if (form.playId) fd.append('playId', form.playId);
    if (form.eventId) fd.append('eventId', form.eventId);
    await fetch('/api/upload', { method: 'POST', body: fd });
    setForm({ visibility: 'CAST_TECH' });
    load();
  };

  return (
    <main className="space-y-4">
      <h2 className="text-xl font-semibold">Файлы</h2>
      <div className="flex gap-2">
        <select className="input max-w-xs" onChange={(e) => setFilter({ ...filter, visibility: e.target.value })}><option value="">Все видимости</option><option>INTERNAL</option><option>CAST_TECH</option></select>
        <button className="btn" onClick={load}>Применить</button>
      </div>
      <form className="grid gap-2 md:grid-cols-4" onSubmit={upload}>
        <input className="input" type="file" onChange={(e) => setForm({ ...form, file: e.target.files?.[0] })} />
        <select className="input" value={form.visibility} onChange={(e) => setForm({ ...form, visibility: e.target.value })}><option>INTERNAL</option><option>CAST_TECH</option></select>
        <input className="input" placeholder="ID спектакля (опц.)" value={form.playId || ''} onChange={(e) => setForm({ ...form, playId: e.target.value })} />
        <input className="input" placeholder="ID сеанса (опц.)" value={form.eventId || ''} onChange={(e) => setForm({ ...form, eventId: e.target.value })} />
        <button className="btn btn-gold">Загрузить</button>
      </form>
      <ul className="space-y-2">{files.map((f) => <li key={f.id} className="rounded border p-2">{f.originalName} · {f.visibility} · {f.play?.title || f.event?.title || 'без привязки'}</li>)}</ul>
    </main>
  );
}
