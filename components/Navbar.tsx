import Link from 'next/link'
import { logoutAction } from '@/app/actions/auth'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

async function getUnreadCount() {
  return prisma.alert.count({ where: { read: false } })
}

export default async function Navbar() {
  const [user, unread] = await Promise.all([getCurrentUser(), getUnreadCount()])

  return (
    <nav className="bg-gray-900 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-50 shadow-lg">
      <Link href="/dashboard" className="text-lg font-bold flex items-center gap-2">
        🍖 <span className="hidden sm:inline">Inventario</span>
      </Link>

      <div className="flex items-center gap-3">
        <Link
          href="/resumen"
          className="p-2 rounded-lg hover:bg-gray-700 transition"
          title="Resumen de inventario"
        >
          <span className="text-xl">📋</span>
        </Link>
        <Link
          href="/alertas"
          className="relative p-2 rounded-lg hover:bg-gray-700 transition"
          title="Alertas"
        >
          <span className="text-xl">🔔</span>
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </Link>

        {user?.role === 'OWNER' && (
          <>
            <Link
              href="/compras"
              className="p-2 rounded-lg hover:bg-gray-700 transition"
              title="Lista de compras"
            >
              <span className="text-xl">🛒</span>
            </Link>
            <Link
              href="/consumo"
              className="p-2 rounded-lg hover:bg-gray-700 transition"
              title="Consumo diario"
            >
              <span className="text-xl">📊</span>
            </Link>
            <Link
              href="/admin"
              className="p-2 rounded-lg hover:bg-gray-700 transition"
              title="Administración"
            >
              <span className="text-xl">⚙️</span>
            </Link>
          </>
        )}

        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-300 hidden sm:block">{user?.name}</span>
          <form action={logoutAction}>
            <button
              type="submit"
              className="text-sm bg-gray-700 hover:bg-gray-600 px-3 py-1.5 rounded-lg transition"
            >
              Salir
            </button>
          </form>
        </div>
      </div>
    </nav>
  )
}
