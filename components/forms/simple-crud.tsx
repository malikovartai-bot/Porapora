'use client';

import { useEffect, useState } from 'react';

export function SimpleCrud({
  title,
  endpoint,
  fields,
  canEdit = true
}: {
  title: string;
  endpoint: string;
  fields: { key: string; label: string; type?: string; options?: string[] }[];
  canEdit?: boolean;
}) {
  const [items, setItems] = useState<any[]>([]);
  const [form, setForm] = useState<Record<string, string>>({});
  const [error, setError] = useState('');

  const load = async () => {
    const res = await fetch(endpoint);
    const data = await res.json();
    setItems(data);
  };

  useEffect(() => { load(); }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    if (!res.ok) {
      setError('Ошибка сохранения');
      return;
    }
    setForm({});
    setError('');
    await load();
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">{title}</h2>
      {canEdit && (
        <form className="grid gap-2 md:grid-cols-2" onSubmit={submit}>
          {fields.map((f) => (
            f.options ? (
              <select key={f.key} className="input" value={form[f.key] || ''} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}>
                <option value="">{f.label}</option>
                {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : (
              <input key={f.key} className="input" placeholder={f.label} type={f.type || 'text'} value={form[f.key] || ''} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
            )
          ))}
          <button className="btn btn-gold" type="submit">Создать</button>
          {error && <p className="text-red-600">{error}</p>}
        </form>
      )}
      <div className="overflow-auto rounded border">
        <table className="min-w-full text-sm">
          <thead className="bg-neutral-100"><tr>{fields.map((f) => <th key={f.key} className="border p-2 text-left">{f.label}</th>)}</tr></thead>
          <tbody>
            {items.length === 0 && <tr><td className="p-3" colSpan={fields.length}>Пусто</td></tr>}
            {items.map((it) => <tr key={it.id}>{fields.map((f) => <td key={f.key} className="border p-2">{String(it[f.key] ?? '')}</td>)}</tr>)}
          </tbody>
        </table>
      </div>
    </div>
  );
}
