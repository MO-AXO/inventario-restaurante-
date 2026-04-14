export const dynamic = 'force-dynamic'

import Navbar from '@/components/Navbar'
import Link from 'next/link'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { CARNES_SERVICIO_MODULES, BEVERAGE_SERVICE_MODULES, todayDate } from '@/lib/utils'
import { Module } from '@prisma/client'

type Props = { searchParams: Promise<{ dias?: string }> }

type DayData = {
  consumption: number | null
  initial: number | null
  mid: number | null      // mid-day weight (carnes only)
  restock: number | null
  final: number | null
}

type ProductRow = {
  id: string
  name: string
  unit: string
  module: Module
  days: Record<string, DayData>   // date → DayData
}

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
  const datesNewest = [...dates].reverse()

  const targetModules: Module[] = [...CARNES_SERVICIO_MODULES, ...BEVERAGE_SERVICE_MODULES]

  const records = await prisma.dailyRecord.findMany({
    where: {
      date: { gte: startDate },
      product: { active: true, module: { in: targetModules } },
    },
    include: {
      product: { select: { id: true, name: true, module: true, unit: true } },
    },
    orderBy: { date: 'asc' },
  })

  // Build product rows
  const productMap: Record<string, ProductRow> = {}

  for (const r of records) {
    const pid = r.productId
    const dateStr = r.date.toISOString().split('T')[0]
    const mod = r.product.module as Module

    if (!productMap[pid]) {
      productMap[pid] = {
        id: pid,
        name: r.product.name,
        unit: r.product.unit,
        module: mod,
        days: {},
      }
    }

    let consumption: number | null = null
    let initial: number | null = null
    let mid: number | null = null
    let restock: number | null = null
    let final: number | null = null

    if (CARNES_SERVICIO_MODULES.includes(mod)) {
      initial = r.initialWeight
      mid = r.waste1          // waste1 stores mid-day weight
      restock = r.restock
      final = r.finalWeight
      consumption = initial !== null && final !== null
        ? (initial ?? 0) + (restock ?? 0) - final
        : null
    } else if (BEVERAGE_SERVICE_MODULES.includes(mod)) {
      initial = r.initialStock
      restock = r.restock
      final = r.finalStock
      consumption = r.consumption
    }

    productMap[pid].days[dateStr] = { consumption, initial, mid, restock, final }
  }

  const carnesProducts = Object.values(productMap)
    .filter(p => CARNES_SERVICIO_MODULES.includes(p.module))
    .sort((a, b) => a.name.localeCompare(b.name))

  const bebidasProducts = Object.values(productMap)
    .filter(p => BEVERAGE_SERVICE_MODULES.includes(p.module))
    .sort((a, b) => a.name.localeCompare(b.name))

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 p-4 max-w-full mx-auto w-full">

        {/* Header */}
        <div className="mb-6 flex items-center justify-between max-w-6xl mx-auto">
          <div>
            <h1 className="text-xl font-bold">Consumo diario</h1>
            <p className="text-sm text-gray-500">Últimos {validDias} días</p>
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

        <div className="space-y-8">
          {/* CARNES PARA SERVICIO */}
          {carnesProducts.length > 0 && (
            <Section
              title="Carnes para Servicio"
              icon="🥩"
              products={carnesProducts}
              dates={datesNewest}
              showMid
            />
          )}

          {/* BEBIDAS SERVICIO */}
          {bebidasProducts.length > 0 && (
            <Section
              title="Bebidas Servicio"
              icon="🥤"
              products={bebidasProducts}
              dates={datesNewest}
              showMid={false}
            />
          )}

          {carnesProducts.length === 0 && bebidasProducts.length === 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center text-gray-500">
              No hay registros de consumo en este período.
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

// ---- Section component ----

function Section({
  title,
  icon,
  products,
  dates,
  showMid,
}: {
  title: string
  icon: string
  products: ProductRow[]
  dates: string[]
  showMid: boolean
}) {
  // Daily totals (consumption)
  const dailyTotals: Record<string, number | null> = {}
  for (const d of dates) {
    const vals = products
      .map(p => p.days[d]?.consumption ?? null)
      .filter((v): v is number => v !== null)
    dailyTotals[d] = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) : null
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-3 max-w-full px-0.5">
        <span className="text-2xl">{icon}</span>
        <h2 className="text-lg font-bold text-gray-800">{title}</h2>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-gray-200 shadow-sm">
        <table className="text-sm w-full min-w-max bg-white">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-3 font-semibold sticky left-0 bg-gray-50 z-10 min-w-[160px]">
                Producto
              </th>
              {dates.map((d) => (
                <th key={d} className="text-center px-3 py-3 font-semibold whitespace-nowrap min-w-[90px]">
                  <div className="text-gray-700">
                    {new Date(d + 'T12:00:00').toLocaleDateString('es-CR', { weekday: 'short' })}
                  </div>
                  <div className="text-xs text-gray-400 font-normal">
                    {new Date(d + 'T12:00:00').toLocaleDateString('es-CR', { day: 'numeric', month: 'short' })}
                  </div>
                </th>
              ))}
              <th className="text-right px-4 py-3 font-semibold bg-orange-50 text-orange-700 min-w-[80px]">
                Prom.
              </th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => {
              const consumptions = dates
                .map(d => p.days[d]?.consumption ?? null)
                .filter((v): v is number => v !== null)
              const avg = consumptions.length > 0
                ? consumptions.reduce((a, b) => a + b, 0) / consumptions.length
                : null
              const maxC = consumptions.length > 0 ? Math.max(...consumptions) : 0

              return (
                <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                  <td className="px-4 py-2 font-medium sticky left-0 bg-white hover:bg-gray-50/50 z-10 whitespace-nowrap">
                    {p.name}
                    <div className="text-xs text-gray-400">{p.unit}</div>
                  </td>
                  {dates.map((d) => {
                    const day = p.days[d]
                    const c = day?.consumption ?? null
                    const intensity = c !== null && maxC > 0 ? c / maxC : 0
                    const bg = c !== null && c > 0
                      ? `rgba(249,115,22,${(intensity * 0.3).toFixed(2)})`
                      : 'transparent'
                    return (
                      <td key={d} className="px-2 py-2 text-center align-top" style={{ backgroundColor: bg }}>
                        {c !== null ? (
                          <div>
                            <div className={`font-bold text-base ${c > 0 ? 'text-gray-800' : 'text-gray-300'}`}>
                              {c.toFixed(1)}
                            </div>
                            {day && (day.initial !== null || day.restock !== null || day.final !== null) && (
                              <div className="text-gray-400 leading-tight mt-0.5" style={{ fontSize: '10px' }}>
                                {day.initial !== null && <span>I:{day.initial.toFixed(1)} </span>}
                                {showMid && day.mid !== null && <span>M:{day.mid.toFixed(1)} </span>}
                                {day.restock !== null && day.restock > 0 && (
                                  <span className="text-blue-400">+{day.restock.toFixed(1)} </span>
                                )}
                                {day.final !== null && <span>F:{day.final.toFixed(1)}</span>}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-200 text-base">—</span>
                        )}
                      </td>
                    )
                  })}
                  <td className="px-4 py-2 text-right font-bold bg-orange-50 text-orange-600 whitespace-nowrap">
                    {avg !== null ? `${avg.toFixed(1)} ${p.unit}` : '—'}
                  </td>
                </tr>
              )
            })}

            {/* Daily totals row */}
            <tr className="border-t-2 border-gray-200 bg-gray-50 font-semibold">
              <td className="px-4 py-2 sticky left-0 bg-gray-50 z-10 text-gray-600 text-xs uppercase tracking-wide">
                Total día
              </td>
              {dates.map((d) => {
                const total = dailyTotals[d]
                return (
                  <td key={d} className="px-2 py-2 text-center text-gray-700">
                    {total !== null ? total.toFixed(1) : '—'}
                  </td>
                )
              })}
              <td className="px-4 py-2 bg-orange-50" />
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
