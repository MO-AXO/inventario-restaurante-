'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { calcStatus } from '@/lib/utils'
import { Module } from '@prisma/client'
import { WEIGHT_MODULES, SMOKED_MODULES, BEVERAGE_SERVICE_MODULES } from '@/lib/utils'

export async function saveInventoryRecord(
  _prevState: { success?: boolean; error?: string } | undefined,
  formData: FormData
) {
  const session = await getSession()
  if (!session) return { error: 'No autorizado' }

  const productId = formData.get('productId') as string
  const date = formData.get('date') as string
  const notes = formData.get('notes') as string | null
  const module = formData.get('module') as Module

  const product = await prisma.product.findUnique({ where: { id: productId } })
  if (!product) return { error: 'Producto no encontrado' }

  let data: Record<string, unknown> = {
    productId,
    date: new Date(date),
    notes,
    userId: session.userId,
  }

  if (WEIGHT_MODULES.includes(module)) {
    const initialWeight = parseFloat(formData.get('initialWeight') as string) || 0
    const waste1 = parseFloat(formData.get('waste1') as string) || 0
    const restock = parseFloat(formData.get('restock') as string) || 0
    const waste2 = parseFloat(formData.get('waste2') as string) || 0
    const finalWeight = initialWeight - waste1 + restock - waste2
    const status = calcStatus(finalWeight, product.minStock)
    data = { ...data, initialWeight, waste1, restock, waste2, finalWeight, currentStock: finalWeight, status }
  } else if (SMOKED_MODULES.includes(module)) {
    const units = parseInt(formData.get('units') as string) || 0
    const weightLb = parseFloat(formData.get('weightLb') as string) || 0
    const status = calcStatus(weightLb, product.minStock)
    data = { ...data, units, weightLb, currentStock: weightLb, status }
  } else if (BEVERAGE_SERVICE_MODULES.includes(module)) {
    const initialStock = parseFloat(formData.get('initialStock') as string) || 0
    const restock = parseFloat(formData.get('restock') as string) || 0
    const finalStock = parseFloat(formData.get('finalStock') as string) || 0
    const consumption = initialStock + restock - finalStock
    const status = calcStatus(finalStock, product.minStock)
    data = { ...data, initialStock, restock, finalStock, consumption, currentStock: finalStock, status }
  } else {
    // Simple stock
    const currentStock = parseFloat(formData.get('currentStock') as string) || 0
    const status = calcStatus(currentStock, product.minStock)
    data = { ...data, currentStock, status }
  }

  await prisma.dailyRecord.upsert({
    where: { productId_date: { productId, date: new Date(date) } },
    update: data,
    create: data as Parameters<typeof prisma.dailyRecord.create>[0]['data'],
  })

  // Create alert if CRITICO or BAJO
  if (data.status === 'CRITICO' || data.status === 'BAJO') {
    await prisma.alert.create({
      data: {
        productId,
        productName: product.name,
        module,
        status: data.status as 'CRITICO' | 'BAJO',
        message: `${product.name} está en estado ${data.status}. Stock: ${data.currentStock} ${product.unit} (mínimo: ${product.minStock})`,
      },
    })
  }

  revalidatePath('/dashboard')
  revalidatePath('/alertas')
  revalidatePath(`/inventario/${module.toLowerCase()}`)

  return { success: true }
}

export async function markAlertRead(alertId: string): Promise<void> {
  await prisma.alert.update({ where: { id: alertId }, data: { read: true } })
  revalidatePath('/alertas')
}

export async function markAllAlertsRead(): Promise<void> {
  await prisma.alert.updateMany({ where: { read: false }, data: { read: true } })
  revalidatePath('/alertas')
}
