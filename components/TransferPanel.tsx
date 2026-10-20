'use client'

import { useMemo, useState, useTransition } from 'react'
import { registerTransfer, type TransferResult, type TransferShift } from '@/app/actions/transfers'

type Product = {
  id: string
  name: string
  sharedId: string | null
  moduleLabel: string
  moduleIcon: string
  needsMidCount: boolean
  unit: string
  available: number | null
  warehouseAvailable: number | null
  linked: boolean
  midCountToday: number | null
}

type BatchSummary = {
  batchId: string
  shift: string
  createdAt: string
  items: { name: string; unit: string; quantity: number }[]
}

const SHIFTS: { id: TransferShift; label: string; icon: string; help: string }[] = [
  { id: 'MANANA', label: 'Mañana', icon: '🌅', help: 'Lo que llevas de Bodega al abrir.' },
  { id: 'MEDIODIA', label: 'Mediodía', icon: '☀️', help: 'Cuenta lo que quedó y luego lo que llevas para la noche.' },
]

function fmt(value: number | null) {
  if (value === null) return '—'
  return Number.isInteger(value) ? String(value) : value.toFixed(2)
}

export default function TransferPanel({ products, batches }: { products: Product[]; batches: BatchSummary[] }) {
  const [shift, setShift] = useState<TransferShift>('MANANA')
  const [selectedModule, setSelectedModule] = useState('Todos')
  const [query, setQuery] = useState('')
  const [quantities, setQuantities] = useState<Record<string, string>>({})
  const [midCounts, setMidCounts] = useState<Record<string, string>>({})
  const [result, setResult] = useState<TransferResult | null>(null)
  const [pending, startTransition] = useTransition()

  const modules = useMemo(() => {
    const seen = new Map<string, { label: string; icon: string; count: number }>()
    for (const p of products) {
      const current = seen.get(p.moduleLabel)
      seen.set(p.moduleLabel, { label: p.moduleLabel, icon: p.moduleIcon, count: (current?.count ?? 0) + 1 })
    }
    return Array.from(seen.values())
  }, [products])

  const visible = useMemo(() => {
    const q = query.toLowerCase().trim()
    return products.filter((p) => {
      const inModule = selectedModule === 'Todos' || p.moduleLabel === selectedModule
      const matches = !q || p.name.toLowerCase().includes(q) || p.sharedId?.toLowerCase().includes(q)
      return inModule && matches
    })
  }, [products, query, selectedModule])

  function needsCount(p: Product) {
    return shift === 'MEDIODIA' && p.needsMidCount
  }

  // Un producto cuenta como "con datos" si lleva cantidad o, en mediodía, si ya se contó lo que quedó.
  function hasData(p: Product) {
    const counted = needsCount(p) && (midCounts[p.id] ?? '').trim() !== '' && Number(midCounts[p.id]) >= 0
    return Number(quantities[p.id]) > 0 || counted
  }

  const filledCount = products.filter(hasData).length
  const pendingByModule = (label: string) =>
    products.filter((p) => p.moduleLabel === label && hasData(p)).length

  function missingCounts() {
    return products.filter((p) => {
      if (!needsCount(p) || !(Number(quantities[p.id]) > 0)) return false
      const raw = midCounts[p.id]
      return raw === undefined || raw.trim() === '' || Number(raw) < 0
    })
  }

  const missing = missingCounts()

  function submit() {
    const lines = products
      .filter(hasData)
      .map((p) => ({
        productId: p.id,
        quantity: Number(quantities[p.id]) > 0 ? Number(quantities[p.id]) : 0,
        midCount: needsCount(p) && midCounts[p.id]?.trim() ? Number(midCounts[p.id]) : null,
      }))
    startTransition(async () => {
      const response = await registerTransfer(shift, lines)
      setResult(response)
      if (response.ok) {
        setQuantities({})
        setMidCounts({})
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
    })
  }

  const inputBase = 'w-full border border-gray-300 rounded-xl px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white'

  return (
    <section className="space-y-4 pb-28">
      <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <h2 className="font-bold text-lg">Traslado de Bodega al Restaurante</h2>
            <p className="text-xs text-gray-500">Se suma al restaurante y se descuenta de Bodega al confirmar.</p>
          </div>
          <span className="text-2xl">🔄</span>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-2">
          {SHIFTS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => { setShift(s.id); setResult(null) }}
              className={`rounded-xl border px-3 py-3 text-left transition ${shift === s.id ? 'border-orange-500 bg-orange-50 ring-2 ring-orange-200' : 'border-gray-200 bg-gray-50 hover:border-orange-300'}`}
            >
              <div className="font-bold">{s.icon} {s.label}</div>
              <div className="text-[11px] text-gray-500 leading-tight mt-0.5">{s.help}</div>
            </button>
          ))}
        </div>
        {shift === 'MEDIODIA' && (
          <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
            En los módulos marcados con <strong>“Cuenta lo que quedó”</strong>, primero cuenta cuánto quedó y después escribe cuánto llevas.
          </p>
        )}
      </div>

      {result?.ok && (
        <div className="rounded-2xl border border-green-200 bg-green-50 p-4 space-y-2">
          <p className="font-bold text-green-800">✓ Traslado de {result.shift === 'MANANA' ? 'mañana' : 'mediodía'} registrado</p>
          <ul className="text-sm text-green-900 space-y-0.5">
            {result.moved.map((m) => (
              <li key={m.name}>
                <strong>{m.name}</strong>: +{fmt(m.quantity)} {m.unit}
                <span className="text-green-700"> · Bodega quedó en {fmt(m.warehouseLeft)}</span>
              </li>
            ))}
          </ul>
          {result.counted.length > 0 && (
            <div className="text-sm text-green-900">
              <p className="font-semibold">Peso/conteo final de mediodía guardado:</p>
              <ul className="space-y-0.5">
                {result.counted.map((c) => (
                  <li key={c.name}><strong>{c.name}</strong>: {fmt(c.count)} {c.unit}</li>
                ))}
              </ul>
            </div>
          )}
          {result.warnings.length > 0 && (
            <ul className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 space-y-0.5">
              {result.warnings.map((w) => <li key={w}>⚠ {w}</li>)}
            </ul>
          )}
        </div>
      )}
      {result && !result.ok && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 font-medium">{result.error}</div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">Elige un módulo</span>
          <span className="text-xs text-gray-400">{filledCount} con cantidad</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 mb-4">
          <button
            type="button"
            onClick={() => setSelectedModule('Todos')}
            className={`min-h-20 rounded-xl border px-2 py-2 flex flex-col items-center justify-center text-center transition ${selectedModule === 'Todos' ? 'border-orange-500 bg-orange-50 ring-2 ring-orange-200' : 'border-gray-200 bg-gray-50 hover:border-orange-300'}`}
          >
            <span className="text-2xl leading-none">📦</span>
            <span className="text-xs font-semibold mt-1">Todos</span>
            <span className="text-[10px] text-gray-400">{products.length} productos</span>
          </button>
          {modules.map((m) => {
            const filled = pendingByModule(m.label)
            return (
              <button
                key={m.label}
                type="button"
                onClick={() => { setSelectedModule(m.label); setQuery('') }}
                className={`relative min-h-20 rounded-xl border px-2 py-2 flex flex-col items-center justify-center text-center transition ${selectedModule === m.label ? 'border-orange-500 bg-orange-50 ring-2 ring-orange-200' : 'border-gray-200 bg-gray-50 hover:border-orange-300'}`}
              >
                {filled > 0 && (
                  <span className="absolute top-1 right-1 bg-orange-500 text-white text-[10px] font-bold min-w-5 h-5 px-1 rounded-full flex items-center justify-center">{filled}</span>
                )}
                <span className="text-2xl leading-none">{m.icon}</span>
                <span className="text-xs font-semibold mt-1 leading-tight">{m.label}</span>
                <span className="text-[10px] text-gray-400">{m.count} productos</span>
              </button>
            )
          })}
        </div>

        <label className="block mb-4">
          <span className="block text-xs font-semibold text-gray-600 mb-1">Buscar producto</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Escribe el nombre o ID..."
            className="w-full border border-gray-300 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
          />
        </label>

        <div className="space-y-2">
          {visible.map((p) => {
            const qty = quantities[p.id] ?? ''
            const hasQty = Number(qty) > 0
            const askCount = needsCount(p)
            const over = hasQty && p.linked && p.warehouseAvailable !== null && Number(qty) > p.warehouseAvailable
            return (
              <div key={p.id} className={`rounded-2xl border p-3 transition ${hasQty ? 'border-orange-300 bg-orange-50/40' : 'border-gray-200 bg-white'}`}>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <div className="font-bold text-sm">{p.name}</div>
                    <div className="text-[11px] text-gray-500 mt-0.5">
                      Restaurante: <strong>{fmt(p.available)} {p.unit}</strong>
                      {askCount && p.midCountToday !== null && <> · Final mediodía guardado: <strong>{fmt(p.midCountToday)} {p.unit}</strong></>}
                      {p.linked
                        ? <> · Bodega: <strong>{fmt(p.warehouseAvailable)} {p.unit}</strong></>
                        : <span className="text-amber-700"> · sin equivalente en Bodega</span>}
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full bg-orange-50 text-orange-700 px-2.5 py-1 text-xs font-semibold">{p.unit}</span>
                </div>
                <div className={`grid gap-2 ${askCount ? 'grid-cols-2' : 'grid-cols-1'}`}>
                  {askCount && (
                    <label className="block">
                      <span className="block text-[11px] font-semibold text-amber-800 mb-1">1. Cuenta lo que quedó <span className="font-normal text-amber-700">(final de mediodía)</span></span>
                      <input
                        type="number" min="0" step="0.01" inputMode="decimal" placeholder="Quedó"
                        value={midCounts[p.id] ?? ''}
                        onChange={(e) => setMidCounts((prev) => ({ ...prev, [p.id]: e.target.value }))}
                        className={`${inputBase} ${hasQty && !(midCounts[p.id] ?? '').trim() ? 'border-amber-400 bg-amber-50' : ''}`}
                      />
                    </label>
                  )}
                  <label className="block">
                    <span className="block text-[11px] font-semibold text-gray-600 mb-1">{askCount ? '2. ' : ''}Cuánto llevas</span>
                    <div className="flex items-center">
                      <input
                        type="number" min="0" step="0.01" inputMode="decimal" placeholder="0"
                        value={qty}
                        onChange={(e) => setQuantities((prev) => ({ ...prev, [p.id]: e.target.value }))}
                        className={`${inputBase} rounded-r-none font-semibold`}
                      />
                      <span className="border border-l-0 border-gray-300 rounded-r-xl px-3 py-2.5 text-sm text-gray-500 bg-gray-50">{p.unit}</span>
                    </div>
                  </label>
                </div>
                {over && (
                  <p className="text-[11px] text-amber-800 mt-1.5">⚠ Bodega solo tiene {fmt(p.warehouseAvailable)} {p.unit}; se descontará lo que haya.</p>
                )}
              </div>
            )
          })}
          {visible.length === 0 && <p className="text-center text-sm text-gray-500 py-6">No se encontraron productos.</p>}
        </div>
      </div>

      {batches.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
          <h2 className="font-bold mb-3">Últimos traslados</h2>
          <div className="space-y-3">
            {batches.map((b) => (
              <details key={b.batchId} className="border-b border-gray-100 last:border-0 pb-2 last:pb-0">
                <summary className="flex items-center justify-between gap-3 cursor-pointer text-sm">
                  <span className="font-medium">
                    {b.shift === 'MANANA' ? '🌅 Mañana' : '☀️ Mediodía'}
                    <span className="text-xs text-gray-400 ml-2">
                      {new Date(b.createdAt).toLocaleString('es-CR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </span>
                  <span className="text-xs text-gray-500">{b.items.length} productos</span>
                </summary>
                <ul className="mt-2 text-xs text-gray-600 space-y-0.5 pl-1">
                  {b.items.map((i) => <li key={i.name}>{i.name}: +{fmt(i.quantity)} {i.unit}</li>)}
                </ul>
              </details>
            ))}
          </div>
        </div>
      )}

      <div className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur border-t border-gray-200 p-3">
        <div className="max-w-4xl mx-auto">
          {missing.length > 0 && (
            <p className="text-[11px] text-amber-800 mb-1.5 text-center">
              Falta contar lo que quedó en {missing.length} producto{missing.length === 1 ? '' : 's'}: {missing.slice(0, 3).map((m) => m.name).join(', ')}{missing.length > 3 ? '…' : ''}
            </p>
          )}
          <button
            type="button"
            onClick={submit}
            disabled={pending || filledCount === 0 || missing.length > 0}
            className="w-full rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3.5 transition"
          >
            {pending ? 'Registrando...' : filledCount === 0 ? (shift === 'MEDIODIA' ? 'Escribe conteos o cantidades para confirmar' : 'Escribe cantidades para confirmar') : `Confirmar traslado de ${shift === 'MANANA' ? 'mañana' : 'mediodía'} (${filledCount})`}
          </button>
        </div>
      </div>
    </section>
  )
}
