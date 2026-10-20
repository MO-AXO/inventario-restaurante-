export const dynamic = 'force-dynamic'

import Navbar from '@/components/Navbar'
import Link from 'next/link'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import {
  CARNES_SERVICIO_MODULES,
  BEVERAGE_SERVICE_MODULES,
  STANDARD_RESTAURANT_MODULES,
  CONSUMPTION_MODULES,
  MODULE_LABELS,
  MODULE_ICONS,
  todayDate,
} from '@/lib/utils'
import { Module } from '@prisma/client'

type Props = { searchParams: Promise<{ dias?: string; tab?: string; modulo?: string }> }

type DayData = {
  consumption: number | null
  consumoMedioDia: number | null   // inicial + recarga de mañana - conteo de mediodía
  consumoNoche: number | null      // conteo de mediodía + recarga de mediodía - final
  initial: number | null
  mid: number | null
  restock: number | null
  final: number | null
  returned: number | null          // regresó a Bodega al cerrar (no es consumo)
  waste: number | null             // merma que se botó (no es consumo)
}

type ProductRow = {
  id: string
  name: string
  unit: string
  module: Module
  days: Record<string, DayData>
}

type RowStats = {
  product: ProductRow
  total: number
  avg: number | null
  max: number
  daysCount: number
}

type Section = {
  mod: Module
  rows: RowStats[]
  dailyTotals: Record<string, number | null>
  dailyMid: Record<string, number | null>
  dailyNight: Record<string, number | null>
  wasteTotal: number
  returnedTotal: number
  total: number
  avg: number | null
  daysCount: number
  top: RowStats | null
  maxAvg: number
}

function fmt(n: number | null, digits = 1) {
  if (n === null) return '—'
  return Number.isInteger(n) ? String(n) : n.toFixed(digits)
}

function buildSection(mod: Module, products: ProductRow[], dates: string[]): Section {
  const rows: RowStats[] = products.map((product) => {
    const values = dates
      .map((d) => product.days[d]?.consumption ?? null)
      .filter((v): v is number => v !== null)
    const total = values.reduce((a, b) => a + b, 0)
    return {
      product,
      total,
      avg: values.length > 0 ? total / values.length : null,
      max: values.length > 0 ? Math.max(...values) : 0,
      daysCount: values.length,
    }
  })
  // Mayor consumo primero; los productos sin datos al final.
  rows.sort((a, b) => (b.daysCount > 0 ? b.total : -Infinity) - (a.daysCount > 0 ? a.total : -Infinity) || a.product.name.localeCompare(b.product.name))

  const dailyTotals: Record<string, number | null> = {}
  for (const d of dates) {
    const vals = products.map((p) => p.days[d]?.consumption ?? null).filter((v): v is number => v !== null)
    dailyTotals[d] = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) : null
  }
  const sumDay = (pick: (day: DayData) => number | null) => {
    const out: Record<string, number | null> = {}
    for (const d of dates) {
      const vals = products.map((p) => (p.days[d] ? pick(p.days[d]) : null)).filter((v): v is number => v !== null)
      out[d] = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) : null
    }
    return out
  }
  const wasteTotal = products.reduce((n, p) => n + dates.reduce((m, d) => m + (p.days[d]?.waste ?? 0), 0), 0)
  const returnedTotal = products.reduce((n, p) => n + dates.reduce((m, d) => m + (p.days[d]?.returned ?? 0), 0), 0)
  const dailyMid = sumDay((day) => day.consumoMedioDia)
  const dailyNight = sumDay((day) => day.consumoNoche)
  const withData = Object.values(dailyTotals).filter((v): v is number => v !== null)
  const total = withData.reduce((a, b) => a + b, 0)
  const withConsumption = rows.filter((r) => r.daysCount > 0)
  return {
    mod,
    rows,
    dailyTotals,
    dailyMid,
    dailyNight,
    wasteTotal,
    returnedTotal,
    total,
    avg: withData.length > 0 ? total / withData.length : null,
    daysCount: withData.length,
    top: withConsumption.length > 0 ? withConsumption[0] : null,
    maxAvg: Math.max(0, ...rows.map((r) => r.avg ?? 0)),
  }
}

