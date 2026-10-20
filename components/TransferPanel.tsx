'use client'

import { useMemo, useState, useTransition } from 'react'
import { registerTransfer, type TransferResult, type TransferShift } from '@/app/actions/transfers'
import { registerClosing, type ClosingResult } from '@/app/actions/closing'

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
  items: { name: string; unit: string; quantity: number; kind: string }[]
}

type ClosingRow = {
  id: string
  name: string
  unit: string
  available: number | null
  finalToday: number | null
  returnedToday: number
  wasteToday: number
  warehouseAvailable: number | null
  linked: boolean
}

type Mode = TransferShift | 'CIERRE'

const SHIFTS: { id: Mode; label: string; icon: string; help: string }[] = [
  { id: 'MANANA', label: 'Mañana', icon: '🌅', help: 'Lo que llevas de Bodega al abrir.' },
  { id: 'MEDIODIA', label: 'Mediodía', icon: '☀️', help: 'Cuenta lo que quedó y luego lo que llevas.' },
  { id: 'CIERRE', label: 'Cierre', icon: '🌙', help: 'Carnes que regresan a Bodega y merma.' },
]

const KIND_LABEL: Record<string, string> = { TRASLADO: 'llevado', DEVOLUCION: 'devuelto a Bodega', MERMA: 'merma' }
const BATCH_LABEL: Record<string, string> = { MANANA: '🌅 Mañana', MEDIODIA: '☀️ Mediodía', CIERRE: '🌙 Cierre' }

function fmt(value: number | null) {
  if (value === null) return '—'
  return Number.isInteger(value) ? String(value) : value.toFixed(2)
}

