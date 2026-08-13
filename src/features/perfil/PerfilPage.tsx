import { useState } from 'react'
import {
  User,
  Mail,
  Shield,
  Calendar,
  Lock,
  Eye,
  EyeOff,
  Save,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { roleConfig } from '@/lib/permissions'
import type { UserRole } from '@/lib/permissions'
import { toast } from 'sonner'

export default function PerfilPage() {
  const { user } = useAuth()
  const role = user?.role as UserRole
  const config = roleConfig[role]

  // Password change form state
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPass, setShowCurrentPass] = useState(false)
  const [showNewPass, setShowNewPass] = useState(false)
  const [showConfirmPass, setShowConfirmPass] = useState(false)
  const [saving, setSaving] = useState(false)

  if (!user) return null

  const initial = user.username.charAt(0).toUpperCase()
  const createdDate = new Date(user.created_at).toLocaleDateString('es-AR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const handlePasswordChange = async () => {
    if (!newPassword || !confirmPassword) {
      toast.error('Completá todos los campos')
      return
    }
    if (newPassword.length < 6) {
      toast.error('La nueva contraseña debe tener al menos 6 caracteres')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('Las contraseñas no coinciden')
      return
    }

    setSaving(true)
    // Simulate save (in demo mode, no real backend)
    await new Promise((r) => setTimeout(r, 800))
    setSaving(false)
    setShowPasswordForm(false)
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    toast.success('Contraseña actualizada correctamente')
  }

  /* ── Style helpers ── */
  const cardStyle: React.CSSProperties = {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    border: '1px solid #f0f0f4',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
    overflow: 'hidden',
  }

  const infoRowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    padding: '16px 24px',
    borderBottom: '1px solid #f8f8fa',
  }

  const iconBoxStyle: React.CSSProperties = {
    width: 38,
    height: 38,
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  }

  const inputContainerStyle: React.CSSProperties = {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 42px 10px 14px',
    borderRadius: '10px',
    border: '1px solid #e5e7eb',
    fontSize: '0.875rem',
    color: '#111827',
    backgroundColor: '#fff',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    fontFamily: 'inherit',
  }

  const eyeButtonStyle: React.CSSProperties = {
    position: 'absolute',
    right: '10px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
    color: '#9ca3af',
    display: 'flex',
    alignItems: 'center',
  }

  return (
    <div className="animate-fade-in" style={{ padding: '32px 36px', maxWidth: '800px' }}>
      {/* Page header */}
      <div style={{ marginBottom: '28px' }}>
        <h1
          style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            color: '#111827',
            marginBottom: '4px',
          }}
        >
          Mi Perfil
        </h1>
        <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
          Información de tu cuenta y configuración personal
        </p>
      </div>

      {/* Profile header card */}
      <div
        style={{
          ...cardStyle,
          marginBottom: '24px',
          position: 'relative',
          overflow: 'visible',
        }}
      >
        {/* Purple banner */}
        <div
          style={{
            height: '42px',
            background: 'white',
            borderRadius: '16px 16px 0 0',
          }}
        />

        {/* Avatar + Name */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            gap: '20px',
            padding: '0 40px 20px',
            marginTop: '-28px',
          }}
        >
          {/* Avatar */}
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              backgroundColor: '#6d28d9',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.75rem',
              fontWeight: 700,
              border: '4px solid #fff',
              boxShadow: '0 4px 12px rgba(109, 40, 217, 0.3)',
              flexShrink: 0,
            }}
          >
            {initial}
          </div>

          {/* Name + role */}
          <div style={{ paddingBottom: '4px' }}>
            <h2
              style={{
                fontSize: '1.25rem',
                fontWeight: 700,
                color: '#111827',
                textTransform: 'capitalize',
                lineHeight: 1.3,
              }}
            >
              {user.username}
            </h2>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '3px 12px',
                borderRadius: '9999px',
                fontSize: '0.7rem',
                fontWeight: 600,
                backgroundColor: '#f5f3ff',
                color: '#6d28d9',
                marginTop: '4px',
                textTransform: 'capitalize',
              }}
            >
              <Shield size={12} />
              {config?.label}
            </span>
          </div>
        </div>
      </div>

      {/* Account info card */}
      <div style={{ ...cardStyle, marginBottom: '24px' }}>
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid #f0f0f4',
          }}
        >
          <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#111827' }}>
            Información de la Cuenta
          </h3>
        </div>

        {/* Username row */}
        <div style={infoRowStyle}>
          <div style={{ ...iconBoxStyle, backgroundColor: '#f5f3ff' }}>
            <User size={18} style={{ color: '#7c3aed' }} />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '2px' }}>
              Nombre de usuario
            </p>
            <p
              style={{
                fontSize: '0.9rem',
                fontWeight: 500,
                color: '#111827',
                textTransform: 'capitalize',
              }}
            >
              {user.username}
            </p>
          </div>
        </div>

        {/* Email row */}
        <div style={infoRowStyle}>
          <div style={{ ...iconBoxStyle, backgroundColor: '#eff6ff' }}>
            <Mail size={18} style={{ color: '#2563eb' }} />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '2px' }}>
              Correo electrónico
            </p>
            <p style={{ fontSize: '0.9rem', fontWeight: 500, color: '#111827' }}>
              {user.email}
            </p>
          </div>
        </div>

        {/* Role row */}
        <div style={infoRowStyle}>
          <div style={{ ...iconBoxStyle, backgroundColor: '#fdf4ff' }}>
            <Shield size={18} style={{ color: '#a855f7' }} />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '2px' }}>
              Rol en el sistema
            </p>
            <p
              style={{
                fontSize: '0.9rem',
                fontWeight: 500,
                color: '#111827',
                textTransform: 'capitalize',
              }}
            >
              {config?.label}
            </p>
          </div>
        </div>

        {/* Created at row */}
        <div style={{ ...infoRowStyle, borderBottom: 'none' }}>
          <div style={{ ...iconBoxStyle, backgroundColor: '#f0fdf4' }}>
            <Calendar size={18} style={{ color: '#16a34a' }} />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '2px' }}>
              Cuenta creada
            </p>
            <p style={{ fontSize: '0.9rem', fontWeight: 500, color: '#111827' }}>
              {createdDate}
            </p>
          </div>
        </div>
      </div>

      {/* Security card */}
      <div style={cardStyle}>
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid #f0f0f4',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#111827' }}>
            Seguridad
          </h3>
          {!showPasswordForm && (
            <button
              onClick={() => setShowPasswordForm(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 16px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#8b5cf6',
                color: '#fff',
                fontSize: '0.8rem',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'background-color 0.15s ease',
              }}
              onMouseEnter={(e) => {
                ;(e.currentTarget as HTMLElement).style.backgroundColor = '#7c3aed'
              }}
              onMouseLeave={(e) => {
                ;(e.currentTarget as HTMLElement).style.backgroundColor = '#8b5cf6'
              }}
            >
              <Lock size={14} />
              Cambiar contraseña
            </button>
          )}
        </div>

        {!showPasswordForm ? (
          <div style={{ ...infoRowStyle, borderBottom: 'none' }}>
            <div style={{ ...iconBoxStyle, backgroundColor: '#fef3c7' }}>
              <Lock size={18} style={{ color: '#d97706' }} />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '2px' }}>
                Contraseña
              </p>
              <p style={{ fontSize: '0.9rem', fontWeight: 500, color: '#111827' }}>
                ••••••••
              </p>
            </div>
          </div>
        ) : (
          <div style={{ padding: '24px' }}>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                maxWidth: '400px',
              }}
            >
              {/* Current password */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.82rem',
                    fontWeight: 500,
                    color: '#374151',
                    marginBottom: '6px',
                  }}
                >
                  Contraseña actual
                </label>
                <div style={inputContainerStyle}>
                  <input
                    type={showCurrentPass ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Ingresá tu contraseña actual"
                    style={inputStyle}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#8b5cf6'
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(139, 92, 246, 0.12)'
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = '#e5e7eb'
                      e.currentTarget.style.boxShadow = 'none'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPass(!showCurrentPass)}
                    style={eyeButtonStyle}
                  >
                    {showCurrentPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* New password */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.82rem',
                    fontWeight: 500,
                    color: '#374151',
                    marginBottom: '6px',
                  }}
                >
                  Nueva contraseña
                </label>
                <div style={inputContainerStyle}>
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    style={inputStyle}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#8b5cf6'
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(139, 92, 246, 0.12)'
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = '#e5e7eb'
                      e.currentTarget.style.boxShadow = 'none'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    style={eyeButtonStyle}
                  >
                    {showNewPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Confirm password */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.82rem',
                    fontWeight: 500,
                    color: '#374151',
                    marginBottom: '6px',
                  }}
                >
                  Confirmar nueva contraseña
                </label>
                <div style={inputContainerStyle}>
                  <input
                    type={showConfirmPass ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repetí la nueva contraseña"
                    style={inputStyle}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#8b5cf6'
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(139, 92, 246, 0.12)'
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = '#e5e7eb'
                      e.currentTarget.style.boxShadow = 'none'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPass(!showConfirmPass)}
                    style={eyeButtonStyle}
                  >
                    {showConfirmPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Buttons */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                <button
                  onClick={handlePasswordChange}
                  disabled={saving}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '10px 20px',
                    borderRadius: '10px',
                    border: 'none',
                    backgroundColor: '#8b5cf6',
                    color: '#fff',
                    fontSize: '0.84rem',
                    fontWeight: 500,
                    cursor: saving ? 'not-allowed' : 'pointer',
                    opacity: saving ? 0.6 : 1,
                    transition: 'background-color 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!saving)
                      (e.currentTarget as HTMLElement).style.backgroundColor = '#7c3aed'
                  }}
                  onMouseLeave={(e) => {
                    if (!saving)
                      (e.currentTarget as HTMLElement).style.backgroundColor = '#8b5cf6'
                  }}
                >
                  {saving ? (
                    <>
                      <div
                        style={{
                          width: 14,
                          height: 14,
                          border: '2px solid rgba(255,255,255,0.3)',
                          borderTopColor: '#fff',
                          borderRadius: '50%',
                          animation: 'spin 0.6s linear infinite',
                        }}
                      />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save size={14} />
                      Guardar cambios
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowPasswordForm(false)
                    setCurrentPassword('')
                    setNewPassword('')
                    setConfirmPassword('')
                  }}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '10px',
                    border: '1px solid #e5e7eb',
                    backgroundColor: '#fff',
                    color: '#374151',
                    fontSize: '0.84rem',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'background-color 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    ;(e.currentTarget as HTMLElement).style.backgroundColor = '#f9fafb'
                  }}
                  onMouseLeave={(e) => {
                    ;(e.currentTarget as HTMLElement).style.backgroundColor = '#fff'
                  }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Spin animation for loading button */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
