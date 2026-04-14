export const dynamic = 'force-dynamic'

import Navbar from '@/components/Navbar'
import { prisma } from '@/lib/db'
import {
  MODULE_LABELS,
  MODULE_ICONS,
  SECTION_GROUPS,
  statusColor,
  statusBadge,
  todayDate,
  CARNES_SERVICIO_MODULES,
  WEIGHT_MODULES,
  SMOKED_MODULES,
  BEVERAGE_SERVICE_MODULES,
} from '@/lib/utils'
import { Module, StockStatus } from '@prisma/client'

async function getData() {
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
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
  })
  return { products, today }
}

function stockDisplay(
  product: { unit: string; module: Module },
  record: {
    currentStock: number | null
    finalWeight: number | null
    weightLb: number | null
    finalStock: number | null
    units: number | null
  } | undefined
): string {
  if (!record) return '—'
  const mod = product.module
  if (CARNES_SERVICIO_MODULES.includes(mod) || WEIGHT_MODULES.includes(mod)) {
    return record.finalWeight !== null ? `${record.finalWeight.toFixed(1)} ${product.unit}` : '—'
  }
  if (SMOKED_MODULES.includes(mod)) {
    const u = record.units !== null ? `${record.units} u` : '—'
    const w = record.weightLb !== null ? `${record.weightLb.toFixed(1)} LB` : '—'
    return `${u} / ${w}`
  }
  if (BEVERAGE_SERVICE_MODULES.includes(mod)) {
    return record.finalStock !== null ? `${record.finalStock.toFixed(1)} ${product.unit}` : '—'
  }
  return record.currentStock !== null ? `${record.currentStock.toFixed(1)} ${product.unit}` : '—'
}

