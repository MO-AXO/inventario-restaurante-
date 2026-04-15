export const dynamic = 'force-dynamic'

import Navbar from '@/components/Navbar'
import Link from 'next/link'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { MODULE_LABELS } from '@/lib/utils'
import { Module } from '@prisma/client'
import { bulkUpdateMinStock } from '@/app/actions/admin'

export default async function MinimosPage() {
  const session = await getSession()
  if (!session || session.role !== 'OWNER') redirect('/dashboard')

  const products = await prisma.product.findMany({
    where: { active: true },
    orderBy: [{ module: 'asc' }, { category: 'asc' }, { name: 'asc' }],
    select: { id: true, name: true, category: true, module: true, unit: true, minStock: true },
  })

  // Group by module
  const byModule: Record<string, typeof products> = {}
  for (const p of products) {
    if (!byModule[p.module]) byModule[p.module] = []
    byModule[p.module].push(p)
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 p-4 max-w-3xl mx-auto w-full">
        <div className="mb-5 flex items-center gap-3">
          <Link href="/admin" className="text-sm text-orange-500 font-medium">← Administración</Link>
          <h1 className="text-xl font-bold">Stocks mínimos</h1>
        </div>

        <form action={bulkUpdateMinStock}>
          <div className="space-y-6">
            {Object.entries(byModule).map(([mod, prods]) => (
              <div key={mod} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="bg-gray-50 border-b border-gray-200 px-4 py-2.5">
                  <span className="text-sm font-bold text-gray-700">{MODULE_LABELS[mod as Module]}</span>
                  <span className="text-xs text-gray-400 ml-2">({prods.length} productos)</span>
                </div>
                <table className="w-full text-sm">
                  <tbody>
                    {prods.map((p, i) => (
                      <tr key={p.id} className={i < prods.length - 1 ? 'border-b border-gray-100' : ''}>
                        <td className="px-4 py-2.5">
                          <div className="font-medium">{p.name}</div>
                          <div className="text-xs text-gray-400">{p.category}</div>
                        </td>
                        <td className="px-4 py-2.5 text-right w-40">
                          <div className="flex items-center gap-1 justify-end">
                            <input
                              type="number"
                              name={`min_${p.id}`}
                              defaultValue={p.minStock}
                              step="0.01"
                              min="0"
                              className="w-20 border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-orange-400"
                            />
                            <span className="text-xs text-gray-400 shrink-0">{p.unit}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>

          <div className="sticky bottom-4 mt-6">
            <button
              type="submit"
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3.5 rounded-2xl shadow-lg transition"
            >
              Guardar todos los mínimos
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}
