export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/db'
import Navbar from '@/components/Navbar'
import {
  MODULE_LABELS,
  statusColor,
  statusBadge,
  CARNES_SERVICIO_MODULES,
  WEIGHT_MODULES,
  SMOKED_MODULES,
  BEVERAGE_SERVICE_MODULES,
} from '@/lib/utils'
import { Module, StockStatus } from '@prisma/client'

type Props = { params: Promise<{ productId: string }> }

export default async function HistorialPage({ params }: Props) {
  const { productId } = await params

  const product = await prisma.product.findUnique({ where: { id: productId } })
  if (!product) notFound()

  const records = await prisma.dailyRecord.findMany({
    where: { productId },
    orderBy: { date: 'desc' },
    take: 30,
  })

  const mod = product.module as Module
  const isCarnesServicio = CARNES_SERVICIO_MODULES.includes(mod)
  const isWeight = WEIGHT_MODULES.includes(mod)
  const isSmoked = SMOKED_MODULES.includes(mod)
  const isBeverage = BEVERAGE_SERVICE_MODULES.includes(mod)

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 p-4 max-w-2xl mx-auto w-full">
        <div className="mb-5">
          <Link
            href={`/inventario/${mod.toLowerCase()}`}
            className="text-sm text-orange-500 font-medium"
          >
            ← {MODULE_LABELS[mod]}
          </Link>
          <h1 className="text-xl font-bold mt-1">{product.name}</h1>
          <p className="text-sm text-gray-500">Últimos 30 días · {product.unit}</p>
        </div>

        {records.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center text-gray-500">
            No hay registros todavía.
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">Fecha</th>
                  {isCarnesServicio && (
                    <>
                      <th className="text-right px-3 py-3 font-semibold">Inicial</th>
                      <th className="text-right px-3 py-3 font-semibold">F. Medio Día</th>
                      <th className="text-right px-3 py-3 font-semibold">Recarga</th>
                      <th className="text-right px-3 py-3 font-semibold">Final Día</th>
                      <th className="text-right px-3 py-3 font-semibold">Consumo</th>
                    </>
                  )}
                  {isWeight && (
                    <>
                      <th className="text-right px-3 py-3 font-semibold">Inicial</th>
                      <th className="text-right px-3 py-3 font-semibold">Recarga</th>
                      <th className="text-right px-3 py-3 font-semibold">Merma</th>
                      <th className="text-right px-3 py-3 font-semibold">Final</th>
                    </>
                  )}
                  {isSmoked && (
                    <>
                      <th className="text-right px-3 py-3 font-semibold">Unidades</th>
                      <th className="text-right px-3 py-3 font-semibold">LB</th>
                    </>
                  )}
                  {isBeverage && (
                    <>
                      <th className="text-right px-3 py-3 font-semibold">Inicial</th>
                      <th className="text-right px-3 py-3 font-semibold">Recarga</th>
                      <th className="text-right px-3 py-3 font-semibold">Final</th>
                      <th className="text-right px-3 py-3 font-semibold">Consumo</th>
                    </>
                  )}
                  {!isCarnesServicio && !isWeight && !isSmoked && !isBeverage && (
                    <th className="text-right px-3 py-3 font-semibold">Stock</th>
                  )}
                  <th className="text-center px-3 py-3 font-semibold">Estado</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.id} className="border-b border-gray-100 last:border-0">
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                      {new Date(r.date).toLocaleDateString('es-CR', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                      })}
                    </td>
                    {isCarnesServicio && (
                      <>
                        <td className="px-3 py-3 text-right">{r.initialWeight?.toFixed(1) ?? '—'}</td>
                        <td className="px-3 py-3 text-right">{r.waste1?.toFixed(1) ?? '—'}</td>
                        <td className="px-3 py-3 text-right">{r.restock ? r.restock.toFixed(1) : '—'}</td>
                        <td className="px-3 py-3 text-right font-semibold">{r.finalWeight?.toFixed(1) ?? '—'}</td>
                        <td className="px-3 py-3 text-right font-semibold text-orange-600">
                          {r.initialWeight !== null && r.finalWeight !== null
                            ? ((r.initialWeight ?? 0) + (r.restock ?? 0) - (r.finalWeight ?? 0)).toFixed(1)
                            : '—'}
                        </td>
                      </>
                    )}
                    {isWeight && (
                      <>
                        <td className="px-3 py-3 text-right">{r.initialWeight?.toFixed(1) ?? '—'}</td>
                        <td className="px-3 py-3 text-right">{r.restock ? r.restock.toFixed(1) : '—'}</td>
                        <td className="px-3 py-3 text-right">
                          {((r.waste1 ?? 0) + (r.waste2 ?? 0)).toFixed(1)}
                        </td>
                        <td className="px-3 py-3 text-right font-semibold">
                          {r.finalWeight?.toFixed(1) ?? '—'}
                        </td>
                      </>
                    )}
                    {isSmoked && (
                      <>
                        <td className="px-3 py-3 text-right">{r.units ?? '—'}</td>
                        <td className="px-3 py-3 text-right font-semibold">
                          {r.weightLb?.toFixed(1) ?? '—'}
                        </td>
                      </>
                    )}
                    {isBeverage && (
                      <>
                        <td className="px-3 py-3 text-right">{r.initialStock?.toFixed(1) ?? '—'}</td>
                        <td className="px-3 py-3 text-right">{r.restock ? r.restock.toFixed(1) : '—'}</td>
                        <td className="px-3 py-3 text-right font-semibold">
                          {r.finalStock?.toFixed(1) ?? '—'}
                        </td>
                        <td className="px-3 py-3 text-right">{r.consumption?.toFixed(1) ?? '—'}</td>
                      </>
                    )}
                    {!isCarnesServicio && !isWeight && !isSmoked && !isBeverage && (
                      <td className="px-3 py-3 text-right font-semibold">
                        {r.currentStock?.toFixed(1) ?? '—'}
                      </td>
                    )}
                    <td className="px-3 py-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${statusColor(r.status as StockStatus)}`}
                      >
                        {statusBadge(r.status as StockStatus)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  )
}
