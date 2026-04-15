export const dynamic = 'force-dynamic'

import Navbar from '@/components/Navbar'
import { prisma } from '@/lib/db'
import { todayDate, MODULE_LABELS, SECTION_GROUPS, MODULE_ICONS, statusColor, statusBadge, calcStatus, CARNES_SERVICIO_MODULES, WEIGHT_MODULES, SMOKED_MODULES, BEVERAGE_SERVICE_MODULES, BODEGA_STOCK_MODULES } from '@/lib/utils'
import { Module, StockStatus } from '@prisma/client'

type StockRecord = {
  currentStock: number | null
  finalWeight: number | null
  weightLb: number | null
  finalStock: number | null
  units: number | null
  status: string
  date: Date
  updatedAt: Date
}

type ProductRow = {
  id: string
  name: string
  category: string
  unit: string
  minStock: number
  module: Module
  records: StockRecord[]
}

function effectiveStock(mod: Module, record: StockRecord | undefined): number | null {
  if (!record) return null
  if (CARNES_SERVICIO_MODULES.includes(mod) || WEIGHT_MODULES.includes(mod)) return record.finalWeight
  if (SMOKED_MODULES.includes(mod)) return record.weightLb
  if (BEVERAGE_SERVICE_MODULES.includes(mod) || BODEGA_STOCK_MODULES.includes(mod)) return record.finalStock
  return record.currentStock
}

function liveStatus(p: ProductRow): StockStatus | null {
  const r = p.records[0]
  if (!r) return null
  return calcStatus(effectiveStock(p.module, r), p.minStock)
}

function stockDisplay(product: { unit: string; module: Module }, record: StockRecord | undefined): string {
  if (!record) return '—'
  const mod = product.module
  if (CARNES_SERVICIO_MODULES.includes(mod) || WEIGHT_MODULES.includes(mod))
    return record.finalWeight !== null ? `${record.finalWeight.toFixed(1)} ${product.unit}` : '—'
  if (SMOKED_MODULES.includes(mod)) {
    const u = record.units !== null ? `${record.units} u` : '—'
    const w = record.weightLb !== null ? `${record.weightLb.toFixed(1)} LB` : '—'
    return `${u} / ${w}`
  }
  if (BEVERAGE_SERVICE_MODULES.includes(mod) || BODEGA_STOCK_MODULES.includes(mod))
    return record.finalStock !== null ? `${record.finalStock.toFixed(1)} ${product.unit}` : '—'
  return record.currentStock !== null ? `${record.currentStock.toFixed(1)} ${product.unit}` : '—'
}