export default async function ConsumoDiarioPage({ searchParams }: Props) {
  const session = await getSession()
  if (!session || session.role !== 'OWNER') redirect('/dashboard')

  const { dias: diasParam, tab: tabParam, modulo: moduloParam } = await searchParams
  const dias = parseInt(diasParam ?? '7')
  const validDias = [7, 14, 30].includes(dias) ? dias : 7
  const activeTab = tabParam === 'historial' ? 'historial' : 'live'

  const today = todayDate()
  const startDate = new Date(today)
  startDate.setDate(startDate.getDate() - (validDias - 1))

  const dates: string[] = []
  for (let i = validDias - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    dates.push(d.toISOString().split('T')[0])
  }
  const datesNewest = [...dates].reverse()

  const records = await prisma.dailyRecord.findMany({
    where: {
      date: { gte: startDate },
      product: { active: true, module: { in: CONSUMPTION_MODULES } },
    },
    include: {
      product: { select: { id: true, name: true, module: true, unit: true } },
    },
    orderBy: { date: 'asc' },
  })

  const productMap: Record<string, ProductRow> = {}

  for (const r of records) {
    const pid = r.productId
    const dateStr = r.date.toISOString().split('T')[0]
    const mod = r.product.module as Module

    if (!productMap[pid]) {
      productMap[pid] = { id: pid, name: r.product.name, unit: r.product.unit, module: mod, days: {} }
    }

    let consumption: number | null = null
    let consumoMedioDia: number | null = null
    let consumoNoche: number | null = null
    let initial: number | null = null
    let mid: number | null = null
    let restock: number | null = null
    let final: number | null = null
    const returned = r.returnedQty ?? null
    const waste = r.wasteQty ?? null

    if (CARNES_SERVICIO_MODULES.includes(mod)) {
      const morning = r.restockMorning ?? 0
      initial = r.initialWeight
      mid = r.waste1
      restock = morning + (r.restock ?? 0)
      final = r.finalWeight
      if (initial !== null && mid !== null) consumoMedioDia = initial + morning - mid
      if (mid !== null && final !== null) consumoNoche = mid + (r.restock ?? 0) - final
      if (initial !== null && final !== null) consumption = initial + restock - final
    } else if (BEVERAGE_SERVICE_MODULES.includes(mod) || STANDARD_RESTAURANT_MODULES.includes(mod)) {
      const morning = r.restockMorning ?? 0
      initial = r.initialStock
      mid = r.midStock
      restock = morning + (r.restock ?? 0)
      final = r.finalStock
      consumption = r.consumption
      if (initial !== null && mid !== null) consumoMedioDia = initial + morning - mid
      if (mid !== null && final !== null) consumoNoche = mid + (r.restock ?? 0) - final
    }

    productMap[pid].days[dateStr] = { consumption, consumoMedioDia, consumoNoche, initial, mid, restock, final, returned, waste }
  }

  const allProducts = Object.values(productMap)
  const sections: Section[] = CONSUMPTION_MODULES
    .map((mod) => buildSection(mod, allProducts.filter((p) => p.module === mod), dates))
    .filter((s) => s.rows.length > 0)

  const selected = sections.some((s) => s.mod === moduloParam) ? (moduloParam as Module) : 'todos'
  const visibleSections = selected === 'todos' ? sections : sections.filter((s) => s.mod === selected)

  const productsWithData = sections.reduce((n, s) => n + s.rows.filter((r) => r.daysCount > 0).length, 0)
  const daysWithData = dates.filter((d) => allProducts.some((p) => (p.days[d]?.consumption ?? null) !== null)).length

  // --- Historial de cierres ---
  const snapshots = await prisma.dayConsumptionSnapshot.findMany({
    where: { date: { gte: startDate } },
    orderBy: [{ date: 'desc' }, { productName: 'asc' }],
  })

  const snapByDate: Record<string, Partial<Record<Module, SnapRow[]>>> = {}
  for (const s of snapshots) {
    const dateStr = s.date.toISOString().split('T')[0]
    const day = (snapByDate[dateStr] ??= {})
    ;(day[s.module] ??= []).push(s)
  }
  const snapDays = Object.entries(snapByDate)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, byModule]) => ({
      date,
      groups: CONSUMPTION_MODULES
        .filter((m) => (byModule[m]?.length ?? 0) > 0)
        .map((m) => ({ mod: m, rows: byModule[m] as SnapRow[] })),
    }))

  const rangeLabel = `${new Date(dates[0] + 'T12:00:00').toLocaleDateString('es-CR', { day: 'numeric', month: 'short' })} – ${new Date(dates[dates.length - 1] + 'T12:00:00').toLocaleDateString('es-CR', { day: 'numeric', month: 'short', year: 'numeric' })}`
  const href = (params: { dias?: number; tab?: string; modulo?: string }) =>
    `/consumo?dias=${params.dias ?? validDias}&tab=${params.tab ?? activeTab}&modulo=${params.modulo ?? selected}`

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <main className="flex-1 p-4 sm:p-6 max-w-6xl mx-auto w-full space-y-5">

        {/* Encabezado */}
        <header className="rounded-3xl bg-gradient-to-br from-[#211915] to-[#3b2a1f] text-white p-5 sm:p-6 shadow-lg">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-orange-300">Pig Brothers</p>
              <h1 className="text-2xl font-extrabold mt-1">Consumo diario</h1>
              <p className="text-sm text-gray-300 mt-0.5">{rangeLabel}</p>
            </div>
            <div className="flex gap-1 bg-white/10 rounded-xl p-1" role="group" aria-label="Período">
              {[7, 14, 30].map((d) => (
                <Link
                  key={d}
                  href={href({ dias: d })}
                  className={`px-3.5 py-1.5 rounded-lg text-sm font-semibold transition ${
                    validDias === d ? 'bg-orange-500 text-white shadow' : 'text-gray-200 hover:bg-white/10'
                  }`}
                >
                  {d} días
                </Link>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mt-5">
            <Stat label="Productos con consumo" value={String(productsWithData)} />
            <Stat label="Días con datos" value={`${daysWithData}/${validDias}`} />
            <Stat label="Módulos" value={String(sections.length)} />
          </div>
        </header>

        {/* Pestañas */}
        <nav className="flex gap-1 bg-gray-200/70 rounded-xl p-1 w-fit" aria-label="Vista">
          {[
            { id: 'live', label: 'En vivo' },
            { id: 'historial', label: 'Historial de cierres' },
          ].map((t) => (
            <Link
              key={t.id}
              href={href({ tab: t.id })}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                activeTab === t.id ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              {t.label}
            </Link>
          ))}
        </nav>

        {/* EN VIVO */}
        {activeTab === 'live' && (
          <>
            {sections.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1" aria-label="Filtrar por módulo">
                <Chip href={href({ modulo: 'todos' })} active={selected === 'todos'} icon="📊" label="Todos" sub={`${sections.length} módulos`} />
                {sections.map((s) => (
                  <Chip
                    key={s.mod}
                    href={href({ modulo: s.mod })}
                    active={selected === s.mod}
                    icon={MODULE_ICONS[s.mod]}
                    label={MODULE_LABELS[s.mod]}
                    sub={`${fmt(s.total)} total`}
                  />
                ))}
              </div>
            )}

            {visibleSections.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center text-gray-500">
                <div className="text-4xl mb-2">📭</div>
                <p className="font-medium">No hay registros de consumo en este período.</p>
                <p className="text-sm text-gray-400 mt-1">El consumo aparece cuando se escribe el inventario final del día.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {visibleSections.map((s) => (
                  <ModuleCard key={s.mod} section={s} dates={datesNewest} today={today} />
                ))}
              </div>
            )}
          </>
        )}

        {/* HISTORIAL */}
        {activeTab === 'historial' && (
          <div className="space-y-3">
            {snapDays.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center text-gray-500">
                <div className="text-4xl mb-2">🗓️</div>
                <p className="font-medium">No hay cierres de día registrados en este período.</p>
                <p className="text-xs text-gray-400 mt-1">Los datos se guardan al presionar &ldquo;Cerrar día&rdquo; en el Dashboard.</p>
              </div>
            ) : (
              snapDays.map((day, i) => <SnapDayCard key={day.date} day={day} defaultOpen={i === 0} />)
            )}
          </div>
        )}
      </main>
    </div>
  )
}

