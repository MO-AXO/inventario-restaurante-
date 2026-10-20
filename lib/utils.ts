import { Module, StockStatus } from '@prisma/client'

export const MODULE_LABELS: Record<Module, string> = {
  CARNES_PREPARADAS:            'Carnes para Servicio',
  CARNES_AHUMADAS:              'Carnes Ahumadas',
  CARNE_CRUDA:                  'Carne Cruda',
  VERDURAS:                     'Verduras',
  BEBIDAS_BODEGA:               'Bebidas Bodega',
  BEBIDAS_SERVICIO:             'Bebidas Servicio',
  SALSAS:                       'Salsas',
  COCINA:                       'Cocina',
  SERVICIO:                     'Servicio',
  BODEGA:                       'Bodega',
  DESECHABLES:                  'Desechables',
  GUARNICIONES:                 'Guarniciones',
  FRITURAS_RESTAURANTE:         'Frituras Restaurante',
  VERDURAS_RESTAURANTE:         'Verduras Restaurante',
  HARINAS_ACEITE_RESTAURANTE:   'Harinas y Aceite Restaurante',
  HARINAS_ACEITE_BODEGA:        'Harinas y Aceite Bodega',
  PAN:                          'Pan Bodega',
  PAN_RESTAURANTE:              'Pan Restaurante',
  FRITURAS:                     'Frituras',
  LACTEOS_RESTAURANTE:          'Lácteos Restaurante',
  LACTEOS_BODEGA:               'Lácteos Bodega',
  CONDIMENTOS_RESTAURANTE:      'Condimentos Restaurante',
  DESECHABLES_BOLSAS_RESTAURANTE: 'Desechables y Bolsas Restaurante',
  DESECHABLES_BODEGA:           'Desechables Bodega',
  SALSAS_ADEREZOS_RESTAURANTE:  'Salsa y Aderezos Restaurante',
  LIMPIEZA_RESTAURANTE:         'Limpieza Restaurante',
  SALSAS_ADEREZOS_BODEGA:       'Salsas y Aderezos Bodega',
  CONDIMENTOS_BODEGA:           'Condimentos Bodega',
  MATERIA_PRIMA_SALSA:          'Materia Prima Salsa',
  LIMPIEZA_BODEGA:              'Limpieza Bodega',
}

export const MODULE_ICONS: Record<Module, string> = {
  CARNES_PREPARADAS:            '🥩',
  CARNES_AHUMADAS:              '🔥',
  CARNE_CRUDA:                  '🫀',
  VERDURAS:                     '🥦',
  BEBIDAS_BODEGA:               '🍺',
  BEBIDAS_SERVICIO:             '🥤',
  SALSAS:                       '🫙',
  COCINA:                       '🍳',
  SERVICIO:                     '🍽️',
  BODEGA:                       '📦',
  DESECHABLES:                  '🗑️',
  GUARNICIONES:                 '🍟',
  FRITURAS_RESTAURANTE:         '🍟',
  VERDURAS_RESTAURANTE:         '🥬',
  HARINAS_ACEITE_RESTAURANTE:   '🌾',
  HARINAS_ACEITE_BODEGA:        '🛢️',
  PAN:                          '🍞',
  PAN_RESTAURANTE:              '🍞',
  FRITURAS:                     '🍟',
  LACTEOS_RESTAURANTE:          '🧀',
  LACTEOS_BODEGA:               '🥛',
  CONDIMENTOS_RESTAURANTE:      '🧂',
  DESECHABLES_BOLSAS_RESTAURANTE: '🛍️',
  DESECHABLES_BODEGA:           '📫',
  SALSAS_ADEREZOS_RESTAURANTE:  '🌶️',
  LIMPIEZA_RESTAURANTE:         '🧹',
  SALSAS_ADEREZOS_BODEGA:       '🥫',
  CONDIMENTOS_BODEGA:           '🫚',
  MATERIA_PRIMA_SALSA:          '🌿',
  LIMPIEZA_BODEGA:              '🧴',
}

export function calcStatus(currentStock: number | null, minStock: number): StockStatus {
  if (currentStock === null || currentStock === undefined) return 'CRITICO'
  if (currentStock === 0) return 'CRITICO'
  if (currentStock < minStock) return 'CRITICO'
  if (currentStock === minStock) return 'BAJO'
  return 'OK'
}

export function statusColor(status: StockStatus) {
  if (status === 'CRITICO') return 'bg-red-500 text-white'
  if (status === 'BAJO') return 'bg-yellow-400 text-black'
  return 'bg-green-500 text-white'
}

