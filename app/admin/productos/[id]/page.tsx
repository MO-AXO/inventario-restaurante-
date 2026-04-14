export const dynamic = 'force-dynamic'

import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import Navbar from '@/components/Navbar'
import { MODULE_LABELS } from '@/lib/utils'
import { Module } from '@prisma/client'
import { updateProduct } from '@/app/actions/admin'

type Props = { params: Promise<{ id: string }> }

export default async function EditProductPage({ params }: Props) {
  const session = await getSession()
  if (!session || session.role !== 'OWNER') redirect('/dashboard')

  const { id } = await params
  const product = await prisma.product.findUnique({ where: { id } })
  if (!product) notFound()

  const modules = Object.keys(MODULE_LABELS) as Module[]

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 p-4 max-w-lg mx-auto w-full">
        <div className="mb-5">
          <Link href="/admin" className="text-sm text-orange-500 font-medium">
            ← Administración
          </Link>
          <h1 className="text-xl font-bold mt-1">Editar producto</h1>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <form action={updateProduct} className="space-y-4">
            <input type="hidden" name="productId" value={product.id} />

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Nombre</label>
              <input
                name="name"
                defaultValue={product.name}
                required
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Categoría</label>
              <input
                name="category"
                defaultValue={product.category}
                required
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Unidad</label>
              <input
                name="unit"
                defaultValue={product.unit}
                required
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Módulo</label>
              <select
                name="module"
                defaultValue={product.module}
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5"
              >
                {modules.map((m) => (
                  <option key={m} value={m}>{MODULE_LABELS[m]}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Stock mínimo</label>
              <input
                name="minStock"
                type="number"
                step="0.01"
                min="0"
                defaultValue={product.minStock}
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl transition"
            >
              Guardar cambios
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}
