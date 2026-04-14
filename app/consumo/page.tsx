export const dynamic = 'force-dynamic'

import Navbar from '@/components/Navbar'
import Link from 'next/link'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { MODULE_LABELS, WEIGHT_MODULES, BEVERAGE_SERVICE_MODULES, todayDate } from '@/lib/utils'
import { Module } from '@prisma/client'

type Props = { searchParams: Promise<{ dias?: string }> }

export default async function ConsumoDiarioPage({ searchParams }: Props) {
  const session = await getSession()
  if (!session || session.role !== 'OWNER') redirect('/dashboard')

  const { dias: diasParam } = await searchParams
  const dias = parseInt(diasParam ?? '7')
  const validDias = [7, 14, 30].includes(dias) ? dias : 7

  const today = todayDate()
  const startDate = new Date(today)
  startDate.setDate(startDate.getDate() - (validDias - 1))

  // Generate array of dates oldest → newest
  const dates: string[] = []
  for (let i = validDias - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    dates.push(d.toISOString().split('T')[0])
  }

  const records = await prisma.dailyRecord.findMany({
    where: {
      date: { gte: startDate },
      product: {
        active: true,
        module: { in: [...WEIGHT_MODULES, ...BEVERAGE_SERVICE_MODULES] },
      },
    },
    include: {
      product: { select: { id: true, name: true, module: true, unit: true } },
    },
  })

  // Build maps
  type ProductInfo = { name: string; module: Module; unit: string }
  const productMap: Record<string, ProductInfo> = {}
  const consumptionMap: Record<string, Record<string, number>> = {}

  for (const r of records) {
    const pid = r.productId
    const dateStr = r.date.toISOString().split('T')[0]
    const mod = r.product.module as Module

    if (!productMap[pid]) {
      productMap[pid] = { name: r.product.name, module: mod, unit: r.product.unit }
    }

    let consumption = 0
    if (WEIGHT_MODULES.includes(mod)) {
      consumption = (r.initialWeight ?? 0) + (r.restock ?? 0) - (r.finalWeight ?? 0)
    } else if (BEVERAGE_SERVICE_MODULES.includes(mod)) {
      consumption = r.consumption ?? 0
    }

    if (!consumptionMap[pid]) consumptionMap[pid] = {}
    consumptionMap[pid][dateStr] = consumption
  }

  // Sort: module first, then name
  const productIds = Object.keys(productMap).sort((a, b) => {
    const modA = productMap[a].module
    const modB = productMap[b].module
    if (modA !== modB) return modA.localeCompare(modB)
    return productMap[a].name.localeCompare(productMap[b].name)
  })

  // Group products by module for display
  const byModule: Record<string, string[]> = {}
  for (const pid of productIds) {
    const mod = productMap[pid].module
    if (!byModule[mod]) byModule[mod] = []
    byModule[mod].push(pid)
  }

  // Dates shown newest first in columns
  const datesNewestFirst = [...dates].reverse()

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 p-4 max-w-full mx-auto w-full">
        <div className="mb-5 flex items-center justify-between max-w-6xl mx-auto">
          <div>
            <h1 className="text-xl font-bold">Consumo diario</h1>
            <p className="text-sm text-gray-500">
              Carnes y bebidas · últimos {validDias} días
            </p>
          </div>
          <div className="flex gap-2">
            {[7, 14, 30].map((d) => (
              <Link
                key={d}
                href={`/consumo?dias=${d}`}
                className={`text-sm px-3 py-1.5 rounded-xl font-medium transition ${
                  validDias === d
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                {d}d
              </Link>
            ))}
          </div>
        </div>

        {productIds.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center text-gray-500 max-w-6xl mx-auto">
            No hay registros de consumo en este período.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-gray-200 shadow-sm">
            <table className="text-sm w-full min-w-max bg-white">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-semibold sticky left-0 bg-gray-50 z-10 min-w-[160px]">
                    Producto
                  </th>
                  {datesNewestFirst.map((d) => (
                    <th key={d} className="text-right px-3 py-3 font-semibold whitespace-nowrap min-w-[80px]">
                      <div>
                        {new Date(d + 'T12:00:00').toLocaleDateString('es-CR', {
                          weekday: 'short',
                        })}
                      </div>
                      <div className="text-xs text-gray-400 font-normal">
                        {new Date(d + 'T12:00:00').toLocaleDateString('es-CR', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </div>
                    </th>
                  ))}
                  <th className="text-right px-4 py-3 font-semibold bg-orange-50 text-orange-700 min-w-[80px]">
                    Prom.
                  </th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(byModule).map(([mod, pids]) => (
                  <>
                    {/* Module header row */}
                    <tr key={`header-${mod}`} className="bg-gray-50 border-y border-gray-200">
                      <td
                        colSpan={datesNewestFirst.length + 2}
                        className="px-4 py-2 text-xs font-bold text-gray-500 uppercase tracking-wide sticky left-0"
                      >
                        {MODULE_LABELS[mod as Module]}
                      </td>
                    </tr>

                    {/* Product rows */}
                    {pids.map((pid) => {
                      const p = productMap[pid]
                      const values = datesNewestFirst.map(
                        (d) => consumptionMap[pid]?.[d] ?? null
                      )
                      const recorded = values.filter((v) => v !== null) as number[]
                      const avg =
                        recorded.length > 0
                          ? recorded.reduce((a, b) => a + b, 0) / recorded.length
                          : null
                      const max = recorded.length > 0 ? Math.max(...recorded) : 0

                      return (
                        <tr
                          key={pid}
                          className="border-b border-gray-100 last:border-0 hover:bg-gray-50"
                        >
                          <td className="px-4 py-2.5 font-medium sticky left-0 bg-white hover:bg-gray-50 z-10 whitespace-nowrap">
                            {p.name}
                          </td>
                          {values.map((v, i) => {
                            // Color intensity based on value relative to max
                            const intensity =
                              v !== null && max > 0 ? v / max : 0
                            const bg =
                              v !== null && v > 0
                                ? `rgba(249,115,22,${(intensity * 0.35).toFixed(2)})`
                                : 'transparent'
                            return (
                              <td
                                key={i}
                                className="px-3 py-2.5 text-right"
                                style={{ backgroundColor: bg }}
                              >
                                {v !== null ? (
                                  <span className={v > 0 ? 'font-medium text-gray-800' : 'text-gray-300'}>
                                    {v.toFixed(1)}
                                  </span>
                                ) : (
                                  <span className="text-gray-200">—</span>
                                )}
                              </td>
                            )
                          })}
                          <td className="px-4 py-2.5 text-right font-bold bg-orange-50 text-orange-700 whitespace-nowrap">
                            {avg !== null ? `${avg.toFixed(1)} ${p.unit}` : '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  )
}