export function statusBadge(status: StockStatus) {
  if (status === 'CRITICO') return 'CRÍTICO'
  if (status === 'BAJO') return 'BAJO'
  return 'OK'
}

export function todayDate() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Costa_Rica' })
}

export const SECTION_GROUPS: { label: string; icon: string; modules: Module[] }[] = [
  {
    label: 'Bodega',
    icon: '📦',
    modules: [
      'BEBIDAS_BODEGA',
      'LACTEOS_BODEGA',
      'SALSAS_ADEREZOS_BODEGA',
      'CONDIMENTOS_BODEGA',
      'DESECHABLES_BODEGA',
      'HARINAS_ACEITE_BODEGA',
      'PAN',
      'FRITURAS',
      'VERDURAS',
      'CARNE_CRUDA',
      'CARNES_AHUMADAS',
      'MATERIA_PRIMA_SALSA',
      'LIMPIEZA_BODEGA',
    ],
  },
  {
    label: 'Restaurante',
    icon: '🍽️',
    modules: [
      'CARNES_PREPARADAS',
      'BEBIDAS_SERVICIO',
      'SALSAS_ADEREZOS_RESTAURANTE',
      'DESECHABLES_BOLSAS_RESTAURANTE',
      'CONDIMENTOS_RESTAURANTE',
      'LACTEOS_RESTAURANTE',
      'PAN_RESTAURANTE',
      'FRITURAS_RESTAURANTE',
      'HARINAS_ACEITE_RESTAURANTE',
      'VERDURAS_RESTAURANTE',
      'LIMPIEZA_RESTAURANTE',
    ],
  },
]

// Carnes para Servicio — 4-point weigh: initial / mid-day final / restock / end-of-day final
export const BODEGA_MODULES: Module[] = SECTION_GROUPS[0].modules

export const RESTAURANTE_MODULES: Module[] = SECTION_GROUPS[1].modules

export const CARNES_SERVICIO_MODULES: Module[] = ['CARNES_PREPARADAS']

// Which modules use weight tracking (initial/waste1/restock/waste2 → calculated final)
export const WEIGHT_MODULES: Module[] = ['CARNE_CRUDA']

// Which modules track smoked meats (units + weight)
export const SMOKED_MODULES: Module[] = ['CARNES_AHUMADAS']

// Which modules track beverage service (initial/restock/final/consumption)
export const BEVERAGE_SERVICE_MODULES: Module[] = ['BEBIDAS_SERVICIO']

// Which modules track bodega stock with initial + restock → auto-calculated final
export const BODEGA_STOCK_MODULES: Module[] = ['DESECHABLES_BODEGA']

// Restaurante modules that restock from a matching bodega module (same product name)
export const RESTAURANTE_RESTOCK_MAP: Partial<Record<Module, Module>> = {
  SALSAS_ADEREZOS_RESTAURANTE:    'SALSAS_ADEREZOS_BODEGA',
  VERDURAS_RESTAURANTE:           'VERDURAS',
  LACTEOS_RESTAURANTE:            'LACTEOS_BODEGA',
  DESECHABLES_BOLSAS_RESTAURANTE: 'DESECHABLES_BODEGA',
}

// Modules with simple stock entry
export const SIMPLE_STOCK_MODULES: Module[] = [
  'VERDURAS', 'BEBIDAS_BODEGA', 'SALSAS', 'COCINA', 'SERVICIO', 'BODEGA', 'DESECHABLES',
  'GUARNICIONES', 'FRITURAS_RESTAURANTE', 'HARINAS_ACEITE_RESTAURANTE',
  'HARINAS_ACEITE_BODEGA', 'PAN', 'PAN_RESTAURANTE', 'FRITURAS', 'LACTEOS_BODEGA',
  'CONDIMENTOS_RESTAURANTE',
  'LIMPIEZA_RESTAURANTE',
  'SALSAS_ADEREZOS_BODEGA', 'CONDIMENTOS_BODEGA', 'MATERIA_PRIMA_SALSA', 'LIMPIEZA_BODEGA',
]

