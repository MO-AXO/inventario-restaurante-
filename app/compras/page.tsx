export const dynamic = 'force-dynamic'

import Navbar from '@/components/Navbar'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { MODULE_LABELS, MODULE_ICONS, SECTION_GROUPS, todayDate } from '@/lib/utils'
import { Module } from '@prisma/client'

async function getData() {
  const today = todayDate()

  const products = await prisma.product.findMany({
    where: { active: true },
    include: {
      records: {
        orderBy: { date: 'desc' },
        take: 1,
      },
    },
    orderBy: [{ module: 'asc' }, { category: 'asc' }, { name: 'asc' }],
  })

  return { products, today }
}

type Row = {
  id: string
  name: string
  category: string
  unit: string
  module: Module
  minStock: number
  currentStock: number | null
  shortfall: number       // minStock - currentStock (how much to reach minimum)
  suggested: number       // 2× minStock - currentStock (comfortable buffer)
  hasRecord: boolean
}

export default async function ComprasPage() {
  const session = await getSession()
  if (!session || session.role !== 'OWNER') redirect('/dashboard')

  const { today } = await getData()
  const { products } = await getData()

  // Build rows for products that need ordering
  const rows: Row[] = []

  for (const p of products) {
    if (p.minStock <= 0) continue  // Skip products with no minimum defined

    const record = p.records[0] ?? null
    const currentStock = record?.currentStock ?? null
    const shortfall = currentStock !== null
      ? Math.max(0, p.minStock - currentStock)
      : p.minStock  // No record → assume 0 stock, need full minimum

    const suggested = currentStock !== null
      ? Math.max(0, p.minStock * 2 - currentStock)
      : p.minStock * 2

    if (shortfall <= 0 && currentStock !== null) continue  // Stock above minimum, skip

    rows.push({
      id: p.id,
      name: p.name,
      category: p.category,
      unit: p.unit,
      module: p.module as Module,
      minStock: p.minStock,
      currentStock,
      shortfall,
      suggested,
      hasRecord: record !== null,
    })
  }

  // Group by section → module
  const assignedModules = new Set(SECTION_GROUPS.flatMap((g) => g.modules))
  const rowsByModule: Record<string, Row[]> = {}
  for (const row of rows) {
    if (!rowsByModule[row.module]) rowsByModule[row.module] = []
    rowsByModule[row.module].push(row)
  }

  const totalItems = rows.length
  const criticalItems = rows.filter((r) => r.currentStock !== null && r.currentStock === 0 || r.currentStock === null).length

  const dateLabel = new Date(today + 'T12:00:00').toLocaleDateString('es-CR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 p-4 max-w-4xl mx-auto w-full">

        {/* Header */}
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold">Lista de compras</h1>
            <p className="text-sm text-gray-500 capitalize">{dateLabel}</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-orange-500">{totalItems}</div>
            <div className="text-xs text-gray-500">productos a pedir</div>
          </div>
        </div>

        {totalItems === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center text-gray-500">
            <div className="text-4xl mb-3">✅</div>
            <p className="font-medium">Todo el inventario está sobre el mínimo.</p>
            <p className="text-sm text-gray-400 mt-1">No hay productos que pedir hoy.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {SECTION_GROUPS.map((section) => {
              const sectionRows = section.modules.flatMap((m) => rowsByModule[m] ?? [])
              if (sectionRows.length === 0) return null

              return (
                <div key={section.label}>
                  {/* Section header */}
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xl">{section.icon}</span>
                    <h2 className="text-base font-bold text-gray-700">{section.label}</h2>
                    <span className="text-xs bg-orange-100 text-orange-600 font-bold px-2 py-0.5 rounded-full">
                      {sectionRows.length}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {section.modules.map((mod) => {
                      const modRows = rowsByModule[mod]
                      if (!modRows?.length) return null
                      return (
                        <ModuleBlock key={mod} mod={mod} rows={modRows} />
                      )
                    })}
                  </div>
                </div>
              )
            })}

            {/* Unassigned modules */}
            {(() => {
              const unassigned = rows.filter((r) => !assignedModules.has(r.module))
              if (unassigned.length === 0) return null
              const byMod: Record<string, Row[]> = {}
              for (const r of unassigned) {
                if (!byMod[r.module]) byMod[r.module] = []
                byMod[r.module].push(r)
              }
              return (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xl">📁</span>
                    <h2 className="text-base font-bold text-gray-700">Otros</h2>
                  </div>
                  <div className="space-y-3">
                    {Object.entries(byMod).map(([mod, modRows]) => (
                      <ModuleBlock key={mod} mod={mod as Module} rows={modRows} />
                    ))}
                  </div>
                </div>
              )
            })()}

            {/* Print note */}
            <p className="text-xs text-gray-400 text-center pt-2">
              * "A pedir" = cantidad mínima para alcanzar el stock mínimo · "Sugerido" = para tener el doble del mínimo
            </p>
          </div>
        )}
      </main>
    </div>
  )
}

// ---- Sub-component ----

function ModuleBlock({ mod, rows }: { mod: Module; rows: Row[] }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      {/* Module header */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-200">
        <span>{MODULE_ICONS[mod]}</span>
        <span className="font-semibold text-sm text-gray-700">{MODULE_LABELS[mod]}</span>
        <span className="text-xs text-gray-400 ml-auto">{rows.length} producto{rows.length !== 1 ? 's' : ''}</span>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-gray-400 uppercase tracking-wide border-b border-gray-100">
            <th className="text-left px-4 py-2 font-medium">Producto</th>
            <th className="text-right px-3 py-2 font-medium hidden sm:table-cell">Stock actual</th>
            <th className="text-right px-3 py-2 font-medium hidden sm:table-cell">Mínimo</th>
            <th className="text-right px-3 py-2 font-medium">A pedir</th>
            <th className="text-right px-4 py-2 font-medium">Sugerido</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const isCritical = row.currentStock === null || row.currentStock === 0
            return (
              <tr
                key={row.id}
                className={`border-t border-gray-100 ${isCritical ? 'bg-red-50/50' : 'bg-yellow-50/30'}`}
              >
                <td className="px-4 py-3">
                  <div className="font-medium">{row.name}</div>
                  <div className="text-xs text-gray-400">{row.category}</div>
                </td>
                <td className="px-3 py-3 text-right hidden sm:table-cell">
                  {row.currentStock !== null ? (
                    <span className={isCritical ? 'text-red-600 font-semibold' : 'text-yellow-600 font-semibold'}>
                      {row.currentStock.toFixed(1)}
                    </span>
                  ) : (
                    <span className="text-gray-300 text-xs">Sin reg.</span>
                  )}
                  <span className="text-gray-400 text-xs ml-1">{row.unit}</span>
                </td>
                <td className="px-3 py-3 text-right text-gray-500 hidden sm:table-cell">
                  {row.minStock.toFixed(1)}
                  <span className="text-gray-400 text-xs ml-1">{row.unit}</span>
                </td>
                <td className="px-3 py-3 text-right">
                  <span className="font-bold text-red-600">
                    {row.shortfall.toFixed(1)}
                  </span>
                  <span className="text-gray-400 text-xs ml-1">{row.unit}</span>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="font-bold text-orange-500">
                    {row.suggested.toFixed(1)}
                  </span>
                  <span className="text-gray-400 text-xs ml-1">{row.unit}</span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
