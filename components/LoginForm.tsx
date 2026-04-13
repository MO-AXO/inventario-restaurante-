'use client'

import { useActionState } from 'react'

type ActionState = { error: string } | undefined
type Props = { action: (state: ActionState, formData: FormData) => Promise<ActionState> }

export default function LoginForm({ action }: Props) {
  const [state, formAction, pending] = useActionState(action, undefined)

  return (
    <form action={formAction} className="bg-white rounded-2xl p-6 shadow-xl space-y-4">
      {state?.error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
          {state.error}
        </div>
      )}

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">Nombre</label>
        <input
          name="name"
          type="text"
          placeholder="Tu nombre"
          className="w-full border border-gray-300 rounded-xl px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
          required
          autoComplete="off"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">PIN</label>
        <input
          name="pin"
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          placeholder="••••"
          className="w-full border border-gray-300 rounded-xl px-4 py-3 text-lg text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-orange-500"
          required
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold py-3 rounded-xl text-lg transition"
      >
        {pending ? 'Ingresando...' : 'Entrar'}
      </button>
    </form>
  )
}
