'use server'

import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { hashPin, createSession } from '@/lib/auth'

export async function setupAction(formData: FormData): Promise<void> {
  const userCount = await prisma.user.count()
  if (userCount > 0) redirect('/login')

  const name = formData.get('name') as string
  const pin = formData.get('pin') as string
  const pinConfirm = formData.get('pinConfirm') as string

  if (!name || !pin || pin !== pinConfirm) redirect('/setup')

  const hashed = await hashPin(pin)
  const user = await prisma.user.create({
    data: { name, pin: hashed, role: 'OWNER' },
  })

  await createSession(user.id, user.role)
  redirect('/dashboard')
}
