export const dynamic = 'force-dynamic'

import Navbar from '@/components/Navbar'
import PedidosPanel from '@/components/PedidosPanel'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { todayDate } from '@/lib/utils'

export default async function PedidosPage() {
  const user = await getCurrentUser()
  if (!user || !user.active) redirect('/login')
  const canManage = user.role === 'OWNER' || user.role === 'MANAGER'

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const [pendientes, atendidos] = await Promise.all([
    prisma.pedido.findMany({ where: { status: 'PENDIENTE' }, orderBy: { createdAt: 'asc' } }),
    prisma.pedido.findMany({
      where: { status: { in: ['LLEVADO', 'CANCELADO'] }, resolvedAt: { gte: weekAgo } },
      orderBy: { resolvedAt: 'desc' },
      take: 30,
    }),
  ])

  const pendings = pendientes.map((p) => ({
    id: p.id,
    text: p.text,
    requestedByName: p.requestedByName,
    createdAt: p.createdAt.toISOString(),
    mine: p.requestedById === user.id,
  }))

  const history = atendidos.map((p) => ({
    id: p.id,
    text: p.text,
    status: p.status,
    requestedByName: p.requestedByName,
    resolvedByName: p.resolvedByName,
    resolvedAt: p.resolvedAt ? p.resolvedAt.toISOString() : null,
  }))

  const dateLabel = new Date(todayDate() + 'T12:00:00').toLocaleDateString('es-CR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 p-4 max-w-2xl mx-auto w-full">
        <div className="mb-5">
          <h1 className="text-xl font-bold">Pedidos</h1>
          <p className="text-sm text-gray-500 capitalize">{dateLabel}</p>
        </div>
        <PedidosPanel pendings={pendings} history={history} canManage={canManage} />
      </main>
    </div>
  )
}
