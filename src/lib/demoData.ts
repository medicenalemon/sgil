/**
 * SGIL v2.0 — Demo Data Store
 * 
 * Provides in-memory data for demo mode (when Supabase is not configured).
 * All data is persisted to localStorage so it survives page refreshes.
 * Data matches the seed.sql file for consistency with the reference screenshots.
 */

import type {
  Producto,
  Cliente,
  Proveedor,
  Categoria,
  Ubicacion,
  Venta,
  VentaItem,
  Compra,
  CompraItem,
  DevolucionCompra,
  DevolucionVenta,
  MovimientoStock,
  CajaSesion,
  CajaMovimiento,
  Auditoria,
  Profile,
} from './types'

export interface DemoUser {
  password: string
  profile: Profile
}

// ============================================
// Storage helpers
// ============================================

function load<T>(key: string, defaults: T[]): T[] {
  try {
    const saved = localStorage.getItem(`sgil_${key}`)
    if (saved) return JSON.parse(saved)
  } catch { /* use defaults */ }
  save(key, defaults)
  return defaults
}

function save<T>(key: string, data: T[]) {
  localStorage.setItem(`sgil_${key}`, JSON.stringify(data))
}

// ============================================
// Default seed data
// ============================================

const defaultCategorias: Categoria[] = [
  { id: 1, nombre: 'Libros' },
  { id: 2, nombre: 'Cuadernos y Anotadores' },
  { id: 3, nombre: 'Útiles Escolares' },
  { id: 4, nombre: 'Arte y Manualidades' },
  { id: 5, nombre: 'Juegos y Juguetes' },
]

const defaultUbicaciones: Ubicacion[] = [
  { id: 1, nombre: 'Estante A - Planta Baja' },
  { id: 2, nombre: 'Estante B - Planta Baja' },
  { id: 3, nombre: 'Estante C - Primer Piso' },
  { id: 4, nombre: 'Depósito' },
  { id: 5, nombre: 'Vitrina Principal' },
]

const defaultProveedores: Proveedor[] = [
  { id: 1, razon_social: 'Papelera Tucumán S.A.', cuit: '30-71234567-8', telefono: '0381-4567890', email: 'ventas@papeleratucuman.com.ar', contacto: 'Carlos Medina', direccion: 'Av. Sáenz Peña 450, San Miguel de Tucumán', activo: true, created_at: '2024-01-15T10:00:00Z' },
  { id: 2, razon_social: 'Tucujuegos S.R.L.', cuit: '30-71987654-3', telefono: '0381-4321098', email: 'info@tucujuegos.com.ar', contacto: 'María García', direccion: 'Calle Junín 230, San Miguel de Tucumán', activo: true, created_at: '2024-02-20T14:00:00Z' },
  { id: 3, razon_social: 'Editorial Kapelusz', cuit: '30-50112233-9', telefono: '011-4555-6677', email: 'distribuidores@kapelusz.com.ar', contacto: 'Roberto Sánchez', direccion: 'Av. Corrientes 1500, CABA', activo: true, created_at: '2024-03-10T09:00:00Z' },
  { id: 4, razon_social: 'Distribuidora del Norte', cuit: '30-71555888-1', telefono: '0381-4888999', email: 'pedidos@distrinorte.com.ar', contacto: 'Ana López', direccion: 'Ruta 9 Km 1290, Yerba Buena', activo: true, created_at: '2024-04-05T11:00:00Z' },
]