export default function TransferPanel({ products, batches, closingRows }: { products: Product[]; batches: BatchSummary[]; closingRows: ClosingRow[] }) {
  const [mode, setMode] = useState<Mode>('MANANA')
  const shift: TransferShift = mode === 'MEDIODIA' ? 'MEDIODIA' : 'MANANA'
  const [closeWaste, setCloseWaste] = useState<Record<string, string>>({})
  const [closeReason, setCloseReason] = useState<Record<string, string>>({})
  const [closeResult, setCloseResult] = useState<ClosingResult | null>(null)
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

  // ---- Cierre: todo lo que sobra regresa a Bodega, menos la merma ----
  // El peso final viene de la tarjeta de cada carne; aquí solo se escribe la merma.
  const num = (v: string | undefined) => (v !== undefined && v.trim() !== '' && Number.isFinite(Number(v)) ? Number(v) : 0)
  function closingState(r: ClosingRow) {
    const typedWaste = (closeWaste[r.id] ?? '').trim() !== ''
    const waste = typedWaste ? num(closeWaste[r.id]) : r.wasteToday
    const final = r.finalToday
    const returned = final === null ? null : Math.round((final - waste) * 1000) / 1000
    const alreadyClosed = r.returnedToday > 0 || r.wasteToday > 0
    // Se confirma toda carne con peso final que aún no se cerró, o cuya merma cambió.
    const changed = typedWaste && waste !== r.wasteToday
    const pendingClose = final !== null && (!alreadyClosed || changed)
    return { waste, final, returned, alreadyClosed, pendingClose, over: returned !== null && returned < 0, noFinal: final === null }
  }
  const closingTouched = closingRows.filter((r) => closingState(r).pendingClose)
  const closingInvalid = closingRows.filter((r) => closingState(r).over)
  const closingMissing = closingRows.filter((r) => closingState(r).noFinal)

  function submitClosing() {
    const lines = closingTouched.map((r) => ({
      productId: r.id,
      waste: closingState(r).waste,
      reason: closeReason[r.id] ?? '',
    }))
    startTransition(async () => {
      const response = await registerClosing(lines)
      setCloseResult(response)
      if (response.ok) {
        setCloseWaste({})
        setCloseReason({})
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
    })
  }

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

        <div className="grid grid-cols-3 gap-2 mb-2">
          {SHIFTS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => { setMode(s.id); setResult(null); setCloseResult(null) }}
              className={`rounded-xl border px-3 py-3 text-left transition ${mode === s.id ? 'border-orange-500 bg-orange-50 ring-2 ring-orange-200' : 'border-gray-200 bg-gray-50 hover:border-orange-300'}`}
            >
              <div className="font-bold">{s.icon} {s.label}</div>
              <div className="text-[11px] text-gray-500 leading-tight mt-0.5">{s.help}</div>
            </button>
          ))}
        </div>
        {mode === 'MEDIODIA' && (
          <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
            En los módulos marcados con <strong>“Cuenta lo que quedó”</strong>, primero cuenta cuánto quedó y después escribe cuánto llevas.
          </p>
        )}
      </div>

      {mode === 'CIERRE' && (
        <>
          {closeResult?.ok && (
            <div className="rounded-2xl border border-green-200 bg-green-50 p-4 space-y-2">
              <p className="font-bold text-green-800">✓ Cierre registrado</p>
              <ul className="text-sm text-green-900 space-y-1">
                {closeResult.items.map((i) => (
                  <li key={i.name}>
                    <strong>{i.name}</strong>: final {fmt(i.final)} {i.unit}
                    <> · regresa a Bodega {fmt(i.returned)}{i.warehouseNow !== null && <span className="text-green-700"> (Bodega ahora {fmt(i.warehouseNow)})</span>}</>
                    {i.waste > 0 && <> · merma {fmt(i.waste)}</>}
                  </li>
                ))}
              </ul>
              {closeResult.warnings.length > 0 && (
                <ul className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 space-y-0.5">
                  {closeResult.warnings.map((w) => <li key={w}>⚠ {w}</li>)}
                </ul>
              )}
            </div>
          )}
          {closeResult && !closeResult.ok && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 font-medium">{closeResult.error}</div>
          )}

          <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm space-y-3">
            <div>
              <h3 className="font-bold">Cierre del servicio de la noche</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                El <strong>peso final</strong> se escribe en la tarjeta de cada carne; de ahí sale el consumo.
                Aquí solo anotas la <strong>merma</strong> (lo que se bota). Todo lo demás <strong>regresa a Bodega</strong>.
              </p>
            </div>

            {closingRows.map((r) => {
              const s = closingState(r)
              return (
                <div key={r.id} className={`rounded-2xl border p-3 transition ${s.over ? 'border-red-300 bg-red-50/40' : s.pendingClose ? 'border-orange-300 bg-orange-50/40' : s.alreadyClosed ? 'border-green-200 bg-green-50/40' : 'border-gray-200 bg-white'}`}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <div className="font-bold text-sm">{r.name}</div>
                      <div className="text-[11px] text-gray-500 mt-0.5">
                        Peso final de hoy: <strong>{r.finalToday !== null ? `${fmt(r.finalToday)} ${r.unit}` : 'sin escribir'}</strong>
                        {s.alreadyClosed && <> · ya cerrado: devuelto {fmt(r.returnedToday)} · merma {fmt(r.wasteToday)}</>}
                        {r.linked
                          ? <> · Bodega: <strong>{fmt(r.warehouseAvailable)} {r.unit}</strong></>
                          : <span className="text-amber-700"> · sin equivalente en Bodega</span>}
                      </div>
                    </div>
                    <span className="shrink-0 rounded-full bg-orange-50 text-orange-700 px-2.5 py-1 text-xs font-semibold">{r.unit}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <label className="block">
                      <span className="block text-[11px] font-semibold text-gray-600 mb-1">Merma (se bota)</span>
                      <input
                        type="number" min="0" step="0.01" inputMode="decimal"
                        placeholder={s.alreadyClosed ? fmt(r.wasteToday) : '0'}
                        disabled={s.noFinal}
                        value={closeWaste[r.id] ?? ''}
                        onChange={(e) => setCloseWaste((prev) => ({ ...prev, [r.id]: e.target.value }))}
                        className={`${inputBase} ${s.noFinal ? 'opacity-50' : ''}`}
                      />
                    </label>
                    <div className="rounded-xl bg-gray-50 border border-gray-200 px-3 py-2 flex flex-col justify-center">
                      <span className="text-[11px] font-semibold text-gray-600">Regresa a Bodega</span>
                      <span className={`text-lg font-bold ${s.over ? 'text-red-600' : 'text-blue-700'}`}>
                        {s.returned !== null ? `${fmt(s.returned)} ${r.unit}` : '—'}
                      </span>
                    </div>
                  </div>

                  {s.waste > 0 && (
                    <label className="block mt-2">
                      <span className="block text-[11px] font-semibold text-gray-600 mb-1">Motivo de la merma <span className="font-normal text-gray-400">(opcional)</span></span>
                      <input
                        value={closeReason[r.id] ?? ''}
                        onChange={(e) => setCloseReason((prev) => ({ ...prev, [r.id]: e.target.value }))}
                        placeholder="Ej. vencida, se cayó, sobrante"
                        className={inputBase}
                      />
                    </label>
                  )}

                  {s.noFinal && (
                    <p className="text-[11px] mt-2 text-amber-700 font-semibold">
                      Escribe primero el peso final en la tarjeta de esta carne (Carnes para Servicio).
                    </p>
                  )}
                  {s.over && (
                    <p className="text-[11px] mt-2 text-red-700 font-semibold">
                      La merma ({fmt(s.waste)}) supera el peso final ({fmt(s.final ?? 0)} {r.unit}).
                    </p>
                  )}
                </div>
              )
            })}
            {closingRows.length === 0 && <p className="text-center text-sm text-gray-500 py-4">No hay carnes configuradas para devolver.</p>}
          </div>
        </>
      )}

      {mode !== 'CIERRE' && result?.ok && (
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
      {mode !== 'CIERRE' && result && !result.ok && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 font-medium">{result.error}</div>
      )}

      {mode !== 'CIERRE' && (
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
      )}

      {batches.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
          <h2 className="font-bold mb-3">Últimos traslados</h2>
          <div className="space-y-3">
            {batches.map((b) => (
              <details key={b.batchId} className="border-b border-gray-100 last:border-0 pb-2 last:pb-0">
                <summary className="flex items-center justify-between gap-3 cursor-pointer text-sm">
                  <span className="font-medium">
                    {BATCH_LABEL[b.shift] ?? b.shift}
                    <span className="text-xs text-gray-400 ml-2">
                      {new Date(b.createdAt).toLocaleString('es-CR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </span>
                  <span className="text-xs text-gray-500">{b.items.length} productos</span>
                </summary>
                <ul className="mt-2 text-xs text-gray-600 space-y-0.5 pl-1">
                  {b.items.map((i, idx) => <li key={`${i.name}-${i.kind}-${idx}`}>{i.name}: {fmt(i.quantity)} {i.unit} <span className="text-gray-400">{KIND_LABEL[i.kind] ?? i.kind}</span></li>)}
                </ul>
              </details>
            ))}
          </div>
        </div>
      )}

      <div className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur border-t border-gray-200 p-3">
        <div className="max-w-4xl mx-auto">
          {mode !== 'CIERRE' && missing.length > 0 && (
            <p className="text-[11px] text-amber-800 mb-1.5 text-center">
              Falta contar lo que quedó en {missing.length} producto{missing.length === 1 ? '' : 's'}: {missing.slice(0, 3).map((m) => m.name).join(', ')}{missing.length > 3 ? '…' : ''}
            </p>
          )}
          {mode === 'CIERRE' ? (
            <button
              type="button"
              onClick={submitClosing}
              disabled={pending || closingTouched.length === 0 || closingInvalid.length > 0}
              className="w-full rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3.5 transition"
            >
              {pending ? 'Registrando...' : closingInvalid.length > 0 ? 'Revisa las cantidades marcadas en rojo' : closingTouched.length === 0 ? (closingMissing.length === closingRows.length ? 'Escribe el peso final en las tarjetas para cerrar' : 'Cierre al día') : `Confirmar cierre (${closingTouched.length})`}
            </button>
          ) : (
          <button
            type="button"
            onClick={submit}
            disabled={pending || filledCount === 0 || missing.length > 0}
            className="w-full rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3.5 transition"
          >
            {pending ? 'Registrando...' : filledCount === 0 ? (shift === 'MEDIODIA' ? 'Escribe conteos o cantidades para confirmar' : 'Escribe cantidades para confirmar') : `Confirmar traslado de ${shift === 'MANANA' ? 'mañana' : 'mediodía'} (${filledCount})`}
          </button>
          )}
        </div>
      </div>
    </section>
  )
}