// A qué módulo de Bodega pertenece cada módulo del restaurante. Se usa junto con el ID compartido.
export const WAREHOUSE_FOR_RESTAURANT: Partial<Record<Module, Module>> = {
  BEBIDAS_SERVICIO:               'BEBIDAS_BODEGA',
  SALSAS_ADEREZOS_RESTAURANTE:    'SALSAS_ADEREZOS_BODEGA',
  VERDURAS_RESTAURANTE:           'VERDURAS',
  LACTEOS_RESTAURANTE:            'LACTEOS_BODEGA',
  DESECHABLES_BOLSAS_RESTAURANTE: 'DESECHABLES_BODEGA',
  PAN_RESTAURANTE:                'PAN',
  FRITURAS_RESTAURANTE:           'FRITURAS',
  HARINAS_ACEITE_RESTAURANTE:     'HARINAS_ACEITE_BODEGA',
  CONDIMENTOS_RESTAURANTE:        'CONDIMENTOS_BODEGA',
  LIMPIEZA_RESTAURANTE:           'LIMPIEZA_BODEGA',
  CARNES_PREPARADAS:              'CARNES_AHUMADAS',
}

// Stock actual de un producto de Bodega; cada módulo lo guarda en un campo distinto.
export function warehouseStock(
  mod: Module,
  r: { currentStock: number | null; finalStock: number | null; weightLb: number | null } | null | undefined
): number {
  if (!r) return 0
  if (BODEGA_STOCK_MODULES.includes(mod)) return r.finalStock ?? r.currentStock ?? 0
  if (SMOKED_MODULES.includes(mod)) return r.weightLb ?? r.currentStock ?? 0
  return r.currentStock ?? 0
}

// Módulos de restaurante que se cuentan al mediodía, antes de la recarga de la noche.
// Los demás (desechables, condimentos, lácteos, harinas y limpieza) solo se cuentan al abrir y al cerrar.
export const MIDDAY_COUNT_MODULES: Module[] = [
  'CARNES_PREPARADAS',
  'BEBIDAS_SERVICIO',
  'SALSAS_ADEREZOS_RESTAURANTE',
  'VERDURAS_RESTAURANTE',
  'PAN_RESTAURANTE',
  'FRITURAS_RESTAURANTE',
]

// Módulos de restaurante con el mismo flujo que las bebidas: inicial → recargas → (mediodía) → final.
// Carnes y bebidas tienen su propio formulario.
export const STANDARD_RESTAURANT_MODULES: Module[] = RESTAURANTE_MODULES.filter(
  (m) => !CARNES_SERVICIO_MODULES.includes(m) && !BEVERAGE_SERVICE_MODULES.includes(m)
)

// Módulos donde se calcula consumo (inicial + recargas - final).
export const CONSUMPTION_MODULES: Module[] = [
  ...CARNES_SERVICIO_MODULES,
  ...BEVERAGE_SERVICE_MODULES,
  ...STANDARD_RESTAURANT_MODULES,
]

// El conteo de mediodía de las carnes vive en waste1; en los demás módulos, en midStock.
export function readMidCount(
  mod: Module,
  r: { waste1: number | null; midStock: number | null } | null | undefined
): number | null {
  if (!r) return null
  return CARNES_SERVICIO_MODULES.includes(mod) ? r.waste1 : r.midStock
}

type StockRecord = {
  currentStock: number | null
  initialWeight: number | null
  waste1: number | null
  restock: number | null
  restockMorning: number | null
  returnedQty?: number | null
  wasteQty?: number | null
  finalWeight: number | null
  initialStock: number | null
  midStock: number | null
  finalStock: number | null
}

export function round3(n: number) {
  return Math.round(n * 1000) / 1000
}

// Carnes ahumadas que regresan a Bodega al cerrar el servicio de la noche (por ID compartido).
// Del final contado, una parte regresa y otra se bota como merma; el resto se queda en el restaurante.
export const RETURNABLE_SHARED_IDS: string[] = [
  'carne-brisket-ahumado',
  'carne-costilla-de-cerdo-ahumada',
  'carne-costillas-de-res-ahumadas',
  'carne-pork-belly-ahumado',
  'carne-pulled-pork-ahumado',
  'carne-puyaso-ahumado',
]

// Cierre de las carnes que regresan: todo lo que sobra vuelve a Bodega, menos la merma que se bota.
// Devuelto = peso final - merma. Es válido mientras la merma no supere el peso final.
export function closingBalance(input: { final: number; waste: number }) {
  const waste = round3(input.waste)
  const returned = round3(input.final - waste)
  return { returned, waste, remaining: 0, valid: waste >= 0 && returned >= 0 }
}

