'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { splitLines, cleanName, MAX_PEDIDO_LINES } from '@/lib/pedidos'

export type CreatePedidosResult =
  | { ok: true; created: number; skipped: number }
  | { ok: false; error: string }

export type SimpleResult = { ok: true; count: number } | { ok: false; error: string }


// Cualquier usuario activo puede pedir. Se lee el rol desde la base y no desde la cookie.
async function currentUser() {
  const user = await getCurrentUser()
  return user && user.active ? user : null
}


export async function createPedidos(raw: string, name: string): Promise<CreatePedidosResult> {
  try {
    const user = await currentUser()
    if (!user) return { ok: false, error: 'Tu sesión no es válida. Entra de nuevo.' }

    // El nombre lo escribe quien pide; la cuenta puede ser compartida por varias personas.
    const requester = cleanName(name)
    if (!requester) return { ok: false, error: 'Escribe tu nombre.' }

    const lines = splitLines(typeof raw === 'string' ? raw : '')
    if (lines.length === 0) return { ok: false, error: 'Escribe lo que hace falta.' }
    if (lines.length > MAX_PEDIDO_LINES) return { ok: false, error: `Máximo ${MAX_PEDIDO_LINES} cosas por pedido.` }

    // Lo que ya est\u00e1 pendiente con el mismo texto no se repite: evita que dos personas pidan lo mismo.
    const pending = await prisma.pedido.findMany({ where: { status: 'PENDIENTE' }, select: { text: true } })
    const pendingSet = new Set(pending.map((p) => p.text.toLowerCase()))
    const fresh = lines.filter((l) => !pendingSet.has(l.toLowerCase()))
    const skipped = lines.length - fresh.length
    if (fresh.length === 0) return { ok: false, error: 'Eso ya estaba pedido y sigue pendiente.' }

    await prisma.pedido.createMany({
      data: fresh.map((text) => ({ text, requestedById: user.id, requestedByName: requester })),
    })

    revalidatePath('/pedidos')
    return { ok: true, created: fresh.length, skipped }
  } catch (error) {
    console.error('createPedidos error:', error)
    return { ok: false, error: 'No se pudo enviar el pedido. Intenta de nuevo.' }
  }
}

// Solo el gerente o el due\u00f1o marcan lo que ya se llev\u00f3.
export async function fulfillPedidos(ids: string[]): Promise<SimpleResult> {
  try {
    const user = await currentUser()
    if (!user || (user.role !== 'OWNER' && user.role !== 'MANAGER')) {
      return { ok: false, error: 'Solo el due\u00f1o o el gerente pueden marcar un pedido como llevado.' }
    }
    const clean = ids.filter((id) => typeof id === 'string' && id.length > 0)
    if (clean.length === 0) return { ok: false, error: 'No hay pedidos para marcar.' }

    const result = await prisma.pedido.updateMany({
      where: { id: { in: clean }, status: 'PENDIENTE' },
      data: { status: 'LLEVADO', resolvedAt: new Date(), resolvedByName: user.name },
    })
    if (result.count === 0) return { ok: false, error: 'Esos pedidos ya fueron atendidos o cancelados.' }

    revalidatePath('/pedidos')
    return { ok: true, count: result.count }
  } catch (error) {
    console.error('fulfillPedidos error:', error)
    return { ok: false, error: 'No se pudo marcar el pedido. Intenta de nuevo.' }
  }
}

// El empleado solo borra lo que escribi\u00f3 \u00e9l; el gerente y el due\u00f1o borran cualquiera.
export async function cancelPedido(id: string): Promise<SimpleResult> {
  try {
    const user = await currentUser()
    if (!user) return { ok: false, error: 'Tu sesi\u00f3n no es v\u00e1lida. Entra de nuevo.' }

    const pedido = await prisma.pedido.findUnique({ where: { id } })
    if (!pedido || pedido.status !== 'PENDIENTE') return { ok: false, error: 'Este pedido ya no est\u00e1 pendiente.' }

    const canManage = user.role === 'OWNER' || user.role === 'MANAGER'
    if (!canManage && pedido.requestedById !== user.id) {
      return { ok: false, error: 'Solo puedes quitar lo que escribiste t\u00fa.' }
    }

    await prisma.pedido.update({
      where: { id },
      data: { status: 'CANCELADO', resolvedAt: new Date(), resolvedByName: user.name },
    })

    revalidatePath('/pedidos')
    return { ok: true, count: 1 }
  } catch (error) {
    console.error('cancelPedido error:', error)
    return { ok: false, error: 'No se pudo quitar el pedido. Intenta de nuevo.' }
  }
}
