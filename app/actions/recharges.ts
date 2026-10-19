'use server'

import { revalidatePath } from 'next/cache'
import { Module, Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import {
  RESTAURANTE_MODULES,
  CARNES_SERVICIO_MODULES,
  BEVERAGE_SERVICE_MODULES,
  RESTAURANTE_RESTOCK_MAP,
  todayDate,
  calcStatus,
  availableStock,
} from '@/lib/utils'

export async function registerRestaurantRecharge(
  _prevState: { success?: boolean; error?: string } | undefined,
  formData: FormData
) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'OWNER') return { error: 'Solo el dueño puede registrar recargas' }

    const productId = String(formData.get('productId') || '')
    const quantity = Number(formData.get('quantity'))
    if (!productId || !Number.isFinite(quantity) || quantity <= 0) {
      return { error: 'Indica una cantidad válida' }
    }

    const product = await prisma.product.findUnique({ where: { id: productId } })
    if (!product || !product.active || !RESTAURANTE_MODULES.includes(product.module as Module)) {
      return { error: 'El producto no pertenece a un módulo de restaurante' }
    }

    const mod = product.module as Module
    const isCarnes = CARNES_SERVICIO_MODULES.includes(mod)
    const isBeverage = BEVERAGE_SERVICE_MODULES.includes(mod)
    const date = new Date(todayDate())

    const saved = await prisma.$transaction(async (tx) => {
      const todayRecord = await tx.dailyRecord.findUnique({ where: { productId_date: { productId, date } } })
      const latest = todayRecord ?? await tx.dailyRecord.findFirst({ where: { productId }, orderBy: { date: 'desc' } })

      const fields: Prisma.DailyRecordUncheckedCreateInput = {
        productId,
        date,
        userId: session.userId,
        status: 'OK',
      }

      if (isCarnes || isBeverage) {
        // Carnes y bebidas de servicio: la recarga se suma a "recarga" y al disponible.
        let initial = availableStock(mod, latest) ?? 0
        let mid: number | null = null
        let final: number | null = null
        let restock = quantity

        if (todayRecord) {
          initial = (isCarnes ? todayRecord.initialWeight : todayRecord.initialStock) ?? 0
          mid = isCarnes ? todayRecord.waste1 : todayRecord.midStock
          final = isCarnes ? todayRecord.finalWeight : todayRecord.finalStock
          restock = (todayRecord.restock ?? 0) + quantity
          // Un final en 0 con inicial positivo y sin mediodía nunca se capturó.
          const finalCaptured = final !== null && !(final === 0 && initial > 0 && !mid)
          // Si el conteo final ya es físico, la recarga también se suma ahí para no alterar el consumo.
          final = finalCaptured && final !== null ? final + quantity : finalCaptured ? final : null
        }

        if (isCarnes) {
          fields.initialWeight = initial
          fields.waste1 = mid
          fields.finalWeight = final
          fields.restock = restock
        } else {
          fields.initialStock = initial
          fields.midStock = mid
          fields.finalStock = final
          fields.restock = restock
          fields.consumption = final === null ? null : initial + restock - final
        }

        fields.currentStock = availableStock(mod, {
          currentStock: null,
          initialWeight: fields.initialWeight ?? null,
          waste1: fields.waste1 ?? null,
          restock: fields.restock ?? null,
          finalWeight: fields.finalWeight ?? null,
          initialStock: fields.initialStock ?? null,
          midStock: fields.midStock ?? null,
          finalStock: fields.finalStock ?? null,
        })
      } else {
        // Módulos simples y salsas: la recarga se suma al stock actual.
        fields.currentStock = (latest?.currentStock ?? 0) + quantity
        if (mod in RESTAURANTE_RESTOCK_MAP) {
          fields.restock = (todayRecord?.restock ?? 0) + quantity
        }
      }

      fields.status = calcStatus(fields.currentStock ?? 0, product.minStock)

      await tx.dailyRecord.upsert({
        where: { productId_date: { productId, date } },
        update: fields,
        create: fields,
      })

      return tx.purchase.create({
        data: {
          productId,
          quantity,
          unit: product.unit,
          userId: session.userId,
          kind: 'RECARGA_RESTAURANTE',
        },
      })
    })

    const record = await prisma.dailyRecord.findUnique({ where: { productId_date: { productId, date } } })
    if (record && (record.status === 'CRITICO' || record.status === 'BAJO')) {
      await prisma.alert.deleteMany({ where: { productId, read: false } })
      await prisma.alert.create({
        data: {
          productId,
          productName: product.name,
          module: mod,
          status: record.status,
          message: `${product.name} está en estado ${record.status}. Stock: ${record.currentStock} ${product.unit} (mínimo: ${product.minStock})`,
        },
      })
    } else {
      await prisma.alert.deleteMany({ where: { productId, read: false } })
    }

    revalidatePath('/recarga-restaurante')
    revalidatePath('/dashboard')
    revalidatePath('/alertas')
    revalidatePath(`/inventario/${mod.toLowerCase()}`)
    return { success: true, purchaseId: saved.id }
  } catch (error) {
    console.error('registerRestaurantRecharge error:', error)
    return { error: 'No se pudo registrar la recarga' }
  }
}
