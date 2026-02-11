import { redirect } from 'next/navigation';
import { getAuthSession } from '@/lib/auth';
import FilesClient from '@/components/forms/files-client';

export default async function FilesPage() {
  const session = await getAuthSession();
  if (!session) redirect('/login');
  return <FilesClient />;
}
