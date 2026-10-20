export const dynamic = 'force-dynamic'

import Navbar from '@/components/Navbar'
import TransferPanel from '@/components/TransferPanel'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import {
  MODULE_LABELS,
  MODULE_ICONS,
  RESTAURANTE_MODULES,
  MIDDAY_COUNT_MODULES,
  WAREHOUSE_FOR_RESTAURANT,
  RETURNABLE_SHARED_IDS,
  CARNES_SERVICIO_MODULES,
  todayDate,
  availableStock,
  warehouseStock,
  readMidCount,
} from '@/lib/utils'

// A partir de esta hora (Costa Rica) se sugiere el turno de mediodía en lugar del de mañana.
const SHIFT_CUTOFF_HOUR = 11

export default async function RecargaRestorantePage() {
  const session = await getSession()
  if (!session || (session.role !== 'OWNER' && session.role !== 'MANAGER')) redirect('/dashboard')

  const today = todayDate()
  const [products, warehouseProducts, transfers, dayClose] = await Promise.all([
    prisma.product.findMany({
      where: { active: true, module: { in: RESTAURANTE_MODULES } },
      include: { records: { orderBy: { date: 'desc' }, take: 1 } },
      orderBy: [{ module: 'asc' }, { name: 'asc' }],
    }),
    prisma.product.findMany({
      where: { active: true, sharedId: { not: null }, module: { in: Object.values(WAREHOUSE_FOR_RESTAURANT) } },
      include: { records: { orderBy: { date: 'desc' }, take: 1 } },
    }),
    prisma.purchase.findMany({
      where: { kind: { in: ['TRASLADO', 'DEVOLUCION', 'MERMA'] }, batchId: { not: null } },
      take: 120,
      orderBy: { createdAt: 'desc' },
      include: { product: { select: { name: true } } },
    }),
    prisma.dayClose.findUnique({ where: { date: new Date(today) } }),
  ])

  const warehouseByKey = new Map(warehouseProducts.map((w) => [`${w.module}:${w.sharedId}`, w]))

  // Lo que ya se llevó hoy de cada producto, por turno, para avisar si se repite.
  const dayStartForRows = new Date(`${today}T00:00:00-06:00`)
  const movedToday: Record<string, { MANANA: number; MEDIODIA: number }> = {}
  for (const t of transfers) {
    if (t.kind !== 'TRASLADO' || t.createdAt < dayStartForRows) continue
    const entry = (movedToday[t.productId] ??= { MANANA: 0, MEDIODIA: 0 })
    if (t.shift === 'MANANA' || t.shift === 'MEDIODIA') entry[t.shift] += t.quantity
  }

  const rows = products.map((p) => {
    const warehouseModule = WAREHOUSE_FOR_RESTAURANT[p.module]
    const warehouse = warehouseModule && p.sharedId ? warehouseByKey.get(`${warehouseModule}:${p.sharedId}`) : undefined
    return {
      id: p.id,
      name: p.name,
      sharedId: p.sharedId,
      moduleLabel: MODULE_LABELS[p.module],
      moduleIcon: MODULE_ICONS[p.module],
      needsMidCount: MIDDAY_COUNT_MODULES.includes(p.module),
      unit: p.unit,
      available: availableStock(p.module, p.records[0] ?? null),
      // Solo el conteo de hoy: el de ayer no es el final de mediodía de hoy.
      midCountToday: p.records[0] && p.records[0].date.toISOString().split('T')[0] === today
        ? readMidCount(p.module, p.records[0])
        : null,
      linked: !!warehouse && warehouse.unit.trim().toLowerCase() === p.unit.trim().toLowerCase(),
      warehouseAvailable: warehouse ? warehouseStock(warehouse.module, warehouse.records[0] ?? null) : null,
      movedMorning: movedToday[p.id]?.MANANA ?? 0,
      movedNoon: movedToday[p.id]?.MEDIODIA ?? 0,
    }
  })

  // Carnes que regresan a Bodega al cerrar: solo las del catálogo definido, con lo que ya hay registrado hoy.
  const closingRows = products
    .filter((p) => CARNES_SERVICIO_MODULES.includes(p.module) && p.sharedId && RETURNABLE_SHARED_IDS.includes(p.sharedId))
    .map((p) => {
      const rec = p.records[0] && p.records[0].date.toISOString().split('T')[0] === today ? p.records[0] : null
      const warehouse = p.sharedId ? warehouseByKey.get(`${WAREHOUSE_FOR_RESTAURANT[p.module]}:${p.sharedId}`) : undefined
      return {
        id: p.id,
        name: p.name,
        unit: p.unit,
        available: availableStock(p.module, p.records[0] ?? null),
        finalToday: rec && rec.finalWeight !== null && !(rec.finalWeight === 0 && (rec.initialWeight ?? 0) > 0 && !rec.waste1) ? rec.finalWeight : null,
        returnedToday: rec?.returnedQty ?? 0,
        wasteToday: rec?.wasteQty ?? 0,
        warehouseAvailable: warehouse ? warehouseStock(warehouse.module, warehouse.records[0] ?? null) : null,
        linked: !!warehouse && warehouse.unit.trim().toLowerCase() === p.unit.trim().toLowerCase(),
      }
    })

  // Costa Rica no tiene horario de verano: UTC-6 todo el año.
  const dayStart = new Date(`${today}T00:00:00-06:00`)

  const batchMap = new Map<string, { batchId: string; shift: string; createdAt: string; items: { name: string; unit: string; quantity: number; kind: string }[] }>()
  for (const t of transfers) {
    if (!t.batchId) continue
    const batch = batchMap.get(t.batchId) ?? { batchId: t.batchId, shift: t.shift ?? 'MANANA', createdAt: t.createdAt.toISOString(), items: [] }
    batch.items.push({ name: t.product.name, unit: t.unit, quantity: t.quantity, kind: t.kind })
    batchMap.set(t.batchId, batch)
  }
  const allBatches = Array.from(batchMap.values())

  // Turnos que ya tienen un traslado hoy, con la hora y cuántos productos llevaron.
  const doneToday: Record<string, { count: number; at: string }> = {}
  for (const b of allBatches) {
    if (new Date(b.createdAt) < dayStart) continue
    const kinds = new Set(b.items.map((i) => i.kind))
    if (b.shift === 'CIERRE' && !kinds.has('DEVOLUCION') && !kinds.has('MERMA')) continue
    if (b.shift !== 'CIERRE' && !kinds.has('TRASLADO')) continue
    const current = doneToday[b.shift]
    doneToday[b.shift] = {
      count: (current?.count ?? 0) + b.items.length,
      at: !current || new Date(b.createdAt) > new Date(current.at) ? b.createdAt : current.at,
    }
  }

  // Solo el lote más reciente de hoy se puede deshacer (si es un traslado).
  const newestToday = allBatches.find((b) => new Date(b.createdAt) >= dayStart)
  const undoableBatchId = newestToday && newestToday.shift !== 'CIERRE' && newestToday.items.some((i) => i.kind === 'TRASLADO')
    ? newestToday.batchId
    : null

  // Turno sugerido por la hora de Costa Rica; es solo una sugerencia y no bloquea nada.
  const hourCR = Number(new Date().toLocaleString('en-US', { timeZone: 'America/Costa_Rica', hour: 'numeric', hour12: false }))
  const suggestedShift = hourCR >= SHIFT_CUTOFF_HOUR ? 'MEDIODIA' : 'MANANA'

  const batches = allBatches.slice(0, 10)

  const dateLabel = new Date(today + 'T12:00:00').toLocaleDateString('es-CR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 p-4 max-w-4xl mx-auto w-full">
        <div className="mb-5">
          <h1 className="text-xl font-bold">Recarga Restaurante</h1>
          <p className="text-sm text-gray-500 capitalize">{dateLabel}</p>
        </div>

        {dayClose ? (
          <div className="bg-gray-100 border border-gray-300 rounded-2xl px-4 py-6 text-center text-gray-600">
            El día está cerrado. Para registrar traslados, el dueño debe reabrirlo desde el Dashboard.
          </div>
        ) : (
          <TransferPanel
                      products={rows}
                      batches={batches}
                      closingRows={closingRows}
                      doneToday={doneToday}
                      undoableBatchId={undoableBatchId}
                      suggestedShift={suggestedShift}
                      cutoffHour={SHIFT_CUTOFF_HOUR}
                    />
        )}
      </main>
    </div>
  )
}
