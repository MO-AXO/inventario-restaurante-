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

type StockRecord = {
  currentStock: number | null
  initialWeight: number | null
  waste1: number | null
  restock: number | null
  finalWeight: number | null
  initialStock: number | null
  midStock: number | null
  finalStock: number | null
}

// Unidades realmente disponibles de un producto de restaurante.
// Carnes y bebidas de servicio: final físico si existe; si no, mediodía (o inicial) + recarga.
export function availableStock(mod: Module, r: StockRecord | null | undefined): number | null {
  if (!r) return null
  const isCarnes = CARNES_SERVICIO_MODULES.includes(mod)
  const isBeverage = BEVERAGE_SERVICE_MODULES.includes(mod)
  if (!isCarnes && !isBeverage) return r.currentStock

  const initial = (isCarnes ? r.initialWeight : r.initialStock) ?? 0
  const mid = isCarnes ? r.waste1 : r.midStock
  const final = isCarnes ? r.finalWeight : r.finalStock
  // Un final en 0 con inicial positivo y sin mediodía es un final que nunca se capturó.
  const finalNotCaptured = final === 0 && initial > 0 && !mid
  if (final !== null && !finalNotCaptured) return final
  const base = finalNotCaptured ? initial : (mid ?? initial)
  return base + (r.restock ?? 0)
}
