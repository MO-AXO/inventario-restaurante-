'use client'

import { useActionState, useState } from 'react'
import { Module } from '@prisma/client'
import Link from 'next/link'
import { CARNES_SERVICIO_MODULES, MIDDAY_COUNT_MODULES, calcStatus, availableStock } from '@/lib/utils'

type Product = {
  id: string
  name: string
  sharedId: string | null
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
  restockMorning: number | null
  returnedQty?: number | null
  wasteQty?: number | null
  waste2: number | null
  finalWeight: number | null
  units: number | null
  weightLb: number | null
  initialStock: number | null
  midStock: number | null
  finalStock: number | null
  consumption: number | null
  status: string
  notes: string | null
  date: Date
  updatedAt: Date
}

type ActionState = { success?: boolean; error?: string } | undefined
type Props = {
  product: Product
  today: string
  formType: 'carnes_servicio' | 'weight' | 'smoked' | 'beverage_service' | 'bodega_stock' | 'standard_restaurant' | 'simple'
  existing: ExistingRecord | null
  isExistingToday: boolean
  carriedFrom?: { date: string; estimated: boolean } | null
  action: (state: ActionState, formData: FormData) => Promise<ActionState>
  dayClosed?: boolean
}

// Extract the relevant stock number from the record based on form type
function effectiveStock(
  formType: Props['formType'],
  existing: ExistingRecord | null,
  module: Module
): number | null {
  if (!existing) return null
  switch (formType) {
    case 'carnes_servicio':
    case 'beverage_service':
    case 'standard_restaurant':
      return availableStock(module, existing)
    case 'weight':
      return existing.finalWeight
    case 'smoked':
      return existing.weightLb
    case 'bodega_stock':
      return existing.finalStock
    default: // simple
      return existing.currentStock
  }
}


function formatCarryDate(date: string) {
  return new Date(date + 'T12:00:00').toLocaleDateString('es-CR', { weekday: 'long', day: 'numeric', month: 'short' })
}

