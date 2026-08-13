# CLAUDE.md — SGIL v2.0

## Proyecto
SGIL — Sistema de Gestión Integral de Librerías
ERP liviano para librerías y rubros afines.

## Stack
- React 18 + Vite + TypeScript
- Tailwind CSS v4 (con @theme)
- Lucide React (iconos)
- Supabase (Auth + PostgreSQL + RLS)
- Sonner (toasts)
- Recharts (gráficos en Reportes)
- jspdf + jspdf-autotable (PDFs)
- react-router-dom (routing)

## Sistema de Diseño
- **Paleta principal:** Violeta/Púrpura (#7C3AED – #9333EA)
- **Gradiente login/banner:** violeta → rosado (135deg)
- **Sidebar:** Fondo violeta oscuro (#1e0a3c → #2d1057)
- **Botón primario:** Violeta sólido, texto blanco
- **Badges de rol:** Administrador = rosado, Encargado = azul, Vendedor = verde
- **Badges de estado:** Activo = violeta
- **Badges de stock:** Entrada = verde, Salida = rojo

## Roles y Permisos (RBAC)
| Módulo | Administrador | Encargado | Vendedor |
|---|:---:|:---:|:---:|
| Dashboard | ✅ | ✅ | ✅ |
| Ventas | ✅ | ✅ | ✅ (crear/ver) |
| Compras | ✅ | ✅ | ❌ |
| Devoluciones | ✅ | ✅ | ❌ |
| Caja | ✅ | ✅ | ❌ |
| Stock | ✅ | ✅ | ✅ (sin precio compra) |
| Clientes | ✅ | ✅ | ✅ (solo consulta) |
| Proveedores | ✅ | ✅ | ❌ |
| Reportes | ✅ | ✅ | ❌ |
| Auditorías | ✅ | ✅ | ❌ |
| Usuarios | ✅ | ❌ | ❌ |

## Reglas de Negocio Críticas
1. **Ventas:** No permitir más cantidad que el stock disponible.
2. **Compras:** Advertir si precio_compra >= precio_venta (sin bloquear).
3. **Devolución de compra:** Descuenta stock (se devuelve al proveedor).
4. **Devolución de venta:** NO repone stock (producto devuelto no vuelve a estar disponible).
5. **Caja:** Saldo = inicial + ventas + ingresos − egresos.
6. **Usuario admin:** Protegido, no se puede eliminar.
7. **Vendedor:** No ve precio de compra en productos.

## Patrones de Código
- Componentes reutilizables: `DataTable`, `CrudModal`, `StatCard`, `ConfirmDialog`
- Auth dual: Supabase (producción) + localStorage (demo)
- Auditoría: `useAuditoria()` hook llamado desde cada módulo
- Permisos: `canAccess()`, `canPerform()`, `getPermissions()` en `lib/permissions.ts`
