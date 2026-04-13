'use server'

import { revalidatePath } from 'next/cache'
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
