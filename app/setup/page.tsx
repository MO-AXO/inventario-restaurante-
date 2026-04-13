export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { setupAction } from '@/app/actions/setup'

export default async function SetupPage() {
  const userCount = await prisma.user.count()
  if (userCount > 0) redirect('/login')

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🍖</div>
          <h1 className="text-2xl font-bold text-white">Configuración Inicial</h1>
          <p className="text-gray-400 mt-1">Crea tu cuenta de dueño para empezar</p>
        </div>

        <form action={setupAction} className="bg-white rounded-2xl p-6 shadow-xl space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Tu nombre
            </label>
            <input
              name="name"
              type="text"
              placeholder="Ej: Mario"
              required
              autoComplete="off"
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              PIN (números)
            </label>
            <input
              name="pin"
              type="password"
              inputMode="numeric"
              placeholder="••••"
              required
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-lg text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Confirmar PIN
            </label>
            <input
              name="pinConfirm"
              type="password"
              inputMode="numeric"
              placeholder="••••"
              required
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-lg text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl text-lg transition"
          >
            Crear cuenta y entrar
          </button>
        </form>
      </div>
    </div>
  )
}
