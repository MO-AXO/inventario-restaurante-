export const dynamic = 'force-dynamic'

import Navbar from '@/components/Navbar'
import { prisma } from '@/lib/db'
import { todayDate } from '@/lib/utils'
import InventarioResumen from '@/components/InventarioResumen'

export default async function ResumenPage() {
  const today = todayDate()

  const products = await prisma.product.findMany({
    where: { active: true },
    include: {
      records: {
        where: { date: new Date(today) },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
  })

  const dateLabel = new Date(today + 'T12:00:00').toLocaleDateString('es-CR', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  // Serialize dates so they can be passed to the client component
  const serialized = products.map((p) => ({
    id: p.id,
    name: p.name,
    category: p.category,
    unit: p.unit,
    minStock: p.minStock,
    module: p.module,
    records: p.records.map((r) => ({
      currentStock: r.currentStock,
      finalWeight: r.finalWeight,
      weightLb: r.weightLb,
      finalStock: r.finalStock,
      units: r.units,
      status: r.status,
      updatedAt: r.updatedAt.toISOString(),
    })),
  }))

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 p-4 max-w-5xl mx-auto w-full">
        <div className="mb-5">
          <h1 className="text-xl font-bold">Resumen de inventario</h1>
          <p className="text-sm text-gray-500 capitalize">{dateLabel}</p>
        </div>

        <InventarioResumen products={serialized} />
      </main>
    </div>
  )
}
