'use server'

import { randomUUID } from 'crypto'
import { revalidatePath } from 'next/cache'
import { Module, Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import {
  RESTAURANTE_MODULES,
  MIDDAY_COUNT_MODULES,
  CARNES_SERVICIO_MODULES,
  BEVERAGE_SERVICE_MODULES,
  STANDARD_RESTAURANT_MODULES,
  BODEGA_STOCK_MODULES,
  SMOKED_MODULES,
  WAREHOUSE_FOR_RESTAURANT,
  MODULE_LABELS,
  todayDate,
  calcStatus,
  availableStock,
  carriedStock,
  warehouseStock,
  readMidCount,
  round3,
} from '@/lib/utils'

export type TransferShift = 'MANANA' | 'MEDIODIA'

export type TransferLine = {
  productId: string
  quantity: number
  midCount: number | null
}

export type TransferResult =
  | {
      ok: true
      batchId: string
      shift: TransferShift
      moved: { name: string; unit: string; quantity: number; deducted: number; warehouseLeft: number; module: string }[]
      counted: { name: string; unit: string; count: number }[]
      warnings: string[]
    }
  | { ok: false; error: string }


function fmt(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2)
}

export async function registerTransfer(shift: TransferShift, lines: TransferLine[]): Promise<TransferResult> {
  try {
    const session = await getSession()
    if (!session || (session.role !== 'OWNER' && session.role !== 'MANAGER')) {
      return { ok: false, error: 'Solo el dueño o el gerente pueden registrar traslados.' }
    }
    if (shift !== 'MANANA' && shift !== 'MEDIODIA') return { ok: false, error: 'Turno no válido.' }

    // Una línea es válida si lleva cantidad, o si es mediodía y trae un conteo (se puede contar sin recargar).
    const hasCount = (l: TransferLine) =>
      shift === 'MEDIODIA' && l.midCount !== null && Number.isFinite(l.midCount) && l.midCount >= 0
    const valid = lines
      .filter((l) => (Number.isFinite(l.quantity) && l.quantity > 0) || hasCount(l))
      .map((l) => ({ ...l, quantity: Number.isFinite(l.quantity) && l.quantity > 0 ? l.quantity : 0 }))
    if (valid.length === 0) return { ok: false, error: 'Escribe la cantidad o el conteo de al menos un producto.' }

    const date = new Date(todayDate())
    const closed = await prisma.dayClose.findUnique({ where: { date } })
    if (closed) return { ok: false, error: 'El día ya está cerrado. Reábrelo para registrar traslados.' }

    const products = await prisma.product.findMany({
      where: { id: { in: valid.map((l) => l.productId) }, active: true, module: { in: RESTAURANTE_MODULES } },
    })
    const byId = new Map(products.map((p) => [p.id, p]))

    // Validación previa: en mediodía, los módulos con conteo exigen "cuánto quedó" antes de recargar.
    if (shift === 'MEDIODIA') {
      const missing: string[] = []
      for (const line of valid) {
        const p = byId.get(line.productId)
        if (!p || !MIDDAY_COUNT_MODULES.includes(p.module) || line.quantity <= 0) continue
        if (line.midCount === null || !Number.isFinite(line.midCount) || line.midCount < 0) missing.push(p.name)
      }
      if (missing.length > 0) {
        const shown = missing.slice(0, 5).join(', ')
        return {
          ok: false,
          error: `Falta contar lo que quedó al mediodía antes de recargar: ${shown}${missing.length > 5 ? ` y ${missing.length - 5} más` : ''}.`,
        }
      }
    }

    const warehouseModules = Array.from(new Set(products.map((p) => WAREHOUSE_FOR_RESTAURANT[p.module]).filter(Boolean))) as Module[]
    const sharedIds = products.map((p) => p.sharedId).filter((id): id is string => !!id)
    const warehouseProducts = await prisma.product.findMany({
      where: { active: true, module: { in: warehouseModules }, sharedId: { in: sharedIds } },
    })
    const warehouseBySharedId = new Map(warehouseProducts.map((w) => [`${w.module}:${w.sharedId}`, w]))

    const batchId = randomUUID()
    const warnings: string[] = []
    const moved: Extract<TransferResult, { ok: true }>['moved'] = []
    const counted: Extract<TransferResult, { ok: true }>['counted'] = []

    await prisma.$transaction(
      async (tx) => {
        for (const line of valid) {
          const product = byId.get(line.productId)
          if (!product) continue

          const mod = product.module as Module
          const isCarnes = CARNES_SERVICIO_MODULES.includes(mod)
          const isBeverage = BEVERAGE_SERVICE_MODULES.includes(mod)
          const isStandard = STANDARD_RESTAURANT_MODULES.includes(mod)
          const wantsMid = shift === 'MEDIODIA' && MIDDAY_COUNT_MODULES.includes(mod)
          if (line.quantity <= 0 && !wantsMid) continue
          const warehouseModule = WAREHOUSE_FOR_RESTAURANT[mod]
          const warehouse = product.sharedId && warehouseModule
            ? warehouseBySharedId.get(`${warehouseModule}:${product.sharedId}`) ?? null
            : null
          const unitsMatch = warehouse ? warehouse.unit.trim().toLowerCase() === product.unit.trim().toLowerCase() : false

          const today = await tx.dailyRecord.findUnique({ where: { productId_date: { productId: product.id, date } } })
          const latest = today ?? await tx.dailyRecord.findFirst({ where: { productId: product.id }, orderBy: { date: 'desc' } })

          const fields: Prisma.DailyRecordUncheckedCreateInput = {
            productId: product.id,
            date,
            userId: session.userId,
            status: 'OK',
            notes: today?.notes ?? null,
          }

          if (isCarnes || isBeverage || isStandard) {
            const hadRecordToday = !!today
            // Sin registro de hoy, el inicial es lo que quedó ayer; si hoy hay uno en formato viejo, su stock es el inicial.
            let initial = hadRecordToday
              ? (isCarnes ? today!.initialWeight : today!.initialStock ?? today!.currentStock) ?? 0
              : isCarnes
              ? availableStock(mod, latest) ?? 0
              : carriedStock(mod, latest)
            let mid = hadRecordToday ? readMidCount(mod, today) : null
            const final = hadRecordToday ? (isCarnes ? today!.finalWeight : today!.finalStock) : null
            let morning = today?.restockMorning ?? 0
            let noon = today?.restock ?? 0

            if (shift === 'MANANA') {
              // En Carnes para Servicio lo que se lleva por la mañana ES el peso inicial del día.
              if (isCarnes) initial += line.quantity
              else morning += line.quantity
            } else {
              noon += line.quantity
              if (wantsMid && line.midCount !== null) mid = line.midCount
            }

            if (isCarnes) {
              fields.initialWeight = initial
              fields.waste1 = mid
              fields.finalWeight = final
            } else {
              fields.initialStock = initial
              fields.midStock = mid
              fields.finalStock = final
            }
            fields.restockMorning = morning
            fields.restock = noon
            if (!isCarnes) {
              fields.consumption = final === null ? null : initial + morning + noon - final
            }
            // Después de recargar, un final escrito antes ya no vale en los módulos estándar: se vuelve a contar al cerrar.
            if (isStandard) {
              fields.finalStock = null
              fields.consumption = null
            }
            fields.currentStock = availableStock(mod, {
              currentStock: null,
              initialWeight: fields.initialWeight ?? null,
              waste1: fields.waste1 ?? null,
              restock: noon,
              restockMorning: morning,
              finalWeight: fields.finalWeight ?? null,
              initialStock: fields.initialStock ?? null,
              midStock: fields.midStock ?? null,
              finalStock: fields.finalStock ?? null,
            })
          } else {
            fields.currentStock = (latest?.currentStock ?? 0) + line.quantity
          }

          const stockNow = fields.currentStock ?? 0
          fields.status = calcStatus(stockNow, product.minStock)
          await tx.dailyRecord.upsert({
            where: { productId_date: { productId: product.id, date } },
            update: fields,
            create: fields,
          })


          // Descuento en Bodega por ID compartido, sin bajar de 0.
          let deducted = 0
          let warehouseLeft = 0
          if (line.quantity > 0 && warehouse && unitsMatch) {
            const wToday = await tx.dailyRecord.findUnique({
              where: { productId_date: { productId: warehouse.id, date } },
            })
            const wLatest = wToday ?? await tx.dailyRecord.findFirst({
              where: { productId: warehouse.id },
              orderBy: { date: 'desc' },
            })
            const previous = warehouseStock(warehouse.module, wLatest)
            deducted = Math.min(line.quantity, previous)
            warehouseLeft = previous - deducted
            const wStatus = calcStatus(warehouseLeft, warehouse.minStock)

            const wData: Prisma.DailyRecordUncheckedCreateInput = {
              productId: warehouse.id,
              date,
              userId: session.userId,
              status: wStatus,
              currentStock: warehouseLeft,
              notes: wToday?.notes ?? null,
            }
            if (BODEGA_STOCK_MODULES.includes(warehouse.module)) {
              let initialW = wToday?.initialStock ?? previous
              let restockW = wToday?.restock ?? 0
              const fromInitial = Math.min(initialW, deducted)
              initialW -= fromInitial
              restockW = Math.max(0, restockW - (deducted - fromInitial))
              wData.initialStock = initialW
              wData.restock = restockW
              wData.finalStock = warehouseLeft
            } else if (SMOKED_MODULES.includes(warehouse.module)) {
              wData.weightLb = warehouseLeft
              wData.units = wLatest?.units ?? null
            }
            await tx.dailyRecord.upsert({
              where: { productId_date: { productId: warehouse.id, date } },
              update: wData,
              create: wData,
            })


            if (deducted < line.quantity) {
              warnings.push(`${product.name}: Bodega solo tenía ${fmt(previous)} ${warehouse.unit}, se descontó ${fmt(deducted)} y quedó en 0.`)
            }
          } else if (line.quantity > 0 && !warehouse) {
            warnings.push(`${product.name}: no tiene equivalente en Bodega, no se descontó nada.`)
          } else if (line.quantity > 0 && warehouse) {
            warnings.push(`${product.name}: unidades distintas (${product.unit} y ${warehouse.unit}), no se descontó de Bodega.`)
          }

          if (line.quantity > 0) {
            await tx.purchase.create({
              data: {
                productId: product.id,
                quantity: line.quantity,
                unit: product.unit,
                userId: session.userId,
                kind: 'TRASLADO',
                shift,
                batchId,
                warehouseDeducted: deducted,
              },
            })

            moved.push({
              name: product.name,
              unit: product.unit,
              quantity: line.quantity,
              deducted,
              warehouseLeft,
              module: MODULE_LABELS[mod],
            })
          }
          if (wantsMid && line.midCount !== null) {
            counted.push({ name: product.name, unit: product.unit, count: line.midCount })
          }
        }
      },
      { timeout: 60000, maxWait: 10000 }
    )

    revalidatePath('/recarga-restaurante')
    revalidatePath('/compras')
    revalidatePath('/dashboard')

    revalidatePath('/resumen')
    revalidatePath('/medio-dia')
    revalidatePath('/consumo')

    return { ok: true, batchId, shift, moved, counted, warnings }
  } catch (error) {
    console.error('registerTransfer error:', error)
    return { ok: false, error: 'No se pudo registrar el traslado. No se aplicó ningún cambio.' }
  }
}

