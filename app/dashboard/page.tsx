export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { prisma } from '@/lib/db'
import Navbar from '@/components/Navbar'
import { MODULE_LABELS, MODULE_ICONS, statusColor, statusBadge, todayDate, SECTION_GROUPS } from '@/lib/utils'
import { Module, StockStatus } from '@prisma/client'

async function getDashboardData() {
  const today = todayDate()

  const products = await prisma.product.findMany({
    where: { active: true },
    include: {
      records: {
        where: { date: new Date(today) },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
    orderBy: [{ module: 'asc' }, { category: 'asc' }, { name: 'asc' }],
  })

  const alerts = await prisma.alert.count({ where: { read: false } })

  return { products, alerts }
}

export default async function DashboardPage() {
  const { products, alerts } = await getDashboardData()

  const criticalCount = products.filter((p) => p.records[0]?.status === 'CRITICO').length
  const lowCount = products.filter((p) => p.records[0]?.status === 'BAJO').length
  const okCount = products.filter((p) => p.records[0]?.status === 'OK').length
  const noDataCount = products.filter((p) => p.records.length === 0).length

  // Group by module
  const byModule = products.reduce((acc, p) => {
    if (!acc[p.module]) acc[p.module] = []
    acc[p.module].push(p)
    return acc
  }, {} as Record<string, typeof products>)

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 p-4 max-w-5xl mx-auto w-full">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm">{new Date().toLocaleDateString('es-CR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-red-500 text-white rounded-2xl p-4 text-center">
            <div className="text-3xl font-bold">{criticalCount}</div>
            <div className="text-sm font-medium mt-1">Críticos</div>
          </div>
          <div className="bg-yellow-400 text-black rounded-2xl p-4 text-center">
            <div className="text-3xl font-bold">{lowCount}</div>
            <div className="text-sm font-medium mt-1">Bajo stock</div>
          </div>
          <div className="bg-green-500 text-white rounded-2xl p-4 text-center">
            <div className="text-3xl font-bold">{okCount}</div>
            <div className="text-sm font-medium mt-1">OK</div>
          </div>
          <div className="bg-gray-300 text-gray-700 rounded-2xl p-4 text-center">
            <div className="text-3xl font-bold">{noDataCount}</div>
            <div className="text-sm font-medium mt-1">Sin registrar</div>
          </div>
        </div>

        {/* Quick actions grouped by section */}
        <div className="mb-6 space-y-6">
          <h2 className="text-lg font-semibold">Registrar inventario</h2>
          {SECTION_GROUPS.map((group) => (
            <div key={group.label}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">{group.icon}</span>
                <h3 className="text-base font-semibold text-gray-700">{group.label}</h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {group.modules.map((mod) => (
                  <Link
                    key={mod}
                    href={`/inventario/${mod.toLowerCase()}`}
                    className="bg-white border border-gray-200 hover:border-orange-400 hover:shadow-md rounded-2xl p-4 flex flex-col items-center gap-2 transition"
                  >
                    <span className="text-3xl">{MODULE_ICONS[mod]}</span>
                    <span className="text-sm font-medium text-center">{MODULE_LABELS[mod]}</span>
                    {byModule[mod] && byModule[mod].filter((p) => p.records[0]?.status === 'CRITICO').length > 0 && (
                      <span className="text-red-500 font-bold text-xs">
                        {byModule[mod].filter((p) => p.records[0]?.status === 'CRITICO').length} críticos
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Critical & Low items */}
        {(criticalCount > 0 || lowCount > 0) && (
          <div>
            <h2 className="text-lg font-semibold mb-3">Requieren atención</h2>
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold">Producto</th>
                    <th className="text-left px-4 py-3 font-semibold hidden sm:table-cell">Módulo</th>
                    <th className="text-right px-4 py-3 font-semibold">Stock</th>
                    <th className="text-center px-4 py-3 font-semibold">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {products
                    .filter((p) => p.records[0]?.status === 'CRITICO' || p.records[0]?.status === 'BAJO')
                    .map((p) => {
                      const record = p.records[0]
                      const status = record?.status as StockStatus
                      return (
                        <tr key={p.id} className="border-b border-gray-100 last:border-0">
                          <td className="px-4 py-3 font-medium">{p.name}</td>
                          <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{MODULE_LABELS[p.module]}</td>
                          <td className="px-4 py-3 text-right">{record?.currentStock ?? '—'} {p.unit}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${statusColor(status)}`}>
                              {statusBadge(status)}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
