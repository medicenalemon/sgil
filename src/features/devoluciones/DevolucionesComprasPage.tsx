import { useState, useEffect, useCallback } from 'react'
import {
  Plus,
  Eye,
  Download,
  AlertCircle,
  ArrowLeft,
  Package,
  Box,
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
import type { Column, DevolucionCompra, MotivoDevolucionCompra } from '@/lib/types'

const MOTIVOS_COMPRA: MotivoDevolucionCompra[] = [
  'Producto dañado',
  'Producto defectuoso',
  'Error en el pedido',
  'Producto vencido',
  'No coincide con orden de compra',
  'Otro',
]

export default function DevolucionesComprasPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { logAuditoria } = useAuditoria()

  // Data state
  const [devCompras, setDevCompras] = useState<(DevolucionCompra & { compra_id_display: string, producto_nombre: string })[]>([])

  // Modal state
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [viewModalOpen, setViewModalOpen] = useState(false)
  const [selectedDevCompra, setSelectedDevCompra] = useState<DevolucionCompra | null>(null)

  // Form state for Nueva Devolución
  const [referenciaId, setReferenciaId] = useState<string>('')
  const [selectedItemId, setSelectedItemId] = useState<string>('')
  const [cantidadDevolver, setCantidadDevolver] = useState<string>('1')
  const [motivo, setMotivo] = useState<string>('')
  const [observaciones, setObservaciones] = useState<string>('')

  const [compras, setCompras] = useState<any[]>([])
  const [currentCompraItems, setCurrentCompraItems] = useState<any[]>([])

  const loadData = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('devoluciones_compras')
        .select('*, producto:productos(nombre)')
        .order('id', { ascending: false })

      if (error) throw error
      
      const enriched = (data || []).map(dc => ({
        ...dc,
        compra_id_display: `#${dc.compra_id}`,
        producto_nombre: dc.producto?.nombre ?? 'Desconocido'
      }))
      setDevCompras(enriched)

      // Pre-load all compras for the dropdown
      const { data: comprasData } = await supabase.from('compras').select('id')
      setCompras(comprasData || [])
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
        setCurrentCompraItems([])
        return
      }
      try {
        const { data, error } = await supabase
          .from('compra_items')
          .select('*, producto:productos(nombre)')
          .eq('compra_id', referenciaId)
        if (error) throw error
        setCurrentCompraItems(data || [])
      } catch (error) {
        console.error('Error fetching items:', error)
      }
    }
    fetchItems()
  }, [referenciaId])

  // ---- Stats ----
  const totalComprasDev = devCompras.length
  const valorTotalComprasDev = devCompras.reduce((acc, curr) => acc + curr.valor, 0)
  const unidadesDevueltas = devCompras.reduce((acc, curr) => acc + curr.cantidad, 0)

  // ---- Save Devolución ----
  const handleSave = async () => {
    if (!referenciaId) {
      toast.error('Seleccioná una compra')
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

    const item = currentCompraItems.find(i => i.id === Number(selectedItemId))
    if (!item) return
    if (cant > item.cantidad) {
      toast.error(`La cantidad no puede superar los ${item.cantidad} comprados originalmente`)
      return
    }

    try {
      const valorDevolucion = item.precio_unitario * cant
      const now = new Date().toISOString()

      const { data: newDev, error } = await supabase
        .from('devoluciones_compras')
        .insert([{
          fecha: now,
          compra_id: Number(referenciaId),
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

      logAuditoria('devoluciones', 'Registro devolución de compra', { devId: newDev.id, compra: referenciaId, valor: valorDevolucion })
      toast.success('Devolución de compra registrada')
      
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
  const openViewCompra = (dev: DevolucionCompra) => {
    setSelectedDevCompra(dev)
    setViewModalOpen(true)
  }

  const downloadPDFCompra = (dev: DevolucionCompra) => {
    const pNombre = (dev as any).producto?.nombre ?? (dev as any).producto_nombre ?? 'Desconocido'
    generatePdf({
      title: `Remito de Devolución a Proveedor #${dev.id}`,
      infoLeft: [
        { label: 'ID Devolución:', value: `#${dev.id}` },
        { label: 'ID Compra Orig.:', value: `#${dev.compra_id}` },
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
      totalLabel: 'TOTAL A FAVOR EMPRESA',
      totalValue: formatCurrency(dev.valor),
      totalColor: [22, 163, 74], // green
      fileName: `remito_devolucion_${dev.id}.pdf`
    })
  }

  // ---- Tables ----
  const colsCompras: Column<DevolucionCompra & { compra_id_display: string, producto_nombre: string }>[] = [
    { key: 'id', header: 'ID Dev.', sortable: true },
    { key: 'fecha', header: 'Fecha', render: d => formatDate(d.fecha), sortable: true },
    { key: 'compra_id_display', header: 'Compra Orig.' },
    { key: 'producto_nombre', header: 'Producto' },
    { key: 'cantidad', header: 'Cant.' },
    { key: 'motivo', header: 'Motivo' },
    { key: 'valor', header: 'Valor a Recuperar', render: d => <span className="font-semibold text-green-600">{formatCurrency(d.valor)}</span>, sortable: true },
  ]

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between" style={{ marginBottom: '36px' }}>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
            Devoluciones de Compras
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
            Gestión de devoluciones a proveedores
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
          value={<span style={{ color: '#ea580c' }}>{totalComprasDev}</span>}
          icon={<Package size={24} />}
          color="#ea580c"
        />
        <StatCard
          title="Valor Devuelto"
          value={<span style={{ color: '#ea580c' }}>{formatCurrency(valorTotalComprasDev)}</span>}
          icon={<AlertTriangle size={24} />}
          color="#ea580c"
        />
        <StatCard
          title="Unidades Devueltas"
          value={<span style={{ color: '#ea580c' }}>{unidadesDevueltas}</span>}
          icon={<Box size={24} />}
          color="#3b82f6"
        />
      </div>

      {/* Tables */}
      <DataTable
        data={devCompras}
        columns={colsCompras}
        searchPlaceholder="Buscar por producto o motivo..."
        searchKeys={['producto_nombre', 'motivo']}
        emptyMessage="No se registraron devoluciones de compras"
        actions={(dev) => (
          <>
            <button className="btn btn-icon btn-outline btn-sm" onClick={() => openViewCompra(dev)} title="Ver detalle">
              <Eye size={15} />
            </button>
            <button className="btn btn-icon btn-outline btn-sm" onClick={() => downloadPDFCompra(dev)} title="Descargar Remito">
              <Download size={15} />
            </button>
          </>
        )}
      />

      {/* CREATE MODAL */}
      <CrudModal
        open={createModalOpen}
        title="Nueva Devolución de Compra"
        subtitle="Seleccioná la compra y el producto a devolver"
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
            <label className="form-label">Compra Original *</label>
            <select className="select" value={referenciaId} onChange={(e) => {
              setReferenciaId(e.target.value);
              setSelectedItemId('');
            }}>
              <option value="">Seleccionar...</option>
              {compras.map(c => <option key={c.id} value={c.id}>Compra #{c.id} — {formatDateTime(c.fecha)} — Total: {formatCurrency(c.total)}</option>)}
            </select>
          </div>

          {referenciaId && (
            <>
              <div className="form-group">
                <label className="form-label">Producto a Devolver *</label>
                <select className="select" value={selectedItemId} onChange={(e) => setSelectedItemId(e.target.value)}>
                  <option value="">Seleccionar producto del comprobante...</option>
                  {currentCompraItems.map(i => {
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
                      {MOTIVOS_COMPRA.map(m => <option key={m} value={m}>{m}</option>)}
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
        title={`Detalle de Devolución #${selectedDevCompra?.id}`}
        subtitle="Información completa"
        maxWidth={500}
        onClose={() => { setViewModalOpen(false); setSelectedDevCompra(null); }}
        footer={
          <div className="flex items-center justify-end w-full">
            <button className="btn btn-primary" onClick={() => setViewModalOpen(false)}>Cerrar</button>
          </div>
        }
      >
        <div className="flex flex-col gap-3">
          {selectedDevCompra && (
            <>
              <p><strong>ID Devolución:</strong> #{selectedDevCompra.id}</p>
              <p><strong>Fecha:</strong> {formatDateTime(selectedDevCompra.fecha)}</p>
              <p><strong>Comprobante Origen:</strong> #{selectedDevCompra.compra_id}</p>
              <p><strong>Producto:</strong> {(selectedDevCompra as any).producto_nombre}</p>
              <p><strong>Cantidad Devuelta:</strong> {selectedDevCompra.cantidad}</p>
              <p><strong>Motivo:</strong> {selectedDevCompra.motivo}</p>
              <p><strong>Valor:</strong> {formatCurrency(selectedDevCompra.valor)}</p>
              <p><strong>Observaciones:</strong> {selectedDevCompra.observaciones || 'Sin observaciones'}</p>
            </>
          )}
        </div>
      </CrudModal>
    </div>
  )
}
