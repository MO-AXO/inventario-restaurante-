import { PrismaClient, Module } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Create default owner
  const ownerPin = await bcrypt.hash('1234', 10)
  const employeePin = await bcrypt.hash('0000', 10)

  await prisma.user.upsert({
    where: { id: 'owner-1' },
    update: {},
    create: { id: 'owner-1', name: 'Dueño', pin: ownerPin, role: 'OWNER' },
  })
  await prisma.user.upsert({
    where: { id: 'emp-1' },
    update: {},
    create: { id: 'emp-1', name: 'Empleado', pin: employeePin, role: 'EMPLOYEE' },
  })

  const products = [
    // ── CARNES PREPARADAS ──
    { name: 'Pulled Pork',            category: 'Carnes', module: 'CARNES_PREPARADAS', unit: 'LB',    minStock: 5  },
    { name: 'Costilla de Cerdo',       category: 'Carnes', module: 'CARNES_PREPARADAS', unit: 'LB',    minStock: 5  },
    { name: 'Pork Belly',             category: 'Carnes', module: 'CARNES_PREPARADAS', unit: 'LB',    minStock: 5  },
    { name: 'Brisket',                category: 'Carnes', module: 'CARNES_PREPARADAS', unit: 'LB',    minStock: 5  },
    { name: 'Muslos de Pollo',         category: 'Carnes', module: 'CARNES_PREPARADAS', unit: 'LB',    minStock: 5  },
    { name: 'Tortitas para Hamburguesa', category: 'Carnes', module: 'CARNES_PREPARADAS', unit: 'unidad', minStock: 10 },
    { name: 'Texas Twinkies',         category: 'Carnes', module: 'CARNES_PREPARADAS', unit: 'unidad', minStock: 8  },
    { name: 'Puyaso',                 category: 'Carnes', module: 'CARNES_PREPARADAS', unit: 'LB',    minStock: 3  },

    // ── CARNES AHUMADAS ──
    { name: 'Costilla de Cerdo',      category: 'Ahumadas', module: 'CARNES_AHUMADAS', unit: 'LB', minStock: 20 },
    { name: 'Brisket',                category: 'Ahumadas', module: 'CARNES_AHUMADAS', unit: 'LB', minStock: 10 },
    { name: 'Pork Belly',             category: 'Ahumadas', module: 'CARNES_AHUMADAS', unit: 'LB', minStock: 20 },
    { name: 'Pulled Pork',            category: 'Ahumadas', module: 'CARNES_AHUMADAS', unit: 'LB', minStock: 30 },
    { name: 'Puyaso',                 category: 'Ahumadas', module: 'CARNES_AHUMADAS', unit: 'LB', minStock: 5  },
    { name: 'Muslos de Pollo',        category: 'Ahumadas', module: 'CARNES_AHUMADAS', unit: 'unidad', minStock: 15 },
    { name: 'Tortitas de Carne',      category: 'Ahumadas', module: 'CARNES_AHUMADAS', unit: 'unidad', minStock: 10 },
    { name: 'Texas Twinkies',         category: 'Ahumadas', module: 'CARNES_AHUMADAS', unit: 'unidad', minStock: 8  },

    // ── CARNE CRUDA ──
    { name: 'Costilla de Cerdo',      category: 'Carne Cruda', module: 'CARNE_CRUDA', unit: 'LB', minStock: 0 },
    { name: 'Brisket',                category: 'Carne Cruda', module: 'CARNE_CRUDA', unit: 'LB', minStock: 0 },
    { name: 'Panceta',                category: 'Carne Cruda', module: 'CARNE_CRUDA', unit: 'LB', minStock: 0 },
    { name: 'Nuca de Cerdo',          category: 'Carne Cruda', module: 'CARNE_CRUDA', unit: 'LB', minStock: 0 },
    { name: 'Puyaso',                 category: 'Carne Cruda', module: 'CARNE_CRUDA', unit: 'LB', minStock: 0 },
    { name: 'Muslos de Pollo',        category: 'Carne Cruda', module: 'CARNE_CRUDA', unit: 'LB', minStock: 0 },
    { name: 'Carne Molida',           category: 'Carne Cruda', module: 'CARNE_CRUDA', unit: 'LB', minStock: 0 },
    { name: 'Carne para moler',       category: 'Carne Cruda', module: 'CARNE_CRUDA', unit: 'LB', minStock: 0 },

    // ── VERDURAS ──
    { name: 'Papa',                   category: 'Verduras', module: 'VERDURAS', unit: 'LB', minStock: 5  },
    { name: 'Zanahoria',              category: 'Verduras', module: 'VERDURAS', unit: 'LB', minStock: 3  },
    { name: 'Repollo Blanco',         category: 'Verduras', module: 'VERDURAS', unit: 'LB', minStock: 5  },
    { name: 'Repollo Morado',         category: 'Verduras', module: 'VERDURAS', unit: 'LB', minStock: 3  },
    { name: 'Camote',                 category: 'Verduras', module: 'VERDURAS', unit: 'LB', minStock: 5  },
    { name: 'Arugula',                category: 'Verduras', module: 'VERDURAS', unit: 'LB', minStock: 1  },
    { name: 'Cebolla Morada',         category: 'Verduras', module: 'VERDURAS', unit: 'LB', minStock: 2  },
    { name: 'Cebolla Blanca',         category: 'Verduras', module: 'VERDURAS', unit: 'LB', minStock: 3  },
    { name: 'Jalapeño',               category: 'Verduras', module: 'VERDURAS', unit: 'LB', minStock: 1  },

    // ── BEBIDAS BODEGA ──
    { name: 'Coca-Cola vidrio',       category: 'Refrescos', module: 'BEBIDAS_BODEGA', unit: 'unidad', minStock: 48 },
    { name: 'Coca-Cola zero vidrio',  category: 'Refrescos', module: 'BEBIDAS_BODEGA', unit: 'unidad', minStock: 48 },
    { name: 'Sprite',                 category: 'Refrescos', module: 'BEBIDAS_BODEGA', unit: 'unidad', minStock: 24 },
    { name: 'Coca cola lata',         category: 'Refrescos', module: 'BEBIDAS_BODEGA', unit: 'unidad', minStock: 24 },
    { name: 'Coca cola zero lata',    category: 'Refrescos', module: 'BEBIDAS_BODEGA', unit: 'unidad', minStock: 24 },
    { name: 'Tropical uva',           category: 'Refrescos', module: 'BEBIDAS_BODEGA', unit: 'unidad', minStock: 24 },
    { name: 'Tropical fresa',         category: 'Refrescos', module: 'BEBIDAS_BODEGA', unit: 'unidad', minStock: 24 },
    { name: 'Pepsi black',            category: 'Refrescos', module: 'BEBIDAS_BODEGA', unit: 'unidad', minStock: 12 },
    { name: 'Pepsi',                  category: 'Refrescos', module: 'BEBIDAS_BODEGA', unit: 'unidad', minStock: 12 },
    { name: 'Kolashampan',            category: 'Refrescos', module: 'BEBIDAS_BODEGA', unit: 'unidad', minStock: 24 },
    { name: 'Salutari de limón',      category: 'Refrescos', module: 'BEBIDAS_BODEGA', unit: 'unidad', minStock: 24 },
    { name: 'Salutari de naranja',    category: 'Refrescos', module: 'BEBIDAS_BODEGA', unit: 'unidad', minStock: 24 },
    { name: 'Salutari de toronja',    category: 'Refrescos', module: 'BEBIDAS_BODEGA', unit: 'unidad', minStock: 24 },
    { name: 'Agua mineral',           category: 'Refrescos', module: 'BEBIDAS_BODEGA', unit: 'unidad', minStock: 24 },
    { name: 'Te limón',               category: 'Refrescos', module: 'BEBIDAS_BODEGA', unit: 'unidad', minStock: 24 },
    { name: 'Te de frambuesa',        category: 'Refrescos', module: 'BEBIDAS_BODEGA', unit: 'unidad', minStock: 24 },
    { name: 'Te de durazno',          category: 'Refrescos', module: 'BEBIDAS_BODEGA', unit: 'unidad', minStock: 24 },
    { name: 'Botella con agua',       category: 'Refrescos', module: 'BEBIDAS_BODEGA', unit: 'unidad', minStock: 24 },
    { name: 'Regia chola 750ml',      category: 'Cervezas',  module: 'BEBIDAS_BODEGA', unit: 'unidad', minStock: 24 },
    { name: 'Regia paq 355',          category: 'Cervezas',  module: 'BEBIDAS_BODEGA', unit: 'unidad', minStock: 24 },
    { name: 'Regia lata',             category: 'Cervezas',  module: 'BEBIDAS_BODEGA', unit: 'unidad', minStock: 24 },
    { name: 'Ultra',                  category: 'Cervezas',  module: 'BEBIDAS_BODEGA', unit: 'unidad', minStock: 12 },
    { name: 'Suprema',                category: 'Cervezas',  module: 'BEBIDAS_BODEGA', unit: 'unidad', minStock: 12 },
    { name: 'Pilsener',               category: 'Cervezas',  module: 'BEBIDAS_BODEGA', unit: 'unidad', minStock: 24 },
    { name: 'Pilsener lata',          category: 'Cervezas',  module: 'BEBIDAS_BODEGA', unit: 'unidad', minStock: 12 },
    { name: 'Estrella Damm',          category: 'Cervezas',  module: 'BEBIDAS_BODEGA', unit: 'unidad', minStock: 6  },
    { name: 'Corona',                 category: 'Cervezas',  module: 'BEBIDAS_BODEGA', unit: 'unidad', minStock: 12 },
    { name: 'Corona Zero',            category: 'Cervezas',  module: 'BEBIDAS_BODEGA', unit: 'unidad', minStock: 6  },
    { name: 'Modelo',                 category: 'Cervezas',  module: 'BEBIDAS_BODEGA', unit: 'unidad', minStock: 6  },
    { name: 'Cadejo Negra',           category: 'Cervezas',  module: 'BEBIDAS_BODEGA', unit: 'unidad', minStock: 12 },
    { name: 'Cadejo hija de pooh',    category: 'Cervezas',  module: 'BEBIDAS_BODEGA', unit: 'unidad', minStock: 12 },
    { name: 'Cadejo mera belga',      category: 'Cervezas',  module: 'BEBIDAS_BODEGA', unit: 'unidad', minStock: 12 },
    { name: 'Heineken 0',             category: 'Cervezas',  module: 'BEBIDAS_BODEGA', unit: 'unidad', minStock: 6  },
    { name: 'Stella Artois',          category: 'Cervezas',  module: 'BEBIDAS_BODEGA', unit: 'unidad', minStock: 6  },

    // ── BEBIDAS SERVICIO ──
    { name: 'Coca-Cola vidrio',       category: 'Refrescos', module: 'BEBIDAS_SERVICIO', unit: 'unidad', minStock: 10 },
    { name: 'Coca-Cola zero vidrio',  category: 'Refrescos', module: 'BEBIDAS_SERVICIO', unit: 'unidad', minStock: 10 },
    { name: 'Coca cola lata',         category: 'Refrescos', module: 'BEBIDAS_SERVICIO', unit: 'unidad', minStock: 10 },
    { name: 'Coca cola zero lata',    category: 'Refrescos', module: 'BEBIDAS_SERVICIO', unit: 'unidad', minStock: 10 },
    { name: 'Sprite',                 category: 'Refrescos', module: 'BEBIDAS_SERVICIO', unit: 'unidad', minStock: 10 },
    { name: 'Tropical uva',           category: 'Refrescos', module: 'BEBIDAS_SERVICIO', unit: 'unidad', minStock: 5  },
    { name: 'Pepsi black',            category: 'Refrescos', module: 'BEBIDAS_SERVICIO', unit: 'unidad', minStock: 5  },
    { name: 'Pepsi',                  category: 'Refrescos', module: 'BEBIDAS_SERVICIO', unit: 'unidad', minStock: 5  },
    { name: 'Kolashampan',            category: 'Refrescos', module: 'BEBIDAS_SERVICIO', unit: 'unidad', minStock: 5  },
    { name: 'Salutari de limón',      category: 'Refrescos', module: 'BEBIDAS_SERVICIO', unit: 'unidad', minStock: 5  },
    { name: 'Salutari de naranja',    category: 'Refrescos', module: 'BEBIDAS_SERVICIO', unit: 'unidad', minStock: 5  },
    { name: 'Salutari de toronja',    category: 'Refrescos', module: 'BEBIDAS_SERVICIO', unit: 'unidad', minStock: 5  },
    { name: 'Agua mineral',           category: 'Refrescos', module: 'BEBIDAS_SERVICIO', unit: 'unidad', minStock: 5  },
    { name: 'Te limón',               category: 'Refrescos', module: 'BEBIDAS_SERVICIO', unit: 'unidad', minStock: 5  },
    { name: 'Te de frambuesa',        category: 'Refrescos', module: 'BEBIDAS_SERVICIO', unit: 'unidad', minStock: 5  },
    { name: 'Te de durazno',          category: 'Refrescos', module: 'BEBIDAS_SERVICIO', unit: 'unidad', minStock: 5  },
    { name: 'Botella con agua',       category: 'Refrescos', module: 'BEBIDAS_SERVICIO', unit: 'unidad', minStock: 5  },
    { name: 'Regia chola 750ml',      category: 'Cervezas',  module: 'BEBIDAS_SERVICIO', unit: 'unidad', minStock: 5  },
    { name: 'Regia paq 355',          category: 'Cervezas',  module: 'BEBIDAS_SERVICIO', unit: 'unidad', minStock: 5  },
    { name: 'Regia lata',             category: 'Cervezas',  module: 'BEBIDAS_SERVICIO', unit: 'unidad', minStock: 5  },
    { name: 'Ultra',                  category: 'Cervezas',  module: 'BEBIDAS_SERVICIO', unit: 'unidad', minStock: 3  },
    { name: 'Suprema',                category: 'Cervezas',  module: 'BEBIDAS_SERVICIO', unit: 'unidad', minStock: 5  },
    { name: 'Corona',                 category: 'Cervezas',  module: 'BEBIDAS_SERVICIO', unit: 'unidad', minStock: 3  },
    { name: 'Heineken 0',             category: 'Cervezas',  module: 'BEBIDAS_SERVICIO', unit: 'unidad', minStock: 3  },
    { name: 'Stella Artois',          category: 'Cervezas',  module: 'BEBIDAS_SERVICIO', unit: 'unidad', minStock: 3  },
    { name: 'Tropical fresa',          category: 'Refrescos', module: 'BEBIDAS_SERVICIO', unit: 'unidad', minStock: 5  },
    { name: 'Pilsener',                category: 'Cervezas',  module: 'BEBIDAS_SERVICIO', unit: 'unidad', minStock: 5  },
    { name: 'Pilsener lata',           category: 'Cervezas',  module: 'BEBIDAS_SERVICIO', unit: 'unidad', minStock: 5  },
    { name: 'Estrella Damm',           category: 'Cervezas',  module: 'BEBIDAS_SERVICIO', unit: 'unidad', minStock: 5  },
    { name: 'Corona Zero',             category: 'Cervezas',  module: 'BEBIDAS_SERVICIO', unit: 'unidad', minStock: 5  },
    { name: 'Modelo',                  category: 'Cervezas',  module: 'BEBIDAS_SERVICIO', unit: 'unidad', minStock: 5  },
    { name: 'Cadejo Negra',            category: 'Cervezas',  module: 'BEBIDAS_SERVICIO', unit: 'unidad', minStock: 5  },
    { name: 'Cadejo hija de pooh',     category: 'Cervezas',  module: 'BEBIDAS_SERVICIO', unit: 'unidad', minStock: 5  },
    { name: 'Cadejo mera belga',       category: 'Cervezas',  module: 'BEBIDAS_SERVICIO', unit: 'unidad', minStock: 5  },

    // ── PAN ──
    { name: 'Pan de Papa - Bodega',     category: 'Pan', module: 'PAN', unit: 'Unidad', minStock: 50 },
    { name: 'Pan de Pretzel - Bodega',  category: 'Pan', module: 'PAN', unit: 'Unidad', minStock: 30 },
    { name: 'Pan de Papa',              category: 'Pan', module: 'PAN_RESTAURANTE', unit: 'Unidad', minStock: 24 },
    { name: 'Pan de Pretzel',           category: 'Pan', module: 'PAN_RESTAURANTE', unit: 'Unidad', minStock: 12 },

    // ── FRITURAS ──
    { name: 'Papas Fritas',             category: 'Frituras', module: 'FRITURAS', unit: 'Unidad', minStock: 8 },

    // ── FRITURAS RESTAURANTE ──
    { name: 'Chicharra',                category: 'Frituras', module: 'FRITURAS_RESTAURANTE', unit: 'Unidad', minStock: 20 },
    { name: 'Papas Fritas',             category: 'Frituras', module: 'FRITURAS_RESTAURANTE', unit: 'Bolsa', minStock: 4 },

    // ── LACTEOS BODEGA ──
    { name: 'Blue Cheese',              category: 'Lacteos', module: 'LACTEOS_BODEGA', unit: 'unidad', minStock: 0 },
    { name: 'Crema',                    category: 'Lacteos', module: 'LACTEOS_BODEGA', unit: 'unidad', minStock: 0 },
    { name: 'Leche',                    category: 'Lacteos', module: 'LACTEOS_BODEGA', unit: 'unidad', minStock: 0 },
    { name: 'Mayonesa',                 category: 'Lacteos', module: 'LACTEOS_BODEGA', unit: 'unidad', minStock: 0 },
    { name: 'Mix de Queso',              category: 'Lacteos', module: 'LACTEOS_BODEGA', unit: 'unidad', minStock: 0 },
    { name: 'Queso Americano',           category: 'Lacteos', module: 'LACTEOS_BODEGA', unit: 'unidad', minStock: 0 },
    { name: 'Queso Crema',               category: 'Lacteos', module: 'LACTEOS_BODEGA', unit: 'unidad', minStock: 0 },
    { name: 'Salsa Sabor a Queso',       category: 'Lacteos', module: 'LACTEOS_BODEGA', unit: 'unidad', minStock: 0 },
    { name: 'Yogurt',                    category: 'Lacteos', module: 'LACTEOS_BODEGA', unit: 'unidad', minStock: 0 },

    // ── LACTEOS RESTAURANTE ──
    { name: 'Blue Cheese',              category: 'Lacteos', module: 'LACTEOS_RESTAURANTE', unit: 'unidad', minStock: 0 },
    { name: 'Crema',                    category: 'Lacteos', module: 'LACTEOS_RESTAURANTE', unit: 'unidad', minStock: 0 },
    { name: 'Leche',                    category: 'Lacteos', module: 'LACTEOS_RESTAURANTE', unit: 'unidad', minStock: 0 },
    { name: 'Mayonesa',                 category: 'Lacteos', module: 'LACTEOS_RESTAURANTE', unit: 'unidad', minStock: 0 },
    { name: 'Mix de Queso',              category: 'Lacteos', module: 'LACTEOS_RESTAURANTE', unit: 'unidad', minStock: 0 },
    { name: 'Queso Americano',           category: 'Lacteos', module: 'LACTEOS_RESTAURANTE', unit: 'unidad', minStock: 0 },
    { name: 'Queso Crema',               category: 'Lacteos', module: 'LACTEOS_RESTAURANTE', unit: 'unidad', minStock: 0 },
    { name: 'Salsa Sabor a Queso',       category: 'Lacteos', module: 'LACTEOS_RESTAURANTE', unit: 'unidad', minStock: 0 },
    { name: 'Yogurt',                    category: 'Lacteos', module: 'LACTEOS_RESTAURANTE', unit: 'unidad', minStock: 0 },

    // ── SALSAS Y ADEREZOS BODEGA ──
    { name: 'Aderezo Ajo Romero',        category: 'Aderezos', module: 'SALSAS_ADEREZOS_BODEGA', unit: 'Bolsa', minStock: 1 },
    { name: 'Aderezo Blue Cheese',       category: 'Aderezos', module: 'SALSAS_ADEREZOS_BODEGA', unit: 'Bolsa', minStock: 0 },
    { name: 'Aderezo de Chipotle',       category: 'Aderezos', module: 'SALSAS_ADEREZOS_BODEGA', unit: 'Bolsa', minStock: 6 },
    { name: 'Aderezo de Cilantro',       category: 'Aderezos', module: 'SALSAS_ADEREZOS_BODEGA', unit: 'Bolsa', minStock: 6 },
    { name: 'Mostaza Dijon',             category: 'Mostaza',  module: 'SALSAS_ADEREZOS_BODEGA', unit: 'Unidad', minStock: 1 },
    { name: 'Salsa de Cerveza',          category: 'Salsas',   module: 'SALSAS_ADEREZOS_BODEGA', unit: 'Bolsa', minStock: 6 },
    { name: 'Salsa de Higos',            category: 'Salsas',   module: 'SALSAS_ADEREZOS_BODEGA', unit: 'Bolsa', minStock: 6 },
    { name: 'Salsa de Panela',           category: 'Salsas',   module: 'SALSAS_ADEREZOS_BODEGA', unit: 'Bolsa', minStock: 6 },
    { name: 'Salsa de Tamarindo',        category: 'Salsas',   module: 'SALSAS_ADEREZOS_BODEGA', unit: 'Bolsa', minStock: 6 },
    { name: 'Sobres de Ketchup',         category: 'Ketchup',  module: 'SALSAS_ADEREZOS_BODEGA', unit: 'Unidad', minStock: 200 },
    { name: 'White BBQ',                 category: 'Salsas',   module: 'SALSAS_ADEREZOS_BODEGA', unit: 'Bolsa', minStock: 1 },

    // ── SALSAS Y ADEREZOS RESTAURANTE ──
    { name: 'Aderezo Ajo Romero',        category: 'Aderezos', module: 'SALSAS_ADEREZOS_RESTAURANTE', unit: 'Bolsa', minStock: 1 },
    { name: 'Aderezo Blue Cheese',       category: 'Aderezos', module: 'SALSAS_ADEREZOS_RESTAURANTE', unit: 'Bolsa', minStock: 1 },
    { name: 'Aderezo de Chipotle',       category: 'Aderezos', module: 'SALSAS_ADEREZOS_RESTAURANTE', unit: 'Bolsa', minStock: 1 },
    { name: 'Aderezo de Cilantro',       category: 'Aderezos', module: 'SALSAS_ADEREZOS_RESTAURANTE', unit: 'Bolsa', minStock: 1 },
    { name: 'Mostaza Dijon',             category: 'Mostaza',  module: 'SALSAS_ADEREZOS_RESTAURANTE', unit: 'Unidad', minStock: 1 },
    { name: 'Salsa de Cerveza',          category: 'Salsas',   module: 'SALSAS_ADEREZOS_RESTAURANTE', unit: 'Bolsa', minStock: 1 },
    { name: 'Salsa de Higos',            category: 'Salsas',   module: 'SALSAS_ADEREZOS_RESTAURANTE', unit: 'Bolsa', minStock: 1 },
    { name: 'Salsa de Panela',           category: 'Salsas',   module: 'SALSAS_ADEREZOS_RESTAURANTE', unit: 'Bolsa', minStock: 1 },
    { name: 'Salsa de Tamarindo',        category: 'Salsas',   module: 'SALSAS_ADEREZOS_RESTAURANTE', unit: 'Bolsa', minStock: 1 },
    { name: 'Sobres de Ketchup',         category: 'Ketchup',  module: 'SALSAS_ADEREZOS_RESTAURANTE', unit: 'Unidad', minStock: 200 },
    { name: 'White BBQ',                 category: 'Salsas',   module: 'SALSAS_ADEREZOS_RESTAURANTE', unit: 'Bolsa', minStock: 1 },

    // ── SALSAS ──
    { name: 'Higos',                  category: 'Salsas', module: 'SALSAS', unit: 'unidad', minStock: 5    },
    { name: 'Cerveza',                category: 'Salsas', module: 'SALSAS', unit: 'unidad', minStock: 4.5  },
    { name: 'Tamarindo',              category: 'Salsas', module: 'SALSAS', unit: 'unidad', minStock: 0    },
    { name: 'Panela',                 category: 'Salsas', module: 'SALSAS', unit: 'unidad', minStock: 5    },
    { name: 'Cilantro',               category: 'Salsas', module: 'SALSAS', unit: 'unidad', minStock: 4    },
    { name: 'Chipotle',               category: 'Salsas', module: 'SALSAS', unit: 'unidad', minStock: 4    },
    { name: 'Pulpa tamarindo',        category: 'Salsas', module: 'SALSAS', unit: 'unidad', minStock: 0    },
    { name: 'Maracuya',               category: 'Salsas', module: 'SALSAS', unit: 'unidad', minStock: 10   },
    { name: 'Romero',                 category: 'Salsas', module: 'SALSAS', unit: 'unidad', minStock: 1    },
    { name: 'Blue Cheese',            category: 'Salsas', module: 'SALSAS', unit: 'unidad', minStock: 1    },
    { name: 'White BBQ',              category: 'Salsas', module: 'SALSAS', unit: 'unidad', minStock: 1    },
    { name: 'Sabor a queso',          category: 'Salsas', module: 'SALSAS', unit: 'unidad', minStock: 1    },

    // ── COCINA ──
    { name: 'Tortitas Hamburguesa',   category: 'Carnes',       module: 'COCINA', unit: 'unidad', minStock: 0   },
    { name: 'Tocino',                 category: 'Carnes',       module: 'COCINA', unit: 'LB',     minStock: 1   },
    { name: 'Texas Twinkies',         category: 'Entrada',      module: 'COCINA', unit: 'unidad', minStock: 8   },
    { name: 'Papas Fritas',           category: 'Guarniciones', module: 'COCINA', unit: 'bolsa',  minStock: 1   },
    { name: 'Mac and Cheese',         category: 'Guarniciones', module: 'COCINA', unit: 'unidad', minStock: 1   },
    { name: 'Cream Corn',             category: 'Guarniciones', module: 'COCINA', unit: 'unidad', minStock: 1   },
    { name: 'Ensalada de Papa',       category: 'Guarniciones', module: 'COCINA', unit: 'unidad', minStock: 1   },
    { name: 'Sal',                    category: 'Condimentos',  module: 'COCINA', unit: 'LB',     minStock: 0   },
    { name: 'Pimienta',               category: 'Condimentos',  module: 'COCINA', unit: 'unidad', minStock: 0   },
    { name: 'Sazonador papas',        category: 'Condimentos',  module: 'COCINA', unit: 'unidad', minStock: 0   },
    { name: 'Pan de pretzel',         category: 'Panes',        module: 'COCINA', unit: 'unidad', minStock: 6   },
    { name: 'Pan de Papa',            category: 'Panes',        module: 'COCINA', unit: 'unidad', minStock: 6   },
    { name: 'Maracuya',               category: 'Extractos',    module: 'COCINA', unit: 'unidad', minStock: 1   },
    { name: 'Arugula',                category: 'Verduras',     module: 'COCINA', unit: 'caja',   minStock: 1   },
    { name: 'Cebolla',                category: 'Verduras',     module: 'COCINA', unit: 'LB',     minStock: 0   },
    { name: 'Cebolla morada',         category: 'Verduras',     module: 'COCINA', unit: 'LB',     minStock: 0   },
    { name: 'Limon',                  category: 'Verduras',     module: 'COCINA', unit: 'unidad', minStock: 0   },
    { name: 'Cebollines',             category: 'Verduras',     module: 'COCINA', unit: 'manojo', minStock: 0   },
    { name: 'Zanahoria',              category: 'Verduras',     module: 'COCINA', unit: 'LB',     minStock: 0   },
    { name: 'Elotito amarillo',       category: 'Verduras',     module: 'COCINA', unit: 'unidad', minStock: 0   },
    { name: 'Repollo Blanco',         category: 'Verduras',     module: 'COCINA', unit: 'LB',     minStock: 0.2 },
    { name: 'Repollo Morado',         category: 'Verduras',     module: 'COCINA', unit: 'LB',     minStock: 0   },
    { name: 'Camote',                 category: 'Verduras',     module: 'COCINA', unit: 'LB',     minStock: 0   },
    { name: 'Coditos',                category: 'Harinas',      module: 'COCINA', unit: 'LB',     minStock: 2   },
    { name: 'Queso Crema',            category: 'Lacteos',      module: 'COCINA', unit: 'unidad', minStock: 0   },
    { name: 'Yogurt',                 category: 'Lacteos',      module: 'COCINA', unit: 'unidad', minStock: 1   },
    { name: 'Queso Americano',        category: 'Lacteos',      module: 'COCINA', unit: 'unidad', minStock: 0   },
    { name: 'Mayonesa',               category: 'Lacteos',      module: 'COCINA', unit: 'unidad', minStock: 0   },
    { name: 'Mix de queso',           category: 'Lacteos',      module: 'COCINA', unit: 'LB',     minStock: 1   },
    { name: 'Leche',                  category: 'Lacteos',      module: 'COCINA', unit: 'unidad', minStock: 1   },
    { name: 'Crema',                  category: 'Lacteos',      module: 'COCINA', unit: 'unidad', minStock: 1   },
    { name: 'Azucar',                 category: 'Varios',       module: 'COCINA', unit: 'unidad', minStock: 0   },
    { name: 'Mostaza Dijon',          category: 'Varios',       module: 'COCINA', unit: 'unidad', minStock: 0   },
    { name: 'Guantes Negros',         category: 'Varios',       module: 'COCINA', unit: 'caja',   minStock: 0   },
    { name: 'Guantes Transparentes',  category: 'Varios',       module: 'COCINA', unit: 'caja',   minStock: 0   },
    { name: 'Papel toalla cocina',    category: 'Varios',       module: 'COCINA', unit: 'rollo',  minStock: 0   },
    { name: 'Aceite y Margarinas',    category: 'Aceite',       module: 'COCINA', unit: 'bidon',  minStock: 1   },

    // ── SERVICIO ──
    { name: 'Bolsa #1',               category: 'Bolsas',  module: 'SERVICIO', unit: 'paquete', minStock: 0   },
    { name: 'Bolsa #2',               category: 'Bolsas',  module: 'SERVICIO', unit: 'paquete', minStock: 0   },
    { name: 'Bolsa #3',               category: 'Bolsas',  module: 'SERVICIO', unit: 'paquete', minStock: 0   },
    { name: 'Bolsa Jardinera 34x50',  category: 'Bolsas',  module: 'SERVICIO', unit: 'unidad',  minStock: 0   },
    { name: 'Bolsa Higienica 19x27',  category: 'Bolsas',  module: 'SERVICIO', unit: 'unidad',  minStock: 0   },
    { name: 'Bolsa Medio Jardin 24x32', category: 'Bolsas', module: 'SERVICIO', unit: 'unidad', minStock: 0   },
    { name: 'Ziploc',                 category: 'Bolsas',  module: 'SERVICIO', unit: 'unidad',  minStock: 0   },
    { name: 'Bolsa 8x12',             category: 'Bolsas',  module: 'SERVICIO', unit: 'unidad',  minStock: 0   },
    { name: 'Papel Higienico',        category: 'Varios',  module: 'SERVICIO', unit: 'paquete', minStock: 0   },
    { name: 'Papel toalla baño',      category: 'Varios',  module: 'SERVICIO', unit: 'paquete', minStock: 0   },
    { name: 'Servilleta Servilletero', category: 'Varios', module: 'SERVICIO', unit: 'paquete', minStock: 0   },
    { name: 'Servilleta Normal',      category: 'Varios',  module: 'SERVICIO', unit: 'paquete', minStock: 0   },
    { name: 'Papel Aluminio',         category: 'Varios',  module: 'SERVICIO', unit: 'rollo',   minStock: 0   },
    { name: 'Bandeja de llevar',      category: 'Varios',  module: 'SERVICIO', unit: 'unidad',  minStock: 50  },
    { name: 'Bandeja #8 papas',       category: 'Varios',  module: 'SERVICIO', unit: 'paquete', minStock: 0   },
    { name: 'Cubiertos para llevar',  category: 'Varios',  module: 'SERVICIO', unit: 'unidad',  minStock: 0   },
    { name: 'Cucharitas',             category: 'Varios',  module: 'SERVICIO', unit: 'unidad',  minStock: 0   },
    { name: 'Tenedores pequeños',     category: 'Varios',  module: 'SERVICIO', unit: 'unidad',  minStock: 0   },
    { name: 'Vasos #16',              category: 'Varios',  module: 'SERVICIO', unit: 'unidad',  minStock: 0   },
    { name: 'Cup 2 Onz',              category: 'Varios',  module: 'SERVICIO', unit: 'unidad',  minStock: 0   },
    { name: 'Tapa de 2oz',            category: 'Varios',  module: 'SERVICIO', unit: 'unidad',  minStock: 0   },
    { name: 'Funda de Cubiertos',     category: 'Varios',  module: 'SERVICIO', unit: 'unidad',  minStock: 0   },
    { name: 'Stickers',               category: 'Varios',  module: 'SERVICIO', unit: 'rollo',   minStock: 0   },
    { name: 'Pajillas',               category: 'Varios',  module: 'SERVICIO', unit: 'unidad',  minStock: 0   },
    { name: 'Papelito de post',       category: 'Varios',  module: 'SERVICIO', unit: 'unidad',  minStock: 0   },
    { name: 'Tirro Scotch',           category: 'Varios',  module: 'SERVICIO', unit: 'unidad',  minStock: 0   },
    { name: 'Salsa Inglesa',          category: 'Bebidas', module: 'SERVICIO', unit: 'unidad',  minStock: 0   },
    { name: 'Chamoy',                 category: 'Bebidas', module: 'SERVICIO', unit: 'unidad',  minStock: 0   },
    { name: 'Tajin',                  category: 'Bebidas', module: 'SERVICIO', unit: 'unidad',  minStock: 0   },

    // ── BODEGA ──
    { name: 'Mayonesa',               category: 'Salsas',     module: 'BODEGA', unit: 'unidad',  minStock: 2  },
    { name: 'Azucar',                 category: 'Varios',     module: 'BODEGA', unit: 'unidad',  minStock: 3  },
    { name: 'Ketchup',                category: 'Salsas',     module: 'BODEGA', unit: 'unidad',  minStock: 3  },
    { name: 'Mostaza de Grano',       category: 'Salsas',     module: 'BODEGA', unit: 'unidad',  minStock: 5  },
    { name: 'BBQ',                    category: 'Salsas',     module: 'BODEGA', unit: 'unidad',  minStock: 3  },
    { name: 'Miel',                   category: 'Varios',     module: 'BODEGA', unit: 'galón',   minStock: 1  },
    { name: 'Papel aluminio',         category: 'Varios',     module: 'BODEGA', unit: 'rollo',   minStock: 2  },
    { name: 'Panela',                 category: 'Varios',     module: 'BODEGA', unit: 'unidad',  minStock: 6  },
    { name: 'Margarina',              category: 'Varios',     module: 'BODEGA', unit: 'unidad',  minStock: 10 },
    { name: 'Bicarbonato',            category: 'Varios',     module: 'BODEGA', unit: 'unidad',  minStock: 5  },
    { name: 'Vita Sal',               category: 'Varios',     module: 'BODEGA', unit: 'unidad',  minStock: 24 },
    { name: 'Lata Melocoton',         category: 'Latas',      module: 'BODEGA', unit: 'unidad',  minStock: 1  },
    { name: 'Lata Maiz Dulces',       category: 'Latas',      module: 'BODEGA', unit: 'unidad',  minStock: 5  },
    { name: 'Lata Higo',              category: 'Latas',      module: 'BODEGA', unit: 'unidad',  minStock: 3  },
    { name: 'Pimienta',               category: 'Especias',   module: 'BODEGA', unit: 'bote',    minStock: 3  },
    { name: 'Cebolla Granulada',      category: 'Especias',   module: 'BODEGA', unit: 'bote',    minStock: 3  },
    { name: 'Ajo granulado',          category: 'Especias',   module: 'BODEGA', unit: 'bote',    minStock: 3  },
    { name: 'Sazonador Italiano',     category: 'Especias',   module: 'BODEGA', unit: 'bote',    minStock: 3  },
    { name: 'Rostisserie Chicken',    category: 'Especias',   module: 'BODEGA', unit: 'bote',    minStock: 3  },
    { name: 'Paprika',                category: 'Especias',   module: 'BODEGA', unit: 'bote',    minStock: 3  },
    { name: 'Sazon Completo',         category: 'Especias',   module: 'BODEGA', unit: 'bote',    minStock: 2  },
    { name: 'Row',                    category: 'Especias',   module: 'BODEGA', unit: 'bote',    minStock: 8  },
    { name: 'Canela Raja',            category: 'Especias',   module: 'BODEGA', unit: 'unidad',  minStock: 1  },
    { name: 'Chile Waco',             category: 'Especias',   module: 'BODEGA', unit: 'bolsa',   minStock: 1  },
    { name: 'Clavo olor',             category: 'Especias',   module: 'BODEGA', unit: 'bolsa',   minStock: 1  },
    { name: 'Tomillo',                category: 'Especias',   module: 'BODEGA', unit: 'bolsa',   minStock: 0  },
    { name: 'Achote',                 category: 'Especias',   module: 'BODEGA', unit: 'bolsa',   minStock: 0  },
    { name: 'Chile Morron',           category: 'Especias',   module: 'BODEGA', unit: 'unidad',  minStock: 1  },
    { name: 'Sal Parrillera',         category: 'Especias',   module: 'BODEGA', unit: 'bolsa',   minStock: 10 },
    { name: 'Pimienta Gorda',         category: 'Especias',   module: 'BODEGA', unit: 'bolsa',   minStock: 1  },
    { name: 'Oregano',                category: 'Especias',   module: 'BODEGA', unit: 'bolsa',   minStock: 0  },
    { name: 'Ajonjoli',               category: 'Especias',   module: 'BODEGA', unit: 'bolsa',   minStock: 0  },
    { name: 'Flor Jamaica',           category: 'Especias',   module: 'BODEGA', unit: 'bolsa',   minStock: 0  },
    { name: 'Vinagre Manzana',        category: 'Líquidos',   module: 'BODEGA', unit: 'galón',   minStock: 1  },
    { name: 'Soya',                   category: 'Líquidos',   module: 'BODEGA', unit: 'galón',   minStock: 1  },
    { name: 'Vinagre Blanco',         category: 'Líquidos',   module: 'BODEGA', unit: 'galón',   minStock: 1  },
    { name: 'Salsa Inglesa',          category: 'Líquidos',   module: 'BODEGA', unit: 'galón',   minStock: 2  },
    { name: 'Papel Higienico',        category: 'Higiene',    module: 'BODEGA', unit: 'paquete', minStock: 12 },
    { name: 'Palillos',               category: 'Higiene',    module: 'BODEGA', unit: 'bote',    minStock: 5  },
    { name: 'Guante L',               category: 'Higiene',    module: 'BODEGA', unit: 'caja',    minStock: 0  },
    { name: 'Guante M',               category: 'Higiene',    module: 'BODEGA', unit: 'caja',    minStock: 0  },
    { name: 'Servilleta de baño',     category: 'Higiene',    module: 'BODEGA', unit: 'unidad',  minStock: 8  },
    { name: 'Servilleta cuadrada',    category: 'Higiene',    module: 'BODEGA', unit: 'unidad',  minStock: 10 },
    { name: 'Servilleta interfoliada', category: 'Higiene',   module: 'BODEGA', unit: 'unidad',  minStock: 48 },
    { name: 'Red de Ajos',            category: 'Varios',     module: 'BODEGA', unit: 'unidad',  minStock: 15 },
    { name: 'Ziploct',                category: 'Varios',     module: 'BODEGA', unit: 'caja',    minStock: 2  },
    { name: 'Desengrasante',          category: 'Limpieza',   module: 'BODEGA', unit: 'unidad',  minStock: 2  },
    { name: 'Leche',                  category: 'Lacteos',    module: 'BODEGA', unit: 'unidad',  minStock: 6  },
    { name: 'Tajin',                  category: 'Varios',     module: 'BODEGA', unit: 'unidad',  minStock: 3  },
    { name: 'Chamoy',                 category: 'Varios',     module: 'BODEGA', unit: 'unidad',  minStock: 3  },
    { name: 'Crema',                  category: 'Lacteos',    module: 'BODEGA', unit: 'unidad',  minStock: 10 },
    { name: 'Mostacilla',             category: 'Especias',   module: 'BODEGA', unit: 'libra',   minStock: 1  },

    // ── DESECHABLES ──
    { name: 'Bolsa #1',               category: 'Bolsas',     module: 'DESECHABLES', unit: 'unidad',  minStock: 100  },
    { name: 'Bolsa #2',               category: 'Bolsas',     module: 'DESECHABLES', unit: 'unidad',  minStock: 100  },
    { name: 'Bolsa #3',               category: 'Bolsas',     module: 'DESECHABLES', unit: 'unidad',  minStock: 100  },
    { name: 'Bolsa 8x12',             category: 'Bolsas',     module: 'DESECHABLES', unit: 'unidad',  minStock: 100  },
    { name: 'Bolsa Higienica Blanca', category: 'Bolsas',     module: 'DESECHABLES', unit: 'unidad',  minStock: 50   },
    { name: 'Bolsa Medio Jardin 24x32', category: 'Bolsas',   module: 'DESECHABLES', unit: 'unidad',  minStock: 50   },
    { name: 'Bolsa Jardinera 34x50',  category: 'Bolsas',     module: 'DESECHABLES', unit: 'unidad',  minStock: 50   },
    { name: 'Ziploc',                 category: 'Bolsas',     module: 'DESECHABLES', unit: 'unidad',  minStock: 6    },
    { name: 'Papel Toalla',           category: 'Varios',     module: 'DESECHABLES', unit: 'rollo',   minStock: 6    },
    { name: 'Manteles Encerados',     category: 'Varios',     module: 'DESECHABLES', unit: 'unidad',  minStock: 2000 },
    { name: 'Cobertor de cubiertos',  category: 'Varios',     module: 'DESECHABLES', unit: 'unidad',  minStock: 1000 },
    { name: 'Caja Kraft para Llevar', category: 'Varios',     module: 'DESECHABLES', unit: 'unidad',  minStock: 100  },
    { name: 'Papel de aluminio',      category: 'Varios',     module: 'DESECHABLES', unit: 'rollo',   minStock: 2    },
    { name: 'Gas',                    category: 'Varios',     module: 'DESECHABLES', unit: 'tanque',  minStock: 2    },
    { name: 'Bandeja para llevar',    category: 'Varios',     module: 'DESECHABLES', unit: 'unidad',  minStock: 300  },
    { name: 'Cups 250',               category: 'Vasos',      module: 'DESECHABLES', unit: 'unidad',  minStock: 25   },
    { name: 'Cups 500',               category: 'Vasos',      module: 'DESECHABLES', unit: 'unidad',  minStock: 25   },
    { name: 'Vaso de 16 onz',         category: 'Vasos',      module: 'DESECHABLES', unit: 'unidad',  minStock: 200  },
    { name: 'Stickers',               category: 'Varios',     module: 'DESECHABLES', unit: 'rollo',   minStock: 1    },
    { name: 'Servilleta Interfoliada baño', category: 'Varios', module: 'DESECHABLES', unit: 'unidad', minStock: 1   },
    { name: 'Servilleta Interfoliada mesa', category: 'Varios', module: 'DESECHABLES', unit: 'unidad', minStock: 5   },
    { name: 'Servilletas para llevar', category: 'Varios',    module: 'DESECHABLES', unit: 'unidad',  minStock: 1    },
    { name: 'Guantes talla L',        category: 'Higiene',    module: 'DESECHABLES', unit: 'caja',    minStock: 1    },
    { name: 'Guantes talla M',        category: 'Higiene',    module: 'DESECHABLES', unit: 'caja',    minStock: 1    },
    { name: 'Guantes de ensalada',    category: 'Higiene',    module: 'DESECHABLES', unit: 'caja',    minStock: 1    },
    { name: 'Palillos de dientes',    category: 'Varios',     module: 'DESECHABLES', unit: 'bote',    minStock: 5    },
    { name: 'Pajilla',                category: 'Varios',     module: 'DESECHABLES', unit: 'unidad',  minStock: 1    },
    { name: 'Papel Higienico',        category: 'Higiene',    module: 'DESECHABLES', unit: 'paquete', minStock: 12   },
    { name: 'Papel termico para post', category: 'Varios',    module: 'DESECHABLES', unit: 'rollo',   minStock: 1    },
    { name: 'Papel termico para comandas', category: 'Varios', module: 'DESECHABLES', unit: 'rollo',  minStock: 1    },
  ]

  // Rename the old restaurant garnish module to dedicated restaurant fries.
  const restaurantFries = await prisma.product.findMany({
    where: { module: 'GUARNICIONES' },
  })
  for (const product of restaurantFries) {
    await prisma.product.update({
      where: { id: product.id },
      data: { module: 'FRITURAS_RESTAURANTE', category: 'Frituras', name: product.name.trim() },
    })
    await prisma.alert.updateMany({
      where: { productId: product.id },
      data: { module: 'FRITURAS_RESTAURANTE', productName: product.name.trim() },
    })
    await prisma.dayConsumptionSnapshot.updateMany({
      where: { productId: product.id },
      data: { module: 'FRITURAS_RESTAURANTE', productName: product.name.trim() },
    })
  }

  // Move fries out of the flour/oil warehouse module without changing their ID or history.
  const fries = await prisma.product.findFirst({
    where: { name: 'Papas Fritas', module: 'HARINAS_ACEITE_BODEGA' },
  })
  if (fries) {
    await prisma.product.update({
      where: { id: fries.id },
      data: { module: 'FRITURAS', category: 'Frituras' },
    })
    await prisma.alert.updateMany({
      where: { productId: fries.id },
      data: { module: 'FRITURAS' },
    })
    await prisma.dayConsumptionSnapshot.updateMany({
      where: { productId: fries.id },
      data: { module: 'FRITURAS' },
    })
  }

  // Move bread records without changing their IDs or history.
  const breadMoves = [
    { sourceModule: 'HARINAS_ACEITE_BODEGA' as Module, sourceName: 'Pan de Papa', targetName: 'Pan de Papa - Bodega' },
    { sourceModule: 'HARINAS_ACEITE_BODEGA' as Module, sourceName: 'Pan de Pretzel', targetName: 'Pan de Pretzel - Bodega' },
    { sourceModule: 'HARINAS_ACEITE_RESTAURANTE' as Module, sourceName: 'Pan de Papa', targetName: 'Pan de Papa' },
    { sourceModule: 'HARINAS_ACEITE_RESTAURANTE' as Module, sourceName: 'Pan de Pretzel', targetName: 'Pan de Pretzel' },
    { sourceModule: 'PAN' as Module, sourceName: 'Pan de Papa', targetName: 'Pan de Papa - Bodega' },
    { sourceModule: 'PAN' as Module, sourceName: 'Pan de Pretzel', targetName: 'Pan de Pretzel - Bodega' },
    { sourceModule: 'PAN' as Module, sourceName: 'Pan de Papa - Restaurante', targetName: 'Pan de Papa' },
    { sourceModule: 'PAN' as Module, sourceName: 'Pan de Pretzel - Restaurante', targetName: 'Pan de Pretzel' },
  ]

  for (const move of breadMoves) {
    const product = await prisma.product.findFirst({
      where: { name: move.sourceName, module: move.sourceModule },
    })
    if (!product) continue
    const targetModule = move.targetName.endsWith('Bodega') ? 'PAN' : 'PAN_RESTAURANTE'

    await prisma.product.update({
      where: { id: product.id },
      data: {
        name: move.targetName,
        module: targetModule,
        category: 'Pan',
      },
    })
    await prisma.alert.updateMany({
      where: { productId: product.id },
      data: { module: targetModule, productName: move.targetName },
    })
    await prisma.dayConsumptionSnapshot.updateMany({
      where: { productId: product.id },
      data: { module: targetModule, productName: move.targetName },
    })
  }

  console.log(`Creating or updating ${products.length} products...`)
  const sharedModules = new Set([
    'BEBIDAS_BODEGA', 'BEBIDAS_SERVICIO',
    'LACTEOS_BODEGA', 'LACTEOS_RESTAURANTE',
    'SALSAS_ADEREZOS_BODEGA', 'SALSAS_ADEREZOS_RESTAURANTE',
  ])
  const dairyModules = new Set(['LACTEOS_BODEGA', 'LACTEOS_RESTAURANTE'])
  const sauceModules = new Set(['SALSAS_ADEREZOS_BODEGA', 'SALSAS_ADEREZOS_RESTAURANTE'])

  for (const p of products) {
    const sharedId = sharedModules.has(p.module)
      ? `${dairyModules.has(p.module) ? 'lacteo' : sauceModules.has(p.module) ? 'salsa' : 'bebida'}-${p.name.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
      : null
    const productName = p.name.trim()
    const existing = await prisma.product.findFirst({
      where: {
        name: sauceModules.has(p.module) ? { in: [productName, `${productName} `] } : p.name,
        module: p.module as Module,
      },
    })

    if (existing) {
      const updateData = sharedId
        ? {
            sharedId,
            ...(dairyModules.has(p.module) && productName === 'Leche' ? { unit: 'unidad' } : {}),
            ...(sauceModules.has(p.module) && existing.name !== productName ? { name: productName } : {}),
          }
        : null
      if (updateData && (
        existing.sharedId !== sharedId ||
        (productName === 'Leche' && existing.unit !== 'unidad') ||
        (sauceModules.has(p.module) && existing.name !== productName)
      )) {
        await prisma.product.update({ where: { id: existing.id }, data: updateData })
      }
    } else {
      await prisma.product.create({
        data: { ...p, ...(sharedId ? { sharedId } : {}) } as Parameters<typeof prisma.product.create>[0]['data'],
      })
    }
  }

  // Keep the dedicated disposable modules synchronized by product identity.
  // Some legacy names differ only by a typo, pluralization, or an extra space.
  const disposableModules = ['DESECHABLES_BODEGA', 'DESECHABLES_BOLSAS_RESTAURANTE'] as const
  const disposableProducts = await prisma.product.findMany({
    where: { module: { in: [...disposableModules] } },
    orderBy: { createdAt: 'asc' },
  })
  const disposableKey = (name: string) => name
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/deposito grade craft/g, 'deposito grande craft')
    .replace(/servilleta para bano/g, 'servilleta de bano')
    .replace(/^vaso #16$/g, 'vasos #16')
    .replace(/[^a-z0-9#]+/g, '-')
    .replace(/^-|-$/g, '')
  const canonicalName = (key: string, fallback: string) => ({
    'deposito-grande-craft': 'Deposito Grande Craft',
    'servilleta-de-bano': 'Servilleta de Baño',
    'vasos-#16': 'Vasos #16',
  }[key] ?? fallback.trim())
  const disposableGroups = new Map<string, typeof disposableProducts>()

  for (const product of disposableProducts) {
    const key = disposableKey(product.name)
    const group = disposableGroups.get(key) ?? []
    group.push(product)
    disposableGroups.set(key, group)
  }

  for (const [key, group] of disposableGroups) {
    const canonical = canonicalName(key, group[0].name)
    const sharedId = `desechable-${key}`
    const byModule = new Map(group.map((product) => [product.module, product]))
    const source = byModule.get('DESECHABLES_BODEGA') ?? group[0]

    for (const product of group) {
      if (product.name !== canonical || product.sharedId !== sharedId) {
        await prisma.product.update({
          where: { id: product.id },
          data: { name: canonical, sharedId },
        })
      }
    }

    for (const module of disposableModules) {
      if (!byModule.has(module)) {
        await prisma.product.create({
          data: {
            name: canonical,
            category: source.category,
            module,
            unit: source.unit,
            minStock: source.minStock,
            sharedId,
          },
        })
      }
    }
  }

  // Link the selected condiment products between warehouse and restaurant.
  const condimentLinks = ['Pimienta', 'Sazonador de Papas', 'Azucar', 'Ajo Granulado', 'Cebolla Granulada', 'Tajin']
  for (const name of condimentLinks) {
    let warehouse = await prisma.product.findFirst({
      where: { name, module: 'CONDIMENTOS_BODEGA' },
      orderBy: { minStock: 'desc' },
    })

    // Azucar was historically stored in the general BODEGA module.
    if (!warehouse && name === 'Azucar') {
      const legacy = await prisma.product.findFirst({ where: { name, module: 'BODEGA' } })
      if (legacy) {
        warehouse = await prisma.product.create({
          data: {
            name,
            category: 'Condimentos',
            module: 'CONDIMENTOS_BODEGA',
            unit: legacy.unit,
            minStock: legacy.minStock,
          },
        })
      }
    }

    if (!warehouse) continue

    const sharedId = `condimento-${name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
    await prisma.product.update({ where: { id: warehouse.id }, data: { sharedId } })

    const restaurant = await prisma.product.findFirst({
      where: { name, module: 'CONDIMENTOS_RESTAURANTE' },
    })
    if (restaurant) {
      await prisma.product.update({ where: { id: restaurant.id }, data: { sharedId } })
    } else {
      await prisma.product.create({
        data: {
          name,
          category: warehouse.category,
          module: 'CONDIMENTOS_RESTAURANTE',
          unit: warehouse.unit,
          minStock: warehouse.minStock,
          sharedId,
        },
      })
    }
  }

  // Link selected flour/oil products between warehouse and restaurant.
  const flourOilLinks = [
    { name: 'Aceite', aliases: ['Aceite', 'Aceites'], sharedId: 'harina-aceite' },
    { name: 'Gas', aliases: ['Gas'], sharedId: 'harina-gas' },
    { name: 'Gas flameador', aliases: ['Gas flameador'], sharedId: 'harina-gas-flameador' },
  ]
  for (const link of flourOilLinks) {
    const warehouse = await prisma.product.findFirst({
      where: { module: 'HARINAS_ACEITE_BODEGA', name: { in: link.aliases } },
      orderBy: { createdAt: 'asc' },
    })
    const restaurant = await prisma.product.findFirst({
      where: { module: 'HARINAS_ACEITE_RESTAURANTE', name: { in: link.aliases } },
      orderBy: { createdAt: 'asc' },
    })
    const source = warehouse ?? restaurant
    if (!source) continue

    const common = {
      name: link.name,
      sharedId: link.sharedId,
    }

    if (warehouse) {
      await prisma.product.update({
        where: { id: warehouse.id },
        data: { ...common, unit: warehouse.unit.trim() },
      })
    } else {
      await prisma.product.create({
        data: {
          ...common,
          category: source.category,
          module: 'HARINAS_ACEITE_BODEGA',
          unit: source.unit.trim(),
          minStock: source.minStock,
        },
      })
    }

    if (restaurant) {
      await prisma.product.update({
        where: { id: restaurant.id },
        data: { ...common, unit: restaurant.unit.trim() },
      })
    } else {
      await prisma.product.create({
        data: {
          ...common,
          category: source.category,
          module: 'HARINAS_ACEITE_RESTAURANTE',
          unit: source.unit.trim(),
          minStock: source.minStock,
        },
      })
    }
  }

  // Link the selected fries between warehouse and restaurant.
  const friesLinks = [
    { name: 'Papas Fritas', sharedId: 'fritura-papas-fritas' },
    { name: 'Chicharra', sharedId: 'fritura-chicharra' },
  ]
  for (const link of friesLinks) {
    const warehouse = await prisma.product.findFirst({
      where: { name: link.name, module: 'FRITURAS' },
    })
    const restaurant = await prisma.product.findFirst({
      where: { name: link.name, module: 'FRITURAS_RESTAURANTE' },
    })
    const source = warehouse ?? restaurant
    if (!source) continue

    const common = {
      name: link.name,
      category: 'Frituras',
      sharedId: link.sharedId,
    }

    if (warehouse) {
      await prisma.product.update({
        where: { id: warehouse.id },
        data: { ...common, unit: warehouse.unit.trim() },
      })
    } else {
      await prisma.product.create({
        data: {
          ...common,
          module: 'FRITURAS',
          unit: source.unit.trim(),
          minStock: source.minStock,
        },
      })
    }

    if (restaurant) {
      await prisma.product.update({
        where: { id: restaurant.id },
        data: { ...common, unit: restaurant.unit.trim() },
      })
    } else {
      await prisma.product.create({
        data: {
          ...common,
          module: 'FRITURAS_RESTAURANTE',
          unit: source.unit.trim(),
          minStock: source.minStock,
        },
      })
    }
  }

  // Keep Azucar only in Condimentos Bodega while preserving its history.
  const materiaAzucar = await prisma.product.findFirst({
    where: { name: 'Azucar', module: 'MATERIA_PRIMA_SALSA' },
  })
  const condimentAzucar = await prisma.product.findFirst({
    where: { name: 'Azucar', module: 'CONDIMENTOS_BODEGA' },
  })
  if (materiaAzucar && condimentAzucar) {
    await prisma.dailyRecord.updateMany({ where: { productId: materiaAzucar.id }, data: { productId: condimentAzucar.id } })
    await prisma.dayConsumptionSnapshot.updateMany({ where: { productId: materiaAzucar.id }, data: { productId: condimentAzucar.id, module: 'CONDIMENTOS_BODEGA' } })
    await prisma.alert.updateMany({ where: { productId: materiaAzucar.id }, data: { productId: condimentAzucar.id, module: 'CONDIMENTOS_BODEGA' } })
    await prisma.product.delete({ where: { id: materiaAzucar.id } })
  }

  // Link selected sauce raw materials with their existing product identities.
  const materiaLinks = [
    { canonical: 'BBQ', aliases: ['BBQ'], sharedId: 'materia-bbq' },
    { canonical: 'Ketchup', aliases: ['Ketchup'], sharedId: 'materia-ketchup' },
    { canonical: 'Miel', aliases: ['Miel'], sharedId: 'materia-miel' },
    { canonical: 'Panela', aliases: ['Panela'], sharedId: 'materia-panela' },
    { canonical: 'Red de Ajos', aliases: ['Red de Ajos'], sharedId: 'materia-red-de-ajos' },
    { canonical: 'Regia Lata 330 ml', aliases: ['Regia Lata 330 ml'], sharedId: 'materia-regia-lata-330-ml' },
    { canonical: 'Salsa Inglesa', aliases: ['Salsa Inglesa'], sharedId: 'materia-salsa-inglesa' },
    { canonical: 'Stella Artois', aliases: ['Stella Artois'], sharedId: 'materia-stella-artois' },
    { canonical: 'Vinagre Blanco', aliases: ['Vinagre Blanco'], sharedId: 'materia-vinagre-blanco' },
    { canonical: 'Chile Morron', aliases: ['Chile Moron', 'Chile Morron'], sharedId: 'materia-chile-morron' },
    { canonical: 'Soya', aliases: ['Soya', 'Salsa de Soya'], sharedId: 'materia-soya' },
    { canonical: 'Vinagre Manzana', aliases: ['Vinagre Manzana', 'Vinagre de Manzana'], sharedId: 'materia-vinagre-manzana' },
  ]
  for (const link of materiaLinks) {
    const searchNames = [...new Set(link.aliases.flatMap((name) => [name, `${name} `]))]
    const existing = await prisma.product.findMany({
      where: { name: { in: searchNames } },
      select: { id: true, name: true, sharedId: true },
    })
    const sharedId = existing.find((product) => product.sharedId)?.sharedId ?? link.sharedId
    for (const product of existing) {
      await prisma.product.update({
        where: { id: product.id },
        data: { name: link.canonical, sharedId },
      })
    }
  }

  // Normalize raw meat duplicates and assign IDs.
  const rawDuplicates = await prisma.product.findMany({
    where: {
      module: 'CARNE_CRUDA',
      name: { in: ['Carne para moler', 'Carne para Moler', 'Muslos de Pollo', 'Muslos de Pollo ', 'Tocino'] },
    },
    select: { id: true, name: true, _count: { select: { records: true } } },
  })
  for (const product of rawDuplicates) {
    const isDuplicate = product.name === 'Carne para moler' || product.name === 'Muslos de Pollo' || (product.name === 'Tocino' && product._count.records === 0)
    if (isDuplicate && product._count.records === 0) {
      await prisma.product.delete({ where: { id: product.id } })
    }
  }

  // Keep only the Tocino record with the highest minimum; the duplicate was explicitly discarded.
  const duplicateTocinos = await prisma.product.findMany({
    where: { module: 'CARNE_CRUDA', name: 'Tocino' },
    orderBy: { minStock: 'desc' },
  })
  for (const duplicate of duplicateTocinos.slice(1)) {
    await prisma.dailyRecord.deleteMany({ where: { productId: duplicate.id } })
    await prisma.dayConsumptionSnapshot.deleteMany({ where: { productId: duplicate.id } })
    await prisma.alert.deleteMany({ where: { productId: duplicate.id } })
    await prisma.product.delete({ where: { id: duplicate.id } })
  }

  const rawMeats = await prisma.product.findMany({
    where: { module: 'CARNE_CRUDA' },
  })
  const sharedRawNames = new Set(['Brisket', 'Costilla de Cerdo', 'Muslos de Pollo', 'Puyaso', 'Tocino'])
  for (const product of rawMeats) {
    const name = product.name.trim() === 'Carne para Moler' ? 'Carne para moler' : product.name.trim()
    const slug = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-')
    const sharedId = sharedRawNames.has(name) ? `carne-${slug}` : `carne-cruda-${slug}`
    if (product.name !== name || product.sharedId !== sharedId) {
      await prisma.product.update({
        where: { id: product.id },
        data: { name, sharedId },
      })
      await prisma.alert.updateMany({ where: { productId: product.id }, data: { productName: name } })
      await prisma.dayConsumptionSnapshot.updateMany({ where: { productId: product.id }, data: { productName: name } })
    }
  }

  // Link cleaning products between warehouse and restaurant.
  const cleaningLinks = [
    'Desengrasante', 'Desinfectante para Piso', 'Jabon de Mano',
    'Jabon Lavaplatos', 'Lejia', 'Mascone', 'Rinso',
  ]
  for (const name of cleaningLinks) {
    const warehouse = await prisma.product.findFirst({
      where: { module: 'LIMPIEZA_BODEGA', name: { in: [name, `${name} `] } },
    })
    const restaurant = await prisma.product.findFirst({
      where: { module: 'LIMPIEZA_RESTAURANTE', name },
    })
    if (!warehouse || !restaurant) continue

    const sharedId = `limpieza-${name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
    await prisma.product.update({
      where: { id: warehouse.id },
      data: { name, sharedId, unit: warehouse.unit.trim() },
    })
    await prisma.product.update({
      where: { id: restaurant.id },
      data: { name, sharedId, unit: restaurant.unit.trim() },
    })
  }

  // Mirror service meats into smoked meats and link exact product names.
  const serviceMeats = await prisma.product.findMany({
    where: { module: 'CARNES_PREPARADAS' },
  })
  for (const serviceMeat of serviceMeats) {
    const sharedId = `carne-${serviceMeat.name.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
    const smokedMeat = await prisma.product.findFirst({
      where: { name: serviceMeat.name, module: 'CARNES_AHUMADAS' },
    })

    await prisma.product.update({
      where: { id: serviceMeat.id },
      data: { sharedId },
    })

    if (smokedMeat) {
      await prisma.product.update({
        where: { id: smokedMeat.id },
        data: { sharedId },
      })
    } else {
      await prisma.product.create({
        data: {
          name: serviceMeat.name,
          category: 'Carnes Ahumadas',
          module: 'CARNES_AHUMADAS',
          unit: serviceMeat.unit,
          minStock: serviceMeat.minStock,
          sharedId,
        },
      })
    }
  }

  // Remove duplicate/legacy vegetable names only when they have no history.
  const duplicateVegetables = await prisma.product.findMany({
    where: {
      module: 'VERDURAS',
      name: { in: ['Cebolla Blanca', 'Cebolla Blanca ', 'Cebollin', 'Limones'] },
    },
    select: { id: true, name: true, _count: { select: { records: true } } },
  })
  for (const product of duplicateVegetables) {
    const isCebollaDuplicate = product.name === 'Cebolla Blanca ' || (product.name === 'Cebolla Blanca' && product._count.records === 0)
    const isLegacyVariant = product.name === 'Cebollin' || product.name === 'Limones'
    if ((isCebollaDuplicate || isLegacyVariant) && product._count.records === 0) {
      await prisma.product.delete({ where: { id: product.id } })
    }
  }

  const trailingCebolla = await prisma.product.findFirst({
    where: { module: 'VERDURAS', name: 'Cebolla Blanca ' },
  })
  if (trailingCebolla) {
    await prisma.product.update({ where: { id: trailingCebolla.id }, data: { name: 'Cebolla Blanca' } })
  }

  const vegetableLinks = [
    'Arugula', 'Camote', 'Cebolla Blanca', 'Cebolla Morada', 'Cebollines',
    'Cilantro', 'Elote', 'Limon', 'Maracuya', 'Papa', 'Repollo Blanco',
    'Repollo Morado', 'Zanahoria',
  ]
  for (const name of vegetableLinks) {
    const warehouse = await prisma.product.findFirst({ where: { name, module: 'VERDURAS' } })
    const restaurant = await prisma.product.findFirst({ where: { name, module: 'VERDURAS_RESTAURANTE' } })
    if (!warehouse || !restaurant) continue

    const sharedId = `verdura-${name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
    await prisma.product.update({
      where: { id: warehouse.id },
      data: { sharedId, ...(name === 'Elote' ? { unit: 'Unidad' } : {}) },
    })
    await prisma.product.update({
      where: { id: restaurant.id },
      data: { sharedId, ...(name === 'Elote' ? { unit: 'Unidad' } : {}) },
    })
  }

  // Remove the duplicate Mostaza Dijon only when it has no history.
  const duplicateMostazas = await prisma.product.findMany({
    where: { name: 'Mostaza Dijon', module: 'CONDIMENTOS_BODEGA' },
    include: { _count: { select: { records: true } } },
    orderBy: { minStock: 'desc' },
  })
  for (const duplicate of duplicateMostazas.slice(1)) {
    if (duplicate._count.records === 0) {
      await prisma.product.delete({ where: { id: duplicate.id } })
    }
  }
  const mostaza = await prisma.product.findFirst({
    where: { name: 'Mostaza Dijon', module: 'CONDIMENTOS_BODEGA' },
  })
  if (mostaza && mostaza.minStock !== 6) {
    await prisma.product.update({ where: { id: mostaza.id }, data: { minStock: 6 } })
  }

  // Unify the beverage catalog across warehouse and service.
  const beverageModules = ['BEBIDAS_BODEGA', 'BEBIDAS_SERVICIO'] as const
  const beverageAlias = (name: string) => {
    const key = name
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
    const aliases: Record<string, string> = {
      'coca cola': 'coca-cola',
      'coca-cola': 'coca-cola',
      'coca zero retornable': 'coca-cola-zero-retornable',
      'coca-cola zero retornable': 'coca-cola-zero-retornable',
      'te liption limon': 'te-lipton-limon',
      'te lipton limon': 'te-lipton-limon',
      'te lipton frambueza': 'te-lipton-frambuesa',
      'te lipton frambuesa': 'te-lipton-frambuesa',
    }
    return aliases[key] ?? key.replace(/[^a-z0-9]+/g, '-')
  }
  const originalBodegaBeverageNames = [
    'Coca-Cola vidrio', 'Coca-Cola zero vidrio', 'Sprite', 'Coca cola lata',
    'Coca cola zero lata', 'Tropical uva', 'Tropical fresa', 'Pepsi black',
    'Pepsi', 'Kolashampan', 'Salutari de limón', 'Salutari de naranja',
    'Salutari de toronja', 'Agua mineral', 'Te limón', 'Te de frambuesa',
    'Te de durazno', 'Botella con agua', 'Regia chola 750ml', 'Regia paq 355',
    'Regia lata', 'Ultra', 'Suprema', 'Pilsener', 'Pilsener lata',
    'Estrella Damm', 'Corona', 'Corona Zero', 'Modelo', 'Cadejo Negra',
    'Cadejo hija de pooh', 'Cadejo mera belga', 'Heineken 0', 'Stella Artois',
  ]

  // Bodega keeps its own catalog. Restaurant-only beverages are hidden there,
  // but their records remain intact and the restaurant catalog is untouched.
  await prisma.product.updateMany({
    where: {
      module: 'BEBIDAS_BODEGA',
      name: { notIn: originalBodegaBeverageNames },
      active: true,
    },
    data: { active: false },
  })
  await prisma.product.updateMany({
    where: { module: 'BEBIDAS_BODEGA', name: 'Cadejo Negra' },
    data: { active: true },
  })

  const beverageProducts = await prisma.product.findMany({
    where: { module: { in: [...beverageModules] }, active: true },
    include: { _count: { select: { records: true } } },
  })
  const beverageGroups = new Map<string, typeof beverageProducts>()
  for (const product of beverageProducts) {
    const key = beverageAlias(product.name)
    const group = beverageGroups.get(key) ?? []
    group.push(product)
    beverageGroups.set(key, group)
  }

  for (const [key, group] of beverageGroups) {
    const byModule = new Map<string, typeof beverageProducts>()
    for (const product of group) {
      const moduleProducts = byModule.get(product.module) ?? []
      moduleProducts.push(product)
      byModule.set(product.module, moduleProducts)
    }
    const existingSharedId = group.find((product) => product.sharedId)?.sharedId
    const sharedId = existingSharedId ?? `bebida-${key}`
    const bodegaPrimary = byModule.get('BEBIDAS_BODEGA')?.sort((a, b) => b._count.records - a._count.records)[0]
    const servicePrimary = byModule.get('BEBIDAS_SERVICIO')?.sort((a, b) => b._count.records - a._count.records)[0]
    const primary = bodegaPrimary ?? servicePrimary
    if (!primary) continue
    const canonicalName = bodegaPrimary?.name.trim() ?? primary.name.trim()

    for (const module of beverageModules) {
      const moduleProducts = byModule.get(module) ?? []
      let keeper = moduleProducts.sort((a, b) => b._count.records - a._count.records)[0]

      if (!keeper) continue

      for (const duplicate of moduleProducts.slice(1)) {
        const records = await prisma.dailyRecord.findMany({
          where: { productId: duplicate.id },
          select: { id: true, date: true },
        })
        for (const record of records) {
          const conflict = await prisma.dailyRecord.findUnique({
            where: { productId_date: { productId: keeper.id, date: record.date } },
            select: { id: true },
          })
          if (conflict) {
            await prisma.dailyRecord.delete({ where: { id: record.id } })
          } else {
            await prisma.dailyRecord.update({ where: { id: record.id }, data: { productId: keeper.id } })
          }
        }
        await prisma.dayConsumptionSnapshot.deleteMany({ where: { productId: duplicate.id } })
        await prisma.alert.updateMany({ where: { productId: duplicate.id }, data: { productId: keeper.id, productName: canonicalName } })
        await prisma.product.delete({ where: { id: duplicate.id } })
      }

      await prisma.product.update({
        where: { id: keeper.id },
        data: { name: canonicalName, sharedId },
      })
    }
  }

  // Carnes ahumadas nuevas: se crean en Bodega y en el restaurante con el mismo ID compartido.
  for (const name of ['Alitas Ahumadas', 'Lomo de Cerdo Ahumado', 'Steak Cerdo Ahumado']) {
    const sharedId = `carne-${name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
    for (const module of ['CARNES_AHUMADAS', 'CARNES_PREPARADAS'] as const) {
      const existing = await prisma.product.findFirst({
        where: { module, name },
        orderBy: [{ active: 'desc' }, { createdAt: 'asc' }],
      })
      if (existing) {
        await prisma.product.update({
          where: { id: existing.id },
          data: { active: true, sharedId, category: 'Carnes Ahumadas', unit: 'LB' },
        })
      } else {
        await prisma.product.create({
          data: { name, category: 'Carnes Ahumadas', module, unit: 'LB', minStock: 0, sharedId },
        })
      }
    }
  }

  // Carnes para Servicio debe usar exactamente el catálogo de Carnes Ahumadas Bodega.
  const smokedWarehouseProducts = await prisma.product.findMany({
    where: { module: 'CARNES_AHUMADAS', active: true },
  })
  const smokedSharedIds = smokedWarehouseProducts
    .map((product) => product.sharedId)
    .filter((id): id is string => Boolean(id))
  await prisma.product.updateMany({
    where: {
      module: 'CARNES_PREPARADAS',
      active: true,
      OR: [
        { sharedId: null },
        { sharedId: { notIn: smokedSharedIds } },
      ],
    },
    data: { active: false },
  })
  for (const warehouseProduct of smokedWarehouseProducts) {
    const serviceProduct = await prisma.product.findFirst({
      where: { module: 'CARNES_PREPARADAS', sharedId: warehouseProduct.sharedId },
    })
    if (serviceProduct) {
      await prisma.product.update({
        where: { id: serviceProduct.id },
        data: {
          active: true,
          name: warehouseProduct.name,
          category: warehouseProduct.category,
          unit: warehouseProduct.unit,
        },
      })
    } else {
      await prisma.product.create({
        data: {
          name: warehouseProduct.name,
          category: warehouseProduct.category,
          module: 'CARNES_PREPARADAS',
          unit: warehouseProduct.unit,
          minStock: warehouseProduct.minStock,
          sharedId: warehouseProduct.sharedId,
        },
      })
    }
  }

  // Keep restaurant beverages aligned with the warehouse beverage catalog.
  const activeBodegaBeverages = await prisma.product.findMany({
    where: { module: 'BEBIDAS_BODEGA', active: true },
  })
  const bodegaBeverageNames = activeBodegaBeverages.map((product) => product.name)
  await prisma.product.updateMany({
    where: {
      module: 'BEBIDAS_SERVICIO',
      active: true,
      name: { notIn: bodegaBeverageNames },
    },
    data: { active: false },
  })
  for (const bodegaProduct of activeBodegaBeverages) {
    const serviceProduct = await prisma.product.findFirst({
      where: { module: 'BEBIDAS_SERVICIO', name: bodegaProduct.name },
    })
    if (serviceProduct) {
      await prisma.product.update({
        where: { id: serviceProduct.id },
        data: {
          active: true,
          sharedId: bodegaProduct.sharedId,
          category: bodegaProduct.category,
          unit: bodegaProduct.unit,
        },
      })
    } else {
      await prisma.product.create({
        data: {
          name: bodegaProduct.name,
          category: bodegaProduct.category,
          module: 'BEBIDAS_SERVICIO',
          unit: bodegaProduct.unit,
          minStock: bodegaProduct.minStock,
          sharedId: bodegaProduct.sharedId,
        },
      })
    }
  }

  // Ensure every selected restaurant product also exists in its warehouse module.
  const restaurantToWarehouse = [
    { restaurantModule: 'LACTEOS_RESTAURANTE' as Module, warehouseModule: 'LACTEOS_BODEGA' as Module, name: 'Mix de Queso', sharedId: 'lacteo-mix-de-queso' },
    { restaurantModule: 'LACTEOS_RESTAURANTE' as Module, warehouseModule: 'LACTEOS_BODEGA' as Module, name: 'Queso Americano', sharedId: 'lacteo-queso-americano' },
    { restaurantModule: 'CONDIMENTOS_RESTAURANTE' as Module, warehouseModule: 'CONDIMENTOS_BODEGA' as Module, name: 'Sal', sharedId: 'condimento-sal' },
    { restaurantModule: 'SALSAS_ADEREZOS_RESTAURANTE' as Module, warehouseModule: 'SALSAS_ADEREZOS_BODEGA' as Module, name: 'Aderezo Blue Cheese', sharedId: 'salsa-aderezo-blue-cheese' },
    { restaurantModule: 'DESECHABLES_BOLSAS_RESTAURANTE' as Module, warehouseModule: 'DESECHABLES_BODEGA' as Module, name: 'Servilleta de Baño', sharedId: 'desechable-servilleta-de-bano' },
    { restaurantModule: 'HARINAS_ACEITE_RESTAURANTE' as Module, warehouseModule: 'HARINAS_ACEITE_BODEGA' as Module, name: 'Coditos', sharedId: 'harina-coditos' },
    { restaurantModule: 'VERDURAS_RESTAURANTE' as Module, warehouseModule: 'VERDURAS' as Module, name: 'Cebolla Blanca', sharedId: 'verdura-cebolla-blanca' },
  ]
  for (const link of restaurantToWarehouse) {
    // Si hay duplicados viejos, se usa el que tiene más historial y nunca se reactiva otro.
    const byMostHistory = [{ active: 'desc' as const }, { records: { _count: 'desc' as const } }, { createdAt: 'asc' as const }]
    const restaurant = await prisma.product.findFirst({ where: { module: link.restaurantModule, name: link.name }, orderBy: byMostHistory })
    if (!restaurant) continue
    const warehouse = await prisma.product.findFirst({ where: { module: link.warehouseModule, name: link.name }, orderBy: byMostHistory })
    if (warehouse) {
      await prisma.product.update({ where: { id: warehouse.id }, data: { sharedId: link.sharedId, active: true } })
    } else {
      await prisma.product.create({
        data: {
          name: link.name,
          category: restaurant.category,
          module: link.warehouseModule,
          unit: restaurant.unit.trim(),
          minStock: restaurant.minStock,
          sharedId: link.sharedId,
        },
      })
    }
    await prisma.product.update({ where: { id: restaurant.id }, data: { sharedId: link.sharedId } })
  }

  // Link restaurant and warehouse bread records despite their location suffix.
  const breadLinks = [
    { restaurantName: 'Pan de Papa', warehouseName: 'Pan de Papa - Bodega', sharedId: 'pan-pan-de-papa' },
    { restaurantName: 'Pan de Pretzel', warehouseName: 'Pan de Pretzel - Bodega', sharedId: 'pan-pan-de-pretzel' },
  ]
  for (const link of breadLinks) {
    const restaurant = await prisma.product.findFirst({ where: { module: 'PAN_RESTAURANTE', name: link.restaurantName } })
    const warehouse = await prisma.product.findFirst({ where: { module: 'PAN', name: link.warehouseName } })
    if (restaurant) await prisma.product.update({ where: { id: restaurant.id }, data: { sharedId: link.sharedId } })
    if (warehouse) await prisma.product.update({ where: { id: warehouse.id }, data: { sharedId: link.sharedId } })
  }

  // Mismo ID compartido = misma unidad de medida. Bodega es la referencia porque de ahí se descuenta.
  const unitPairs: [Module, Module][] = [
    ['BEBIDAS_SERVICIO', 'BEBIDAS_BODEGA'],
    ['SALSAS_ADEREZOS_RESTAURANTE', 'SALSAS_ADEREZOS_BODEGA'],
    ['VERDURAS_RESTAURANTE', 'VERDURAS'],
    ['LACTEOS_RESTAURANTE', 'LACTEOS_BODEGA'],
    ['DESECHABLES_BOLSAS_RESTAURANTE', 'DESECHABLES_BODEGA'],
    ['PAN_RESTAURANTE', 'PAN'],
    ['FRITURAS_RESTAURANTE', 'FRITURAS'],
    ['HARINAS_ACEITE_RESTAURANTE', 'HARINAS_ACEITE_BODEGA'],
    ['CONDIMENTOS_RESTAURANTE', 'CONDIMENTOS_BODEGA'],
    ['LIMPIEZA_RESTAURANTE', 'LIMPIEZA_BODEGA'],
    ['CARNES_PREPARADAS', 'CARNES_AHUMADAS'],
  ]
  for (const [restaurantModule, warehouseModule] of unitPairs) {
    const warehouseProducts = await prisma.product.findMany({
      where: { module: warehouseModule, active: true, sharedId: { not: null } },
    })
    for (const warehouseProduct of warehouseProducts) {
      const unit = warehouseProduct.unit.trim()
      if (warehouseProduct.unit !== unit) {
        await prisma.product.update({ where: { id: warehouseProduct.id }, data: { unit } })
      }
      await prisma.product.updateMany({
        where: { module: restaurantModule, sharedId: warehouseProduct.sharedId, unit: { not: unit } },
        data: { unit },
      })
    }
  }

  console.log('✓ Seed complete!')
  console.log('\nDefault credentials:')
  console.log('  Dueño  → PIN: 1234')
  console.log('  Empleado → PIN: 0000')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
