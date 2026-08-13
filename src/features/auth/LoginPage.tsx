import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, Lock, Eye, EyeOff, Loader2 } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

/**
 * Login page matching the reference:
 * Full-screen purple-to-pink gradient background,
 * centered white card with SGIL logo, username + password fields.
 */
export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!username.trim() || !password.trim()) {
      setError('Por favor completá todos los campos')
      return
    }

    setLoading(true)
    const result = await login(username.trim(), password)
    setLoading(false)

    if (result.error) {
      setError(result.error)
    } else {
      navigate('/', { replace: true })
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: 'linear-gradient(135deg, #4c1d95 0%, #7c3aed 30%, #a855f7 50%, #ec4899 80%, #f43f5e 100%)',
      }}
    >
      {/* Decorative circles */}
      <div
        className="fixed"
        style={{
          width: 400,
          height: 400,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.05)',
          top: '-10%',
          right: '-5%',
        }}
      />
      <div
        className="fixed"
        style={{
          width: 300,
          height: 300,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.03)',
          bottom: '-5%',
          left: '-5%',
        }}
      />

      <div
        className="w-full animate-scale-in"
        style={{ maxWidth: 420, position: 'relative', zIndex: 10 }}
      >
        <div
          className="card"
          style={{
            padding: '2.5rem',
            borderRadius: 'var(--radius-2xl)',
            boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
          }}
        >
          {/* Logo */}
          <div className="flex flex-col items-center mb-12">
            <img 
              src="/sgilcolor.png" 
              alt="SGIL Logo" 
              style={{ height: '96px', objectFit: 'contain' }} 
            />
            <p><br /></p>
          </div>
          

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Username */}
            <div className="form-group">
              <label htmlFor="login-username" className="form-label">
                Usuario
              </label>
              <div className="relative">
                <User
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--color-text-muted)' }}
                />
                <input
                  id="login-username"
                  type="text"
                  className="input"
                  style={{ paddingLeft: '2.25rem' }}
                  placeholder="Ingresá tu usuario"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  autoFocus
                />
              </div>
            </div>

            {/* Password */}
            <div className="form-group">
              <label htmlFor="login-password" className="form-label">
                Contraseña
              </label>
              <div className="relative">
                <Lock
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--color-text-muted)' }}
                />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  className="input"
                  style={{ paddingLeft: '2.25rem', paddingRight: '2.5rem' }}
                  placeholder="Ingresá tu contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
                  style={{
                    color: 'var(--color-text-muted)',
                    background: 'none',
                    border: 'none',
                    padding: 0,
                  }}
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div
                className="text-sm text-center py-2 px-3 rounded-lg animate-fade-in"
                style={{
                  background: 'var(--color-danger-50)',
                  color: 'var(--color-danger-600)',
                }}
              >
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              className="btn btn-primary btn-lg w-full mt-2"
              disabled={loading}
              style={{
                background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
                fontSize: '0.9375rem',
                padding: '0.75rem',
              }}
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Iniciando sesión...
                </>
              ) : (
                'Iniciar Sesión'
              )}
            </button>
          </form>
        </div>

        {/* Version */}
        <p
          className="text-center text-xs mt-4"
          style={{ color: 'rgba(255,255,255,1)' }}
        ><br />
          SGIL v2.1 — © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  )
}
