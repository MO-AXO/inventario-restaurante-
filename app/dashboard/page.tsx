export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { prisma } from '@/lib/db'
import Navbar from '@/components/Navbar'
import {
  MODULE_LABELS,
  MODULE_ICONS,
  statusColor,
  statusBadge,
  calcStatus,
  todayDate,
  SECTION_GROUPS,
  CARNES_SERVICIO_MODULES,
  WEIGHT_MODULES,
  SMOKED_MODULES,
  BEVERAGE_SERVICE_MODULES,
  BODEGA_STOCK_MODULES,
} from '@/lib/utils'
import { Module, StockStatus } from '@prisma/client'
import { getSession } from '@/lib/auth'
import { closeDayAction, reopenDayAction } from '@/app/actions/dayclose'

async function getDashboardData() {
  const today = todayDate()
  const sevenDaysAgo = new Date(today)
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const [products, alertCount, weekRecords, dayClose] = await Promise.all([
    prisma.product.findMany({
      where: { active: true },
      include: {
        records: {
          where: { date: new Date(today) },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: [{ module: 'asc' }, { category: 'asc' }, { name: 'asc' }],
    }),
    prisma.alert.count({ where: { read: false } }),
    prisma.dailyRecord.findMany({
      where: { date: { gte: sevenDaysAgo } },
      include: {
        product: { select: { name: true, module: true, unit: true, active: true } },
      },
    }),
    prisma.dayClose.findUnique({ where: { date: new Date(today) } }),
  ])

  return { products, alertCount, weekRecords, dayClose }
}

export default async function DashboardPage() {
  const session = await getSession()
  const isOwner = session?.role === 'OWNER'
  const { products, alertCount, weekRecords, dayClose } = await getDashboardData()

  const isClosed = !!dayClose

  // Compute status live from actual stock values (not stored DB status)
  function effectiveStock(mod: Module, r: typeof products[0]['records'][0] | undefined): number | null {
    if (!r) return null
    if (CARNES_SERVICIO_MODULES.includes(mod) || WEIGHT_MODULES.includes(mod)) return r.finalWeight
    if (SMOKED_MODULES.includes(mod)) return r.weightLb
    if (BEVERAGE_SERVICE_MODULES.includes(mod) || BODEGA_STOCK_MODULES.includes(mod)) return r.finalStock
    return r.currentStock
  }
  function liveStatus(p: typeof products[0]): StockStatus | null {
    const r = p.records[0]
    if (!r) return null
    return calcStatus(effectiveStock(p.module as Module, r), p.minStock)
  }

  const criticalCount = products.filter((p) => liveStatus(p) === 'CRITICO').length
  const lowCount      = products.filter((p) => liveStatus(p) === 'BAJO').length
  const okCount       = products.filter((p) => liveStatus(p) === 'OK').length
  const noDataCount   = products.filter((p) => p.records.length === 0).length

  // Group by module
  const byModule = products.reduce((acc, p) => {
    if (!acc[p.module]) acc[p.module] = []
    acc[p.module].push(p)
    return acc
  }, {} as Record<string, typeof products>)

  // Consumo promedio últimos 7 días (weight + beverage modules only)
  type ConsEntry = { name: string; module: Module; unit: string; total: number; days: number }
  const consumptionMap: Record<string, ConsEntry> = {}

  for (const r of weekRecords) {
    if (!r.product.active) continue
    const mod = r.product.module as Module
    let consumption: number | null = null

    if (CARNES_SERVICIO_MODULES.includes(mod) || WEIGHT_MODULES.includes(mod)) {
      consumption = (r.initialWeight ?? 0) + (r.restock ?? 0) - (r.finalWeight ?? 0)
    } else if (BEVERAGE_SERVICE_MODULES.includes(mod)) {
      consumption = r.consumption ?? null
    }

    if (consumption !== null && consumption > 0) {
      if (!consumptionMap[r.productId]) {
        consumptionMap[r.productId] = {
          name: r.product.name,
          module: mod,
          unit: r.product.unit,
          total: 0,
          days: 0,
        }
      }
      consumptionMap[r.productId].total += consumption
      consumptionMap[r.productId].days += 1
    }
  }

  const topConsumers = Object.values(consumptionMap)
    .map((p) => ({ ...p, avgDaily: p.total / p.days }))
    .sort((a, b) => b.avgDaily - a.avgDaily)
    .slice(0, 10)

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 p-4 max-w-5xl mx-auto w-full">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{isOwner ? 'Dashboard' : 'Inventario'}</h1>
            <p className="text-gray-500 text-sm">
              {new Date().toLocaleDateString('es-CR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          {/* Close / Reopen day — owner only */}
          {isOwner && (
            isClosed ? (
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-sm bg-gray-200 text-gray-700 px-3 py-1.5 rounded-xl font-medium">
                  Día cerrado por {dayClose.closedByName}
                </span>
                <form action={reopenDayAction}>
                  <button type="submit" className="text-sm text-orange-500 underline">
                    Reabrir
                  </button>
                </form>
              </div>
            ) : (
              <form action={closeDayAction}>
                <button
                  type="submit"
                  className="text-sm bg-gray-800 hover:bg-gray-900 text-white px-4 py-2 rounded-xl font-medium transition shrink-0"
                >
                  Cerrar día
                </button>
              </form>
            )
          )}
        </div>

        {/* Summary Cards — owner only */}
        {isOwner && (
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
        )}

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
                    {byModule[mod] && byModule[mod].filter((p) => liveStatus(p) === 'CRITICO').length > 0 && (
                      <span className="text-red-500 font-bold text-xs">
                        {byModule[mod].filter((p) => liveStatus(p) === 'CRITICO').length} críticos
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Critical & Low items — owner only */}
        {isOwner && (criticalCount > 0 || lowCount > 0) && (
          <div className="mb-6">
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
                    .filter((p) => liveStatus(p) === 'CRITICO' || liveStatus(p) === 'BAJO')
                    .map((p) => {
                      const record = p.records[0]
                      const status = liveStatus(p) as StockStatus
                      const stock = effectiveStock(p.module as Module, record)
                      return (
                        <tr key={p.id} className="border-b border-gray-100 last:border-0">
                          <td className="px-4 py-3 font-medium">{p.name}</td>
                          <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{MODULE_LABELS[p.module as Module]}</td>
                          <td className="px-4 py-3 text-right">{stock !== null ? stock.toFixed(1) : '—'} {p.unit}</td>
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

        {/* Consumo promedio últimos 7 días — owner only */}
        {isOwner && topConsumers.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-3">Consumo promedio (últimos 7 días)</h2>
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold">Producto</th>
                    <th className="text-left px-4 py-3 font-semibold hidden sm:table-cell">Módulo</th>
                    <th className="text-right px-4 py-3 font-semibold">Prom. diario</th>
                    <th className="text-right px-4 py-3 font-semibold">Total 7d</th>
                  </tr>
                </thead>
                <tbody>
                  {topConsumers.map((p, i) => (
                    <tr key={i} className="border-b border-gray-100 last:border-0">
                      <td className="px-4 py-3 font-medium">{p.name}</td>
                      <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{MODULE_LABELS[p.module]}</td>
                      <td className="px-4 py-3 text-right font-semibold">
                        {p.avgDaily.toFixed(1)} {p.unit}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-500">
                        {p.total.toFixed(1)} {p.unit}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
