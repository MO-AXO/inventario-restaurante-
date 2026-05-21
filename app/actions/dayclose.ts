'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { todayDate, CARNES_SERVICIO_MODULES, BEVERAGE_SERVICE_MODULES } from '@/lib/utils'
import { Module } from '@prisma/client'

const CONSUMPTION_MODULES: Module[] = [...CARNES_SERVICIO_MODULES, ...BEVERAGE_SERVICE_MODULES]

export async function closeDayAction(): Promise<void> {
  const session = await getSession()
  if (!session || session.role !== 'OWNER') return

  const user = await prisma.user.findUnique({ where: { id: session.userId } })
  if (!user) return

  const today = todayDate()
  const todayDate_ = new Date(today)

  // Snapshot today's consumption before closing
  const records = await prisma.dailyRecord.findMany({
    where: {
      date: todayDate_,
      product: { active: true, module: { in: CONSUMPTION_MODULES } },
    },
    include: {
      product: { select: { name: true, module: true, unit: true } },
    },
  })

  for (const r of records) {
    const mod = r.product.module as Module
    let consumption: number | null = null
    let initial: number | null = null
    let restock: number | null = null
    let final: number | null = null

    let consumoMedioDia: number | null = null
    let consumoNoche: number | null = null
    let mid: number | null = null

    if (CARNES_SERVICIO_MODULES.includes(mod)) {
      initial = r.initialWeight
      mid = r.waste1
      restock = r.restock
      final = r.finalWeight
      if (initial !== null && mid !== null) {
        consumoMedioDia = initial - mid
      }
      if (mid !== null && final !== null) {
        consumoNoche = mid + (restock ?? 0) - final
      }
      consumption =
        initial !== null && final !== null
          ? initial + (restock ?? 0) - final
          : null
    } else if (BEVERAGE_SERVICE_MODULES.includes(mod)) {
      initial = r.initialStock
      restock = r.restock
      final = r.finalStock
      consumption = r.consumption
    }

    if (consumption === null) continue

    await prisma.dayConsumptionSnapshot.upsert({
      where: { productId_date: { productId: r.productId, date: todayDate_ } },
      update: {
        productName: r.product.name,
        module: mod,
        unit: r.product.unit,
        consumption,
        consumoMedioDia,
        consumoNoche,
        initial,
        mid,
        restock,
        final,
      },
      create: {
        date: todayDate_,
        productId: r.productId,
        productName: r.product.name,
        module: mod,
        unit: r.product.unit,
        consumption,
        consumoMedioDia,
        consumoNoche,
        initial,
        mid,
        restock,
        final,
      },
    })
  }

  await prisma.dayClose.upsert({
    where: { date: todayDate_ },
    update: { closedAt: new Date(), closedByName: user.name },
    create: { date: todayDate_, closedByName: user.name },
  })

  revalidatePath('/dashboard')
  revalidatePath('/consumo')
}

export async function reopenDayAction(): Promise<void> {
  const session = await getSession()
  if (!session || session.role !== 'OWNER') return

  const today = todayDate()
  await prisma.dayClose.deleteMany({ where: { date: new Date(today) } })

  revalidatePath('/dashboard')
  revalidatePath('/consumo')
}