// Unidades realmente disponibles de un producto de restaurante.
// Carnes y bebidas de servicio: final físico si existe; si no, conteo de mediodía + recarga de mediodía,
// o, sin conteo de mediodía, inicial + recarga de la mañana + recarga de mediodía.
export function availableStock(mod: Module, r: StockRecord | null | undefined): number | null {
  if (!r) return null
  const isCarnes = CARNES_SERVICIO_MODULES.includes(mod)
  const isBeverage = BEVERAGE_SERVICE_MODULES.includes(mod)

  if (STANDARD_RESTAURANT_MODULES.includes(mod)) {
    // Final escrito > conteo de mediodía + recarga de mediodía > inicial + recargas.
    // Un registro viejo con solo "stock actual" se respeta tal cual.
    if (r.finalStock !== null) return r.finalStock
    if (r.midStock !== null) return r.midStock + (r.restock ?? 0)
    if (r.initialStock !== null) return r.initialStock + (r.restockMorning ?? 0) + (r.restock ?? 0)
    return r.currentStock
  }
  if (!isCarnes && !isBeverage) return r.currentStock

  const initial = (isCarnes ? r.initialWeight : r.initialStock) ?? 0
  const mid = isCarnes ? r.waste1 : r.midStock
  const final = isCarnes ? r.finalWeight : r.finalStock
  // Un final en 0 con inicial positivo y sin mediodía es un final que nunca se capturó.
  const finalNotCaptured = final === 0 && initial > 0 && !mid
  // El final de las carnes se cuenta antes de devolver o botar; lo disponible es lo que se queda en el restaurante.
  if (final !== null && !finalNotCaptured) {
    // Si ya se cerró la noche (hay devolución o merma), esa carne volvió a Bodega o se botó: no queda nada.
    const closed = isCarnes && ((r.returnedQty ?? 0) > 0 || (r.wasteQty ?? 0) > 0)
    return closed ? Math.max(0, round3(final - (r.returnedQty ?? 0) - (r.wasteQty ?? 0))) : final
  }
  if (mid !== null && !finalNotCaptured) return mid + (r.restock ?? 0)
  return initial + (r.restockMorning ?? 0) + (r.restock ?? 0)
}

// El inventario final de un día pasa a ser el inicial del siguiente en todos los módulos del restaurante,
// menos Carnes para Servicio, donde el inicial se pesa cada día.
export const CARRY_OVER_MODULES: Module[] = RESTAURANTE_MODULES.filter((m) => !CARNES_SERVICIO_MODULES.includes(m))

export type CarriedFrom = { date: string; estimated: boolean }

// Si el último registro es de un día anterior, devuelve un registro "de arranque" para hoy: el inicial es lo que
// quedó disponible y se limpian conteos y recargas de ayer. No escribe nada; solo prepara lo que ve el formulario.
// Lo que pasa a ser el inicial del día siguiente. Bebidas: el final se deduce de availableStock.
// Resto de módulos: primero el "Inventario final" escrito y, si no hay, el último stock guardado.
export function carriedStock(mod: Module, record: StockRecord | null | undefined): number {
  if (!record) return 0
  if (BEVERAGE_SERVICE_MODULES.includes(mod)) return availableStock(mod, record) ?? 0
  return record.finalStock ?? record.currentStock ?? 0
}

export function carryOverRecord<T extends StockRecord & { date: Date; consumption: number | null }>(
  mod: Module,
  record: T | null | undefined,
  today: string
): { record: T | null; carriedFrom: CarriedFrom | null } {
  if (!record) return { record: null, carriedFrom: null }
  const recordDate = record.date.toISOString().split('T')[0]

  if (recordDate >= today) {
    // Registro de hoy en formato viejo (solo "stock actual"): ese número se lee como el inicial.
    if (STANDARD_RESTAURANT_MODULES.includes(mod) && record.initialStock === null && record.currentStock !== null) {
      return { record: { ...record, initialStock: record.currentStock }, carriedFrom: null }
    }
    return { record, carriedFrom: null }
  }
  if (!CARRY_OVER_MODULES.includes(mod)) return { record, carriedFrom: null }

  const isBeverage = BEVERAGE_SERVICE_MODULES.includes(mod)
  const carried = carriedStock(mod, record)
  const finalCaptured = isBeverage
    ? record.finalStock !== null &&
      !(record.finalStock === 0 && (record.initialStock ?? 0) > 0 && !record.midStock)
    : record.finalStock !== null
  const carriedRecord = {
    ...record,
    currentStock: carried,
    initialStock: carried,
    midStock: null,
    finalStock: null,
    restock: null,
    restockMorning: null,
    consumption: null,
  } as T
  return { record: carriedRecord, carriedFrom: { date: recordDate, estimated: !finalCaptured } }
}