// ---------- Piezas de interfaz ----------

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/10 px-4 py-3">
      <div className="text-2xl font-extrabold leading-none">{value}</div>
      <div className="text-[11px] text-gray-300 mt-1.5 leading-tight">{label}</div>
    </div>
  )
}

function Chip({ href, active, icon, label, sub }: { href: string; active: boolean; icon: string; label: string; sub: string }) {
  return (
    <Link
      href={href}
      className={`shrink-0 flex items-center gap-2.5 rounded-xl border px-3.5 py-2 transition ${
        active
          ? 'border-orange-500 bg-orange-500 text-white shadow-md'
          : 'border-gray-200 bg-white text-gray-700 hover:border-orange-300'
      }`}
    >
      <span className="text-xl leading-none">{icon}</span>
      <span className="text-left leading-tight">
        <span className="block text-sm font-semibold whitespace-nowrap">{label}</span>
        <span className={`block text-[11px] ${active ? 'text-orange-100' : 'text-gray-400'}`}>{sub}</span>
      </span>
    </Link>
  )
}

function ModuleCard({ section, dates, today }: { section: Section; dates: string[]; today: string }) {
  const { mod, rows, dailyTotals, dailyMid, dailyNight, wasteTotal, returnedTotal, total, avg, top, maxAvg } = section

  return (
    <section className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-4 sm:px-5 py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="w-11 h-11 rounded-xl bg-orange-50 flex items-center justify-center text-2xl">{MODULE_ICONS[mod]}</span>
          <div>
            <h2 className="text-lg font-bold text-gray-900 leading-tight">{MODULE_LABELS[mod]}</h2>
            <p className="text-xs text-gray-500">
              {rows.filter((r) => r.daysCount > 0).length} de {rows.length} productos con consumo
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Metric label="Total del período" value={fmt(total)} />
          <Metric label="Promedio diario" value={fmt(avg)} />
          {wasteTotal > 0 && <Metric label="Merma del períodio" value={fmt(wasteTotal)} />}
          {returnedTotal > 0 && <Metric label="Devuelto a Bodega" value={fmt(returnedTotal)} />}
          {top && <Metric label="Mayor consumo" value={top.product.name} small />}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-max text-sm">
          <thead>
            <tr className="bg-gray-50/80 text-xs text-gray-500">
              <th className="text-left px-4 py-2.5 font-semibold sticky left-0 bg-gray-50 z-10 min-w-[170px]">Producto</th>
              {dates.map((d) => {
                const isToday = d === today
                return (
                  <th key={d} className="text-center px-2 py-2.5 font-semibold min-w-[104px]">
                    <div className={`capitalize ${isToday ? 'text-orange-600' : 'text-gray-700'}`}>
                      {new Date(d + 'T12:00:00').toLocaleDateString('es-CR', { weekday: 'short' })}
                      {isToday && <span className="ml-1 inline-block w-1.5 h-1.5 rounded-full bg-orange-500 align-middle" />}
                    </div>
                    <div className="text-[11px] font-normal text-gray-400">
                      {new Date(d + 'T12:00:00').toLocaleDateString('es-CR', { day: 'numeric', month: 'short' })}
                    </div>
                  </th>
                )
              })}
              <th className="text-right px-4 py-2.5 font-semibold bg-orange-50 text-orange-700 min-w-[130px]">Promedio</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ product: p, avg: pAvg, max, daysCount }) => (
              <tr key={p.id} className={`border-t border-gray-100 hover:bg-gray-50/60 ${daysCount === 0 ? 'opacity-60' : ''}`}>
                <td className="px-4 py-2.5 sticky left-0 bg-white z-10">
                  <div className="font-semibold text-gray-900 whitespace-nowrap">{p.name}</div>
                  <div className="text-[11px] text-gray-400">{p.unit}</div>
                </td>
                {dates.map((d) => (
                  <DayCell key={d} day={p.days[d]} max={max} />
                ))}
                <td className="px-4 py-2.5 bg-orange-50/60">
                  <div className="text-right font-bold text-orange-700 whitespace-nowrap">
                    {pAvg !== null ? `${fmt(pAvg)} ${p.unit}` : '—'}
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-orange-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-orange-500"
                      style={{ width: `${maxAvg > 0 && pAvg !== null ? Math.max(4, (Math.max(pAvg, 0) / maxAvg) * 100) : 0}%` }}
                    />
                  </div>
                </td>
              </tr>
            ))}
            <tr className="border-t-2 border-gray-200 bg-gray-50 text-gray-700">
              <td className="px-4 py-2.5 sticky left-0 bg-gray-50 z-10 text-[11px] font-bold uppercase tracking-wide text-gray-500">
                Total del día
              </td>
              {dates.map((d) => (
                <td key={d} className="px-2 py-2.5 text-center align-top">
                  <div className="font-bold text-gray-900">{fmt(dailyTotals[d])}</div>
                  {(dailyMid[d] !== null || dailyNight[d] !== null) && (
                    <div className="mt-1 space-y-0.5 text-[11px] font-medium">
                      <div className="flex justify-between gap-2 text-amber-600"><span>Mediodía</span><span>{fmt(dailyMid[d])}</span></div>
                      <div className="flex justify-between gap-2 text-indigo-600"><span>Final</span><span>{fmt(dailyNight[d])}</span></div>
                    </div>
                  )}
                </td>
              ))}
              <td className="px-4 py-2.5 bg-orange-50 text-right font-bold text-orange-700">{fmt(total)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50/50 text-[11px] text-gray-500 flex flex-wrap gap-x-4 gap-y-1">
        <span><strong className="text-amber-600">Mediodía</strong>: lo consumido desde que abren hasta el conteo de mediodía</span>
        <span><strong className="text-indigo-600">Final</strong>: lo consumido después del mediodía hasta el cierre</span>
        <span>Pasa el mouse sobre un día para ver inicial, recargas y conteos</span>
      </div>
    </section>
  )
}

