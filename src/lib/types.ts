import type { UserRole } from './permissions'

/**
 * Type definitions for SGIL v2.0
 */

// ============================================
// Auth & Users
// ============================================

export interface Role {
  id: number
  nombre: UserRole
}

export interface Profile {
  id: string
  username: string
  email: string
  role_id: number
  active: boolean
  protected: boolean
  created_at: string
  
  // Joined fields
  role?: UserRole // Mapped role string for frontend compatibility
  roles?: Role    // Raw joined object from Supabase
}

export interface AuthUser {
  id: string
  email: string
  profile: Profile
}

// ============================================
// Catalogs
// ============================================

export interface Categoria {
  id: number
  nombre: string
}

export interface Ubicacion {
  id: number
  nombre: string
}

export interface Proveedor {
  id: number
  razon_social: string
  cuit: string | null
  telefono: string | null
  email: string | null
  contacto: string | null
  direccion: string | null
  activo: boolean
  created_at: string
}

export interface Cliente {
  id: number
  nombre: string
  telefono: string | null
  email: string | null
  direccion: string | null
  observaciones: string | null
  activo: boolean
  created_at: string
}

export interface Producto {
  id: number
  codigo: string
  nombre: string
  descripcion: string | null
  precio_compra: number
  precio_venta: number
  stock: number
  stock_minimo: number
  categoria_id: number | null
  proveedor_id: number | null
  ubicacion_id: number | null
  activo: boolean
  created_at: string
  // Joined fields
  categoria?: Categoria
  proveedor?: Proveedor
  ubicacion?: Ubicacion
}

// ============================================
// Ventas
// ============================================

export interface Venta {
  id: number
  fecha: string
  cliente_id: number | null
  metodo_pago: MetodoPago
  total: number
  usuario_id: string
  // Joined
  cliente?: Cliente
  usuario?: Profile
  items?: VentaItem[]
}

export interface VentaItem {
  id: number
  venta_id: number
  producto_id: number
  cantidad: number
  precio_unitario: number
  subtotal: number
  // Joined
  producto?: Producto
}

export type MetodoPago = 'Efectivo' | 'Tarjeta deb.' | 'Tarjeta cred.' | 'Transferencia' | 'Mercado Pago'

// ============================================
// Compras
// ============================================

export interface Compra {
  id: number
  fecha: string
  proveedor_id: number | null
  total: number
  usuario_id: string
  // Joined
  proveedor?: Proveedor
  usuario?: Profile
  items?: CompraItem[]
}

export interface CompraItem {
  id: number
  compra_id: number
  producto_id: number
  cantidad: number
  precio_unitario: number
  subtotal: number
  // Joined
  producto?: Producto
}

// ============================================
// Devoluciones
// ============================================

export type MotivoDevolucionCompra =
  | 'Producto dañado'
  | 'Producto defectuoso'
  | 'Error en el pedido'
  | 'Producto vencido'
  | 'No coincide con orden de compra'
  | 'Otro'

export type MotivoDevolucionVenta =
  | 'Producto defectuoso'
  | 'Producto incorrecto'
  | 'No cumple expectativas'
  | 'Cliente arrepentido'
  | 'Producto dañado en transporte'
  | 'Otro'

export interface DevolucionCompra {
  id: number
  fecha: string
  compra_id: number
  producto_id: number
  cantidad: number
  motivo: MotivoDevolucionCompra
  observaciones: string | null
  valor: number
  usuario_id: string
  // Joined
  compra?: Compra
  producto?: Producto
  usuario?: Profile
}

export interface DevolucionVenta {
  id: number
  fecha: string
  venta_id: number
  producto_id: number
  cantidad: number
  motivo: MotivoDevolucionVenta
  observaciones: string | null
  valor: number
  usuario_id: string
  // Joined
  venta?: Venta
  producto?: Producto
  usuario?: Profile
}

// ============================================
// Caja
// ============================================

export interface CajaSesion {
  id: number
  usuario_id: string
  fecha_apertura: string
  fecha_cierre: string | null
  monto_inicial: number
  monto_declarado: number | null
  monto_calculado: number | null
  diferencia: number | null
  estado: 'abierta' | 'cerrada'
  observaciones_apertura: string | null
  observaciones_cierre: string | null
  // Joined
  usuario?: Profile
  movimientos?: CajaMovimiento[]
}

export interface CajaMovimiento {
  id: number
  sesion_id: number
  tipo: 'ingreso' | 'egreso' | 'arqueo'
  monto: number
  descripcion: string | null
  fecha: string
  usuario_id: string
  // Joined
  usuario?: Profile
}

// ============================================
// Stock
// ============================================

export interface MovimientoStock {
  id: number
  fecha: string
  producto_id: number
  tipo: 'entrada' | 'salida'
  cantidad: number
  motivo: string
  referencia_tipo: 'venta' | 'compra' | 'devolucion_compra' | 'devolucion_venta' | null
  referencia_id: number | null
  usuario_id: string
  // Joined
  producto?: Producto
  usuario?: Profile
}

// ============================================
// Auditoría
// ============================================

export interface Auditoria {
  id: number
  usuario_id: string
  fecha: string
  modulo: string
  accion: string
  detalle: Record<string, unknown> | null
  // Joined
  usuario?: Profile
}

// ============================================
// Sidebar / Navigation
// ============================================

export interface SidebarItem {
  key: string
  label: string
  icon: string
  path: string
  module: string
  section: string
}

// ============================================
// Component Props
// ============================================

export interface Column<T> {
  key: string
  header: string
  render?: (item: T) => React.ReactNode
  sortable?: boolean
  className?: string
}

export interface StatCardData {
  title: string
  value: string | number | React.ReactNode
  icon: React.ReactNode
  color?: string
  trend?: {
    value: number
    positive: boolean
  }
}
