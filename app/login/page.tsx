import { loginAction } from '@/app/actions/auth'
import LoginForm from '@/components/LoginForm'

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#211915] p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 rounded-3xl bg-gradient-to-br from-orange-400 to-orange-700 flex items-center justify-center text-5xl shadow-2xl">🐷</div>
          <p className="text-orange-300 text-xs font-bold uppercase tracking-[0.25em] mb-2">Pig Brothers</p>
          <h1 className="text-2xl font-extrabold text-white">Control de Inventario</h1>
          <p className="text-gray-400 mt-2">Ingresa con tu nombre y PIN</p>
        </div>
        <LoginForm action={loginAction} />
      </div>
    </div>
  )
}
