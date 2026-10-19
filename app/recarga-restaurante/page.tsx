export const dynamic = 'force-dynamic'

import Navbar from '@/components/Navbar'
import PurchasesPanel from '@/components/PurchasesPanel'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { MODULE_LABELS, MODULE_ICONS, RESTAURANTE_MODULES, todayDate, availableStock } from '@/lib/utils'
import { registerRestaurantRecharge } from '@/app/actions/recharges'

export default async function RecargaRestorantePage() {
  const session = await getSession()
  if (!session || session.role !== 'OWNER') redirect('/dashboard')

  const today = todayDate()
  const [products, recentRecharges] = await Promise.all([
    prisma.product.findMany({
      where: { active: true, module: { in: RESTAURANTE_MODULES } },
      include: { records: { orderBy: { date: 'desc' }, take: 1 } },
      orderBy: [{ module: 'asc' }, { name: 'asc' }],
    }),
    prisma.purchase.findMany({
      where: { kind: 'RECARGA_RESTAURANTE' },
      take: 20,
      orderBy: { createdAt: 'desc' },
      include: { product: { select: { name: true } } },
    }),
  ])

  const restaurantProducts = products.map((p) => ({
    id: p.id,
    name: p.name,
    category: p.category,
    moduleLabel: MODULE_LABELS[p.module],
    moduleIcon: MODULE_ICONS[p.module],
    unit: p.unit,
    sharedId: p.sharedId,
    currentStock: availableStock(p.module, p.records[0] ?? null),
  }))

  const recent = recentRecharges.map((r) => ({
    id: r.id,
    productName: r.product.name,
    quantity: r.quantity,
    unit: r.unit,
    supplier: null,
    unitCost: null,
    createdAt: r.createdAt.toISOString(),
  }))

  const dateLabel = new Date(today + 'T12:00:00').toLocaleDateString('es-CR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 p-4 max-w-4xl mx-auto w-full">
        <div className="mb-5">
          <h1 className="text-xl font-bold">Recarga Restaurante</h1>
          <p className="text-sm text-gray-500 capitalize">{dateLabel}</p>
        </div>

        <PurchasesPanel
          products={restaurantProducts}
          recent={recent}
          action={registerRestaurantRecharge}
          title="Recargar el restaurante"
          description="La cantidad se suma de inmediato al inventario del restaurante."
          icon="🔄"
          submitLabel="Añadir recarga"
          successMessage="Recarga añadida y stock actualizado."
          recentTitle="Últimas recargas"
          showPurchaseFields={false}
        />
      </main>
    </div>
  )
}
