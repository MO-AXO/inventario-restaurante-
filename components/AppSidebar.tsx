import Link from 'next/link'
import { logoutAction } from '@/app/actions/auth'
import { getCurrentUser } from '@/lib/auth'

const navigation = [
  { label: 'Dashboard', href: '/dashboard', icon: '▦' },
  { label: 'Resumen', href: '/resumen', icon: '▥' },
  { label: 'Alertas', href: '/alertas', icon: '⚠' },
  { label: 'Productos', href: '/admin', icon: '▤', ownerOnly: true },
  { label: 'Inventario', href: '/dashboard', icon: '▣' },
  { label: 'Compras', href: '/compras', icon: '⌂', ownerOnly: true },
  { label: 'Consumo', href: '/consumo', icon: '▱', ownerOnly: true },
]

export default async function AppSidebar() {
  const user = await getCurrentUser()
  const visibleNavigation = navigation.filter((item) => !item.ownerOnly || user?.role === 'OWNER')

  return (
    <aside className="hidden md:flex md:w-60 md:shrink-0 md:flex-col bg-[#1b2543] text-white min-h-screen">
      <div className="px-5 pt-6 pb-5">
        <Link href="/dashboard" className="flex items-baseline gap-1">
          <strong className="text-xl tracking-tight text-[#5ba3da]">we<span className="text-white">POS</span></strong>
          <small className="text-xs text-[#aab7d0]">Admin</small>
        </Link>
      </div>
      <nav className="flex flex-col gap-1 px-3" aria-label="Navegación principal">
        {visibleNavigation.map((item) => (
          <Link key={item.label} href={item.href} className={`flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-bold text-[#dce4f3] transition hover:bg-[#283657] ${item.label === 'Dashboard' ? 'bg-[#5aa0d8] text-white' : ''}`}>
            <span className="w-5 text-center text-[#c5d1e6]">{item.icon}</span>{item.label}
          </Link>
        ))}
      </nav>
      <div className="mt-auto px-4 pb-4">
        <span className="mb-2 block text-xs text-[#9caac4]">{user?.name ?? 'Administrador'}</span>
        <div className="flex gap-2">
          <Link href="/dashboard" className="flex-1 rounded-lg bg-[#eef8ff] py-2 text-center text-xs font-bold text-[#4788bd]">Inicio</Link>
          <form action={logoutAction} className="flex-1">
            <button type="submit" className="w-full rounded-lg bg-[#202b49] py-2 text-xs font-bold text-[#d7dfef]">Salir</button>
          </form>
        </div>
      </div>
    </aside>
  )
}