// Lo que la pantalla de traslado ya llevó hoy. Solo lectura: se registra en Recarga Restaurante.
function TransferNote({ morning, noon, unit }: { morning: number; noon: number; unit: string }) {
  if (morning + noon <= 0) return null
  return (
    <div className="col-span-2 bg-blue-50 border border-blue-200 rounded-xl px-3 py-2 text-xs text-blue-700">
      Trasladado de Bodega hoy:
      {morning > 0 && <> mañana <strong>{morning} {unit}</strong></>}
      {morning > 0 && noon > 0 && ' ·'}
      {noon > 0 && <> mediodía <strong>{noon} {unit}</strong></>}
    </div>
  )
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

function stockBadgeClass(s: string | undefined) {
  if (s === 'CRITICO') return 'bg-red-100 text-red-700 border-red-200'
  if (s === 'BAJO') return 'bg-yellow-100 text-yellow-700 border-yellow-200'
  if (s === 'OK') return 'bg-green-100 text-green-700 border-green-200'
  return 'bg-gray-100 text-gray-500 border-gray-200'
}

export default function InventoryForm({ product, today, formType, existing, isExistingToday, carriedFrom, action, dayClosed }: Props) {
  const [open, setOpen] = useState(!existing)
  const [state, formAction, pending] = useActionState(action, undefined)

  // Live calculation for bodega_stock: finalStock = initialStock + restock
  const [initStock, setInitStock] = useState<number>(existing?.initialStock ?? 0)
  const [restockStock, setRestockStock] = useState<number>(existing?.restock ?? 0)
  const computedFinal = initStock + restockStock

  // Un final en 0 con inicial positivo y sin mediodía es un final que nunca se capturó: se muestra vacío.
  const initialOnly = !!existing && (
    (formType === 'carnes_servicio' && (existing.initialWeight ?? 0) > 0 && !existing.waste1 && existing.finalWeight === 0) ||
    (formType === 'beverage_service' && (existing.initialStock ?? 0) > 0 && !existing.midStock && existing.finalStock === 0)
  )
  // Disponible real: último conteo + las recargas hechas después (las registra la pantalla de traslado).
  const stock = effectiveStock(formType, existing, product.module)
  const morningTransfer = existing?.restockMorning ?? 0
  const noonTransfer = existing?.restock ?? 0
  const liveStatus = existing ? calcStatus(stock, product.minStock) : undefined
  // Las observaciones solo se usan en Carnes para Servicio.
  const showNotes = CARNES_SERVICIO_MODULES.includes(product.module)
  // El conteo de mediodía solo existe en los módulos que se cuentan a esa hora.
  const midCount = MIDDAY_COUNT_MODULES.includes(product.module)

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
            {product.sharedId && (
              <span className="text-[10px] text-gray-400 ml-2">ID: {product.sharedId}</span>
            )}

          </div>
        </button>
        <div className="flex items-center gap-3">
          {existing && (
            <div className="text-right">
              <div className="text-sm text-gray-600 font-medium">
                {formType === 'smoked'
                  ? `${existing.units ?? '—'} u / ${existing.weightLb ?? '—'} LB`
                  : formType === 'beverage_service'
                  ? `Disponible: ${stock ?? '—'} ${product.unit}`
                  : formType === 'weight'
                  ? `${existing.units ?? '—'} u / ${existing.finalWeight ?? '—'} ${product.unit}`
                  : formType === 'bodega_stock'
                  ? `Total: ${existing.finalStock ?? '—'} ${product.unit}${existing.initialStock !== null ? ` (${existing.initialStock ?? 0}+${existing.restock ?? 0})` : ''}`
                  : formType === 'carnes_servicio'
                  ? `Disponible: ${stock ?? '—'} ${product.unit}`
                  : formType === 'standard_restaurant'
                  ? `Disponible: ${stock ?? '—'} ${product.unit}`
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
          <span className={`text-[11px] font-semibold px-2 py-1 rounded-full border whitespace-nowrap ${stockBadgeClass(liveStatus)}`}>
            {stock === null
              ? 'Sin registrar'
              : formType === 'carnes_servicio'
              ? `Disponible: ${stock ?? '—'} ${product.unit}`
              : formType === 'beverage_service' || formType === 'standard_restaurant'
              ? `Disponible: ${stock ?? '—'} ${product.unit}`
              : `${Number.isInteger(stock) ? stock : stock.toFixed(2)} ${product.unit}`}
          </span>
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
            {existing && !isExistingToday && !state?.success && (
              carriedFrom ? (
                <p className="text-xs text-blue-800 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                  {carriedFrom.estimated
                    ? `El ${formatCarryDate(carriedFrom.date)} no se escribió el inventario final; se usa el último stock guardado (${stock ?? 0} ${product.unit}) como inicial de hoy.`
                    : `Inicial de hoy tomado del inventario final del ${formatCarryDate(carriedFrom.date)}: ${stock ?? 0} ${product.unit}.`}
                  {' '}Corrígelo si no coincide y guarda.
                </p>
              ) : (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  Mostrando último registro guardado. Al guardar se creará el registro de hoy.
                </p>
              )
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
                    <label className={labelClass}>Peso Final Mediodía ({product.unit})</label>
                    <input type="number" name="midWeight" step="0.01" min="0" inputMode="decimal"
                      defaultValue={initialOnly ? '' : existing?.waste1 ?? ''} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Peso Final del Día ({product.unit})</label>
                    <input type="number" name="finalWeight" step="0.01" min="0" inputMode="decimal"
                      defaultValue={initialOnly ? '' : existing?.finalWeight ?? ''} className={inputClass} />
                  </div>
                  <TransferNote morning={morningTransfer} noon={noonTransfer} unit={product.unit} />
                  {((existing?.returnedQty ?? 0) > 0 || (existing?.wasteQty ?? 0) > 0) && (
                    <div className="col-span-2 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2 text-xs text-rose-800">
                      Cierre de hoy:
                      {(existing?.returnedQty ?? 0) > 0 && <> devuelto a Bodega <strong>{existing?.returnedQty} {product.unit}</strong></>}
                      {(existing?.returnedQty ?? 0) > 0 && (existing?.wasteQty ?? 0) > 0 && ' ·'}
                      {(existing?.wasteQty ?? 0) > 0 && <> merma <strong>{existing?.wasteQty} {product.unit}</strong></>}
                      . Se registra en Recarga Restaurante → Cierre.
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

              {formType === 'standard_restaurant' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Inv. inicial ({product.unit})</label>
                    <input type="number" name="initialStock" step="0.01" min="0" inputMode="decimal"
                      defaultValue={existing?.initialStock ?? ''} placeholder={`Mínimo: ${product.minStock}`} className={inputClass} />
                  </div>
                  {midCount && (
                    <div>
                      <label className={labelClass}>Final mediodía ({product.unit})</label>
                      <input type="number" name="midStock" step="0.01" min="0" inputMode="decimal"
                        defaultValue={existing?.midStock ?? ''} placeholder="Cantidad restante" className={inputClass} />
                    </div>
                  )}
                  <div>
                    <label className={labelClass}>Inv. final ({product.unit})</label>
                    <input type="number" name="finalStock" step="0.01" min="0" inputMode="decimal"
                      defaultValue={existing?.finalStock ?? ''} placeholder="Al cerrar" className={inputClass} />
                  </div>
                  <TransferNote morning={morningTransfer} noon={noonTransfer} unit={product.unit} />
                </div>
              )}

              {formType === 'weight' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Unidades</label>
                    <input type="number" name="units" min="0" inputMode="numeric"
                      defaultValue={existing?.units ?? ''} className={inputClass} />
                  </div>
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
                  {existing?.finalWeight !== undefined && existing?.finalWeight !== null && (
                    <div className="bg-gray-100 rounded-xl px-3 py-2 flex flex-col justify-center">
                      <span className="text-xs text-gray-600">Peso final calculado</span>
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
                    <input type="number" name="initialStock" step="0.01" min="0" inputMode="decimal"
                      defaultValue={existing?.initialStock ?? ''} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Final mediodía ({product.unit})</label>
                    <input type="number" name="midStock" step="0.01" min="0" inputMode="decimal"
                      defaultValue={existing?.midStock ?? ''} placeholder="Cantidad restante" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Inv. final ({product.unit})</label>
                    <input type="number" name="finalStock" step="0.01" min="0" inputMode="decimal"
                      defaultValue={initialOnly ? '' : existing?.finalStock ?? ''} className={inputClass} />
                  </div>
                  <TransferNote morning={morningTransfer} noon={noonTransfer} unit={product.unit} />
                </div>
              )}

              {formType === 'bodega_stock' && (
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
                    <span className="text-xs text-gray-600">Total disponible (inicial + recarga): </span>
                    <span className="font-bold">{computedFinal.toFixed(1)} {product.unit}</span>
                  </div>
                </div>
              )}


            </div>

            {showNotes && (
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
            )}

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
              {pending ? 'Guardando...' : state?.success ? '✓ Guardado' : isExistingToday ? 'Actualizar' : 'Guardar'}
            </button>
          </form>
        )
      )}
    </div>
  )
}
