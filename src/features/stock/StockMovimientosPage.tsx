import { useState, useEffect, useCallback } from 'react'
import { ArrowLeft, Home, BarChart2, TrendingUp, TrendingDown, Info } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import DataTable from '@/components/shared/DataTable'
import StatCard from '@/components/shared/StatCard'
import CrudModal from '@/components/shared/CrudModal'
import { supabase } from '@/lib/supabase'
import type { MovimientoStock, Column } from '@/lib/types'

export default function StockMovimientosPage() {
  const navigate = useNavigate()
  const [movimientos, setMovimientos] = useState<MovimientoStock[]>([])
  
  // Modal state
  const [viewModalOpen, setViewModalOpen] = useState(false)
  const [selectedMovimiento, setSelectedMovimiento] = useState<MovimientoStock | null>(null)
  
  // Filters
  const [dateFilter, setDateFilter] = useState('')
  const [tipoFilter, setTipoFilter] = useState<'todos' | 'entrada' | 'salida'>('todos')

  const loadData = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('movimientos_stock')
        .select('*, producto:productos(nombre)')
        .order('fecha', { ascending: false })

      if (error) throw error
      setMovimientos(data || [])
    } catch (error: any) {
      console.error('Error fetching movimientos:', error)
      toast.error('Error al cargar movimientos de stock')
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const filteredMovimientos = movimientos.filter((m) => {
    if (tipoFilter !== 'todos' && m.tipo !== tipoFilter) return false
    if (dateFilter) {
      const mDate = new Date(m.fecha).toISOString().split('T')[0]
      if (mDate !== dateFilter) return false
    }
    return true
  })

  // Stats
  const totalMovimientos = movimientos.length
  const totalEntradas = movimientos.filter(m => m.tipo === 'entrada').length
  const totalSalidas = movimientos.filter(m => m.tipo === 'salida').length

  const limpiarFiltros = () => {
    setDateFilter('')
    setTipoFilter('todos')
  }

  const movimientoColumns: Column<MovimientoStock>[] = [
    {
      key: 'fecha',
      header: 'Fecha',
      render: (m) => new Date(m.fecha).toLocaleDateString('es-AR'),
      sortable: true,
    },
    {
      key: 'producto_id',
      header: 'Producto',
      render: (m) => m.producto?.nombre ?? '—',
    },
    {
      key: 'tipo',
      header: 'Tipo',
      render: (m) => {
        const isFigurativo = m.referencia_tipo === 'devolucion_venta'
        const bg = isFigurativo ? '#f3f4f6' : (m.tipo === 'entrada' ? 'var(--color-success-50)' : 'var(--color-danger-50)')
        const col = isFigurativo ? '#4b5563' : (m.tipo === 'entrada' ? 'var(--color-success-700)' : 'var(--color-danger-700)')
        const icon = isFigurativo ? <Info size={14} /> : (m.tipo === 'entrada' ? <TrendingUp size={14} /> : <TrendingDown size={14} />)
        const text = isFigurativo ? 'Registro' : (m.tipo === 'entrada' ? 'Entrada' : 'Salida')
        
        return (
          <span 
            className="px-2 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1"
            style={{ background: bg, color: col }}
          >
            {icon} {text}
          </span>
        )
      },
    },
    { 
      key: 'cantidad', 
      header: 'Cantidad', 
      render: (m) => {
        const isFigurativo = m.referencia_tipo === 'devolucion_venta'
        const color = isFigurativo ? 'text-gray-500' : (m.tipo === 'entrada' ? 'text-green-600' : 'text-red-600')
        const prefix = isFigurativo ? '' : (m.tipo === 'entrada' ? '+' : '-')
        
        return (
          <span className={`font-semibold ${color}`} title={isFigurativo ? 'Movimiento figurativo (no afectó stock)' : ''}>
            {prefix}{m.cantidad}
          </span>
        )
      },
      sortable: true 
    },
    { key: 'motivo', header: 'Motivo' },
  ]

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between" style={{ marginBottom: '36px' }}>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
            Movimientos de Stock
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
            {filteredMovimientos.length} de {totalMovimientos} movimientos
          </p>
        </div>
        <div className="flex gap-3">
          <button className="btn btn-outline bg-white" onClick={() => navigate('/stock')}>
            <ArrowLeft size={18} />
            Volver a Stock
          </button>
          <button className="btn btn-outline bg-white" onClick={() => navigate('/')}>
            <Home size={18} />
            Menú Principal
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6" style={{ marginBottom: '40px' }}>
        <StatCard
          title="Total Movimientos"
          value={totalMovimientos}
          icon={<BarChart2 size={24} />}
          color="#7c3aed"
        />
        <StatCard
          title="Entradas"
          value={totalEntradas}
          icon={<TrendingUp size={24} />}
          color="#10b981"
        />
        <StatCard
          title="Salidas"
          value={totalSalidas}
          icon={<TrendingDown size={24} />}
          color="#ef4444"
        />
      </div>

      {/* Filters */}
      <div className="flex justify-end gap-3" style={{ marginBottom: '32px' }}>
        <input 
          type="date" 
          className="input bg-white" 
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
        />
        <select 
          className="select min-w-[150px] bg-white"
          value={tipoFilter}
          onChange={(e) => setTipoFilter(e.target.value as any)}
        >
          <option value="todos">Todos</option>
          <option value="entrada">Entradas</option>
          <option value="salida">Salidas</option>
        </select>
        <button className="btn btn-outline bg-white" onClick={limpiarFiltros}>
          Limpiar Filtros
        </button>
      </div>
      
      <DataTable
        data={filteredMovimientos}
        columns={movimientoColumns}
        emptyMessage="No hay movimientos de stock registrados"
        actions={(m) => (
          <button 
            className="btn btn-icon btn-ghost btn-sm" 
            title="Ver detalle"
            onClick={() => { setSelectedMovimiento(m); setViewModalOpen(true); }}
          >
            <Info size={18} style={{ color: 'var(--color-text-secondary)' }} />
          </button>
        )}
      />

      {/* VIEW MODAL */}
      <CrudModal
        open={viewModalOpen}
        title="Detalle del Movimiento"
        subtitle="Información completa del movimiento de stock."
        maxWidth={500}
        onClose={() => { setViewModalOpen(false); setSelectedMovimiento(null); }}
        footer={
          <div className="flex items-center justify-end w-full">
            <button className="btn btn-outline" onClick={() => { setViewModalOpen(false); setSelectedMovimiento(null); }}>Cerrar</button>
          </div>
        }
      >
        {selectedMovimiento && (
          <div className="rounded-lg grid grid-cols-2 gap-6 border" style={{ padding: '24px', borderColor: 'var(--color-border-light)' }}>
            <div>
              <p className="text-xs font-medium mb-1" style={{ color: 'var(--color-text-muted)' }}>ID</p>
              <p className="text-sm font-bold" style={{ color: 'var(--color-primary-600)' }}>{selectedMovimiento.id}</p>
            </div>
            <div>
              <p className="text-xs font-medium mb-1" style={{ color: 'var(--color-text-muted)' }}>Fecha</p>
              <p className="text-sm font-semibold">
                {new Date(selectedMovimiento.fecha).toLocaleString('es-AR')}
              </p>
            </div>
            
            <div className="col-span-2">
              <p className="text-xs font-medium mb-1" style={{ color: 'var(--color-text-muted)' }}>Producto</p>
              <p className="text-sm font-semibold">
                {selectedMovimiento.producto?.nombre ?? '—'}
              </p>
            </div>
            
            <div>
              <p className="text-xs font-medium mb-1" style={{ color: 'var(--color-text-muted)' }}>Tipo</p>
              <span 
                className="px-2 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1 w-fit"
                style={{ 
                  background: selectedMovimiento.tipo === 'entrada' ? 'var(--color-success-50)' : 'var(--color-danger-50)',
                  color: selectedMovimiento.tipo === 'entrada' ? 'var(--color-success-700)' : 'var(--color-danger-700)'
                }}
              >
                {selectedMovimiento.tipo === 'entrada' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                {selectedMovimiento.tipo === 'entrada' ? 'Entrada' : 'Salida'}
              </span>
            </div>
            <div>
              <p className="text-xs font-medium mb-1" style={{ color: 'var(--color-text-muted)' }}>Cantidad</p>
              <p className={`text-sm font-semibold mt-1 ${selectedMovimiento.tipo === 'entrada' ? 'text-green-600' : 'text-red-600'}`}>
                {selectedMovimiento.tipo === 'entrada' ? '+' : '-'}{selectedMovimiento.cantidad}
              </p>
            </div>

            <div className="col-span-2">
              <p className="text-xs font-medium mb-1" style={{ color: 'var(--color-text-muted)' }}>Motivo</p>
              <p className="text-sm font-semibold">{selectedMovimiento.motivo}</p>
            </div>
          </div>
        )}
      </CrudModal>
    </div>
  )
}