function Metric({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <div className="rounded-xl bg-gray-50 border border-gray-100 px-3 py-1.5 max-w-[180px]">
      <div className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">{label}</div>
      <div className={`font-bold text-gray-900 truncate ${small ? 'text-sm' : 'text-base'}`}>{value}</div>
    </div>
  )
}

function DayCell({ day, max }: { day: DayData | undefined; max: number }) {
  const c = day?.consumption ?? null
  if (!day || c === null) {
    return <td className="px-2 py-2 text-center text-gray-300">—</td>
  }

  const intensity = c > 0 && max > 0 ? c / max : 0
  const hasSplit = day.consumoMedioDia !== null || day.consumoNoche !== null

  const tooltip = [
    day.initial !== null && `Inicial ${fmt(day.initial)}`,
    day.restock !== null && day.restock > 0 && `Recargas ${fmt(day.restock)}`,
    day.mid !== null && `Mediodía ${fmt(day.mid)}`,
    day.final !== null && `Final ${fmt(day.final)}`,
    day.returned !== null && day.returned > 0 && `Devuelto a Bodega ${fmt(day.returned)}`,
    day.waste !== null && day.waste > 0 && `Merma ${fmt(day.waste)}`,
  ].filter(Boolean).join(' · ')

  return (
    <td
      className="px-1.5 py-2 text-center align-top"
      style={{ backgroundColor: c > 0 ? `rgba(249,115,22,${(0.06 + intensity * 0.26).toFixed(2)})` : undefined }}
      title={tooltip}
    >
      <div className={`font-bold text-base leading-tight ${c < 0 ? 'text-red-600' : c === 0 ? 'text-gray-400' : 'text-gray-900'}`}>
        {fmt(c)}
      </div>
      {hasSplit && (
        <div className="mt-1.5 pt-1.5 border-t border-gray-200/70 space-y-0.5 text-[11px] font-medium text-left">
          <div className="flex justify-between gap-2 text-amber-600"><span>Mediodía</span><span>{fmt(day.consumoMedioDia)}</span></div>
          <div className="flex justify-between gap-2 text-indigo-600"><span>Final</span><span>{fmt(day.consumoNoche)}</span></div>
        </div>
      )}
      {((day.waste ?? 0) > 0 || (day.returned ?? 0) > 0) && (
        <div className="mt-1 space-y-0.5 text-[11px] font-medium text-left">
          {(day.returned ?? 0) > 0 && <div className="flex justify-between gap-2 text-blue-600"><span>Devuelto</span><span>{fmt(day.returned)}</span></div>}
          {(day.waste ?? 0) > 0 && <div className="flex justify-between gap-2 text-rose-600"><span>Merma</span><span>{fmt(day.waste)}</span></div>}
        </div>
      )}
    </td>
  )
}

