'use server'

import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { createSession, deleteSession, verifyPin } from '@/lib/auth'

export async function loginAction(
  _prevState: { error: string } | undefined,
  formData: FormData
) {
  const name = formData.get('name') as string
  const pin = formData.get('pin') as string

  if (!name || !pin) return { error: 'Ingresa tu nombre y PIN' }

  const user = await prisma.user.findFirst({
    where: { name: { equals: name, mode: 'insensitive' }, active: true },
  })

  if (!user) return { error: 'Usuario no encontrado' }

  const valid = await verifyPin(pin, user.pin)
  if (!valid) return { error: 'PIN incorrecto' }

  await createSession(user.id, user.role)
  redirect('/dashboard')
}

export async function logoutAction() {
  await deleteSession()
  redirect('/login')
}
