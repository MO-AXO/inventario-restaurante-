'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { calcStatus } from '@/lib/utils'
import { Module } from '@prisma/client'
import { WEIGHT_MODULES, SMOKED_MODULES, BEVERAGE_SERVICE_MODULES, CARNES_SERVICIO_MODULES, RESTAURANTE_RESTOCK_MAP, BODEGA_STOCK_MODULES } from '@/lib/utils'

export async function saveInventoryRecord(
  _prevState: { success?: boolean; error?: string } | undefined,
  formData: FormData
) {
  try {
  const session = await getSession()
  if (!session) return { error: 'No autorizado' }

  const productId = formData.get('productId') as string
  const date = formData.get('date') as string
  const notes = (formData.get('notes') as string)?.trim() || null
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

    // Descontar delta de peso inicial + recarga de Carnes Ahumadas (idempotente)
    // waste2 almacena el total ya descontado hoy, para que el delta sea correcto
    // incluso si el registro existía antes de que se activara esta lógica.
    const existingCarnes = await prisma.dailyRecord.findUnique({
      where: { productId_date: { productId, date: new Date(date) } },
    })
    const totalShouldDeduct = initialWeight + restock
    const alreadyDeducted = existingCarnes?.waste2 ?? 0
    const delta = totalShouldDeduct - alreadyDeducted
    if (delta !== 0) {
      await deductFromModule(product.name, delta, date, session.userId, 'CARNES_AHUMADAS')
    }

    data = { ...data, initialWeight, waste1: midWeight, restock, finalWeight, currentStock: finalWeight, status, waste2: totalShouldDeduct }
  } else if (WEIGHT_MODULES.includes(module)) {
    const units = parseInt(formData.get('units') as string) || 0
    const initialWeight = parseFloat(formData.get('initialWeight') as string) || 0
    const waste1 = parseFloat(formData.get('waste1') as string) || 0
    const finalWeight = initialWeight - waste1
    const status = calcStatus(finalWeight, product.minStock)
    data = { ...data, units, initialWeight, waste1, finalWeight, currentStock: finalWeight, status }
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

    // Descontar delta de recarga de Bebidas Bodega (idempotente)
    const existingBebidas = await prisma.dailyRecord.findUnique({
      where: { productId_date: { productId, date: new Date(date) } },
    })
    const oldRestockBebidas = existingBebidas?.restock ?? 0
    const deltaBebidas = restock - oldRestockBebidas
    if (deltaBebidas !== 0) {
      await deductFromModule(product.name, deltaBebidas, date, session.userId, 'BEBIDAS_BODEGA')
    }
  } else if (BODEGA_STOCK_MODULES.includes(module)) {
    // Bodega stock: initial + restock → finalStock auto-calculated
    const initialStock = parseFloat(formData.get('initialStock') as string) || 0
    const restock = parseFloat(formData.get('restock') as string) || 0
    const finalStock = parseFloat(formData.get('finalStock') as string) || 0
    const status = calcStatus(finalStock, product.minStock)
    data = { ...data, initialStock, restock, finalStock, currentStock: finalStock, status }
  } else if (module in RESTAURANTE_RESTOCK_MAP) {
    const currentStock = parseFloat(formData.get('currentStock') as string) || 0
    const restock = parseFloat(formData.get('restock') as string) || 0
    const status = calcStatus(currentStock, product.minStock)
    data = { ...data, currentStock, restock, status }

    // Descontar delta de recarga del módulo bodega correspondiente (idempotente)
    const existingToday = await prisma.dailyRecord.findUnique({
      where: { productId_date: { productId, date: new Date(date) } },
    })
    const oldRestock = existingToday?.restock ?? 0
    const delta = restock - oldRestock
    if (delta !== 0) {
      const targetModule = RESTAURANTE_RESTOCK_MAP[module]!
      await deductFromModule(product.name, delta, date, session.userId, targetModule)
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
  } catch (err) {
    console.error('saveInventoryRecord error:', err)
    return { error: 'Error al guardar. Intentá de nuevo.' }
  }
}

// Descuenta (o suma si negativo) del stock de un módulo bodega dado.
// qty puede ser negativo para revertir un descuento previo.
async function deductFromModule(
  productName: string,
  qty: number,
  date: string,
  userId: string,
  targetModule: Module,
) {
  const bodegaProduct = await prisma.product.findFirst({
    where: { name: { equals: productName, mode: 'insensitive' }, module: targetModule, active: true },
  })
  if (!bodegaProduct) return

  // Buscar stock actual: registro de hoy o el más reciente
  const latestRecord = await prisma.dailyRecord.findFirst({
    where: { productId: bodegaProduct.id },
    orderBy: { date: 'desc' },
  })

  const currentStock = Math.max(0, (latestRecord?.currentStock ?? 0) - qty)
  const status = calcStatus(currentStock, bodegaProduct.minStock)

  const isSmokedTarget = SMOKED_MODULES.includes(targetModule)
  await prisma.dailyRecord.upsert({
    where: { productId_date: { productId: bodegaProduct.id, date: new Date(date) } },
    update: isSmokedTarget
      ? { currentStock, weightLb: currentStock, status, userId }
      : { currentStock, finalWeight: currentStock, status, userId },
    create: isSmokedTarget
      ? { productId: bodegaProduct.id, date: new Date(date), currentStock, weightLb: currentStock, status, userId }
      : { productId: bodegaProduct.id, date: new Date(date), currentStock, finalWeight: currentStock, status, userId },
  })

  // Alerta si quedó bajo o crítico; limpiar si quedó OK
  if (status === 'CRITICO' || status === 'BAJO') {
    await prisma.alert.deleteMany({ where: { productId: bodegaProduct.id, read: false } })
    await prisma.alert.create({
      data: {
        productId: bodegaProduct.id,
        productName: bodegaProduct.name,
        module: targetModule,
        status,
        message: `${bodegaProduct.name} bajo por recarga. Stock: ${currentStock} ${bodegaProduct.unit} (mínimo: ${bodegaProduct.minStock})`,
      },
    })
  } else {
    await prisma.alert.deleteMany({ where: { productId: bodegaProduct.id, read: false } })
  }

  revalidatePath(`/inventario/${targetModule.toLowerCase()}`)
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