// ---------- Historial de cierres ----------

type SnapRow = {
  id: string
  productName: string
  unit: string
  consumption: number
  consumoMedioDia: number | null
  consumoNoche: number | null
  initial: number | null
  mid: number | null
  restock: number | null
  final: number | null
  returned: number | null
  waste: number | null
}

function SnapDayCard({ day, defaultOpen }: { day: { date: string; groups: { mod: Module; rows: SnapRow[] }[] }; defaultOpen: boolean }) {
  const label = new Date(day.date + 'T12:00:00').toLocaleDateString('es-CR', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })
  const productCount = day.groups.reduce((n, g) => n + g.rows.length, 0)

  return (
    <details open={defaultOpen} className="group bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <summary className="cursor-pointer list-none px-4 sm:px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 hover:bg-gray-50">
        <div className="flex items-center gap-3">
          <span className="text-gray-400 transition group-open:rotate-90">▶</span>
          <span className="font-bold text-gray-900 capitalize">{label}</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {day.groups.map((g) => (
            <span key={g.mod} className="text-[11px] font-semibold bg-orange-50 text-orange-700 rounded-full px-2.5 py-1">
              {MODULE_ICONS[g.mod]} {fmt(g.rows.reduce((n, r) => n + r.consumption, 0))}
            </span>
          ))}
          <span className="text-[11px] text-gray-400 self-center ml-1">{productCount} productos</span>
        </div>
      </summary>
      <div className="border-t border-gray-100 divide-y divide-gray-100">
        {day.groups.map((g) => (
          <SnapSection key={g.mod} mod={g.mod} rows={g.rows} />
        ))}
      </div>
    </details>
  )
}