export default async function ResumenPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tab?: string }>
}) {
  const { q = '', tab = 'todos' } = await searchParams
  const today = todayDate()

  const allProducts = await prisma.product.findMany({
    where: { active: true },
    include: {
      records: {
        orderBy: { date: 'desc' },
        take: 1,
      },
    },
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
  })

  const products: ProductRow[] = allProducts.map((p) => ({
    id: p.id,
    name: p.name,
    category: p.category,
    unit: p.unit,
    minStock: p.minStock,
    module: p.module,
    records: p.records,
  }))

  // Filter server-side
  const query = q.toLowerCase().trim()
  const filtered = query
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.category.toLowerCase().includes(query) ||
          MODULE_LABELS[p.module].toLowerCase().includes(query)
      )
    : products

  // Which sections are visible based on active tab
  const visibleSections = tab === 'bodega'
    ? SECTION_GROUPS.filter((s) => s.label === 'Bodega')
    : tab === 'restaurante'
    ? SECTION_GROUPS.filter((s) => s.label === 'Restaurante')
    : SECTION_GROUPS

  const visibleModules = new Set(visibleSections.flatMap((s) => s.modules))
  const tabFiltered = tab === 'todos'
    ? filtered
    : filtered.filter((p) => visibleModules.has(p.module))

  // Summary counts — scoped to active tab
  const critico = tabFiltered.filter((p) => liveStatus(p) === 'CRITICO').length
  const bajo    = tabFiltered.filter((p) => liveStatus(p) === 'BAJO').length
  const ok      = tabFiltered.filter((p) => liveStatus(p) === 'OK').length
  const sinReg  = tabFiltered.filter((p) => p.records.length === 0).length

  // Group by module
  const byModule: Record<string, ProductRow[]> = {}
  for (const p of filtered) {
    if (!byModule[p.module]) byModule[p.module] = []
    byModule[p.module].push(p)
  }

  const assignedModules = new Set(SECTION_GROUPS.flatMap((g) => g.modules))
  const unassignedModules = (Object.keys(byModule) as Module[]).filter(
    (m) => !assignedModules.has(m) && (tab === 'todos' || visibleModules.has(m))
  )

  const dateLabel = new Date(today + 'T12:00:00').toLocaleDateString('es-CR', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 p-4 max-w-5xl mx-auto w-full">
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold">Resumen de inventario</h1>
            <p className="text-sm text-gray-500 capitalize">{dateLabel}</p>
          </div>
          <a
            href={`/resumen?tab=${tab}`}
            className="text-xs text-gray-400 hover:text-gray-600 mt-1 flex items-center gap-1"
            title="Actualizar"
          >
            🔄 Actualizar
          </a>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-5">
          {([
            { label: 'Todos', value: 'todos' },
            { label: '📦 Bodega', value: 'bodega' },
            { label: '🍽️ Restaurante', value: 'restaurante' },
          ] as const).map(({ label, value }) => (
            <a
              key={value}
              href={`/resumen?tab=${value}${q ? `&q=${encodeURIComponent(q)}` : ''}`}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
                tab === value
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-orange-400'
              }`}
            >
              {label}
            </a>
          ))}
        </div>

        {/* Search bar */}
        <form method="GET" action="/resumen" className="relative mb-5">
          <input type="hidden" name="tab" value={tab} />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">🔍</span>
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Buscar producto, categoría o módulo..."
            className="w-full border border-gray-300 rounded-2xl pl-10 pr-20 py-3 text-base focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white shadow-sm"
          />
          <button
            type="submit"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-sm bg-orange-500 hover:bg-orange-600 text-white px-3 py-1 rounded-xl transition"
          >
            Buscar
          </button>
        </form>

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
            <div className="text-xl font-bold text-gray-500">{sinReg}</div>
            <div className="text-xs text-gray-400">Sin reg.</div>
          </div>
        </div>

        {/* No results */}
        {filtered.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center text-gray-500">
            <div className="text-3xl mb-2">🔍</div>
            <p>No se encontró <strong>"{q}"</strong></p>
            <p className="text-sm text-gray-400 mt-1">Intentá con otro nombre o categoría.</p>
          </div>
        )}

        {/* Sections */}
        <div className="space-y-8">
          {visibleSections.map((section) => {
            const sectionModules = section.modules.filter((m) => byModule[m]?.length > 0)
            if (sectionModules.length === 0) return null
            return (
              <div key={section.label}>
                {tab === 'todos' && (
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-2xl">{section.icon}</span>
                    <h2 className="text-lg font-bold text-gray-800">{section.label}</h2>
                  </div>
                )}
                <div className="space-y-4">
                  {sectionModules.map((mod) => (
                    <ModuleTable key={mod} mod={mod} products={byModule[mod]} query={query} />
                  ))}
                </div>
              </div>
            )
          })}

          {unassignedModules.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">📁</span>
                <h2 className="text-lg font-bold text-gray-800">Otros</h2>
              </div>
              <div className="space-y-4">
                {unassignedModules.map((mod) => (
                  <ModuleTable key={mod} mod={mod} products={byModule[mod]} query={query} />
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

// ---- Module table ----

function highlight(text: string, query: string) {
  if (!query.trim()) return <>{text}</>
  const idx = text.toLowerCase().indexOf(query.toLowerCase().trim())
  if (idx === -1) return <>{text}</>
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-yellow-200 rounded px-0.5">{text.slice(idx, idx + query.trim().length)}</mark>
      {text.slice(idx + query.trim().length)}
    </>
  )
}

function ModuleTable({ mod, products, query }: { mod: Module; products: ProductRow[]; query: string }) {
  const categories: Record<string, ProductRow[]> = {}
  for (const p of products) {
    if (!categories[p.category]) categories[p.category] = []
    categories[p.category].push(p)
  }

  const criticalCount = products.filter((p) => liveStatus(p) === 'CRITICO').length
  const lowCount      = products.filter((p) => liveStatus(p) === 'BAJO').length

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
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
                const status = liveStatus(p)
                const rowBg = status === 'CRITICO' ? 'bg-red-50/40' : status === 'BAJO' ? 'bg-yellow-50/40' : ''
                return (
                  <tr key={p.id} className={`border-t border-gray-100 ${rowBg}`}>
                    <td className="px-4 py-2.5 font-medium">{highlight(p.name, query)}</td>
                    <td className="px-4 py-2.5 text-gray-500 hidden sm:table-cell">{highlight(p.category, query)}</td>
                    <td className="px-4 py-2.5 text-right font-semibold">{stockDisplay(p, record)}</td>
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
                            month: 'short', day: 'numeric',
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
