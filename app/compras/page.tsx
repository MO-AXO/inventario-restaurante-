export const dynamic = 'force-dynamic'

import Navbar from '@/components/Navbar'
import PurchasesPanel from '@/components/PurchasesPanel'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { MODULE_LABELS, MODULE_ICONS, BODEGA_MODULES, todayDate } from '@/lib/utils'

async function getData() {
  const today = todayDate()

  const [products, recentPurchases] = await Promise.all([
    prisma.product.findMany({
      where: { active: true },
      include: {
        records: {
          orderBy: { date: 'desc' },
          take: 1,
        },
      },
      orderBy: [{ module: 'asc' }, { category: 'asc' }, { name: 'asc' }],
    }),
    prisma.purchase.findMany({
      where: { kind: 'COMPRA' },
      take: 20,
      orderBy: { createdAt: 'desc' },
      include: { product: { select: { name: true } } },
    }),
  ])

  return { products, recentPurchases, today }
}

export default async function ComprasPage() {
  const session = await getSession()
  if (!session || session.role !== 'OWNER') redirect('/dashboard')

  const { products, recentPurchases, today } = await getData()
  const bodegaProducts = products
    .filter((p) => BODEGA_MODULES.includes(p.module) || p.module === 'CARNES_AHUMADAS')
    .map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      moduleLabel: MODULE_LABELS[p.module],
      moduleIcon: MODULE_ICONS[p.module],
      unit: p.unit,
      sharedId: p.sharedId,
      currentStock: p.records[0]?.currentStock ?? p.records[0]?.finalStock ?? p.records[0]?.finalWeight ?? p.records[0]?.weightLb ?? null,
    }))
  const recent = recentPurchases.map((purchase) => ({
    id: purchase.id,
    productName: purchase.product.name,
    quantity: purchase.quantity,
    unit: purchase.unit,
    supplier: purchase.supplier,
    unitCost: purchase.unitCost,
    createdAt: purchase.createdAt.toISOString(),
  }))

  const dateLabel = new Date(today + 'T12:00:00').toLocaleDateString('es-CR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 p-4 max-w-4xl mx-auto w-full">
        <div className="mb-5">
          <h1 className="text-xl font-bold">Añadir inventario</h1>
          <p className="text-sm text-gray-500 capitalize">{dateLabel}</p>
        </div>

        <PurchasesPanel products={bodegaProducts} recent={recent} />
      </main>
    </div>
  )
}
