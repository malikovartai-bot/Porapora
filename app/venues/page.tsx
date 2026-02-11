import { redirect } from 'next/navigation';
import { getAuthSession } from '@/lib/auth';
import { SimpleCrud } from '@/components/forms/simple-crud';

export default async function VenuesPage() {
  const session = await getAuthSession();
  if (!session) redirect('/login');
  const role = (session.user as any).role;
  if (!['OWNER', 'MANAGER'].includes(role)) redirect('/');
  return <SimpleCrud title="Площадки" endpoint="/api/venues" fields={[{ key: 'title', label: 'Название' }, { key: 'address', label: 'Адрес' }, { key: 'notes', label: 'Заметки' }]} />;
}
