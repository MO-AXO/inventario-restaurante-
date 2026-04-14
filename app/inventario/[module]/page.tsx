export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import Navbar from '@/components/Navbar'
import InventoryForm from '@/components/InventoryForm'
import { MODULE_LABELS, MODULE_ICONS, todayDate, WEIGHT_MODULES, SMOKED_MODULES, BEVERAGE_SERVICE_MODULES, CARNES_SERVICIO_MODULES, SALSAS_RESTOCK_MODULES } from '@/lib/utils'
import { Module } from '@prisma/client'
import { saveInventoryRecord } from '@/app/actions/inventory'

type Props = { params: Promise<{ module: string }> }

function toModule(str: string): Module | null {
  const upper = str.toUpperCase() as Module
  const valid: Module[] = [
    'CARNES_PREPARADAS', 'CARNES_AHUMADAS', 'CARNE_CRUDA', 'VERDURAS',
    'BEBIDAS_BODEGA', 'BEBIDAS_SERVICIO', 'SALSAS', 'COCINA',
    'SERVICIO', 'BODEGA', 'DESECHABLES',
    'GUARNICIONES', 'VERDURAS_RESTAURANTE', 'HARINAS_ACEITE_RESTAURANTE',
    'HARINAS_ACEITE_BODEGA', 'LACTEOS_RESTAURANTE', 'LACTEOS_BODEGA',
    'CONDIMENTOS_RESTAURANTE', 'DESECHABLES_BOLSAS_RESTAURANTE', 'DESECHABLES_BODEGA',
    'SALSAS_ADEREZOS_RESTAURANTE', 'LIMPIEZA_RESTAURANTE',
    'SALSAS_ADEREZOS_BODEGA', 'CONDIMENTOS_BODEGA', 'MATERIA_PRIMA_SALSA',
  ]
  return valid.includes(upper) ? upper : null
}

function getFormType(mod: Module): 'carnes_servicio' | 'weight' | 'smoked' | 'beverage_service' | 'salsas_restaurante' | 'simple' {
  if (CARNES_SERVICIO_MODULES.includes(mod)) return 'carnes_servicio'
  if (WEIGHT_MODULES.includes(mod)) return 'weight'
  if (SMOKED_MODULES.includes(mod)) return 'smoked'
  if (BEVERAGE_SERVICE_MODULES.includes(mod)) return 'beverage_service'
  if (SALSAS_RESTOCK_MODULES.includes(mod)) return 'salsas_restaurante'
  return 'simple'
}

export default async function InventarioModulePage({ params }: Props) {
  const { module: moduleSlug } = await params
  const mod = toModule(moduleSlug)
  if (!mod) notFound()

  const today = todayDate()

  const [products, dayClose] = await Promise.all([
    prisma.product.findMany({
    where: { module: mod, active: true },
    include: {
      records: {
        where: { date: new Date(today) },
        take: 1,
      },
    },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    }),
    prisma.dayClose.findUnique({ where: { date: new Date(today) } }),
  ])

  const isClosed = !!dayClose
  const formType = getFormType(mod)

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 p-4 max-w-2xl mx-auto w-full">
        <div className="mb-5 flex items-center gap-3">
          <span className="text-3xl">{MODULE_ICONS[mod]}</span>
          <div>
            <h1 className="text-xl font-bold">{MODULE_LABELS[mod]}</h1>
            <p className="text-sm text-gray-500">{new Date(today + 'T12:00:00').toLocaleDateString('es-CR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          </div>
        </div>

        {products.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center text-gray-500">
            No hay productos en este módulo. Agrégalos desde Administración.
          </div>
        ) : (
          <div className="space-y-3">
            {isClosed && (
              <div className="bg-gray-100 border border-gray-300 rounded-2xl px-4 py-3 text-sm text-gray-600 text-center font-medium">
                Día cerrado — solo lectura
              </div>
            )}
            {products.map((product) => (
              <InventoryForm
                key={product.id}
                product={{
                  id: product.id,
                  name: product.name,
                  category: product.category,
                  unit: product.unit,
                  minStock: product.minStock,
                  module: product.module,
                }}
                today={today}
                formType={formType}
                existing={product.records[0] ?? null}
                action={saveInventoryRecord}
                dayClosed={isClosed}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
