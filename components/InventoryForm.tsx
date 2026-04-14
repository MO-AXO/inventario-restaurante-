'use client'

import { useActionState, useState } from 'react'
import { Module } from '@prisma/client'
import Link from 'next/link'
import { calcStatus } from '@/lib/utils'

type Product = {
  id: string
  name: string
  category: string
  unit: string
  minStock: number
  module: Module
}

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

type ActionState = { success?: boolean; error?: string } | undefined
type Props = {
  product: Product
  today: string
  formType: 'carnes_servicio' | 'weight' | 'smoked' | 'beverage_service' | 'salsas_restaurante' | 'simple'
  existing: ExistingRecord | null
  action: (state: ActionState, formData: FormData) => Promise<ActionState>
  dayClosed?: boolean
}

// Extract the relevant stock number from the record based on form type
function effectiveStock(
  formType: Props['formType'],
  existing: ExistingRecord | null
): number | null {
  if (!existing) return null
  switch (formType) {
    case 'carnes_servicio':
    case 'weight':
      return existing.finalWeight
    case 'smoked':
      return existing.weightLb
    case 'beverage_service':
      return existing.finalStock
    default: // simple, salsas_restaurante
      return existing.currentStock
  }
}

function statusClass(s: string | undefined) {
  if (s === 'CRITICO') return 'border-red-400 bg-red-50'
  if (s === 'BAJO') return 'border-yellow-400 bg-yellow-50'
  if (s === 'OK') return 'border-green-400 bg-green-50'
  return 'border-gray-200 bg-white'
}

function statusDot(s: string | undefined) {
  if (s === 'CRITICO') return <span className="w-3 h-3 rounded-full bg-red-500 inline-block" />
  if (s === 'BAJO') return <span className="w-3 h-3 rounded-full bg-yellow-400 inline-block" />
  if (s === 'OK') return <span className="w-3 h-3 rounded-full bg-green-500 inline-block" />
  return <span className="w-3 h-3 rounded-full bg-gray-300 inline-block" />
}

