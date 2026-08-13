import { ShoppingCart, Receipt } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function DevolucionesPage() {
  const navigate = useNavigate()

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: '36px' }}>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
          Devoluciones
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
          Gestión de devoluciones de compras y ventas
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6" style={{ marginBottom: '36px' }}>
        {/* Tarjeta de Compras */}
        <div
          onClick={() => navigate('/devoluciones/compras')}
          className="flex items-center justify-between rounded-2xl cursor-pointer transition-all shadow-sm hover:shadow-md border border-transparent"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border-light)', padding: '32px' }}
        >
          <div>
            <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)', marginBottom: '8px' }}>
              Devoluciones de Compras
            </h3>
            <p className="text-sm font-medium" style={{ color: 'var(--color-primary-600)' }}>
              Devoluciones a proveedores
            </p>
          </div>
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: 'var(--color-primary-500)', color: 'white' }}
          >
            <ShoppingCart size={26} />
          </div>
        </div>

        {/* Tarjeta de Ventas */}
        <div
          onClick={() => navigate('/devoluciones/ventas')}
          className="flex items-center justify-between rounded-2xl cursor-pointer transition-all shadow-sm hover:shadow-md border border-transparent"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border-light)', padding: '32px' }}
        >
          <div>
            <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)', marginBottom: '8px' }}>
              Devoluciones de Ventas
            </h3>
            <p className="text-sm font-medium" style={{ color: 'var(--color-primary-600)' }}>
              Devoluciones de clientes
            </p>
          </div>
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: 'var(--color-primary-500)', color: 'white' }}
          >
            <Receipt size={26} />
          </div>
        </div>
      </div>
    </div>
  )
}
