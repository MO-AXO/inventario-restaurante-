'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { calcStatus } from '@/lib/utils'
import { Module } from '@prisma/client'
import { WEIGHT_MODULES, SMOKED_MODULES, BEVERAGE_SERVICE_MODULES, CARNES_SERVICIO_MODULES } from '@/lib/utils'

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

  // Actualizar stock mínimo si cambió
  const newMinStock = parseFloat(formData.get('minStock') as string)
  if (!isNaN(newMinStock) && newMinStock !== product.minStock) {
    await prisma.product.update({ where: { id: productId }, data: { minStock: newMinStock } })
    product.minStock = newMinStock
  }

  let data: Record<string, unknown> = {
    productId,
    date: new Date(date),
    notes,
    userId: session.userId,
  }

  if (CARNES_SERVICIO_MODULES.includes(module)) {
    // 4-point weigh: initial / mid-day final / restock / end-of-day final
    // waste1 stores mid-day final weight; finalWeight is entered directly
    const initialWeight = parseFloat(formData.get('initialWeight') as string) || 0
    const midWeight    = parseFloat(formData.get('midWeight') as string) || 0
    const restock      = parseFloat(formData.get('restock') as string) || 0
    const finalWeight  = parseFloat(formData.get('finalWeight') as string) || 0
    const status = calcStatus(finalWeight, product.minStock)
    data = { ...data, initialWeight, waste1: midWeight, restock, finalWeight, currentStock: finalWeight, status }
  } else if (WEIGHT_MODULES.includes(module)) {
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

    // Si hay recarga, descontar de Bebidas Bodega automáticamente
    if (restock > 0) {
      await deductFromBodega(product.name, restock, date, session.userId)
    }
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

  // Create alert if CRITICO or BAJO — one unread alert per product max
  if (data.status === 'CRITICO' || data.status === 'BAJO') {
    await prisma.alert.deleteMany({ where: { productId, read: false } })
    await prisma.alert.create({
      data: {
        productId,
        productName: product.name,
        module,
        status: data.status as 'CRITICO' | 'BAJO',
        message: `${product.name} está en estado ${data.status}. Stock: ${data.currentStock} ${product.unit} (mínimo: ${product.minStock})`,
      },
    })
  } else {
    // Stock OK — remove any existing unread alert
    await prisma.alert.deleteMany({ where: { productId, read: false } })
  }

  revalidatePath('/dashboard')
  revalidatePath('/alertas')
  revalidatePath(`/inventario/${module.toLowerCase()}`)

  return { success: true }
}

// Descuenta del stock de Bebidas Bodega cuando se registra una recarga en Servicio
async function deductFromBodega(productName: string, qty: number, date: string, userId: string) {
  const bodegaProduct = await prisma.product.findFirst({
    where: { name: { equals: productName, mode: 'insensitive' }, module: 'BEBIDAS_BODEGA', active: true },
  })
  if (!bodegaProduct) return

  // Buscar stock actual: registro de hoy o el más reciente
  const latestRecord = await prisma.dailyRecord.findFirst({
    where: { productId: bodegaProduct.id },
    orderBy: { date: 'desc' },
  })

  const currentStock = Math.max(0, (latestRecord?.currentStock ?? 0) - qty)
  const status = calcStatus(currentStock, bodegaProduct.minStock)

  await prisma.dailyRecord.upsert({
    where: { productId_date: { productId: bodegaProduct.id, date: new Date(date) } },
    update: { currentStock, status, userId },
    create: { productId: bodegaProduct.id, date: new Date(date), currentStock, status, userId },
  })

  // Alerta si quedó bajo o crítico — one unread alert per product max
  if (status === 'CRITICO' || status === 'BAJO') {
    await prisma.alert.deleteMany({ where: { productId: bodegaProduct.id, read: false } })
    await prisma.alert.create({
      data: {
        productId: bodegaProduct.id,
        productName: bodegaProduct.name,
        module: 'BEBIDAS_BODEGA',
        status,
        message: `${bodegaProduct.name} en Bodega bajo por recarga de Servicio. Stock: ${currentStock} ${bodegaProduct.unit} (mínimo: ${bodegaProduct.minStock})`,
      },
    })
  }

  revalidatePath('/inventario/bebidas_bodega')
}

export async function markAlertRead(alertId: string): Promise<void> {
  await prisma.alert.update({ where: { id: alertId }, data: { read: true } })
  revalidatePath('/alertas')
}

export async function markAllAlertsRead(): Promise<void> {
  await prisma.alert.updateMany({ where: { read: false }, data: { read: true } })
  revalidatePath('/alertas')
}

export async function deleteReadAlerts(): Promise<void> {
  await prisma.alert.deleteMany({ where: { read: true } })
  revalidatePath('/alertas')
}
