import Link from 'next/link'
import { prisma } from '@/lib/prisma'

export default async function PlaysPage() {
  const plays = await prisma.play.findMany({
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Спектакли</h1>

      <div className="overflow-x-auto rounded border">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50">
            <tr>
              <th className="text-left p-3">Название</th>
              <th className="text-left p-3">Описание</th>
              <th className="text-right p-3">Действия</th>
            </tr>
          </thead>
          <tbody>
            {plays.map((play) => (
              <tr key={play.id} className="border-t">
                <td className="p-3">
                  <Link
                    href={`/plays/${play.id}`}
                    className="hover:underline font-medium"
                  >
                    {play.title}
                  </Link>
                </td>

                <td className="p-3 text-neutral-600">
                  {play.description ?? ''}
                </td>

                <td className="p-3">
                  <div className="flex justify-end gap-2">
                    <Link
                      href={`/plays/${play.id}/roles`}
                      className="px-3 py-2 rounded border hover:bg-neutral-50"
                    >
                      Роли
                    </Link>

                    <Link
                      href={`/plays/${play.id}/edit`}
                      className="px-3 py-2 rounded border hover:bg-neutral-50"
                    >
                      Редактировать
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
