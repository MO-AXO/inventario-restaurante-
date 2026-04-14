'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { todayDate } from '@/lib/utils'

export async function closeDayAction(): Promise<void> {
  const session = await getSession()
  if (!session || session.role !== 'OWNER') return

  const user = await prisma.user.findUnique({ where: { id: session.userId } })
  if (!user) return

  const today = todayDate()
  await prisma.dayClose.upsert({
    where: { date: new Date(today) },
    update: { closedAt: new Date(), closedByName: user.name },
    create: { date: new Date(today), closedByName: user.name },
  })

  revalidatePath('/dashboard')
}

export async function reopenDayAction(): Promise<void> {
  const session = await getSession()
  if (!session || session.role !== 'OWNER') return

  const today = todayDate()
  await prisma.dayClose.deleteMany({ where: { date: new Date(today) } })

  revalidatePath('/dashboard')
}
