import './globals.css';
import { getAuthSession } from '@/lib/auth';
import { Nav } from '@/components/layout/nav';
import { Providers } from './providers';

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getAuthSession();

  return (
    <html lang="ru">
      <body>
        <Providers>
          <div className="mx-auto min-h-screen max-w-6xl p-4">
            <header className="mb-6 border-b border-black pb-4">
              <h1 className="text-2xl font-semibold">AmmA — внутренний портал</h1>
              {session?.user && (
                <div className="mt-3 space-y-2">
                  <p className="text-sm">{session.user.name || session.user.email} · {(session.user as any).role}</p>
                  <Nav role={(session.user as any).role} />
                </div>
              )}
            </header>
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
