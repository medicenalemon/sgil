import { Package, ArrowLeftRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function StockPage() {
  const navigate = useNavigate()

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: '36px' }}>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
          Stock e Inventario
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
          Gestión de productos y movimientos de stock
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6" style={{ marginBottom: '36px' }}>
        {/* Tarjeta de Productos */}
        <div
          onClick={() => navigate('/stock/productos')}
          className="flex items-center justify-between rounded-2xl cursor-pointer transition-all shadow-sm hover:shadow-md border border-transparent"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border-light)', padding: '32px' }}
        >
          <div>
            <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)', marginBottom: '8px' }}>
              Gestión de Productos
            </h3>
            <p className="text-sm font-medium" style={{ color: 'var(--color-primary-600)' }}>
              Catálogo, altas y bajas
            </p>
          </div>
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: 'var(--color-primary-500)', color: 'white' }}
          >
            <Package size={26} />
          </div>
        </div>

        {/* Tarjeta de Movimientos */}
        <div
          onClick={() => navigate('/stock/movimientos')}
          className="flex items-center justify-between rounded-2xl cursor-pointer transition-all shadow-sm hover:shadow-md border border-transparent"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border-light)', padding: '32px' }}
        >
          <div>
            <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)', marginBottom: '8px' }}>
              Movimientos de Stock
            </h3>
            <p className="text-sm font-medium" style={{ color: 'var(--color-primary-600)' }}>
              Historial de entradas y salidas
            </p>
          </div>
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: 'var(--color-primary-500)', color: 'white' }}
          >
            <ArrowLeftRight size={26} />
          </div>
        </div>
      </div>
    </div>
  )
}
