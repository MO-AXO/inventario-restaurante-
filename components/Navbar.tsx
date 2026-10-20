import Link from 'next/link'
import { logoutAction } from '@/app/actions/auth'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'

export default async function Navbar() {
  const user = await getCurrentUser()
  // Pedidos por llevar: lo ven todos, pero el aviso rojo es para quien tiene que atenderlos.
  const canManage = user?.role === 'OWNER' || user?.role === 'MANAGER'
  const pedidosPendientes = user ? await prisma.pedido.count({ where: { status: 'PENDIENTE' } }) : 0

  return (
    <nav className="bg-[#211915] text-white px-3 sm:px-5 py-2.5 flex items-center justify-between sticky top-0 z-50 shadow-lg border-b border-orange-500/30">
      <Link href="/dashboard" className="flex items-center gap-2.5 shrink-0 group" aria-label="Pig Brothers, inicio">
        <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-400 to-orange-700 flex items-center justify-center text-xl shadow-inner group-hover:scale-105 transition">🐷</span>
        <span className="hidden sm:block leading-tight">
          <span className="block text-sm font-extrabold tracking-wide">Pig Brothers</span>
          <span className="block text-[10px] text-orange-200/70 uppercase tracking-widest">Inventario</span>
        </span>
      </Link>

      <div className="flex items-center gap-2 sm:gap-6 min-w-0">
        <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto">
          <Link
            href="/resumen"
            className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm font-medium text-gray-200 hover:bg-gray-700 hover:text-white transition whitespace-nowrap"
            title="Resumen de inventario"
          >
            <span>📋</span>
            <span className="hidden md:inline">Resumen</span>
          </Link>

          <Link
            href="/pedidos"
            className="relative flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm font-medium text-gray-200 hover:bg-gray-700 hover:text-white transition whitespace-nowrap"
            title="Pedidos"
          >
            <span>📝</span>
            <span className="hidden md:inline">Pedidos</span>
            {pedidosPendientes > 0 && (
              <span className={`absolute top-0 right-0 text-white text-[10px] font-bold min-w-4 h-4 px-1 rounded-full flex items-center justify-center ${canManage ? 'bg-red-500' : 'bg-gray-500'}`}>
                {pedidosPendientes > 9 ? '9+' : pedidosPendientes}
              </span>
            )}
          </Link>

          {(user?.role === 'OWNER' || user?.role === 'MANAGER') && (
            <Link
              href="/recarga-restaurante"
              className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm font-medium text-gray-200 hover:bg-gray-700 hover:text-white transition whitespace-nowrap"
              title="Recarga Restaurante"
            >
              <span>🔄</span>
              <span className="hidden md:inline">Recarga Restaurante</span>
            </Link>
          )}

          {user?.role === 'OWNER' && (
            <>
              <Link
                href="/compras"
                className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm font-medium text-gray-200 hover:bg-gray-700 hover:text-white transition whitespace-nowrap"
                title="Añadir inventario"
              >
                <span>🛒</span>
                <span className="hidden md:inline">Añadir inventario</span>
              </Link>
              <Link
                href="/consumo"
                className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm font-medium text-gray-200 hover:bg-gray-700 hover:text-white transition whitespace-nowrap"
                title="Consumo diario"
              >
                <span>📊</span>
                <span className="hidden md:inline">Consumo</span>
              </Link>
              <Link
                href="/medio-dia"
                className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm font-medium text-gray-200 hover:bg-gray-700 hover:text-white transition whitespace-nowrap"
                title="Corte de mediodía"
              >
                <span>🕛</span>
                <span className="hidden md:inline">Mediodía</span>
              </Link>
              <Link
                href="/admin"
                className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm font-medium text-gray-200 hover:bg-gray-700 hover:text-white transition whitespace-nowrap"
                title="Administración"
              >
                <span>⚙️</span>
                <span className="hidden md:inline">Administración</span>
              </Link>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 ml-auto shrink-0 border-l border-gray-700 pl-2 sm:pl-4">
          <span className="text-sm text-gray-300 hidden sm:block max-w-28 truncate">{user?.name}</span>
          <form action={logoutAction}>
            <button
              type="submit"
              className="text-xs sm:text-sm bg-gray-700 hover:bg-gray-600 px-3 py-1.5 rounded-lg transition"
            >
              Salir
            </button>
          </form>
        </div>
      </div>
    </nav>
  )
}