class UndoError extends Error {}

export type UndoResult =
  | { ok: true; restored: { name: string; unit: string; quantity: number; returned: number }[]; warnings: string[] }
  | { ok: false; error: string }

// Deshace un traslado completo de hoy: resta lo llevado del restaurante, devuelve a Bodega lo que se descontó
// y marca el comprobante como anulado (no se borra, queda para auditoría). Todo o nada.
export async function undoTransfer(batchId: string): Promise<UndoResult> {
  try {
    const session = await getSession()
    if (!session || (session.role !== 'OWNER' && session.role !== 'MANAGER')) {
      return { ok: false, error: 'Solo el dueño o el gerente pueden deshacer traslados.' }
    }

    const today = todayDate()
    const date = new Date(today)
    const closed = await prisma.dayClose.findUnique({ where: { date } })
    if (closed) return { ok: false, error: 'El día ya está cerrado. Reábrelo para deshacer traslados.' }

    const rows = await prisma.purchase.findMany({ where: { batchId, kind: 'TRASLADO' }, include: { product: true } })
    if (rows.length === 0) return { ok: false, error: 'Este traslado ya fue deshecho o no existe.' }

    // Costa Rica no tiene horario de verano: UTC-6 todo el año.
    const dayStart = new Date(`${today}T00:00:00-06:00`)
    if (rows.some((r) => r.createdAt < dayStart)) return { ok: false, error: 'Solo se puede deshacer un traslado de hoy.' }

    // Solo el más reciente: si hay otro traslado o un cierre después, revertir este dejaría las cuentas torcidas.
    const newest = rows.reduce((m, r) => (r.createdAt > m ? r.createdAt : m), rows[0].createdAt)
    const later = await prisma.purchase.findFirst({
      where: { kind: { in: ['TRASLADO', 'DEVOLUCION', 'MERMA'] }, batchId: { not: batchId }, createdAt: { gt: newest } },
    })
    if (later) return { ok: false, error: 'Hay un traslado o un cierre posterior. Deshaz primero el más reciente.' }

    const restored: Extract<UndoResult, { ok: true }>['restored'] = []
    const warnings: string[] = []

    await prisma.$transaction(
      async (tx) => {
        for (const row of rows) {
          const product = row.product
          const mod = product.module as Module
          const quantity = row.quantity
          if (row.shift !== 'MANANA' && row.shift !== 'MEDIODIA') {
            throw new UndoError(`${product.name}: el turno del traslado no es válido.`)
          }

          const rec = await tx.dailyRecord.findUnique({ where: { productId_date: { productId: product.id, date } } })
          if (!rec) throw new UndoError(`${product.name}: no hay registro de hoy para revertir.`)

          let initialWeight = rec.initialWeight
          let restockMorning = rec.restockMorning
          let restock = rec.restock
          const data: Prisma.DailyRecordUncheckedUpdateInput = {}

          // Se revierte exactamente el campo que el traslado tocó.
          if (row.shift === 'MANANA') {
            if (CARNES_SERVICIO_MODULES.includes(mod)) {
              const next = round3((initialWeight ?? 0) - quantity)
              if (next < 0) throw new UndoError(`${product.name}: el peso inicial de hoy (${fmt(initialWeight ?? 0)}) es menor que lo trasladado (${fmt(quantity)}). Revísalo antes de deshacer.`)
              initialWeight = next
              data.initialWeight = next
            } else {
              const next = round3((restockMorning ?? 0) - quantity)
              if (next < 0) throw new UndoError(`${product.name}: la recarga de la mañana (${fmt(restockMorning ?? 0)}) es menor que lo trasladado (${fmt(quantity)}).`)
              restockMorning = next
              data.restockMorning = next
            }
          } else {
            const next = round3((restock ?? 0) - quantity)
            if (next < 0) throw new UndoError(`${product.name}: la recarga de mediodía (${fmt(restock ?? 0)}) es menor que lo trasladado (${fmt(quantity)}).`)
            restock = next
            data.restock = next
          }

          const currentStock = availableStock(mod, { ...rec, initialWeight, restockMorning, restock }) ?? rec.currentStock ?? 0
          data.currentStock = currentStock
          data.status = calcStatus(currentStock, product.minStock)
          if (!CARNES_SERVICIO_MODULES.includes(mod) && rec.finalStock !== null) {
            data.consumption = round3((rec.initialStock ?? 0) + (restockMorning ?? 0) + (restock ?? 0) - rec.finalStock)
          }
          await tx.dailyRecord.update({ where: { id: rec.id }, data })

          if (row.shift === 'MEDIODIA' && MIDDAY_COUNT_MODULES.includes(mod)) {
            warnings.push(`${product.name}: el conteo de mediodía se conserva; solo se deshizo lo llevado.`)
          }

          // Devolver a Bodega exactamente lo que se le descontó.
          const deducted = row.warehouseDeducted ?? 0
          if (deducted > 0) {
            const warehouseModule = WAREHOUSE_FOR_RESTAURANT[mod]
            const warehouse = product.sharedId && warehouseModule
              ? await tx.product.findFirst({ where: { module: warehouseModule, sharedId: product.sharedId, active: true } })
              : null
            if (!warehouse) {
              warnings.push(`${product.name}: no se encontró el producto en Bodega; no se le devolvió lo descontado.`)
            } else {
              const wToday = await tx.dailyRecord.findUnique({ where: { productId_date: { productId: warehouse.id, date } } })
              const wLatest = wToday ?? await tx.dailyRecord.findFirst({ where: { productId: warehouse.id }, orderBy: { date: 'desc' } })
              const previous = warehouseStock(warehouse.module, wLatest)
              const next = round3(previous + deducted)
              const wData: Prisma.DailyRecordUncheckedCreateInput = {
                productId: warehouse.id,
                date,
                userId: session.userId,
                status: calcStatus(next, warehouse.minStock),
                currentStock: next,
                notes: wToday?.notes ?? null,
              }
              if (BODEGA_STOCK_MODULES.includes(warehouse.module)) {
                wData.initialStock = round3((wToday?.initialStock ?? previous) + deducted)
                wData.restock = wToday?.restock ?? 0
                wData.finalStock = next
              } else if (SMOKED_MODULES.includes(warehouse.module)) {
                wData.weightLb = next
                wData.units = wLatest?.units ?? null
              }
              await tx.dailyRecord.upsert({
                where: { productId_date: { productId: warehouse.id, date } },
                update: wData,
                create: wData,
              })
            }
          }

          restored.push({ name: product.name, unit: product.unit, quantity, returned: deducted })
        }

        await tx.purchase.updateMany({
          where: { batchId, kind: 'TRASLADO' },
          data: { kind: 'ANULADO', notes: `Deshecho por el usuario ${session.userId}` },
        })
      },
      { timeout: 60000, maxWait: 10000 }
    )

    revalidatePath('/recarga-restaurante')
    revalidatePath('/dashboard')
    revalidatePath('/resumen')
    revalidatePath('/medio-dia')
    revalidatePath('/consumo')

    return { ok: true, restored, warnings }
  } catch (error) {
    if (error instanceof UndoError) return { ok: false, error: `${error.message} No se aplicó ningún cambio.` }
    console.error('undoTransfer error:', error)
    return { ok: false, error: 'No se pudo deshacer el traslado. No se aplicó ningún cambio.' }
  }
}