export default async function ResumenPage() {
  const { products, today } = await getData()

  // Index products by module
  const byModule: Record<string, typeof products> = {}
  for (const p of products) {
    if (!byModule[p.module]) byModule[p.module] = []
    byModule[p.module].push(p)
  }

  // Modules not assigned to any section group
  const assignedModules = new Set(SECTION_GROUPS.flatMap((g) => g.modules))
  const unassignedModules = (Object.keys(byModule) as Module[]).filter(
    (m) => !assignedModules.has(m) && byModule[m].length > 0
  )

  const dateLabel = new Date(today + 'T12:00:00').toLocaleDateString('es-CR', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  // Count totals for summary bar
  const total = products.length
  const critico = products.filter((p) => p.records[0]?.status === 'CRITICO').length
  const bajo = products.filter((p) => p.records[0]?.status === 'BAJO').length
  const ok = products.filter((p) => p.records[0]?.status === 'OK').length
  const sinRegistro = products.filter((p) => p.records.length === 0).length

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 p-4 max-w-5xl mx-auto w-full">

        {/* Header */}
        <div className="mb-5">
          <h1 className="text-xl font-bold">Resumen de inventario</h1>
          <p className="text-sm text-gray-500 capitalize">{dateLabel}</p>
        </div>

        {/* Summary bar */}
        <div className="grid grid-cols-4 gap-2 mb-6 text-center text-sm">
          <div className="bg-red-50 border border-red-200 rounded-xl py-2">
            <div className="text-xl font-bold text-red-600">{critico}</div>
            <div className="text-xs text-red-500">Críticos</div>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl py-2">
            <div className="text-xl font-bold text-yellow-600">{bajo}</div>
            <div className="text-xs text-yellow-500">Bajo</div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-xl py-2">
            <div className="text-xl font-bold text-green-600">{ok}</div>
            <div className="text-xs text-green-500">OK</div>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-xl py-2">
            <div className="text-xl font-bold text-gray-500">{sinRegistro}</div>
            <div className="text-xs text-gray-400">Sin reg.</div>
          </div>
        </div>

        {/* Sections */}
        <div className="space-y-8">
          {SECTION_GROUPS.map((section) => {
            const sectionModules = section.modules.filter((m) => byModule[m]?.length > 0)
            if (sectionModules.length === 0) return null
            return (
              <div key={section.label}>
                {/* Section header */}
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-2xl">{section.icon}</span>
                  <h2 className="text-lg font-bold text-gray-800">{section.label}</h2>
                </div>

                <div className="space-y-4">
                  {sectionModules.map((mod) => {
                    const moduleProducts = byModule[mod] ?? []
                    return (
                      <ModuleTable
                        key={mod}
                        mod={mod}
                        products={moduleProducts}
                      />
                    )
                  })}
                </div>
              </div>
            )
          })}

          {/* Unassigned modules */}
          {unassignedModules.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">📁</span>
                <h2 className="text-lg font-bold text-gray-800">Otros</h2>
              </div>
              <div className="space-y-4">
                {unassignedModules.map((mod) => (
                  <ModuleTable
                    key={mod}
                    mod={mod}
                    products={byModule[mod] ?? []}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

// ---- Sub-component ----

type ProductWithRecord = {
  id: string
  name: string
  category: string
  unit: string
  minStock: number
  module: Module
  records: {
    currentStock: number | null
    finalWeight: number | null
    weightLb: number | null
    finalStock: number | null
    units: number | null
    status: string
    updatedAt: Date
  }[]
}

function ModuleTable({ mod, products }: { mod: Module; products: ProductWithRecord[] }) {
  // Group by category within module
  const categories: Record<string, ProductWithRecord[]> = {}
  for (const p of products) {
    if (!categories[p.category]) categories[p.category] = []
    categories[p.category].push(p)
  }

  const criticalCount = products.filter((p) => p.records[0]?.status === 'CRITICO').length
  const lowCount = products.filter((p) => p.records[0]?.status === 'BAJO').length

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      {/* Module header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <span className="text-lg">{MODULE_ICONS[mod]}</span>
          <h3 className="font-semibold text-gray-800">{MODULE_LABELS[mod]}</h3>
          <span className="text-xs text-gray-400">({products.length})</span>
        </div>
        <div className="flex gap-2">
          {criticalCount > 0 && (
            <span className="text-xs bg-red-500 text-white font-bold px-2 py-0.5 rounded-full">
              {criticalCount} crítico{criticalCount > 1 ? 's' : ''}
            </span>
          )}
          {lowCount > 0 && (
            <span className="text-xs bg-yellow-400 text-black font-bold px-2 py-0.5 rounded-full">
              {lowCount} bajo
            </span>
          )}
        </div>
      </div>

      {/* Table */}
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 text-xs text-gray-400 uppercase tracking-wide">
            <th className="text-left px-4 py-2 font-medium">Producto</th>
            <th className="text-left px-4 py-2 font-medium hidden sm:table-cell">Categoría</th>
            <th className="text-right px-4 py-2 font-medium">Stock</th>
            <th className="text-right px-4 py-2 font-medium hidden sm:table-cell">Mínimo</th>
            <th className="text-center px-4 py-2 font-medium">Estado</th>
            <th className="text-right px-4 py-2 font-medium hidden md:table-cell">Actualizado</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(categories).map(([cat, catProducts]) => (
            <>
              {Object.keys(categories).length > 1 && (
                <tr key={`cat-${cat}`} className="bg-gray-50/60">
                  <td colSpan={6} className="px-4 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                    {cat}
                  </td>
                </tr>
              )}
              {catProducts.map((p) => {
                const record = p.records[0]
                const status = record?.status as StockStatus | undefined
                const rowBg = status === 'CRITICO'
                  ? 'bg-red-50/40'
                  : status === 'BAJO'
                  ? 'bg-yellow-50/40'
                  : ''

                return (
                  <tr
                    key={p.id}
                    className={`border-t border-gray-100 ${rowBg}`}
                  >
                    <td className="px-4 py-2.5 font-medium">{p.name}</td>
                    <td className="px-4 py-2.5 text-gray-500 hidden sm:table-cell">{p.category}</td>
                    <td className="px-4 py-2.5 text-right font-semibold">
                      {stockDisplay(p, record)}
                    </td>
                    <td className="px-4 py-2.5 text-right text-gray-400 hidden sm:table-cell">
                      {p.minStock} {p.unit}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {status ? (
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${statusColor(status)}`}>
                          {statusBadge(status)}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-300">Sin reg.</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right text-gray-400 text-xs hidden md:table-cell">
                      {record
                        ? new Date(record.updatedAt).toLocaleString('es-CR', {
                            hour: '2-digit', minute: '2-digit',
                          })
                        : '—'}
                    </td>
                  </tr>
                )
              })}
            </>
          ))}
        </tbody>
      </table>
    </div>
  )
}
