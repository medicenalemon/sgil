import { useNavigate } from 'react-router-dom'
import {
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
  ArrowRight,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { canAccess, roleConfig } from '@/lib/permissions'
import type { UserRole } from '@/lib/permissions'

interface ModuleCard {
  key: string
  title: string
  description: string
  icon: React.ReactNode
  path: string
  module: string
  color: string
}

const moduleCards: ModuleCard[] = [
  {
    key: 'compras',
    title: 'Compras',
    description: 'Registrá compras a proveedores',
    icon: <ShoppingCart size={22} />,
    path: '/compras',
    module: 'compras',
    color: '#7c3aed',
  },
  {
    key: 'ventas',
    title: 'Ventas',
    description: 'Generá nuevas ventas a clientes',
    icon: <ShoppingBag size={22} />,
    path: '/ventas',
    module: 'ventas',
    color: '#7c3aed',
  },
  {
    key: 'devoluciones',
    title: 'Devoluciones',
    description: 'Devoluciones de compras y ventas',
    icon: <RotateCcw size={22} />,
    path: '/devoluciones',
    module: 'devoluciones',
    color: '#7c3aed',
  },
  {
    key: 'stock',
    title: 'Stock e Inventario',
    description: 'Productos y movimientos de stock',
    icon: <Package size={22} />,
    path: '/stock',
    module: 'stock',
    color: '#7c3aed',
  },
  {
    key: 'caja',
    title: 'Caja',
    description: 'Apertura, cierre y movimientos',
    icon: <Wallet size={22} />,
    path: '/caja',
    module: 'caja',
    color: '#7c3aed',
  },
  {
    key: 'proveedores',
    title: 'Proveedores',
    description: 'Gestión de proveedores',
    icon: <Truck size={22} />,
    path: '/proveedores',
    module: 'proveedores',
    color: '#7c3aed',
  },
  {
    key: 'clientes',
    title: 'Clientes',
    description: 'Gestión de clientes',
    icon: <Users size={22} />,
    path: '/clientes',
    module: 'clientes',
    color: '#7c3aed',
  },
  {
    key: 'reportes',
    title: 'Reportes y Analytics',
    description: 'Métricas, indicadores y reportes',
    icon: <BarChart3 size={22} />,
    path: '/reportes',
    module: 'reportes',
    color: '#7c3aed',
  },
  {
    key: 'auditorias',
    title: 'Auditorías',
    description: 'Registro de actividad del sistema',
    icon: <Shield size={22} />,
    path: '/auditorias',
    module: 'auditorias',
    color: '#7c3aed',
  },
  {
    key: 'usuarios',
    title: 'Usuarios y Roles',
    description: 'Administrar usuarios y permisos',
    icon: <UserCog size={22} />,
    path: '/usuarios',
    module: 'usuarios',
    color: '#7c3aed',
  },
]

export default function DashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const role = user?.role as UserRole
  const config = roleConfig[role]

  const visibleCards = moduleCards.filter((card) => canAccess(role, card.module))

  return (
    <div
      className="animate-fade-in"
      style={{ padding: '32px 36px' }}
    >
      {/* Welcome banner */}
      <div
        style={{
          borderRadius: '20px',
          padding: '36px 40px',
          marginBottom: '36px',
          position: 'relative',
          overflow: 'hidden',
          background: 'linear-gradient(135deg, #8b5cf6 0%, #a855f7 50%, #d946ef 100%)',
          boxShadow: '0 10px 30px -10px rgba(139, 92, 246, 0.5)',
        }}
      >
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h1
            style={{
              fontSize: 'clamp(1.75rem, 3vw, 2.25rem)',
              fontWeight: 700,
              color: '#fff',
              marginBottom: '10px',
              lineHeight: 1.2,
            }}
          >
            ¡Hola, {config?.label || user?.username}!
          </h1>
          <p
            style={{
              color: 'rgba(255, 255, 255, 0.9)',
              fontSize: '0.95rem',
              marginBottom: '20px',
              maxWidth: '600px',
              lineHeight: 1.6,
            }}
          >
            Bienvenido al Sistema de Gestión Integral de Librerías. Elegí un módulo para comenzar.
          </p>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '6px 18px',
              borderRadius: '9999px',
              fontSize: '0.72rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              color: 'white',
              backdropFilter: 'blur(10px)',
            }}
          >
            Rol: {config?.label}
          </span>
        </div>
      </div>

      {/* Section title */}
      <div style={{ marginBottom: '24px' }}>
        <h2
          style={{
            fontSize: '1.25rem',
            fontWeight: 700,
            color: '#111827',
          }}
        >
          Módulos del Sistema
        </h2>
      </div>

      {/* Module cards grid */}
      <div
        style={{
          display: 'grid',
          gap: '20px',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        }}
      >
        {visibleCards.map((card, index) => (
          <div
            key={card.key}
            className={`animate-fade-in stagger-${Math.min(index + 1, 6)}`}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '18px',
              padding: '24px 28px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04)',
              border: '1px solid #f0f0f4',
              cursor: 'pointer',
              opacity: 0,
              transition: 'all 0.25s ease',
            }}
            onClick={() => navigate(card.path)}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLElement
              el.style.boxShadow = '0 12px 28px -6px rgba(139, 92, 246, 0.18), 0 4px 12px -2px rgba(0, 0, 0, 0.06)'
              el.style.transform = 'translateY(-4px)'
              el.style.borderColor = '#e9e5f5'
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLElement
              el.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04)'
              el.style.transform = 'translateY(0)'
              el.style.borderColor = '#f0f0f4'
            }}
          >
            {/* Card header: title + icon */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '14px',
              }}
            >
              <h3
                style={{
                  color: '#111827',
                  fontWeight: 700,
                  fontSize: '1.05rem',
                  paddingTop: '6px',
                  lineHeight: 1.3,
                }}
              >
                {card.title}
              </h3>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '14px',
                  backgroundColor: '#8b5cf6',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {card.icon}
              </div>
            </div>

            {/* Card body */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                marginBottom: '4px',
              }}
            >
              <span
                style={{
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: '#6b7280',
                }}
              >
                Ir al módulo
              </span>
              <ArrowRight size={14} style={{ color: '#9ca3af' }} />
            </div>
            <p
              style={{
                fontSize: '0.82rem',
                color: '#8b5cf6',
                lineHeight: 1.4,
              }}
            >
              {card.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
