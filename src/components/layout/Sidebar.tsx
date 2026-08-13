import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  ShoppingCart,
  ShoppingBag,
  RotateCcw,
  Wallet,
  Package,
  Users,
  Truck,
  BarChart3,
  Shield,
  UserCog,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Info,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { canAccess } from '@/lib/permissions'
import type { UserRole } from '@/lib/permissions'
import { useState } from 'react'

interface SubItem {
  key: string
  label: string
  path: string
}

interface NavItem {
  key: string
  label: string
  icon: React.ReactNode
  path: string
  module: string
  subItems?: SubItem[]
}

interface NavSection {
  title: string
  items: NavItem[]
}

const navSections: NavSection[] = [
  {
    title: 'PRINCIPAL',
    items: [
      { key: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} />, path: '/', module: 'dashboard' },
    ],
  },
  {
    title: 'OPERACIONES',
    items: [
      { key: 'ventas', label: 'Ventas', icon: <ShoppingCart size={18} />, path: '/ventas', module: 'ventas' },
      { key: 'compras', label: 'Compras', icon: <ShoppingBag size={18} />, path: '/compras', module: 'compras' },
      { key: 'devoluciones', label: 'Devoluciones', icon: <RotateCcw size={18} />, path: '/devoluciones', module: 'devoluciones' },
      { key: 'caja', label: 'Caja', icon: <Wallet size={18} />, path: '/caja', module: 'caja' },
      {
        key: 'stock',
        label: 'Stock e Inventario',
        icon: <Package size={18} />,
        path: '/stock',
        module: 'stock',
        subItems: [
          { key: 'stock-productos', label: 'Gestión de Productos', path: '/stock/productos' },
          { key: 'stock-movimientos', label: 'Movimientos de Stock', path: '/stock/movimientos' },
        ],
      },
    ],
  },
  {
    title: 'CONTACTOS',
    items: [
      { key: 'clientes', label: 'Clientes', icon: <Users size={18} />, path: '/clientes', module: 'clientes' },
      { key: 'proveedores', label: 'Proveedores', icon: <Truck size={18} />, path: '/proveedores', module: 'proveedores' },
    ],
  },
  {
    title: 'ADMINISTRACIÓN',
    items: [
      { key: 'reportes', label: 'Reportes y Analytics', icon: <BarChart3 size={18} />, path: '/reportes', module: 'reportes' },
      { key: 'auditorias', label: 'Auditorías', icon: <Shield size={18} />, path: '/auditorias', module: 'auditorias' },
      { key: 'usuarios', label: 'Usuarios y Roles', icon: <UserCog size={18} />, path: '/usuarios', module: 'usuarios' },
    ],
  },
  {
    title: 'SISTEMA',
    items: [
      { key: 'acerca', label: 'Acerca de', icon: <Info size={18} />, path: '/acerca', module: 'dashboard' },
    ],
  },
]

