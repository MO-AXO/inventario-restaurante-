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
  VERDURAS_RESTAURANTE:         'Verduras Restaurante',
  HARINAS_ACEITE_RESTAURANTE:   'Harinas y Aceite Restaurante',
  HARINAS_ACEITE_BODEGA:        'Harinas y Aceite Bodega',
  LACTEOS_RESTAURANTE:          'Lácteos Restaurante',
  LACTEOS_BODEGA:               'Lácteos Bodega',
  CONDIMENTOS_RESTAURANTE:      'Condimentos Restaurante',
  DESECHABLES_BOLSAS_RESTAURANTE: 'Desechables y Bolsas Restaurante',
  DESECHABLES_BODEGA:           'Desechables Bodega',
  SALSAS_ADEREZOS_RESTAURANTE:  'Salsa y Aderezos Restaurante',
  LIMPIEZA_RESTAURANTE:         'Limpieza Restaurante',
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
  VERDURAS_RESTAURANTE:         '🥬',
  HARINAS_ACEITE_RESTAURANTE:   '🌾',
  HARINAS_ACEITE_BODEGA:        '🛢️',
  LACTEOS_RESTAURANTE:          '🧀',
  LACTEOS_BODEGA:               '🥛',
  CONDIMENTOS_RESTAURANTE:      '🧂',
  DESECHABLES_BOLSAS_RESTAURANTE: '🛍️',
  DESECHABLES_BODEGA:           '📫',
  SALSAS_ADEREZOS_RESTAURANTE:  '🌶️',
  LIMPIEZA_RESTAURANTE:         '🧹',
}

export function calcStatus(currentStock: number | null, minStock: number): StockStatus {
  if (currentStock === null || currentStock === undefined) return 'CRITICO'
  if (currentStock === 0) return 'CRITICO'
  if (currentStock <= minStock) return 'CRITICO'
  if (currentStock <= minStock * 1.5) return 'BAJO'
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
  return new Date().toISOString().split('T')[0]
}

// Which modules use weight tracking (initial/waste/restock/final)
export const WEIGHT_MODULES: Module[] = ['CARNES_PREPARADAS', 'CARNE_CRUDA', 'VERDURAS']

// Which modules track smoked meats (units + weight)
export const SMOKED_MODULES: Module[] = ['CARNES_AHUMADAS']

// Which modules track beverage service (initial/restock/final/consumption)
export const BEVERAGE_SERVICE_MODULES: Module[] = ['BEBIDAS_SERVICIO']

// Modules with simple stock entry
export const SIMPLE_STOCK_MODULES: Module[] = [
  'BEBIDAS_BODEGA', 'SALSAS', 'COCINA', 'SERVICIO', 'BODEGA', 'DESECHABLES',
  'GUARNICIONES', 'VERDURAS_RESTAURANTE', 'HARINAS_ACEITE_RESTAURANTE',
  'HARINAS_ACEITE_BODEGA', 'LACTEOS_RESTAURANTE', 'LACTEOS_BODEGA',
  'CONDIMENTOS_RESTAURANTE', 'DESECHABLES_BOLSAS_RESTAURANTE', 'DESECHABLES_BODEGA',
  'SALSAS_ADEREZOS_RESTAURANTE', 'LIMPIEZA_RESTAURANTE',
]
