export const dynamic = 'force-dynamic'

import Navbar from '@/components/Navbar'
import Link from 'next/link'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { MODULE_LABELS } from '@/lib/utils'
import { Module } from '@prisma/client'
import { createUser, createProduct, toggleProductActive, toggleUserActive } from '@/app/actions/admin'

async function getData() {
  const [products, users] = await Promise.all([
    prisma.product.findMany({ orderBy: [{ module: 'asc' }, { category: 'asc' }, { name: 'asc' }] }),
    prisma.user.findMany({ orderBy: { name: 'asc' } }),
  ])
  return { products, users }
}

export default async function AdminPage() {
  const session = await getSession()
  if (!session || session.role !== 'OWNER') redirect('/dashboard')

  const { products, users } = await getData()
  const modules = Object.keys(MODULE_LABELS) as Module[]

  const activeProducts = products.filter((p) => p.active)
  const inactiveProducts = products.filter((p) => !p.active)

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 p-4 max-w-3xl mx-auto w-full space-y-8">
        <h1 className="text-xl font-bold">Administración</h1>

        {/* Add User */}
        <section className="bg-white rounded-2xl border border-gray-200 p-5">
          <h2 className="font-bold text-lg mb-4">Agregar empleado</h2>
          <form action={createUser} className="grid grid-cols-2 gap-3">
            <input name="name" placeholder="Nombre" required
              className="border border-gray-300 rounded-xl px-3 py-2.5 col-span-2" />
            <input name="pin" type="password" inputMode="numeric" placeholder="PIN (solo números)"
              className="border border-gray-300 rounded-xl px-3 py-2.5" required />
            <select name="role" className="border border-gray-300 rounded-xl px-3 py-2.5">
              <option value="EMPLOYEE">Empleado</option>
              <option value="OWNER">Dueño</option>
            </select>
            <button type="submit" className="col-span-2 bg-orange-500 text-white font-bold py-2.5 rounded-xl">
              Agregar
            </button>
          </form>

          {users.length > 0 && (
            <div className="mt-4 space-y-2">
              {users.map((u) => (
                <div key={u.id} className="flex justify-between items-center text-sm border border-gray-100 rounded-xl px-3 py-2">
                  <span className={`font-medium ${!u.active ? 'text-gray-400 line-through' : ''}`}>{u.name}</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${u.role === 'OWNER' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                      {u.role === 'OWNER' ? 'Dueño' : 'Empleado'}
                    </span>
                    <form action={toggleUserActive}>
                      <input type="hidden" name="userId" value={u.id} />
                      <button type="submit" className={`text-xs px-2 py-0.5 rounded-full font-medium ${u.active ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}>
                        {u.active ? 'Desactivar' : 'Reactivar'}
                      </button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Add Product */}
        <section className="bg-white rounded-2xl border border-gray-200 p-5">
          <h2 className="font-bold text-lg mb-4">Agregar producto</h2>
          <form action={createProduct} className="grid grid-cols-2 gap-3">
            <input name="name" placeholder="Nombre del producto" required
              className="border border-gray-300 rounded-xl px-3 py-2.5 col-span-2" />
            <input name="category" placeholder="Categoría (ej: Carnes, Verduras)" required
              className="border border-gray-300 rounded-xl px-3 py-2.5" />
            <input name="unit" placeholder="Unidad (LB, unidad, bolsa, bote...)" required
              className="border border-gray-300 rounded-xl px-3 py-2.5" />
            <select name="module" className="border border-gray-300 rounded-xl px-3 py-2.5">
              {modules.map((m) => (
                <option key={m} value={m}>{MODULE_LABELS[m]}</option>
              ))}
            </select>
            <input name="minStock" type="number" step="0.01" placeholder="Stock mínimo" defaultValue="0"
              className="border border-gray-300 rounded-xl px-3 py-2.5" />
            <button type="submit" className="col-span-2 bg-orange-500 text-white font-bold py-2.5 rounded-xl">
              Agregar producto
            </button>
          </form>
        </section>

        {/* Active products */}
        <section className="bg-white rounded-2xl border border-gray-200 p-5">
          <h2 className="font-bold text-lg mb-4">Productos activos ({activeProducts.length})</h2>
          <div className="space-y-1 max-h-[500px] overflow-y-auto">
            {activeProducts.map((p) => (
              <div key={p.id} className="flex items-center gap-2 border border-gray-100 rounded-xl px-3 py-2">
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium">{p.name}</span>
                  <span className="text-xs text-gray-400 ml-2">{MODULE_LABELS[p.module as Module]}</span>
                  <span className="text-xs text-gray-300 ml-1">· {p.category}</span>
                </div>
                <span className="text-xs text-gray-400 shrink-0">{p.minStock} {p.unit}</span>
                <Link
                  href={`/admin/productos/${p.id}`}
                  className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded-lg shrink-0 font-medium"
                >
                  Editar
                </Link>
                <form action={toggleProductActive}>
                  <input type="hidden" name="productId" value={p.id} />
                  <button type="submit" className="text-xs bg-red-50 hover:bg-red-100 text-red-600 px-2 py-1 rounded-lg shrink-0 font-medium">
                    Desactivar
                  </button>
                </form>
              </div>
            ))}
          </div>
        </section>

        {/* Inactive products */}
        {inactiveProducts.length > 0 && (
          <section className="bg-white rounded-2xl border border-gray-200 p-5">
            <h2 className="font-bold text-lg mb-4 text-gray-400">Productos desactivados ({inactiveProducts.length})</h2>
            <div className="space-y-1 max-h-60 overflow-y-auto">
              {inactiveProducts.map((p) => (
                <div key={p.id} className="flex items-center gap-2 border border-gray-100 rounded-xl px-3 py-2 opacity-60">
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium line-through text-gray-400">{p.name}</span>
                    <span className="text-xs text-gray-300 ml-2">{MODULE_LABELS[p.module as Module]}</span>
                  </div>
                  <Link
                    href={`/admin/productos/${p.id}`}
                    className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded-lg shrink-0 font-medium"
                  >
                    Editar
                  </Link>
                  <form action={toggleProductActive}>
                    <input type="hidden" name="productId" value={p.id} />
                    <button type="submit" className="text-xs bg-green-50 hover:bg-green-100 text-green-600 px-2 py-1 rounded-lg shrink-0 font-medium">
                      Reactivar
                    </button>
                  </form>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
