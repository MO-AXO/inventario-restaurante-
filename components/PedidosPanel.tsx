'use client'

import { useEffect, useState, useTransition } from 'react'
import { createPedidos, fulfillPedidos, cancelPedido, type CreatePedidosResult, type SimpleResult } from '@/app/actions/pedidos'
import { splitLines, cleanName, MAX_NAME } from '@/lib/pedidos'

const NAME_KEY = 'pedidos:nombre'

type Pending = {
  id: string
  text: string
  requestedByName: string
  createdAt: string
  mine: boolean
}

type History = {
  id: string
  text: string
  status: string
  requestedByName: string
  resolvedByName: string | null
  resolvedAt: string | null
}

type Props = {
  pendings: Pending[]
  history: History[]
  canManage: boolean
}

function timeLabel(iso: string) {
  return new Date(iso).toLocaleString('es-CR', {
    day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'America/Costa_Rica',
  })
}

export default function PedidosPanel({ pendings, history, canManage }: Props) {
  const [text, setText] = useState('')
  const [name, setName] = useState('')
  const [created, setCreated] = useState<CreatePedidosResult | null>(null)
  const [actionResult, setActionResult] = useState<SimpleResult | null>(null)
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const [pending, startTransition] = useTransition()

  // El último nombre usado queda guardado en este teléfono para no escribirlo cada vez.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(NAME_KEY)
      if (saved) setName(saved)
    } catch {
      // Sin acceso al almacenamiento: simplemente se escribe cada vez.
    }
  }, [])

  const lineCount = splitLines(text).length
  const hasName = cleanName(name).length > 0
  const checkedIds = pendings.filter((p) => checked[p.id]).map((p) => p.id)

  function send() {
    startTransition(async () => {
      const response = await createPedidos(text, name)
      setCreated(response)
      setActionResult(null)
      if (response.ok) {
        setText('')
        try {
          window.localStorage.setItem(NAME_KEY, cleanName(name))
        } catch {
          // Sin acceso al almacenamiento: no pasa nada.
        }
      }
    })
  }

  function fulfill(ids: string[]) {
    startTransition(async () => {
      const response = await fulfillPedidos(ids)
      setActionResult(response)
      setCreated(null)
      if (response.ok) setChecked({})
    })
  }

  function remove(id: string) {
    startTransition(async () => {
      setActionResult(await cancelPedido(id))
      setCreated(null)
    })
  }

  return (
    <section className="space-y-4">
      {/* Escribir lo que hace falta */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
        <label className="block mb-4">
          <span className="block text-sm font-bold text-gray-800 mb-1">Tu nombre</span>
          <input
            value={name}
            maxLength={MAX_NAME}
            onChange={(e) => { setName(e.target.value); setCreated(null) }}
            placeholder="¿Quién hace el pedido?"
            autoComplete="given-name"
            className={`w-full border rounded-xl px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white ${!hasName && lineCount > 0 ? 'border-amber-400 bg-amber-50' : 'border-gray-300'}`}
          />
        </label>

        <label className="block">
          <span className="block text-sm font-bold text-gray-800 mb-1">¿Qué hace falta para el servicio?</span>
          <span className="block text-xs text-gray-500 mb-2">Escribe una cosa por línea. Ejemplo: “Brisket 10 lb”, “Servilletas”, “Salsa BBQ”.</span>
          <textarea
            value={text}
            onChange={(e) => { setText(e.target.value); setCreated(null) }}
            rows={5}
            placeholder={'Brisket 10 lb\nServilletas\nSalsa BBQ'}
            className="w-full border border-gray-300 rounded-xl px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white resize-y"
          />
        </label>

        {created?.ok && (
          <p className="mt-3 rounded-xl bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-800 font-semibold">
            ✓ Enviado ({created.created}). El gerente y los dueños ya lo ven.
            {created.skipped > 0 && <span className="block text-xs font-normal text-amber-800 mt-0.5">{created.skipped} ya estaba{created.skipped === 1 ? '' : 'n'} pedido{created.skipped === 1 ? '' : 's'} y no se repitió.</span>}
          </p>
        )}
        {created && !created.ok && (
          <p className="mt-3 rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700 font-medium">{created.error}</p>
        )}

        <button
          type="button"
          onClick={send}
          disabled={pending || lineCount === 0 || !hasName}
          className="mt-3 w-full rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3.5 transition"
        >
          {pending ? 'Enviando...' : lineCount === 0 ? 'Escribe lo que hace falta' : !hasName ? 'Escribe tu nombre para enviar' : `Enviar (${lineCount})`}
        </button>
      </div>

      {/* Lista de lo pendiente */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-bold text-gray-800">📋 Por llevar <span className="text-sm font-normal text-gray-400">({pendings.length})</span></h2>
          {canManage && checkedIds.length > 0 && (
            <button
              type="button"
              onClick={() => fulfill(checkedIds)}
              disabled={pending}
              className="rounded-lg bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-bold px-3 py-1.5 transition"
            >
              {pending ? 'Guardando...' : `Ya llevé (${checkedIds.length})`}
            </button>
          )}
        </div>

        {actionResult && !actionResult.ok && (
          <p className="px-4 py-2 text-sm text-red-700 bg-red-50 border-b border-red-100">{actionResult.error}</p>
        )}

        {pendings.length === 0 ? (
          <div className="p-10 text-center text-gray-500">
            <div className="text-4xl mb-2">✅</div>
            <p className="font-medium">No hay nada pendiente.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {pendings.map((p) => (
              <li key={p.id} className="px-4 py-3 flex items-start gap-3">
                {canManage && (
                  <button
                    type="button"
                    aria-label={`Marcar ${p.text}`}
                    onClick={() => setChecked((prev) => ({ ...prev, [p.id]: !prev[p.id] }))}
                    className={`mt-0.5 w-6 h-6 rounded-md border-2 flex items-center justify-center text-sm font-bold shrink-0 ${checked[p.id] ? 'bg-green-600 border-green-600 text-white' : 'border-gray-300 text-transparent'}`}
                  >
                    ✓
                  </button>
                )}
                <div className="min-w-0 flex-1">
                  <div className={`font-semibold text-sm ${checked[p.id] ? 'line-through text-gray-400' : 'text-gray-900'}`}>{p.text}</div>
                  <div className="text-[11px] text-gray-500 mt-0.5">{p.requestedByName} · {timeLabel(p.createdAt)}</div>
                </div>
                {(canManage || p.mine) && (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => remove(p.id)}
                    className="text-[11px] font-semibold text-gray-400 hover:text-red-600 underline shrink-0 disabled:opacity-50"
                  >
                    Quitar
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {history.length > 0 && (
        <details className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
          <summary className="font-bold cursor-pointer">Atendidos recientemente ({history.length})</summary>
          <ul className="mt-3 space-y-1.5 text-xs text-gray-600">
            {history.map((h) => (
              <li key={h.id}>
                <span className={h.status === 'LLEVADO' ? 'text-green-600' : 'text-gray-400'}>{h.status === 'LLEVADO' ? '✓ Llevado' : '✕ Quitado'}</span>{' '}
                <strong className="text-gray-800">{h.text}</strong>
                <span className="text-gray-400"> · pidió {h.requestedByName}{h.resolvedByName ? ` · lo atendió ${h.resolvedByName}` : ''}{h.resolvedAt ? ` · ${timeLabel(h.resolvedAt)}` : ''}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  )
}