const defaultClientes: Cliente[] = [
  { id: 1, nombre: 'Mauricio Montero', telefono: '0381-155-1234', email: 'mauricio.montero@gmail.com', direccion: 'Calle Laprida 567, San Miguel de Tucumán', observaciones: 'Cliente frecuente', activo: true, created_at: '2024-01-10T10:00:00Z' },
  { id: 2, nombre: 'Gabriela Montero', telefono: '0381-155-5678', email: 'gabriela.montero@gmail.com', direccion: 'Calle San Martín 890, San Miguel de Tucumán', observaciones: null, activo: true, created_at: '2024-02-15T14:00:00Z' },
  { id: 3, nombre: 'Escuela Nº 42 "Belgrano"', telefono: '0381-4222333', email: 'escuela42@tucuman.edu.ar', direccion: 'Av. Mate de Luna 2000, San Miguel de Tucumán', observaciones: 'Compras institucionales', activo: true, created_at: '2024-03-01T09:00:00Z' },
  { id: 4, nombre: 'Librería El Estudiante', telefono: '0381-4111222', email: 'contacto@elestudiante.com.ar', direccion: 'Calle 24 de Septiembre 300, San Miguel de Tucumán', observaciones: 'Reventa - mayorista', activo: true, created_at: '2024-04-20T11:00:00Z' },
  { id: 5, nombre: 'Ana Rodríguez', telefono: '0381-155-9012', email: 'ana.rodriguez@gmail.com', direccion: 'B° Sur, Mz. 5, Casa 12, Tucumán', observaciones: null, activo: true, created_at: '2024-05-10T16:00:00Z' },
]

const defaultProductos: Producto[] = [
  { id: 1, codigo: 'LIB-001', nombre: 'Cuaderno Rivadavia 48 hojas', descripcion: 'Cuaderno tapa dura, rayado, 48 hojas', precio_compra: 350, precio_venta: 550, stock: 150, stock_minimo: 20, categoria_id: 2, proveedor_id: 1, ubicacion_id: 1, activo: true, created_at: '2024-01-20T10:00:00Z' },
  { id: 2, codigo: 'LIB-002', nombre: 'Resma A4 75gr (500 hojas)', descripcion: 'Resma de papel A4, 75 gramos, 500 hojas', precio_compra: 2800, precio_venta: 4200, stock: 45, stock_minimo: 10, categoria_id: 3, proveedor_id: 1, ubicacion_id: 4, activo: true, created_at: '2024-01-20T10:05:00Z' },
  { id: 3, codigo: 'LIB-003', nombre: 'Set de Pinturas Acrílicas x12', descripcion: 'Set de 12 colores acrílicos, tubos de 20ml', precio_compra: 1500, precio_venta: 2800, stock: 30, stock_minimo: 5, categoria_id: 4, proveedor_id: 4, ubicacion_id: 5, activo: true, created_at: '2024-02-05T14:00:00Z' },
  { id: 4, codigo: 'LIB-004', nombre: 'Rompecabezas 1000 piezas', descripcion: 'Rompecabezas paisaje de montaña, 1000 piezas', precio_compra: 3200, precio_venta: 5500, stock: 12, stock_minimo: 3, categoria_id: 5, proveedor_id: 2, ubicacion_id: 3, activo: true, created_at: '2024-02-10T09:00:00Z' },
  { id: 5, codigo: 'LIB-005', nombre: 'El Principito - Saint-Exupéry', descripcion: 'Edición ilustrada de El Principito', precio_compra: 1200, precio_venta: 2100, stock: 25, stock_minimo: 5, categoria_id: 1, proveedor_id: 3, ubicacion_id: 1, activo: true, created_at: '2024-03-01T11:00:00Z' },
]

const defaultProfiles: DemoUser[] = [
  {
    password: 'admin123',
    profile: {
      id: 'demo-admin-001',
      username: 'admin',
      email: 'admin@sgil.local',
      role: 'administrador',
      role_id: 1,
      active: true,
      protected: true,
      created_at: '2024-01-01T10:00:00Z',
    },
  },
  {
    password: 'encargado123',
    profile: {
      id: 'demo-encargado-001',
      username: 'maritesalcedo',
      email: 'maritesalcedo@sgil.local',
      role: 'encargado',
      role_id: 2,
      active: true,
      protected: false,
      created_at: '2024-01-02T10:00:00Z',
    },
  },
  {
    password: 'encargado123',
    profile: {
      id: 'demo-encargado-002',
      username: 'luisinaperez',
      email: 'luisinaperez@sgil.local',
      role: 'encargado',
      role_id: 2,
      active: true,
      protected: false,
      created_at: '2024-01-03T10:00:00Z',
    },
  },
  {
    password: 'vendedor123',
    profile: {
      id: 'demo-vendedor-001',
      username: 'vendedor',
      email: 'vendedor@sgil.local',
      role: 'vendedor',
      role_id: 3,
      active: true,
      protected: false,
      created_at: '2024-01-04T10:00:00Z',
    },
  },
]

