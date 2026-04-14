'use client'

import { useState, useMemo } from 'react'
import InventoryForm from '@/components/InventoryForm'
import { Module } from '@prisma/client'
import { saveInventoryRecord } from '@/app/actions/inventory'

type ExistingRecord = {
  currentStock: number | null
  initialWeight: number | null
  waste1: number | null
  restock: number | null
  waste2: number | null
  finalWeight: number | null
  units: number | null
  weightLb: number | null
  initialStock: number | null
  finalStock: number | null
  consumption: number | null
  status: string
  notes: string | null
  updatedAt: Date
}

type Product = {
  id: string
  name: string
  category: string
  unit: string
  minStock: number
  module: Module
  existing: ExistingRecord | null
}

type FormType = 'carnes_servicio' | 'weight' | 'smoked' | 'beverage_service' | 'salsas_restaurante' | 'simple'

type Props = {
  products: Product[]
  today: string
  formType: FormType
  dayClosed: boolean
  isClosed: boolean
}

export default function ModuleProductList({ products, today, formType, dayClosed, isClosed }: Props) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    if (!q) return products
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
    )
  }, [products, query])

  // Group by category
  const categories = useMemo(() => {
    const map: Record<string, Product[]> = {}
    for (const p of filtered) {
      if (!map[p.category]) map[p.category] = []
      map[p.category].push(p)
    }
    return map
  }, [filtered])

  const multipleCategories = Object.keys(categories).length > 1

  return (
    <div className="space-y-3">
      {isClosed && (
        <div className="bg-gray-100 border border-gray-300 rounded-2xl px-4 py-3 text-sm text-gray-600 text-center font-medium">
          Día cerrado — solo lectura
        </div>
      )}

      {/* Search bar */}
      {products.length > 4 && (
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar producto o categoría..."
            className="w-full border border-gray-300 rounded-2xl pl-9 pr-9 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white shadow-sm"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-lg leading-none"
            >
              ×
            </button>
          )}
        </div>
      )}

      {/* No results */}
      {filtered.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center text-gray-500">
          <div className="text-2xl mb-2">🔍</div>
          <p>No se encontró <strong>"{query}"</strong></p>
        </div>
      )}

      {/* Products grouped by category */}
      {Object.entries(categories).map(([cat, catProducts]) => (
        <div key={cat}>
          {multipleCategories && (
            <div className="px-1 pb-1 pt-2">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">{cat}</span>
              <span className="text-xs text-gray-300 ml-2">({catProducts.length})</span>
            </div>
          )}
          <div className="space-y-3">
            {catProducts.map((product) => (
              <InventoryForm
                key={product.id}
                product={{
                  id: product.id,
                  name: product.name,
                  category: product.category,
                  unit: product.unit,
                  minStock: product.minStock,
                  module: product.module,
                }}
                today={today}
                formType={formType}
                existing={product.existing}
                action={saveInventoryRecord}
                dayClosed={dayClosed}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