export default function Sidebar() {
  const { user } = useAuth()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)
  const [expandedMenus, setExpandedMenus] = useState<string[]>(['stock'])
  const role = user?.role as UserRole

  if (!user) return null

  const filteredSections = navSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => canAccess(role, item.module)),
    }))
    .filter((section) => section.items.length > 0)

  const toggleSubmenu = (key: string) => {
    setExpandedMenus((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    )
  }

  const isItemActive = (item: NavItem) => {
    if (item.path === '/') return location.pathname === '/'
    return location.pathname.startsWith(item.path)
  }

  /* ── Styles ── */
  const sidebarBg = 'linear-gradient(180deg, #4c1d95 0%, #3b0764 100%)'
  const sectionLabelColor = 'rgba(196, 181, 253, 0.7)' // purple-300 faded
  const dividerColor = 'rgba(139, 92, 246, 0.18)'
  const activeItemBg = 'rgba(139, 92, 246, 0.35)'
  const hoverItemBg = 'rgba(139, 92, 246, 0.15)'
  const textDefault = 'rgba(255, 255, 255, 0.75)'
  const textActive = '#ffffff'

  return (
    <aside
      style={{
        width: collapsed ? 'var(--sidebar-collapsed-width)' : 'var(--sidebar-width)',
        background: sidebarBg,
        transition: 'width 0.3s ease',
      }}
      className="fixed top-0 left-0 h-screen z-40 flex flex-col overflow-hidden text-white"
    >
      {/* ── Logo ── */}
      <div
        style={{
          padding: collapsed ? '20px 10px 16px' : '20px 20px 16px',
          borderBottom: `1px solid ${dividerColor}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start' }}>
          {!collapsed ? (
            <img 
              src="/sgilblanco.png" 
              alt="SGIL Logo Completo" 
              className="animate-fade-in"
              style={{ height: '48px', objectFit: 'contain', maxWidth: '100%' }} 
            />
          ) : (
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: '10px',
                background: 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                overflow: 'hidden'
              }}
            >
              <img src="/sgilblanco.png" alt="SGIL Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
          )}
        </div>
      </div>

      {/* ── Navigation ── */}
      <nav
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: collapsed ? '12px 8px' : '8px 12px',
        }}
      >
        {filteredSections.map((section, sectionIdx) => (
          <div
            key={section.title}
            style={{
              paddingTop: sectionIdx === 0 ? '8px' : '12px',
              paddingBottom: '8px',
              borderBottom:
                sectionIdx < filteredSections.length - 1
                  ? `1px solid ${dividerColor}`
                  : 'none',
            }}
          >
            {/* Section label */}
            {!collapsed && (
              <p
                style={{
                  fontSize: '0.65rem',
                  fontWeight: 600,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: sectionLabelColor,
                  padding: '0 12px',
                  marginBottom: '8px',
                }}
              >
                {section.title}
              </p>
            )}

            {/* Nav items */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {section.items.map((item) => {
                const isActive = isItemActive(item)
                const hasSubItems = item.subItems && item.subItems.length > 0
                const isExpanded = expandedMenus.includes(item.key)

                return (
                  <div key={item.key}>
                    {/* Main item */}
                    {hasSubItems ? (
                      /* Parent item with sub-menu — click toggles expand */
                      <button
                        onClick={() => toggleSubmenu(item.key)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          width: '100%',
                          padding: collapsed ? '10px' : '9px 12px',
                          borderRadius: '8px',
                          border: 'none',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          color: isActive ? textActive : textDefault,
                          background: isActive ? activeItemBg : 'transparent',
                          fontWeight: isActive ? 500 : 400,
                          fontSize: '0.84rem',
                          fontFamily: 'inherit',
                          textAlign: 'left',
                          justifyContent: collapsed ? 'center' : 'flex-start',
                        }}
                        onMouseEnter={(e) => {
                          if (!isActive) {
                            ;(e.currentTarget as HTMLElement).style.background = hoverItemBg
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isActive) {
                            ;(e.currentTarget as HTMLElement).style.background = 'transparent'
                          }
                        }}
                      >
                        <span style={{ flexShrink: 0, opacity: isActive ? 1 : 0.7, display: 'flex' }}>
                          {item.icon}
                        </span>
                        {!collapsed && (
                          <>
                            <span style={{ flex: 1 }}>{item.label}</span>
                            <span style={{ opacity: 0.5, display: 'flex' }}>
                              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </span>
                          </>
                        )}
                      </button>
                    ) : (
                      /* Regular NavLink item */
                      <NavLink
                        to={item.path}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: collapsed ? '10px' : '9px 12px',
                          borderRadius: '8px',
                          textDecoration: 'none',
                          transition: 'all 0.2s ease',
                          color: isActive ? textActive : textDefault,
                          background: isActive ? activeItemBg : 'transparent',
                          fontWeight: isActive ? 500 : 400,
                          fontSize: '0.84rem',
                          justifyContent: collapsed ? 'center' : 'flex-start',
                        }}
                        onMouseEnter={(e) => {
                          if (!isActive) {
                            ;(e.currentTarget as HTMLElement).style.background = hoverItemBg
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isActive) {
                            ;(e.currentTarget as HTMLElement).style.background = 'transparent'
                          }
                        }}
                      >
                        <span style={{ flexShrink: 0, opacity: isActive ? 1 : 0.7, display: 'flex' }}>
                          {item.icon}
                        </span>
                        {!collapsed && <span>{item.label}</span>}
                      </NavLink>
                    )}

                    {/* Sub-items (expanded) */}
                    {hasSubItems && isExpanded && !collapsed && (
                      <div
                        style={{
                          marginLeft: '28px',
                          paddingLeft: '12px',
                          borderLeft: `1px solid ${dividerColor}`,
                          marginTop: '2px',
                          marginBottom: '4px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '1px',
                        }}
                      >
                        {item.subItems!.map((sub) => {
                          const subPath = sub.path
                          const isSubActive = location.pathname === sub.path

                          return (
                            <NavLink
                              key={sub.key}
                              to={subPath}
                              style={{
                                display: 'block',
                                padding: '6px 10px',
                                borderRadius: '6px',
                                textDecoration: 'none',
                                fontSize: '0.78rem',
                                fontWeight: isSubActive ? 500 : 400,
                                color: isSubActive ? textActive : textDefault,
                                background: isSubActive ? activeItemBg : 'transparent',
                                transition: 'all 0.15s ease',
                              }}
                              onMouseEnter={(e) => {
                                if (!isSubActive) {
                                  ;(e.currentTarget as HTMLElement).style.background = hoverItemBg
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!isSubActive) {
                                  ;(e.currentTarget as HTMLElement).style.background = 'transparent'
                                }
                              }}
                            >
                              {sub.label}
                            </NavLink>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* ── Collapse toggle ── */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '14px 0',
          borderTop: `1px solid ${dividerColor}`,
          color: textDefault,
          background: 'transparent',
          border: 'none',
          borderTopStyle: 'solid',
          borderTopWidth: '1px',
          borderTopColor: dividerColor,
          cursor: 'pointer',
          transition: 'background 0.2s ease',
        }}
        onMouseEnter={(e) => {
          ;(e.currentTarget as HTMLElement).style.background = hoverItemBg
        }}
        onMouseLeave={(e) => {
          ;(e.currentTarget as HTMLElement).style.background = 'transparent'
        }}
      >
        {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
      </button>
    </aside>
  )
}
