import { PanelLeft, User, LogOut } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { roleConfig } from '@/lib/permissions'
import type { UserRole } from '@/lib/permissions'
import { useState, useRef, useEffect } from 'react'

export default function Topbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  if (!user) return null

  const initial = user.username.charAt(0).toUpperCase()
  const role = user.role as UserRole
  const config = roleConfig[role]

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpen])

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 30,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 32px',
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #f0f0f4',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
      }}
    >
      {/* Left side — Welcome */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button
          style={{
            padding: '6px',
            borderRadius: '6px',
            color: '#6b7280',
            backgroundColor: 'transparent',
            border: '1px solid #e5e7eb',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background-color 0.15s ease',
          }}
          title="Alternar menú"
          onMouseEnter={(e) => {
            ;(e.currentTarget as HTMLElement).style.backgroundColor = '#f3f4f6'
          }}
          onMouseLeave={(e) => {
            ;(e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'
          }}
        >
          <PanelLeft size={20} />
        </button>
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.3 }}>
          <span
            style={{
              fontSize: '0.72rem',
              color: '#6b7280',
              fontWeight: 500,
            }}
          >
            Bienvenido,
          </span>
          <span
            style={{
              fontSize: '0.875rem',
              fontWeight: 600,
              color: '#111827',
              textTransform: 'capitalize',
            }}
          >
            {user.username}
          </span>
        </div>
      </div>

      {/* Right side — Role pill + Avatar with dropdown */}
      <div
        ref={menuRef}
        style={{ display: 'flex', alignItems: 'center', gap: '12px', position: 'relative' }}
      >
        {/* Role Pill */}
        <span
          style={{
            padding: '6px 14px',
            backgroundColor: '#f5f3ff',
            color: '#6d28d9',
            fontSize: '0.75rem',
            fontWeight: 600,
            borderRadius: '9999px',
            textTransform: 'capitalize',
          }}
        >
          {config?.label || user.role}
        </span>

        {/* Avatar button */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            backgroundColor: '#6d28d9',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 600,
            fontSize: '0.9rem',
            cursor: 'pointer',
            border: 'none',
            outline: 'none',
            boxShadow: '0 2px 6px rgba(109, 40, 217, 0.3)',
            transition: 'opacity 0.15s ease, box-shadow 0.15s ease',
          }}
          onMouseEnter={(e) => {
            ;(e.currentTarget as HTMLElement).style.boxShadow = '0 4px 12px rgba(109, 40, 217, 0.4)'
          }}
          onMouseLeave={(e) => {
            ;(e.currentTarget as HTMLElement).style.boxShadow = '0 2px 6px rgba(109, 40, 217, 0.3)'
          }}
          title="Menú de usuario"
        >
          {initial}
        </button>

        {/* Dropdown menu */}
        {menuOpen && (
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              right: 0,
              width: '220px',
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              boxShadow: '0 10px 40px -8px rgba(0, 0, 0, 0.15), 0 4px 12px -2px rgba(0, 0, 0, 0.08)',
              border: '1px solid #f0f0f4',
              overflow: 'hidden',
              animation: 'scaleIn 0.15s ease-out forwards',
              zIndex: 50,
            }}
          >
            {/* User info header */}
            <div
              style={{
                padding: '14px 16px',
                borderBottom: '1px solid #f0f0f4',
              }}
            >
              <p
                style={{
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: '#111827',
                  textTransform: 'capitalize',
                  margin: 0,
                  lineHeight: 1.3,
                }}
              >
                {config?.label || user.username}
              </p>
              <p
                style={{
                  fontSize: '0.75rem',
                  color: '#9ca3af',
                  margin: '2px 0 0',
                  lineHeight: 1.3,
                }}
              >
                {user.email}
              </p>
            </div>

            {/* Menu items */}
            <div style={{ padding: '6px' }}>
              {/* Mi Perfil */}
              <button
                onClick={() => {
                  setMenuOpen(false)
                  navigate('/perfil')
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: '#374151',
                  fontSize: '0.84rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'background-color 0.15s ease',
                  textAlign: 'left',
                }}
                onMouseEnter={(e) => {
                  ;(e.currentTarget as HTMLElement).style.backgroundColor = '#f9fafb'
                }}
                onMouseLeave={(e) => {
                  ;(e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'
                }}
              >
                <User size={16} style={{ color: '#9ca3af' }} />
                Mi Perfil
              </button>

              {/* Divider */}
              <div
                style={{
                  height: '1px',
                  backgroundColor: '#f0f0f4',
                  margin: '4px 8px',
                }}
              />

              {/* Cerrar Sesión */}
              <button
                onClick={() => {
                  setMenuOpen(false)
                  logout()
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: '#dc2626',
                  fontSize: '0.84rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'background-color 0.15s ease',
                  textAlign: 'left',
                }}
                onMouseEnter={(e) => {
                  ;(e.currentTarget as HTMLElement).style.backgroundColor = '#fef2f2'
                }}
                onMouseLeave={(e) => {
                  ;(e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'
                }}
              >
                <LogOut size={16} style={{ color: '#dc2626' }} />
                Cerrar Sesión
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
