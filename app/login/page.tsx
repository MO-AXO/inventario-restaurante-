import { loginAction } from '@/app/actions/auth'
import LoginForm from '@/components/LoginForm'

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🍖</div>
          <h1 className="text-2xl font-bold text-white">Control de Inventario</h1>
          <p className="text-gray-400 mt-1">Ingresa con tu nombre y PIN</p>
        </div>
        <LoginForm action={loginAction} />
      </div>
    </div>
  )
}
