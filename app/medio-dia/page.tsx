export const dynamic = 'force-dynamic'

import Navbar from '@/components/Navbar'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Module } from '@prisma/client'
import { todayDate, MODULE_LABELS, MODULE_ICONS } from '@/lib/utils'

// Módulos sin columna "inicial" propia: su apertura se guarda como stock y el traslado de la mañana la reemplaza.
const COUNT_ONLY_MODULES: Module[] = [
  'SALSAS_ADEREZOS_RESTAURANTE',
  'VERDURAS_RESTAURANTE',
  'PAN_RESTAURANTE',
  'FRITURAS_RESTAURANTE',
]

export default async function MedioDiaPage() {
  const session = await getSession()
  if (!session || session.role !== 'OWNER') redirect('/dashboard')

  const today = todayDate()
  const records = await prisma.dailyRecord.findMany({
    where: {
      date: new Date(today),
      product: {
        active: true,
        module: { in: ['CARNES_PREPARADAS', 'BEBIDAS_SERVICIO', ...COUNT_ONLY_MODULES] },
      },
    },
    include: {
      product: { select: { name: true, module: true, unit: true } },
    },
    orderBy: [{ product: { module: 'asc' } }, { product: { name: 'asc' } }],
  })

  const carnes = records.filter((record) => record.product.module === 'CARNES_PREPARADAS')
  const bebidas = records.filter((record) => record.product.module === 'BEBIDAS_SERVICIO')
  const dateLabel = new Date(today + 'T12:00:00').toLocaleDateString('es-CR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 p-4 max-w-4xl mx-auto w-full">
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🕛</span>
            <div>
              <h1 className="text-xl font-bold">Corte de mediodía</h1>
              <p className="text-sm text-gray-500 capitalize">{dateLabel}</p>
            </div>
          </div>
          <p className="mt-3 text-sm text-gray-600 bg-orange-50 border border-orange-100 rounded-xl px-3 py-2">
            Consulta lo que se contó al medio día: el peso o conteo final de mediodía se registra en Recarga Restaurante.
          </p>
        </div>

        <section className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">🥩</span>
            <h2 className="text-lg font-bold">Carnes para servicio</h2>
            <span className="text-xs text-gray-400">{carnes.length} registradas</span>
          </div>
          <DataTable>
            <thead>
              <tr>
                <Header>Producto</Header>
                <Header>Inicial</Header>
                <Header>+ Mañana</Header>
                <Header>Peso final mediodía</Header>
                <Header>+ Mediodía</Header>
                <Header>Unidad</Header>
              </tr>
            </thead>
            <tbody>
              {carnes.map((record) => (
                <tr key={record.id} className="border-t border-gray-100">
                  <td className="px-4 py-3 font-medium">{record.product.name}</td>
                  <td className="px-4 py-3 text-right">{formatValue(record.initialWeight)}</td>
                  <td className="px-4 py-3 text-right text-blue-600">{formatValue(record.restockMorning)}</td>
                  <td className="px-4 py-3 text-right font-bold text-orange-600">{formatValue(record.waste1)}</td>
                  <td className="px-4 py-3 text-right text-blue-600">{formatValue(record.restock)}</td>
                  <td className="px-4 py-3 text-right text-gray-500">{record.product.unit}</td>
                </tr>
              ))}
            </tbody>
          </DataTable>
          {carnes.length === 0 && <Empty message="Todavía no hay pesos de carnes registrados hoy." />}
        </section>

        <section className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">🥤</span>
            <h2 className="text-lg font-bold">Bebidas de servicio</h2>
            <span className="text-xs text-gray-400">{bebidas.length} registradas</span>
          </div>
          <DataTable>
            <thead>
              <tr>
                <Header>Producto</Header>
                <Header>Inicial</Header>
                <Header>+ Mañana</Header>
                <Header>Final mediodía</Header>
                <Header>+ Mediodía</Header>
                <Header>Unidad</Header>
              </tr>
            </thead>
            <tbody>
              {bebidas.map((record) => (
                <tr key={record.id} className="border-t border-gray-100">
                  <td className="px-4 py-3 font-medium">{record.product.name}</td>
                  <td className="px-4 py-3 text-right">{formatValue(record.initialStock)}</td>
                  <td className="px-4 py-3 text-right text-blue-600">{formatValue(record.restockMorning)}</td>
                  <td className="px-4 py-3 text-right font-bold text-orange-600">{formatValue(record.midStock)}</td>
                  <td className="px-4 py-3 text-right text-blue-600">{formatValue(record.restock)}</td>
                  <td className="px-4 py-3 text-right text-gray-500">{record.product.unit}</td>
                </tr>
              ))}
            </tbody>
          </DataTable>
          {bebidas.length === 0 && <Empty message="Todavía no hay bebidas registradas hoy." />}
        </section>

        {COUNT_ONLY_MODULES.map((mod) => {
          const rows = records.filter((record) => record.product.module === mod)
          return (
            <section key={mod} className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">{MODULE_ICONS[mod]}</span>
                <h2 className="text-lg font-bold">{MODULE_LABELS[mod]}</h2>
                <span className="text-xs text-gray-400">{rows.length} registrados</span>
              </div>
              <DataTable>
                <thead>
                  <tr>
                    <Header>Producto</Header>
                    <Header>+ Mañana</Header>
                    <Header>Final mediodía</Header>
                    <Header>+ Mediodía</Header>
                    <Header>Unidad</Header>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((record) => (
                    <tr key={record.id} className="border-t border-gray-100">
                      <td className="px-4 py-3 font-medium">{record.product.name}</td>
                      <td className="px-4 py-3 text-right text-blue-600">{formatValue(record.restockMorning)}</td>
                      <td className="px-4 py-3 text-right font-bold text-orange-600">{formatValue(record.midStock)}</td>
                      <td className="px-4 py-3 text-right text-blue-600">{formatValue(record.restock)}</td>
                      <td className="px-4 py-3 text-right text-gray-500">{record.product.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </DataTable>
              {rows.length === 0 && <Empty message="Todavía no hay registros de este módulo hoy." />}
            </section>
          )
        })}
      </main>
    </div>
  )
}

function DataTable({ children }: { children: React.ReactNode }) {
  return <div className="bg-white rounded-2xl border border-gray-200 overflow-x-auto"><table className="w-full text-sm">{children}</table></div>
}

function Header({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-3 text-left text-xs text-gray-500 uppercase tracking-wide font-semibold whitespace-nowrap">{children}</th>
}

function Empty({ message }: { message: string }) {
  return <div className="bg-white border border-gray-200 rounded-2xl px-4 py-6 text-center text-sm text-gray-500">{message}</div>
}

function formatValue(value: number | null) {
  return value === null ? '—' : Number.isInteger(value) ? value : value.toFixed(2)
}
