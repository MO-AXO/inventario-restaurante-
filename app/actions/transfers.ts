'use server'

import { randomUUID } from 'crypto'
import { revalidatePath } from 'next/cache'
import { Module, Prisma, Product, StockStatus } from '@prisma/client'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import {
  RESTAURANTE_MODULES,
  MIDDAY_COUNT_MODULES,
  CARNES_SERVICIO_MODULES,
  BEVERAGE_SERVICE_MODULES,
  BODEGA_STOCK_MODULES,
  SMOKED_MODULES,
  WAREHOUSE_FOR_RESTAURANT,
  MODULE_LABELS,
  todayDate,
  calcStatus,
  availableStock,
  warehouseStock,
  readMidCount,
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


async function syncAlert(tx: Prisma.TransactionClient, product: Product, status: StockStatus, stock: number) {
  await tx.alert.deleteMany({ where: { productId: product.id, read: false } })
  if (status === 'CRITICO' || status === 'BAJO') {
    await tx.alert.create({
      data: {
        productId: product.id,
        productName: product.name,
        module: product.module,
        status,
        message: `${product.name} está en estado ${status}. Stock: ${stock} ${product.unit} (mínimo: ${product.minStock})`,
      },
    })
  }
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

          if (isCarnes || isBeverage) {
            const hadRecordToday = !!today
            const initial = hadRecordToday
              ? (isCarnes ? today!.initialWeight : today!.initialStock) ?? 0
              : availableStock(mod, latest) ?? 0
            let mid = hadRecordToday ? readMidCount(mod, today) : null
            const final = hadRecordToday ? (isCarnes ? today!.finalWeight : today!.finalStock) : null
            let morning = today?.restockMorning ?? 0
            let noon = today?.restock ?? 0

            if (shift === 'MANANA') morning += line.quantity
            else {
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
            // Módulos simples: el conteo de mediodía (si aplica) reemplaza el stock y luego se suma la recarga.
            const base = wantsMid && line.midCount !== null ? line.midCount : (latest?.currentStock ?? 0)
            fields.currentStock = base + line.quantity
            if (shift === 'MANANA') fields.restockMorning = (today?.restockMorning ?? 0) + line.quantity
            else {
              fields.restock = (today?.restock ?? 0) + line.quantity
              fields.restockMorning = today?.restockMorning ?? null
            }
            if (wantsMid && line.midCount !== null) fields.midStock = line.midCount
          }

          const stockNow = fields.currentStock ?? 0
          fields.status = calcStatus(stockNow, product.minStock)
          await tx.dailyRecord.upsert({
            where: { productId_date: { productId: product.id, date } },
            update: fields,
            create: fields,
          })
          await syncAlert(tx, product, fields.status as StockStatus, stockNow)

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
            await syncAlert(tx, warehouse, wStatus, warehouseLeft)

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
    revalidatePath('/alertas')
    revalidatePath('/resumen')
    revalidatePath('/medio-dia')
    revalidatePath('/consumo')

    return { ok: true, batchId, shift, moved, counted, warnings }
  } catch (error) {
    console.error('registerTransfer error:', error)
    return { ok: false, error: 'No se pudo registrar el traslado. No se aplicó ningún cambio.' }
  }
}

