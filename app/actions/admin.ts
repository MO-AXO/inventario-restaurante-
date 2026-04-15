'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { hashPin } from '@/lib/auth'
import { Module } from '@prisma/client'

export async function createUser(formData: FormData): Promise<void> {
  const session = await getSession()
  if (!session || session.role !== 'OWNER') return

  const name = formData.get('name') as string
  const pin = formData.get('pin') as string
  const role = formData.get('role') as 'OWNER' | 'EMPLOYEE'

  const hashed = await hashPin(pin)
  await prisma.user.create({ data: { name, pin: hashed, role } })
  revalidatePath('/admin')
}

export async function updateProductMin(formData: FormData): Promise<void> {
  const session = await getSession()
  if (!session || session.role !== 'OWNER') return

  const productId = formData.get('productId') as string
  const minStock = parseFloat(formData.get('minStock') as string)

  await prisma.product.update({ where: { id: productId }, data: { minStock } })
  revalidatePath('/admin')
  revalidatePath('/dashboard')
}

export async function createProduct(formData: FormData): Promise<void> {
  const session = await getSession()
  if (!session || session.role !== 'OWNER') return

  const name = formData.get('name') as string
  const category = formData.get('category') as string
  const module = formData.get('module') as Module
  const unit = formData.get('unit') as string
  const minStock = parseFloat(formData.get('minStock') as string) || 0

  await prisma.product.create({ data: { name, category, module, unit, minStock } })
  revalidatePath('/admin')
  revalidatePath(`/inventario/${module.toLowerCase()}`)
}

export async function updateProduct(formData: FormData): Promise<void> {
  const session = await getSession()
  if (!session || session.role !== 'OWNER') return

  const productId = formData.get('productId') as string
  const name = formData.get('name') as string
  const category = formData.get('category') as string
  const module = formData.get('module') as Module
  const unit = formData.get('unit') as string
  const minStock = parseFloat(formData.get('minStock') as string) || 0

  await prisma.product.update({
    where: { id: productId },
    data: { name, category, module, unit, minStock },
  })
  revalidatePath('/admin')
  revalidatePath('/dashboard')
  revalidatePath(`/inventario/${module.toLowerCase()}`)
  redirect('/admin')
}

export async function toggleProductActive(formData: FormData): Promise<void> {
  const session = await getSession()
  if (!session || session.role !== 'OWNER') return

  const productId = formData.get('productId') as string
  const current = await prisma.product.findUnique({ where: { id: productId }, select: { active: true } })
  if (!current) return

  await prisma.product.update({ where: { id: productId }, data: { active: !current.active } })
  revalidatePath('/admin')
  revalidatePath('/dashboard')
}

export async function bulkUpdateMinStock(formData: FormData): Promise<void> {
  const session = await getSession()
  if (!session || session.role !== 'OWNER') return

  const updates: { id: string; minStock: number }[] = []
  for (const [key, value] of formData.entries()) {
    if (key.startsWith('min_')) {
      const id = key.slice(4)
      const minStock = parseFloat(value as string)
      if (!isNaN(minStock) && minStock >= 0) {
        updates.push({ id, minStock })
      }
    }
  }

  await prisma.$transaction(
    updates.map((u) => prisma.product.update({ where: { id: u.id }, data: { minStock: u.minStock } }))
  )

  revalidatePath('/admin/minimos')
  revalidatePath('/dashboard')
}

export async function toggleUserActive(formData: FormData): Promise<void> {
  const session = await getSession()
  if (!session || session.role !== 'OWNER') return

  const userId = formData.get('userId') as string
  const current = await prisma.user.findUnique({ where: { id: userId }, select: { active: true } })
  if (!current) return

  await prisma.user.update({ where: { id: userId }, data: { active: !current.active } })
  revalidatePath('/admin')
}
