import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/hooks/useAuth'
import AppLayout from '@/components/layout/AppLayout'
import LoginPage from '@/features/auth/LoginPage'
import DashboardPage from '@/features/dashboard/DashboardPage'
import VentasPage from '@/features/ventas/VentasPage'
import ComprasPage from '@/features/compras/ComprasPage'
import ClientesPage from '@/features/clientes/ClientesPage'
import ProveedoresPage from '@/features/proveedores/ProveedoresPage'
import StockPage from '@/features/stock/StockPage'
import StockProductosPage from '@/features/stock/StockProductosPage'
import StockMovimientosPage from '@/features/stock/StockMovimientosPage'
import DevolucionesPage from '@/features/devoluciones/DevolucionesPage'
import DevolucionesVentasPage from '@/features/devoluciones/DevolucionesVentasPage'
import DevolucionesComprasPage from '@/features/devoluciones/DevolucionesComprasPage'
import CajaPage from '@/features/caja/CajaPage'
import ReportesPage from '@/features/reportes/ReportesPage'
import AuditoriasPage from '@/features/auditorias/AuditoriasPage'
import UsuariosPage from '@/features/usuarios/UsuariosPage'
import PerfilPage from '@/features/perfil/PerfilPage'
import AcercaDePage from '@/features/acerca-de/AcercaDePage'
import { canAccess } from '@/lib/permissions'
import type { UserRole } from '@/lib/permissions'
import { Toaster } from 'sonner'


/** Route guard: requires authentication */
function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div
          className="flex items-center gap-3 text-sm"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          <div
            className="w-5 h-5 border-2 rounded-full animate-spin"
            style={{
              borderColor: 'var(--color-primary-200)',
              borderTopColor: 'var(--color-primary-600)',
            }}
          />
          Cargando...
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

/** Route guard: requires a specific module permission */
function RequireModule({ module, children }: { module: string; children: React.ReactNode }) {
  const { user } = useAuth()
  const role = user?.role as UserRole

  if (!canAccess(role, module)) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

/** Redirect to dashboard if already logged in */
function GuestOnly({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) return null

  if (user) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster
          position="top-right"
          richColors
          closeButton
          toastOptions={{
            style: {
              fontFamily: 'var(--font-sans)',
            },
          }}
        />
        <Routes>
          {/* Public */}
          <Route
            path="/login"
            element={
              <GuestOnly>
                <LoginPage />
              </GuestOnly>
            }
          />

          {/* Protected — App layout */}
          <Route
            element={
              <RequireAuth>
                <AppLayout />
              </RequireAuth>
            }
          >
            <Route index element={<DashboardPage />} />

            {/* Ventas */}
            <Route
              path="ventas"
              element={
                <RequireModule module="ventas">
                  <VentasPage />
                </RequireModule>
              }
            />

            {/* Compras */}
            <Route
              path="compras"
              element={
                <RequireModule module="compras">
                  <ComprasPage />
                </RequireModule>
              }
            />

            {/* Devoluciones */}
            <Route
              path="devoluciones"
              element={
                <RequireModule module="devoluciones">
                  <DevolucionesPage />
                </RequireModule>
              }
            />
            <Route
              path="devoluciones/ventas"
              element={
                <RequireModule module="devoluciones">
                  <DevolucionesVentasPage />
                </RequireModule>
              }
            />
            <Route
              path="devoluciones/compras"
              element={
                <RequireModule module="devoluciones">
                  <DevolucionesComprasPage />
                </RequireModule>
              }
            />

            {/* Caja */}
            <Route
              path="caja"
              element={
                <RequireModule module="caja">
                  <CajaPage />
                </RequireModule>
              }
            />

            {/* Stock */}
            <Route
              path="stock"
              element={
                <RequireModule module="stock">
                  <StockPage />
                </RequireModule>
              }
            />
            <Route
              path="stock/productos"
              element={
                <RequireModule module="stock">
                  <StockProductosPage />
                </RequireModule>
              }
            />
            <Route
              path="stock/movimientos"
              element={
                <RequireModule module="stock">
                  <StockMovimientosPage />
                </RequireModule>
              }
            />

            {/* Clientes */}
            <Route
              path="clientes"
              element={
                <RequireModule module="clientes">
                  <ClientesPage />
                </RequireModule>
              }
            />

            {/* Proveedores */}
            <Route
              path="proveedores"
              element={
                <RequireModule module="proveedores">
                  <ProveedoresPage />
                </RequireModule>
              }
            />

            {/* Reportes */}
            <Route
              path="reportes"
              element={
                <RequireModule module="reportes">
                  <ReportesPage />
                </RequireModule>
              }
            />

            {/* Auditorías */}
            <Route
              path="auditorias"
              element={
                <RequireModule module="auditorias">
                  <AuditoriasPage />
                </RequireModule>
              }
            />

            {/* Usuarios */}
            <Route
              path="usuarios"
              element={
                <RequireModule module="usuarios">
                  <UsuariosPage />
                </RequireModule>
              }
            />

            {/* Acerca De */}
            <Route path="acerca" element={<AcercaDePage />} />

            {/* Perfil */}
            <Route path="perfil" element={<PerfilPage />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