function SnapSection({ mod, rows }: { mod: Module; rows: SnapRow[] }) {
  const showBreakdown = rows.some((r) => r.consumoMedioDia !== null || r.consumoNoche !== null)
  const showReturns = rows.some((r) => (r.returned ?? 0) > 0 || (r.waste ?? 0) > 0)
  const sorted = [...rows].sort((a, b) => b.consumption - a.consumption)

  return (
    <div>
      <div className="px-4 sm:px-5 py-2.5 bg-gray-50/70 flex items-center gap-2">
        <span className="text-base">{MODULE_ICONS[mod]}</span>
        <span className="text-sm font-bold text-gray-700">{MODULE_LABELS[mod]}</span>
        <span className="text-xs text-gray-400">· total {fmt(rows.reduce((n, r) => n + r.consumption, 0))}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-max text-sm">
          <thead>
            <tr className="text-xs text-gray-400 border-b border-gray-100">
              <th className="text-left px-4 sm:px-5 py-2 font-medium">Producto</th>
              <th className="text-right px-3 py-2 font-medium">Inicial</th>
              {showBreakdown && <th className="text-right px-3 py-2 font-medium">Mediodía</th>}
              <th className="text-right px-3 py-2 font-medium">Recarga</th>
              <th className="text-right px-3 py-2 font-medium">Final</th>
              {showBreakdown && <th className="text-right px-3 py-2 font-medium text-amber-600">☀</th>}
              {showBreakdown && <th className="text-right px-3 py-2 font-medium text-indigo-500">🌙</th>}
              {showReturns && <th className="text-right px-3 py-2 font-medium text-blue-600">Devuelto</th>}
              {showReturns && <th className="text-right px-3 py-2 font-medium text-rose-600">Merma</th>}
              <th className="text-right px-4 sm:px-5 py-2 font-medium text-orange-600">Consumo</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <tr key={r.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60">
                <td className="px-4 sm:px-5 py-2 font-medium text-gray-900">{r.productName}</td>
                <td className="px-3 py-2 text-right text-gray-500">{fmt(r.initial)}</td>
                {showBreakdown && <td className="px-3 py-2 text-right text-gray-500">{fmt(r.mid)}</td>}
                <td className="px-3 py-2 text-right text-blue-500">{r.restock !== null && r.restock > 0 ? `+${fmt(r.restock)}` : '—'}</td>
                <td className="px-3 py-2 text-right text-gray-500">{fmt(r.final)}</td>
                {showBreakdown && <td className="px-3 py-2 text-right font-semibold text-amber-600">{fmt(r.consumoMedioDia)}</td>}
                {showBreakdown && <td className="px-3 py-2 text-right font-semibold text-indigo-500">{fmt(r.consumoNoche)}</td>}
                {showReturns && <td className="px-3 py-2 text-right text-blue-600">{(r.returned ?? 0) > 0 ? fmt(r.returned) : '—'}</td>}
                {showReturns && <td className="px-3 py-2 text-right text-rose-600">{(r.waste ?? 0) > 0 ? fmt(r.waste) : '—'}</td>}
                <td className="px-4 sm:px-5 py-2 text-right font-bold text-orange-600 whitespace-nowrap">
                  {fmt(r.consumption)} <span className="text-[11px] font-normal text-gray-400">{r.unit}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
