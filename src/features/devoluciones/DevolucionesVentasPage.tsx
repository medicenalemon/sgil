import { useState, useEffect, useCallback } from 'react'
import {
  RotateCcw,
  Plus,
  Eye,
  Download,
  AlertCircle,
  ArrowLeft,
  AlertTriangle,
} from 'lucide-react'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'
import StatCard from '@/components/shared/StatCard'
import DataTable from '@/components/shared/DataTable'
import CrudModal from '@/components/shared/CrudModal'
import { useAuth } from '@/hooks/useAuth'
import { useAuditoria } from '@/hooks/useAuditoria'
import { supabase } from '@/lib/supabase'
import { generatePdf, formatCurrency, formatDate, formatDateTime } from '@/lib/pdf/pdfGenerator'
import type { Column, DevolucionVenta, MotivoDevolucionVenta } from '@/lib/types'

const MOTIVOS_VENTA: MotivoDevolucionVenta[] = [
  'Producto defectuoso',
  'Producto incorrecto',
  'No cumple expectativas',
  'Cliente arrepentido',
  'Producto dañado en transporte',
  'Otro',
]

export default function DevolucionesVentasPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { logAuditoria } = useAuditoria()

  // Data state
  const [devVentas, setDevVentas] = useState<(DevolucionVenta & { venta_id_display: string, producto_nombre: string })[]>([])

  // Modal state
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [viewModalOpen, setViewModalOpen] = useState(false)
  const [selectedDevVenta, setSelectedDevVenta] = useState<DevolucionVenta | null>(null)

  // Form state for Nueva Devolución
  const [referenciaId, setReferenciaId] = useState<string>('')
  const [selectedItemId, setSelectedItemId] = useState<string>('')
  const [cantidadDevolver, setCantidadDevolver] = useState<string>('1')
  const [motivo, setMotivo] = useState<string>('')
  const [observaciones, setObservaciones] = useState<string>('')

  const [ventas, setVentas] = useState<any[]>([])
  const [currentVentaItems, setCurrentVentaItems] = useState<any[]>([])

  const loadData = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('devoluciones_ventas')
        .select('*, producto:productos(nombre)')
        .order('id', { ascending: false })

      if (error) throw error
      
      const enriched = (data || []).map(dv => ({
        ...dv,
        venta_id_display: `#${dv.venta_id}`,
        producto_nombre: dv.producto?.nombre ?? 'Desconocido'
      }))
      setDevVentas(enriched)

      // Pre-load all ventas for the dropdown
      const { data: ventasData } = await supabase.from('ventas').select('id')
      setVentas(ventasData || [])
    } catch (error: any) {
      console.error('Error fetching devoluciones:', error)
      toast.error('Error al cargar devoluciones')
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    const fetchItems = async () => {
      if (!referenciaId) {
        setCurrentVentaItems([])
        return
      }
      try {
        const { data, error } = await supabase
          .from('venta_items')
          .select('*, producto:productos(nombre)')
          .eq('venta_id', referenciaId)
        if (error) throw error
        setCurrentVentaItems(data || [])
      } catch (error) {
        console.error('Error fetching items:', error)
      }
    }
    fetchItems()
  }, [referenciaId])

  // ---- Stats ----
  const totalVentasDev = devVentas.length
  const valorTotalVentasDev = devVentas.reduce((acc, curr) => acc + curr.valor, 0)
  const unidadesDevueltas = devVentas.reduce((acc, curr) => acc + curr.cantidad, 0)

  // ---- Save Devolución ----
  const handleSave = async () => {
    if (!referenciaId) {
      toast.error('Seleccioná una venta')
      return
    }
    if (!selectedItemId) {
      toast.error('Seleccioná el producto a devolver')
      return
    }
    const cant = parseInt(cantidadDevolver) || 0
    if (cant <= 0) {
      toast.error('La cantidad debe ser mayor a 0')
      return
    }
    if (!motivo) {
      toast.error('Seleccioná un motivo')
      return
    }

    const item = currentVentaItems.find(i => i.id === Number(selectedItemId))
    if (!item) return
    if (cant > item.cantidad) {
      toast.error(`La cantidad no puede superar los ${item.cantidad} comprados originalmente`)
      return
    }

    try {
      const valorDevolucion = item.precio_unitario * cant
      const now = new Date().toISOString()

      const { data: newDev, error } = await supabase
        .from('devoluciones_ventas')
        .insert([{
          fecha: now,
          venta_id: Number(referenciaId),
          producto_id: item.producto_id,
          cantidad: cant,
          motivo: motivo,
          observaciones: observaciones || null,
          valor: valorDevolucion,
          usuario_id: user?.id,
        }])
        .select()
        .single()

      if (error) throw error

      // Note: We DO NOT update the real stock here because returned products from sales 
      // are considered defective/unusable (as requested).
      // However, we DO log the movement so it appears in the Stock history.
      await supabase
        .from('movimientos_stock')
        .insert({
          fecha: now,
          producto_id: item.producto_id,
          tipo: 'entrada',
          cantidad: cant,
          motivo: `Devolución de Venta (Defectuoso): ${motivo}`,
          referencia_tipo: 'devolucion_venta',
          referencia_id: newDev.id,
          usuario_id: user?.id
        })

      logAuditoria('devoluciones', 'Registro devolución de venta', { devId: newDev.id, venta: referenciaId, valor: valorDevolucion })
      toast.success('Devolución de venta registrada')
      
      setCreateModalOpen(false)
      resetForm()
      loadData()
    } catch (error: any) {
      console.error('Error saving devolucion:', error)
      toast.error(error.message || 'Error al registrar la devolución')
    }
  }

  const resetForm = () => {
    setReferenciaId('')
    setSelectedItemId('')
    setCantidadDevolver('1')
    setMotivo('')
    setObservaciones('')
  }

  // ---- Modals & PDF ----
  const openViewVenta = (dev: DevolucionVenta) => {
    setSelectedDevVenta(dev)
    setViewModalOpen(true)
  }

  const downloadPDFVenta = (dev: DevolucionVenta) => {
    const pNombre = (dev as any).producto?.nombre ?? (dev as any).producto_nombre ?? 'Desconocido'
    generatePdf({
      title: `Nota de Crédito - Devolución #${dev.id}`,
      infoLeft: [
        { label: 'ID Devolución:', value: `#${dev.id}` },
        { label: 'ID Venta Orig.:', value: `#${dev.venta_id}` },
        { label: 'Fecha:', value: formatDateTime(dev.fecha) },
      ],
      infoRight: [
        { label: 'Motivo:', value: dev.motivo },
      ],
      columns: [
        { header: 'Producto', dataKey: 'producto' },
        { header: 'Cant. Devuelta', dataKey: 'cantidad' },
        { header: 'Valor Unit.', dataKey: 'unitario' },
        { header: 'Valor Total', dataKey: 'total' },
      ],
      rows: [
        {
          producto: pNombre,
          cantidad: dev.cantidad,
          unitario: formatCurrency(dev.valor / dev.cantidad),
          total: formatCurrency(dev.valor),
        }
      ],
      totalLabel: 'TOTAL A FAVOR CLIENTE',
      totalValue: formatCurrency(dev.valor),
      totalColor: [220, 38, 38], // red
      fileName: `nc_devolucion_${dev.id}.pdf`
    })
  }

  // ---- Tables ----
  const colsVentas: Column<DevolucionVenta & { venta_id_display: string, producto_nombre: string }>[] = [
    { key: 'id', header: 'ID Dev.', sortable: true },
    { key: 'fecha', header: 'Fecha', render: d => formatDate(d.fecha), sortable: true },
    { key: 'venta_id_display', header: 'Venta Orig.' },
    { key: 'producto_nombre', header: 'Producto' },
    { key: 'cantidad', header: 'Cant.' },
    { key: 'motivo', header: 'Motivo' },
    { key: 'valor', header: 'Valor Reintegrado', render: d => <span className="font-semibold text-red-600">{formatCurrency(d.valor)}</span>, sortable: true },
  ]

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between" style={{ marginBottom: '36px' }}>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
            Devoluciones de Ventas
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
            Gestión de devoluciones de clientes
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="btn btn-outline" onClick={() => navigate('/devoluciones')}>
            <ArrowLeft size={18} />
            Volver a Devoluciones
          </button>
          <button className="btn btn-primary" onClick={() => setCreateModalOpen(true)}>
            <Plus size={18} />
            Nueva Devolución
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6" style={{ marginBottom: '36px' }}>
        <StatCard
          title="Total Devoluciones"
          value={<span style={{ color: '#e11d48' }}>{totalVentasDev}</span>}
          icon={<RotateCcw size={24} />}
          color="#e11d48"
        />
        <StatCard
          title="Valor Devuelto"
          value={<span style={{ color: '#e11d48' }}>{formatCurrency(valorTotalVentasDev)}</span>}
          icon={<AlertTriangle size={24} />}
          color="#f59e0b"
        />
        <StatCard
          title="Unidades Devueltas"
          value={<span style={{ color: '#e11d48' }}>{unidadesDevueltas}</span>}
          icon={<RotateCcw size={24} />}
          color="#3b82f6"
        />
      </div>

      {/* Tables */}
      <DataTable
        data={devVentas}
        columns={colsVentas}
        searchPlaceholder="Buscar por producto o motivo..."
        searchKeys={['producto_nombre', 'motivo']}
        emptyMessage="No se registraron devoluciones de ventas"
        actions={(dev) => (
          <>
            <button className="btn btn-icon btn-outline btn-sm" onClick={() => openViewVenta(dev)} title="Ver detalle">
              <Eye size={15} />
            </button>
            <button className="btn btn-icon btn-outline btn-sm" onClick={() => downloadPDFVenta(dev)} title="Descargar NC">
              <Download size={15} />
            </button>
          </>
        )}
      />

      {/* CREATE MODAL */}
      <CrudModal
        open={createModalOpen}
        title="Nueva Devolución de Venta"
        subtitle="Seleccioná la venta y el producto a devolver"
        maxWidth={650}
        onClose={() => { setCreateModalOpen(false); resetForm(); }}
        footer={
          <div className="flex items-center justify-center gap-4 w-full">
            <button className="btn btn-outline" onClick={() => { setCreateModalOpen(false); resetForm(); }}>Cancelar</button>
            <button className="btn btn-primary" onClick={handleSave}>Confirmar Devolución</button>
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="form-group">
            <label className="form-label">Venta Original *</label>
            <select className="select" value={referenciaId} onChange={(e) => {
              setReferenciaId(e.target.value);
              setSelectedItemId('');
            }}>
              <option value="">Seleccionar...</option>
              {ventas.map(v => <option key={v.id} value={v.id}>Venta #{v.id} — {formatDateTime(v.fecha)} — Total: {formatCurrency(v.total)}</option>)}
            </select>
          </div>

          {referenciaId && (
            <>
              <div className="form-group">
                <label className="form-label">Producto a Devolver *</label>
                <select className="select" value={selectedItemId} onChange={(e) => setSelectedItemId(e.target.value)}>
                  <option value="">Seleccionar producto del comprobante...</option>
                  {currentVentaItems.map(i => {
                    const prodName = i.producto?.nombre ?? 'Desconocido';
                    return (<option key={i.id} value={i.id}>{prodName} (Comprados: {i.cantidad}) — Unitario: {formatCurrency(i.precio_unitario)}</option>)
                  })}
                </select>
              </div>

              {selectedItemId && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="form-group">
                    <label className="form-label">Cantidad a Devolver *</label>
                    <input 
                      type="number" 
                      className="input" 
                      min="1" 
                      value={cantidadDevolver}
                      onChange={e => setCantidadDevolver(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Motivo *</label>
                    <select className="select" value={motivo} onChange={e => setMotivo(e.target.value)}>
                      <option value="">Seleccionar...</option>
                      {MOTIVOS_VENTA.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Observaciones (Opcional)</label>
                <textarea 
                  className="input min-h-[80px]" 
                  value={observaciones} 
                  onChange={e => setObservaciones(e.target.value)}
                  placeholder="Detalles adicionales sobre la devolución..."
                />
              </div>
            </>
          )}

          {!referenciaId && (
            <div className="flex items-center gap-2 p-3 rounded-lg text-sm bg-surface-secondary text-text-muted mt-2">
              <AlertCircle size={16} />
              Seleccioná un comprobante original para continuar
            </div>
          )}
        </div>
      </CrudModal>

      {/* VIEW MODAL */}
      <CrudModal
        open={viewModalOpen}
        title={`Detalle de Devolución #${selectedDevVenta?.id}`}
        subtitle="Información completa"
        maxWidth={500}
        onClose={() => { setViewModalOpen(false); setSelectedDevVenta(null); }}
        footer={
          <div className="flex items-center justify-end w-full">
            <button className="btn btn-primary" onClick={() => setViewModalOpen(false)}>Cerrar</button>
          </div>
        }
      >
        <div className="flex flex-col gap-3">
          {selectedDevVenta && (
            <>
              <p><strong>ID Devolución:</strong> #{selectedDevVenta.id}</p>
              <p><strong>Fecha:</strong> {formatDateTime(selectedDevVenta.fecha)}</p>
              <p><strong>Comprobante Origen:</strong> #{selectedDevVenta.venta_id}</p>
              <p><strong>Producto:</strong> {(selectedDevVenta as any).producto_nombre}</p>
              <p><strong>Cantidad Devuelta:</strong> {selectedDevVenta.cantidad}</p>
              <p><strong>Motivo:</strong> {selectedDevVenta.motivo}</p>
              <p><strong>Valor:</strong> {formatCurrency(selectedDevVenta.valor)}</p>
              <p><strong>Observaciones:</strong> {selectedDevVenta.observaciones || 'Sin observaciones'}</p>
            </>
          )}
        </div>
      </CrudModal>
    </div>
  )
}