// ============================================
// Demo Data Store Class
// ============================================

class DemoStore {
  // ---- Getters (load from localStorage) ----

  get categorias(): Categoria[] { return load('categorias', defaultCategorias) }
  get ubicaciones(): Ubicacion[] { return load('ubicaciones', defaultUbicaciones) }
  get proveedores(): Proveedor[] { return load('proveedores', defaultProveedores) }
  get clientes(): Cliente[] { return load('clientes', defaultClientes) }
  get productos(): Producto[] { return load('productos', defaultProductos) }
  get ventas(): Venta[] { return load('ventas', []) }
  get ventaItems(): VentaItem[] { return load('venta_items', []) }
  get compras(): Compra[] { return load('compras', []) }
  get compraItems(): CompraItem[] { return load('compra_items', []) }
  get devolucionesCompra(): DevolucionCompra[] { return load('devoluciones_compra', []) }
  get devolucionesVenta(): DevolucionVenta[] { return load('devoluciones_venta', []) }
  get movimientosStock(): MovimientoStock[] { return load('movimientos_stock', []) }
  get cajaSesiones(): CajaSesion[] { return load('caja_sesiones', []) }
  get cajaMovimientos(): CajaMovimiento[] { return load('caja_movimientos', []) }
  get auditorias(): Auditoria[] { return load('auditorias', []) }
  get profiles(): DemoUser[] { return load('profiles', defaultProfiles) }

  // ---- Setters (save to localStorage) ----

  set categorias(data: Categoria[]) { save('categorias', data) }
  set ubicaciones(data: Ubicacion[]) { save('ubicaciones', data) }
  set proveedores(data: Proveedor[]) { save('proveedores', data) }
  set clientes(data: Cliente[]) { save('clientes', data) }
  set productos(data: Producto[]) { save('productos', data) }
  set ventas(data: Venta[]) { save('ventas', data) }
  set ventaItems(data: VentaItem[]) { save('venta_items', data) }
  set compras(data: Compra[]) { save('compras', data) }
  set compraItems(data: CompraItem[]) { save('compra_items', data) }
  set devolucionesCompra(data: DevolucionCompra[]) { save('devoluciones_compra', data) }
  set devolucionesVenta(data: DevolucionVenta[]) { save('devoluciones_venta', data) }
  set movimientosStock(data: MovimientoStock[]) { save('movimientos_stock', data) }
  set cajaSesiones(data: CajaSesion[]) { save('caja_sesiones', data) }
  set cajaMovimientos(data: CajaMovimiento[]) { save('caja_movimientos', data) }
  set auditorias(data: Auditoria[]) { save('auditorias', data) }
  set profiles(data: DemoUser[]) { save('profiles', data) }

  // ---- Helpers ----

  nextId(key: string): number {
    const items = load<{ id: number }>(key, [])
    return items.length > 0 ? Math.max(...items.map((i) => i.id)) + 1 : 1
  }

  /** Get producto with joined categoria, proveedor, ubicacion */
  getProductoFull(id: number): Producto | undefined {
    const p = this.productos.find((p) => p.id === id)
    if (!p) return undefined
    return {
      ...p,
      categoria: this.categorias.find((c) => c.id === p.categoria_id),
      proveedor: this.proveedores.find((pr) => pr.id === p.proveedor_id),
      ubicacion: this.ubicaciones.find((u) => u.id === p.ubicacion_id),
    }
  }

  /** Reset all data to defaults */
  reset() {
    const keys = [
      'categorias', 'ubicaciones', 'proveedores', 'clientes', 'productos',
      'ventas', 'venta_items', 'compras', 'compra_items',
      'devoluciones_compra', 'devoluciones_venta', 'movimientos_stock',
      'caja_sesiones', 'caja_movimientos', 'auditorias', 'profiles'
    ]
    keys.forEach((k) => localStorage.removeItem(`sgil_${k}`))
  }
}

export const demoStore = new DemoStore()
