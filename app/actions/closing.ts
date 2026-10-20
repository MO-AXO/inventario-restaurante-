'use server'

import { randomUUID } from 'crypto'
import { revalidatePath } from 'next/cache'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import {
  CARNES_SERVICIO_MODULES,
  SMOKED_MODULES,
  RETURNABLE_SHARED_IDS,
  MODULE_LABELS,
  todayDate,
  calcStatus,
  closingBalance,
  round3,
  warehouseStock,
} from '@/lib/utils'

// El peso final lo escribe el equipo en la tarjeta de la carne; aquí solo se anota la merma.
// Todo lo demás regresa a Bodega: devuelto = peso final - merma.
export type ClosingLine = {
  productId: string
  waste: number
  reason: string
}

export type ClosingResult =
  | {
      ok: true
      batchId: string
      items: {
        name: string
        unit: string
        final: number
        returned: number
        waste: number
        added: number
        warehouseNow: number | null
      }[]
      warnings: string[]
    }
  | { ok: false; error: string }

function fmt(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2)
}

export async function registerClosing(lines: ClosingLine[]): Promise<ClosingResult> {
  try {
    const session = await getSession()
    if (!session || (session.role !== 'OWNER' && session.role !== 'MANAGER')) {
      return { ok: false, error: 'Solo el dueño o el gerente pueden registrar el cierre.' }
    }

    const date = new Date(todayDate())
    const closed = await prisma.dayClose.findUnique({ where: { date } })
    if (closed) return { ok: false, error: 'El día ya está cerrado. Reábrelo para registrar el cierre.' }

    // Se cierran todas las carnes que regresan y ya tienen peso final hoy; la merma es opcional por carne.
    const wasteByProduct = new Map(lines.map((l) => [l.productId, l]))
    const products = await prisma.product.findMany({
      where: { active: true, module: { in: CARNES_SERVICIO_MODULES }, sharedId: { in: RETURNABLE_SHARED_IDS } },
    })
    if (products.length === 0) return { ok: false, error: 'No hay carnes configuradas para devolver.' }

    const todayRecords = await prisma.dailyRecord.findMany({
      where: { date, productId: { in: products.map((p) => p.id) } },
    })
    const recordByProduct = new Map(todayRecords.map((r) => [r.productId, r]))

    // Un final en 0 con inicial positivo y sin mediodía es un final que nunca se escribió.
    const finalOf = (productId: string) => {
      const rec = recordByProduct.get(productId)
      if (!rec || rec.finalWeight === null) return null
      if (rec.finalWeight === 0 && (rec.initialWeight ?? 0) > 0 && !rec.waste1) return null
      return rec.finalWeight
    }

    const errors: string[] = []
    const pending: { product: (typeof products)[number]; final: number; waste: number; reason: string }[] = []
    for (const p of products) {
      const line = wasteByProduct.get(p.id)
      const waste = line && Number.isFinite(line.waste) ? line.waste : null
      // Una carne sin merma escrita y sin final no se toca; si traen merma, el final es obligatorio.
      const final = finalOf(p.id)
      if (final === null) {
        if (waste !== null && waste > 0) errors.push(`${p.name}: escribe primero el peso final en su tarjeta.`)
        continue
      }
      const previousWaste = recordByProduct.get(p.id)?.wasteQty ?? 0
      const wasteValue = waste !== null ? waste : previousWaste
      const check = closingBalance({ final, waste: wasteValue })
      if (wasteValue < 0) {
        errors.push(`${p.name}: la merma no puede ser negativa.`)
        continue
      }
      if (!check.valid) {
        errors.push(`${p.name}: la merma (${fmt(wasteValue)}) supera el peso final de ${fmt(final)} ${p.unit}.`)
        continue
      }
      pending.push({ product: p, final, waste: wasteValue, reason: line?.reason ?? '' })
    }
    if (errors.length > 0) return { ok: false, error: errors.join(' ') }
    if (pending.length === 0) {
      return { ok: false, error: 'Ninguna carne tiene peso final hoy. Escríbelo primero en la tarjeta de cada carne.' }
    }

    const sharedIds = pending.map((x) => x.product.sharedId).filter((id): id is string => !!id)
    const warehouseProducts = await prisma.product.findMany({
      where: { active: true, module: { in: SMOKED_MODULES }, sharedId: { in: sharedIds } },
    })
    const warehouseBySharedId = new Map(warehouseProducts.map((w) => [w.sharedId as string, w]))

    const batchId = randomUUID()
    const warnings: string[] = []
    const items: Extract<ClosingResult, { ok: true }>['items'] = []

    await prisma.$transaction(
      async (tx) => {
        for (const { product, final, waste, reason } of pending) {
          const rec = await tx.dailyRecord.findUnique({ where: { productId_date: { productId: product.id, date } } })
          const { returned } = closingBalance({ final, waste })
          const alreadyReturned = rec?.returnedQty ?? 0
          // Solo se suma a Bodega la diferencia con lo ya devuelto hoy: confirmar dos veces no duplica.
          const added = round3(returned - alreadyReturned)

          const fields: Prisma.DailyRecordUncheckedCreateInput = {
            productId: product.id,
            date,
            userId: session.userId,
            status: calcStatus(0, product.minStock),
            notes: rec?.notes ?? null,
            initialWeight: rec?.initialWeight ?? null,
            waste1: rec?.waste1 ?? null,
            restock: rec?.restock ?? null,
            restockMorning: rec?.restockMorning ?? null,
            finalWeight: final,
            returnedQty: returned,
            wasteQty: waste,
            wasteReason: waste > 0 && reason.trim() ? reason.trim() : waste > 0 ? rec?.wasteReason ?? null : null,
            currentStock: 0,
          }
          await tx.dailyRecord.upsert({
            where: { productId_date: { productId: product.id, date } },
            update: fields,
            create: fields,
          })

          let warehouseNow: number | null = null
          const warehouse = product.sharedId ? warehouseBySharedId.get(product.sharedId) ?? null : null
          if (added !== 0) {
            if (!warehouse) {
              warnings.push(`${product.name}: no tiene equivalente en Bodega, la devolución no se sumó.`)
            } else if (warehouse.unit.trim().toLowerCase() !== product.unit.trim().toLowerCase()) {
              warnings.push(`${product.name}: unidades distintas (${product.unit} y ${warehouse.unit}), la devolución no se sumó a Bodega.`)
            } else {
              const wToday = await tx.dailyRecord.findUnique({
                where: { productId_date: { productId: warehouse.id, date } },
              })
              const wLatest = wToday ?? await tx.dailyRecord.findFirst({
                where: { productId: warehouse.id },
                orderBy: { date: 'desc' },
              })
              const previous = warehouseStock(warehouse.module, wLatest)
              warehouseNow = Math.max(0, round3(previous + added))
              const wData: Prisma.DailyRecordUncheckedCreateInput = {
                productId: warehouse.id,
                date,
                userId: session.userId,
                status: calcStatus(warehouseNow, warehouse.minStock),
                currentStock: warehouseNow,
                weightLb: warehouseNow,
                units: wLatest?.units ?? null,
                notes: wToday?.notes ?? null,
              }
              await tx.dailyRecord.upsert({
                where: { productId_date: { productId: warehouse.id, date } },
                update: wData,
                create: wData,
              })
              await tx.purchase.create({
                data: {
                  productId: warehouse.id,
                  quantity: added,
                  unit: warehouse.unit,
                  userId: session.userId,
                  kind: 'DEVOLUCION',
                  shift: 'CIERRE',
                  batchId,
                  notes: `Devolución desde ${MODULE_LABELS[product.module]}`,
                },
              })
            }
          }

          // La merma se registra una vez; si ya estaba registrada con el mismo valor no se repite.
          const wasteDelta = round3(waste - (rec?.wasteQty ?? 0))
          if (wasteDelta !== 0) {
            await tx.purchase.create({
              data: {
                productId: product.id,
                quantity: wasteDelta,
                unit: product.unit,
                userId: session.userId,
                kind: 'MERMA',
                shift: 'CIERRE',
                batchId,
                notes: reason.trim() || null,
              },
            })
          }

          items.push({ name: product.name, unit: product.unit, final, returned, waste, added, warehouseNow })
        }
      },
      { timeout: 60000, maxWait: 10000 }
    )

    revalidatePath('/recarga-restaurante')
    revalidatePath('/dashboard')
    revalidatePath('/resumen')
    revalidatePath('/consumo')
    revalidatePath('/inventario/carnes_preparadas')
    revalidatePath('/inventario/carnes_ahumadas')

    return { ok: true, batchId, items, warnings }
  } catch (error) {
    console.error('registerClosing error:', error)
    return { ok: false, error: 'No se pudo registrar el cierre. No se aplicó ningún cambio.' }
  }
}
