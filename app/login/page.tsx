'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';

export default function LoginPage() {
  const [email, setEmail] = useState('admin@local.test');
  const [password, setPassword] = useState('Admin123!');
  const [error, setError] = useState('');

  return (
    <main className="mx-auto max-w-md">
      <h2 className="mb-4 text-xl font-semibold">Вход</h2>
      <form
        className="space-y-3"
        onSubmit={async (e) => {
          e.preventDefault();
          const result = await signIn('credentials', { email, password, callbackUrl: '/' });
          if (result?.error) setError('Неверные данные');
        }}
      >
        <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
        <input className="input" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Пароль" type="password" />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="btn btn-gold w-full" type="submit">Войти</button>
      </form>
    </main>
  );
}
