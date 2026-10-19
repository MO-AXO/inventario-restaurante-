'use server'

import { revalidatePath } from 'next/cache'
import { Module } from '@prisma/client'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { BODEGA_MODULES, todayDate, calcStatus, WEIGHT_MODULES, SMOKED_MODULES, BODEGA_STOCK_MODULES } from '@/lib/utils'

export async function registerPurchase(_prevState: { success?: boolean; error?: string } | undefined, formData: FormData) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'OWNER') return { error: 'Solo el dueño puede registrar compras' }

    const productId = String(formData.get('productId') || '')
    const quantity = Number(formData.get('quantity'))
    const unitCostValue = Number(formData.get('unitCost'))
    const supplier = String(formData.get('supplier') || '').trim() || null
    const notes = String(formData.get('notes') || '').trim() || null

    if (!productId || !Number.isFinite(quantity) || quantity <= 0) {
      return { error: 'Indica una cantidad válida' }
    }

    const product = await prisma.product.findUnique({ where: { id: productId } })
    if (!product || !product.active || !BODEGA_MODULES.includes(product.module as Module)) {
      return { error: 'El producto no pertenece a un módulo de bodega' }
    }

    const unitCost = Number.isFinite(unitCostValue) && unitCostValue >= 0 ? unitCostValue : null
    const date = new Date(todayDate())
    const result = await prisma.$transaction(async (tx) => {
      const record = await tx.dailyRecord.findUnique({ where: { productId_date: { productId, date } } })
      const previous = record?.currentStock ?? record?.finalStock ?? record?.finalWeight ?? record?.weightLb ?? 0
      const nextStock = previous + quantity
      const status = calcStatus(nextStock, product.minStock)

      const recordData = {
        productId,
        date,
        userId: session.userId,
        status,
        currentStock: nextStock,
        notes: record?.notes ?? null,
        ...(BODEGA_STOCK_MODULES.includes(product.module)
          ? {
              initialStock: record?.initialStock ?? previous,
              restock: (record?.restock ?? 0) + quantity,
              finalStock: nextStock,
            }
          : {}),
        ...(WEIGHT_MODULES.includes(product.module)
          ? {
              initialWeight: record?.initialWeight ?? previous,
              restock: (record?.restock ?? 0) + quantity,
              finalWeight: nextStock,
            }
          : {}),
        ...(SMOKED_MODULES.includes(product.module) ? { weightLb: nextStock } : {}),
      }

      await tx.dailyRecord.upsert({
        where: { productId_date: { productId, date } },
        update: recordData,
        create: recordData,
      })

      return tx.purchase.create({
        data: {
          productId,
          quantity,
          unit: product.unit,
          unitCost,
          supplier,
          notes,
          userId: session.userId,
        },
      })
    })

    revalidatePath('/compras')
    revalidatePath('/dashboard')
    revalidatePath(`/inventario/${product.module.toLowerCase()}`)
    return { success: true, purchaseId: result.id }
  } catch (error) {
    console.error('registerPurchase error:', error)
    return { error: 'No se pudo registrar la compra' }
  }
}
