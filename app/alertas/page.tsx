export const dynamic = 'force-dynamic'

import Navbar from '@/components/Navbar'
import { prisma } from '@/lib/db'
import { MODULE_LABELS } from '@/lib/utils'
import { markAlertRead, markAllAlertsRead } from '@/app/actions/inventory'
import { Module, StockStatus } from '@prisma/client'

async function getAlerts() {
  return prisma.alert.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
  })
}

function statusStyle(s: StockStatus) {
  if (s === 'CRITICO') return 'bg-red-100 border-red-300 text-red-800'
  return 'bg-yellow-100 border-yellow-300 text-yellow-800'
}

export default async function AlertasPage() {
  const alerts = await getAlerts()
  const unread = alerts.filter((a) => !a.read).length

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 p-4 max-w-2xl mx-auto w-full">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-xl font-bold">Alertas</h1>
            <p className="text-sm text-gray-500">{unread} sin leer</p>
          </div>
          {unread > 0 && (
            <form action={markAllAlertsRead}>
              <button
                type="submit"
                className="text-sm bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-xl font-medium transition"
              >
                Marcar todas como leídas
              </button>
            </form>
          )}
        </div>

        {alerts.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center text-gray-500">
            No hay alertas. ¡Todo bajo control! ✅
          </div>
        )}

        <div className="space-y-2">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`rounded-2xl border p-4 flex items-start justify-between gap-3 ${
                alert.read ? 'opacity-50' : ''
              } ${statusStyle(alert.status as StockStatus)}`}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold">{alert.productName}</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    alert.status === 'CRITICO' ? 'bg-red-500 text-white' : 'bg-yellow-400 text-black'
                  }`}>
                    {alert.status === 'CRITICO' ? 'CRÍTICO' : 'BAJO'}
                  </span>
                </div>
                <p className="text-sm">{alert.message}</p>
                <p className="text-xs mt-1 opacity-70">
                  {MODULE_LABELS[alert.module as Module]} · {new Date(alert.createdAt).toLocaleString('es-CR')}
                </p>
              </div>
              {!alert.read && (
                <form action={markAlertRead.bind(null, alert.id)}>
                  <button
                    type="submit"
                    className="text-xs underline shrink-0"
                  >
                    Leer
                  </button>
                </form>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
