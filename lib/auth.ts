import { cookies } from 'next/headers'
import { SignJWT, jwtVerify } from 'jose'
import bcrypt from 'bcryptjs'
import { prisma } from './db'

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'inventario-restaurante-secret-key-2024'
)

export async function hashPin(pin: string) {
  return bcrypt.hash(pin, 10)
}

export async function verifyPin(pin: string, hash: string) {
  return bcrypt.compare(pin, hash)
}

export async function createSession(userId: string, role: string) {
  const token = await new SignJWT({ userId, role })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(SECRET)

  const cookieStore = await cookies()
  cookieStore.set('session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  })
}

export async function getSession() {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, SECRET)
    return payload as { userId: string; role: string }
  } catch {
    return null
  }
}

export async function getCurrentUser() {
  const session = await getSession()
  if (!session) return null
  return prisma.user.findUnique({ where: { id: session.userId } })
}

export async function deleteSession() {
  const cookieStore = await cookies()
  cookieStore.delete('session')
}