export default function InventoryForm({ product, today, formType, existing, action, dayClosed }: Props) {
  const [open, setOpen] = useState(!existing)
  const [state, formAction, pending] = useActionState(action, undefined)

  // Live calculation for beverage_service: finalStock = initialStock + restock
  const [initStock, setInitStock] = useState<number>(existing?.initialStock ?? 0)
  const [restockStock, setRestockStock] = useState<number>(existing?.restock ?? 0)
  const computedFinal = initStock + restockStock

  // Compute status live from stock + minStock so color always reflects new thresholds
  const stock = effectiveStock(formType, existing)
  const liveStatus = existing ? calcStatus(stock, product.minStock) : undefined

  const inputClass = 'w-full border border-gray-300 rounded-xl px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white'
  const labelClass = 'block text-xs font-semibold text-gray-600 mb-1'

  return (
    <div className={`rounded-2xl border-2 overflow-hidden transition ${statusClass(liveStatus)}`}>
      {/* Header - always visible */}
      <div className="w-full flex items-center justify-between px-4 py-3">
        <button
          type="button"
          className="flex-1 flex items-center gap-2 text-left"
          onClick={() => setOpen(!open)}
        >
          {statusDot(liveStatus)}
          <div>
            <span className="font-semibold">{product.name}</span>
            <span className="text-xs text-gray-500 ml-2">{product.category}</span>
          </div>
        </button>
        <div className="flex items-center gap-3">
          {existing && (
            <div className="text-right">
              <div className="text-sm text-gray-600 font-medium">
                {formType === 'smoked'
                  ? `${existing.units ?? '—'} u / ${existing.weightLb ?? '—'} LB`
                  : formType === 'beverage_service'
                  ? `Final: ${existing.finalStock ?? '—'} ${product.unit}${existing.initialStock !== null ? ` (${existing.initialStock ?? 0}+${existing.restock ?? 0})` : ''}`
                  : formType === 'carnes_servicio'
                  ? `Final: ${existing.finalWeight ?? '—'} ${product.unit}`
                  : formType === 'salsas_restaurante'
                  ? `${existing.currentStock ?? '—'} ${product.unit}${existing.restock ? ` (+${existing.restock} recarga)` : ''}`
                  : `${existing.currentStock ?? '—'} ${product.unit}`}
              </div>
              <div className="text-xs text-gray-400">
                {new Date(existing.updatedAt).toLocaleString('es-CR', {
                  month: 'short', day: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                })}
              </div>
            </div>
          )}
          {dayClosed && (
            <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full shrink-0">
              Cerrado
            </span>
          )}
          <Link
            href={`/historial/${product.id}`}
            className="text-xs text-orange-500 underline shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            Historial
          </Link>
          <button type="button" onClick={() => setOpen(!open)} className="text-gray-400 text-lg">
            {open ? '▲' : '▼'}
          </button>
        </div>
      </div>

      {/* Form - collapsible */}
      {open && (
        dayClosed ? (
          <div className="px-4 pb-4 pt-3 border-t border-gray-200/60 text-center text-sm text-gray-500">
            Día cerrado. No se pueden realizar cambios.
          </div>
        ) : (
          <form
            action={formAction}
            className="px-4 pb-4 space-y-3 border-t border-gray-200/60"
          >
            <input type="hidden" name="productId" value={product.id} />
            <input type="hidden" name="date" value={today} />
            <input type="hidden" name="module" value={product.module} />

            {state?.error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{state.error}</p>
            )}
            {state?.success && (
              <p className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">✓ Guardado</p>
            )}

            <div className="pt-3">
              {formType === 'carnes_servicio' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Peso Inicial ({product.unit})</label>
                    <input type="number" name="initialWeight" step="0.01" min="0" inputMode="decimal"
                      defaultValue={existing?.initialWeight ?? ''} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Peso Final Medio Día ({product.unit})</label>
                    <input type="number" name="midWeight" step="0.01" min="0" inputMode="decimal"
                      defaultValue={existing?.waste1 ?? ''} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Peso Recarga ({product.unit})</label>
                    <input type="number" name="restock" step="0.01" min="0" inputMode="decimal"
                      defaultValue={existing?.restock ?? ''} placeholder="0" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Peso Final del Día ({product.unit})</label>
                    <input type="number" name="finalWeight" step="0.01" min="0" inputMode="decimal"
                      defaultValue={existing?.finalWeight ?? ''} className={inputClass} />
                  </div>
                  {existing && existing.initialWeight !== null && existing.finalWeight !== null && (
                    <div className="col-span-2 bg-gray-100 rounded-xl px-3 py-2">
                      <span className="text-xs text-gray-600">Consumo del día: </span>
                      <span className="font-bold">
                        {(
                          (existing.initialWeight ?? 0) +
                          (existing.restock ?? 0) -
                          (existing.finalWeight ?? 0)
                        ).toFixed(2)} {product.unit}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {formType === 'simple' && (
                <div>
                  <label className={labelClass}>Stock actual ({product.unit})</label>
                  <input
                    type="number"
                    name="currentStock"
                    step="0.01"
                    min="0"
                    inputMode="decimal"
                    defaultValue={existing?.currentStock ?? ''}
                    placeholder={`Mínimo: ${product.minStock}`}
                    className={inputClass}
                  />
                </div>
              )}

              {formType === 'weight' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Peso inicial ({product.unit})</label>
                    <input type="number" name="initialWeight" step="0.01" min="0" inputMode="decimal"
                      defaultValue={existing?.initialWeight ?? ''} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Merma 1 ({product.unit})</label>
                    <input type="number" name="waste1" step="0.01" min="0" inputMode="decimal"
                      defaultValue={existing?.waste1 ?? ''} placeholder="0" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Recarga ({product.unit})</label>
                    <input type="number" name="restock" step="0.01" min="0" inputMode="decimal"
                      defaultValue={existing?.restock ?? ''} placeholder="0" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Merma 2 ({product.unit})</label>
                    <input type="number" name="waste2" step="0.01" min="0" inputMode="decimal"
                      defaultValue={existing?.waste2 ?? ''} placeholder="0" className={inputClass} />
                  </div>
                  {existing?.finalWeight !== undefined && existing?.finalWeight !== null && (
                    <div className="col-span-2 bg-gray-100 rounded-xl px-3 py-2">
                      <span className="text-xs text-gray-600">Peso final calculado: </span>
                      <span className="font-bold">{existing.finalWeight.toFixed(2)} {product.unit}</span>
                    </div>
                  )}
                </div>
              )}

              {formType === 'smoked' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Unidades</label>
                    <input type="number" name="units" min="0" inputMode="numeric"
                      defaultValue={existing?.units ?? ''} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Peso (LB)</label>
                    <input type="number" name="weightLb" step="0.01" min="0" inputMode="decimal"
                      defaultValue={existing?.weightLb ?? ''} className={inputClass} />
                  </div>
                </div>
              )}

              {formType === 'beverage_service' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Inv. inicial ({product.unit})</label>
                    <input
                      type="number"
                      name="initialStock"
                      step="0.01"
                      min="0"
                      inputMode="decimal"
                      value={initStock || ''}
                      onChange={(e) => setInitStock(parseFloat(e.target.value) || 0)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Recarga ({product.unit})</label>
                    <input
                      type="number"
                      name="restock"
                      step="0.01"
                      min="0"
                      inputMode="decimal"
                      value={restockStock || ''}
                      onChange={(e) => setRestockStock(parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      className={inputClass}
                    />
                  </div>
                  <input type="hidden" name="finalStock" value={computedFinal} />
                  <div className="col-span-2 bg-gray-100 rounded-xl px-3 py-2">
                    <span className="text-xs text-gray-600">Inv. final (inicial + recarga): </span>
                    <span className="font-bold">{computedFinal.toFixed(1)} {product.unit}</span>
                  </div>
                </div>
              )}

              {formType === 'salsas_restaurante' && (
                <div className="space-y-3">
                  <div>
                    <label className={labelClass}>Stock actual ({product.unit})</label>
                    <input
                      type="number"
                      name="currentStock"
                      step="0.01"
                      min="0"
                      inputMode="decimal"
                      defaultValue={existing?.currentStock ?? ''}
                      placeholder={`Mínimo: ${product.minStock}`}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Recarga desde Bodega ({product.unit})</label>
                    <input
                      type="number"
                      name="restock"
                      step="0.01"
                      min="0"
                      inputMode="decimal"
                      defaultValue={existing?.restock ?? ''}
                      placeholder="0 — se descuenta de Bodega"
                      className={inputClass}
                    />
                  </div>
                  {existing?.restock !== null && existing?.restock !== undefined && existing.restock > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl px-3 py-2 text-xs text-blue-700">
                      Se descontaron <strong>{existing.restock} {product.unit}</strong> de Bodega
                    </div>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className={labelClass}>Notas (opcional)</label>
              <input
                type="text"
                name="notes"
                defaultValue={existing?.notes ?? ''}
                placeholder="Observaciones..."
                className={inputClass}
              />
            </div>

            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
              <span className="text-xs text-gray-500 shrink-0">Stock mínimo:</span>
              <input
                type="number"
                name="minStock"
                step="0.01"
                min="0"
                inputMode="decimal"
                defaultValue={product.minStock}
                className="flex-1 bg-transparent text-sm font-medium focus:outline-none text-right"
              />
              <span className="text-xs text-gray-400 shrink-0">{product.unit}</span>
            </div>

            <button
              type="submit"
              disabled={pending}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition"
            >
              {pending ? 'Guardando...' : existing ? 'Actualizar' : 'Guardar'}
            </button>
          </form>
        )
      )}
    </div>
  )
}
