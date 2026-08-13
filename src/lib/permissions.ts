/**
 * SGIL v2.0 — Permission Matrix (RBAC)
 * 
 * Controls UI visibility and route access based on user role.
 * Database-level security is enforced via Supabase RLS policies.
 */

export type UserRole = 'administrador' | 'encargado' | 'vendedor'

export interface ModulePermission {
  read: boolean
  create: boolean
  update: boolean
  delete: boolean
}

type PermissionMatrix = Record<string, Record<UserRole, ModulePermission>>

/** Full permission matrix matching the plan's Section 6 */
const permissions: PermissionMatrix = {
  dashboard: {
    administrador: { read: true, create: false, update: false, delete: false },
    encargado:     { read: true, create: false, update: false, delete: false },
    vendedor:      { read: true, create: false, update: false, delete: false },
  },
  ventas: {
    administrador: { read: true, create: true, update: true, delete: true },
    encargado:     { read: true, create: true, update: true, delete: true },
    vendedor:      { read: true, create: true, update: false, delete: false },
  },
  compras: {
    administrador: { read: true, create: true, update: true, delete: true },
    encargado:     { read: true, create: true, update: true, delete: true },
    vendedor:      { read: false, create: false, update: false, delete: false },
  },
  devoluciones: {
    administrador: { read: true, create: true, update: false, delete: false },
    encargado:     { read: true, create: true, update: false, delete: false },
    vendedor:      { read: false, create: false, update: false, delete: false },
  },
  caja: {
    administrador: { read: true, create: true, update: true, delete: false },
    encargado:     { read: true, create: true, update: true, delete: false },
    vendedor:      { read: false, create: false, update: false, delete: false },
  },
  stock: {
    administrador: { read: true, create: true, update: true, delete: true },
    encargado:     { read: true, create: true, update: true, delete: true },
    vendedor:      { read: true, create: false, update: false, delete: false },
  },
  clientes: {
    administrador: { read: true, create: true, update: true, delete: true },
    encargado:     { read: true, create: true, update: true, delete: true },
    vendedor:      { read: true, create: false, update: false, delete: false },
  },
  proveedores: {
    administrador: { read: true, create: true, update: true, delete: true },
    encargado:     { read: true, create: true, update: true, delete: true },
    vendedor:      { read: false, create: false, update: false, delete: false },
  },
  reportes: {
    administrador: { read: true, create: false, update: false, delete: false },
    encargado:     { read: true, create: false, update: false, delete: false },
    vendedor:      { read: false, create: false, update: false, delete: false },
  },
  auditorias: {
    administrador: { read: true, create: false, update: false, delete: false },
    encargado:     { read: true, create: false, update: false, delete: false },
    vendedor:      { read: false, create: false, update: false, delete: false },
  },
  usuarios: {
    administrador: { read: true, create: true, update: true, delete: true },
    encargado:     { read: false, create: false, update: false, delete: false },
    vendedor:      { read: false, create: false, update: false, delete: false },
  },
}

/** Check if a role can access a module */
export function canAccess(role: UserRole, module: string): boolean {
  return permissions[module]?.[role]?.read ?? false
}

/** Get full permissions for a role on a module */
export function getPermissions(role: UserRole, module: string): ModulePermission {
  return permissions[module]?.[role] ?? { read: false, create: false, update: false, delete: false }
}

/** Check a specific action on a module */
export function canPerform(role: UserRole, module: string, action: keyof ModulePermission): boolean {
  return permissions[module]?.[role]?.[action] ?? false
}

/** Get all accessible module keys for a role */
export function getAccessibleModules(role: UserRole): string[] {
  return Object.keys(permissions).filter(mod => permissions[mod][role]?.read)
}

/** Role display labels and colors */
export const roleConfig: Record<UserRole, { label: string; badgeClass: string; color: string }> = {
  administrador: { label: 'Administrador', badgeClass: 'badge-admin', color: '#be185d' },
  encargado:     { label: 'Encargado',     badgeClass: 'badge-encargado', color: '#1d4ed8' },
  vendedor:      { label: 'Vendedor',      badgeClass: 'badge-vendedor', color: '#15803d' },
}
