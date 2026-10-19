'use client'

import { useMemo, useState } from 'react'
import { useActionState } from 'react'
import { registerPurchase } from '@/app/actions/purchases'

type Product = {
  id: string
  name: string
  category: string
  moduleLabel: string
  moduleIcon: string
  unit: string
  sharedId: string | null
  currentStock: number | null
}

type RecentPurchase = {
  id: string
  productName: string
  quantity: number
  unit: string
  supplier: string | null
  unitCost: number | null
  createdAt: string
}

type ActionResult = { success?: boolean; error?: string } | undefined

type PanelProps = {
  products: Product[]
  recent: RecentPurchase[]
  action?: (state: ActionResult, formData: FormData) => Promise<ActionResult>
  title?: string
  description?: string
  icon?: string
  submitLabel?: string
  successMessage?: string
  recentTitle?: string
  showPurchaseFields?: boolean
}

export default function PurchasesPanel({
  products,
  recent,
  action = registerPurchase,
  title = 'Añadir al inventario',
  description = 'La cantidad se suma de inmediato al inventario de bodega.',
  icon = '🧾',
  submitLabel = 'Añadir al inventario',
  successMessage = 'Producto añadido y stock actualizado.',
  recentTitle = 'Últimas entradas',
  showPurchaseFields = true,
}: PanelProps) {
  const [query, setQuery] = useState('')
  const [selectedModule, setSelectedModule] = useState('Todas')
  const [state, formAction, pending] = useActionState(action, undefined)

  const modules = useMemo(() => {
    const seen = new Set<string>()
    return products.filter((product) => {
      if (seen.has(product.moduleLabel)) return false
      seen.add(product.moduleLabel)
      return true
    })
  }, [products])
  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    return products.filter((p) => {
      const matchesModule = selectedModule === 'Todas' || p.moduleLabel === selectedModule
      const matchesQuery = !q || p.name.toLowerCase().includes(q) || p.sharedId?.toLowerCase().includes(q)
      return matchesModule && matchesQuery
    })
  }, [products, query, selectedModule])
  const grouped = useMemo(() => {
    const groups: Record<string, Product[]> = {}
    for (const product of filtered) {
      if (!groups[product.moduleLabel]) groups[product.moduleLabel] = []
      groups[product.moduleLabel].push(product)
    }
    return groups
  }, [filtered])

  return (
    <section className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <h2 className="font-bold text-lg">{title}</h2>
            <p className="text-xs text-gray-500">{description}</p>
          </div>
          <span className="text-2xl">{icon}</span>
        </div>

        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">Elige un módulo</span>
            <span className="text-xs text-gray-400">Toca una tarjeta para entrar</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => setSelectedModule('Todas')}
              className={`min-h-20 rounded-xl border px-2 py-2 flex flex-col items-center justify-center text-center transition ${selectedModule === 'Todas' ? 'border-orange-500 bg-orange-50 ring-2 ring-orange-200' : 'border-gray-200 bg-gray-50 hover:border-orange-300'}`}
            >
              <span className="text-2xl leading-none">📦</span>
              <span className="text-xs font-semibold mt-1">Todos</span>
              <span className="text-[10px] text-gray-400">{products.length} productos</span>
            </button>
            {modules.map((module) => {
              const count = products.filter((product) => product.moduleLabel === module.moduleLabel).length
              return (
                <button
                  key={module.moduleLabel}
                  type="button"
                  onClick={() => { setSelectedModule(module.moduleLabel); setQuery('') }}
                  className={`min-h-20 rounded-xl border px-2 py-2 flex flex-col items-center justify-center text-center transition ${selectedModule === module.moduleLabel ? 'border-orange-500 bg-orange-50 ring-2 ring-orange-200' : 'border-gray-200 bg-gray-50 hover:border-orange-300'}`}
                >
                  <span className="text-2xl leading-none">{module.moduleIcon}</span>
                  <span className="text-xs font-semibold mt-1 leading-tight">{module.moduleLabel}</span>
                  <span className="text-[10px] text-gray-400">{count} productos</span>
                </button>
              )
            })}
          </div>
        </div>

        <label className="block mb-4">
          <span className="block text-xs font-semibold text-gray-600 mb-1">Buscar en {selectedModule === 'Todas' ? 'todos los módulos' : selectedModule}</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Escribe el nombre o ID del producto..."
            className="w-full border border-gray-300 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
          />
        </label>

        {state?.error && <p className="mb-3 rounded-xl bg-red-50 text-red-700 px-3 py-2 text-sm">{state.error}</p>}
        {state?.success && <p className="mb-3 rounded-xl bg-green-50 text-green-700 px-3 py-2 text-sm">{successMessage}</p>}

        <div className="space-y-4 max-h-[34rem] overflow-y-auto pr-1">
          {Object.entries(grouped).map(([moduleLabel, moduleProducts]) => (
            <div key={moduleLabel}>
              <div className="flex items-center gap-2 mb-2 px-1">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">{moduleLabel}</span>
                <span className="text-[11px] text-gray-400">({moduleProducts.length})</span>
              </div>
              <div className="space-y-2">
                {moduleProducts.map((product) => (
            <form key={product.id} action={formAction} className="border border-gray-200 rounded-2xl p-4 bg-white shadow-sm">
              <input type="hidden" name="productId" value={product.id} />
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0">
                  <div className="font-bold text-sm truncate">{product.name}</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {product.sharedId && <span className="text-gray-400">ID: {product.sharedId} · </span>}
                    Stock actual: <strong>{product.currentStock ?? 0} {product.unit}</strong>
                  </div>
                </div>
                <span className="shrink-0 rounded-full bg-orange-50 text-orange-700 px-2.5 py-1 text-xs font-semibold">{product.unit}</span>
              </div>
              <div className={`grid grid-cols-1 sm:grid-cols-2 ${showPurchaseFields ? 'lg:grid-cols-4' : 'lg:grid-cols-2'} gap-3 items-end`}>
                <label className="block">
                  <span className="block text-xs font-semibold text-gray-600 mb-1">Cantidad a añadir *</span>
                  <div className="flex items-center">
                    <input name="quantity" type="number" min="0.01" step="0.01" required inputMode="decimal" placeholder="Ej. 10" className="w-full border border-gray-300 rounded-l-xl px-3 py-3 text-base font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-orange-400" />
                    <span className="border border-l-0 border-gray-300 rounded-r-xl px-3 py-3 text-sm text-gray-500 bg-gray-50">{product.unit}</span>
                  </div>
                </label>
                {showPurchaseFields && (
                  <>
                    <label className="block">
                      <span className="block text-xs font-semibold text-gray-600 mb-1">Costo unitario <span className="font-normal text-gray-400">(opcional)</span></span>
                      <input name="unitCost" type="number" min="0" step="0.01" inputMode="decimal" placeholder="Ej. 2500" className="w-full border border-gray-300 rounded-xl px-3 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400" />
                    </label>
                    <label className="block">
                      <span className="block text-xs font-semibold text-gray-600 mb-1">Proveedor <span className="font-normal text-gray-400">(opcional)</span></span>
                      <input name="supplier" placeholder="Ej. PriceSmart" className="w-full border border-gray-300 rounded-xl px-3 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400" />
                    </label>
                  </>
                )}
                <button disabled={pending} type="submit" className="w-full rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold px-3 py-3 transition">
                  {pending ? 'Guardando...' : submitLabel}
                </button>
              </div>
            </form>
                ))}
              </div>
            </div>
          ))}
          {filtered.length === 0 && <p className="text-center text-sm text-gray-500 py-6">No se encontraron productos.</p>}
        </div>
      </div>

      {recent.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
          <h2 className="font-bold mb-3">{recentTitle}</h2>
          <div className="space-y-2">
            {recent.map((purchase) => (
              <div key={purchase.id} className="flex items-center justify-between gap-3 border-b border-gray-100 last:border-0 pb-2 last:pb-0 text-sm">
                <div>
                  <div className="font-medium">{purchase.productName}</div>
                  <div className="text-xs text-gray-400">
                    {new Date(purchase.createdAt).toLocaleDateString('es-CR')} · {purchase.supplier || 'Sin proveedor'}
                  </div>
                </div>
                <div className="text-right font-semibold">+{purchase.quantity} {purchase.unit}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
