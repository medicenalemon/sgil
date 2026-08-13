import { useState, useEffect, useCallback } from 'react'
import {
  ShoppingCart,
  Plus,
  Eye,
  Download,
  Trash2,
  X,
  AlertCircle,
  ArrowLeft,
  CheckCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'
import StatCard from '@/components/shared/StatCard'
import DataTable from '@/components/shared/DataTable'
import CrudModal from '@/components/shared/CrudModal'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { useAuth } from '@/hooks/useAuth'
import { useAuditoria } from '@/hooks/useAuditoria'
import { canPerform } from '@/lib/permissions'
import { supabase } from '@/lib/supabase'
import { generatePdf, formatCurrency, formatDate, formatDateTime } from '@/lib/pdf/pdfGenerator'
import type { Venta, VentaItem, Producto, MetodoPago } from '@/lib/types'
import type { Column } from '@/lib/types'

const METODOS_PAGO: MetodoPago[] = [
  'Efectivo',
  'Tarjeta deb.',
  'Tarjeta cred.',
  'Transferencia',
  'Mercado Pago',
]

interface CartItem {
  producto: Producto
  cantidad: number
  precio_unitario: number
  subtotal: number
}

export default function VentasPage() {
  const { user } = useAuth()
  const { logAuditoria } = useAuditoria()
  const navigate = useNavigate()
  const role = user?.role ?? 'vendedor'
  const canCreate = canPerform(role, 'ventas', 'create')
  const canDelete = canPerform(role, 'ventas', 'delete')

  const [ventas, setVentas] = useState<(Venta & { cliente_nombre?: string; items_count?: number })[]>([])
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [viewModalOpen, setViewModalOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  
  // Download success modal
  const [successVenta, setSuccessVenta] = useState<{ venta: Venta; items: VentaItem[] } | null>(null)
  const [selectedVenta, setSelectedVenta] = useState<Venta | null>(null)
  const [selectedItems, setSelectedItems] = useState<VentaItem[]>([])

  // Create form state
  const [clienteId, setClienteId] = useState<string>('')
  const [metodoPago, setMetodoPago] = useState<MetodoPago>('Efectivo')
  const [cart, setCart] = useState<CartItem[]>([])
  const [selectedProductId, setSelectedProductId] = useState<string>('')
  const [selectedCantidad, setSelectedCantidad] = useState<string>('1')

  const [clientes, setClientes] = useState<any[]>([])
  const [productos, setProductos] = useState<any[]>([])

  const loadData = useCallback(async () => {
    try {
      const [
        { data: ventasData, error: ventasErr },
        { data: clientesData, error: clientesErr },
        { data: productosData, error: productosErr }
      ] = await Promise.all([
        supabase
          .from('ventas')
          .select('*, cliente:clientes(nombre), items:venta_items(id)')
          .order('id', { ascending: false }),
        supabase.from('clientes').select('id, nombre').eq('activo', true),
        supabase.from('productos').select('id, nombre, stock, precio_venta').eq('activo', true).gt('stock', 0)
      ])

      if (ventasErr) throw ventasErr
      if (clientesErr) throw clientesErr
      if (productosErr) throw productosErr

      const enriched = (ventasData || []).map((v: any) => ({
        ...v,
        cliente_nombre: v.cliente?.nombre ?? 'Sin cliente',
        items_count: v.items?.length || 0
      }))

      setVentas(enriched)
      setClientes(clientesData || [])
      setProductos(productosData || [])
    } catch (error: any) {
      console.error('Error fetching ventas:', error)
      toast.error(error.message || 'Error al cargar ventas')
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Cart totals
  const cartTotal = cart.reduce((acc, item) => acc + item.subtotal, 0)

  // Stats
  const totalVentas = ventas.length
  const ingresosTotales = ventas.reduce((acc, v) => acc + v.total, 0)
  const promedioPorVenta = totalVentas > 0 ? ingresosTotales / totalVentas : 0

  // ---- Cart operations ----

  const addToCart = () => {
    if (!selectedProductId) {
      toast.error('Seleccioná un producto')
      return
    }
    const cant = parseInt(selectedCantidad) || 0
    if (cant <= 0) {
      toast.error('La cantidad debe ser mayor a 0')
      return
    }

    const prod = productos.find((p) => p.id === Number(selectedProductId))
    if (!prod) return

    // Check if already in cart
    const existingIdx = cart.findIndex((c) => c.producto.id === prod.id)
    const existingQty = existingIdx >= 0 ? cart[existingIdx].cantidad : 0

    if (existingQty + cant > prod.stock) {
      toast.error(`Stock insuficiente. Disponible: ${prod.stock - existingQty} unidades`)
      return
    }

    if (existingIdx >= 0) {
      const updated = [...cart]
      updated[existingIdx].cantidad += cant
      updated[existingIdx].subtotal = updated[existingIdx].cantidad * updated[existingIdx].precio_unitario
      setCart(updated)
    } else {
      setCart([
        ...cart,
        {
          producto: prod,
          cantidad: cant,
          precio_unitario: prod.precio_venta,
          subtotal: cant * prod.precio_venta,
        },
      ])
    }

    setSelectedProductId('')
    setSelectedCantidad('1')
  }

  const removeFromCart = (index: number) => {
    setCart(cart.filter((_, i) => i !== index))
  }

  // ---- Save venta ----

  const handleSave = async () => {
    if (cart.length === 0) {
      toast.error('Agregá al menos un producto')
      return
    }

    try {
      const now = new Date().toISOString()
      
      // 1. Insert Venta
      const { data: ventaData, error: ventaError } = await supabase
        .from('ventas')
        .insert([{
          fecha: now,
          cliente_id: clienteId ? Number(clienteId) : null,
          metodo_pago: metodoPago,
          total: cartTotal,
          usuario_id: user?.id,
        }])
        .select()
        .single()

      if (ventaError) throw ventaError

      const ventaId = ventaData.id

      // 2. Insert VentaItems (Trigger handles stock and movimientos)
      const itemsToInsert = cart.map(item => ({
        venta_id: ventaId,
        producto_id: item.producto.id,
        cantidad: item.cantidad,
        precio_unitario: item.precio_unitario,
        subtotal: item.subtotal,
      }))

      const { data: itemsData, error: itemsError } = await supabase
        .from('venta_items')
        .insert(itemsToInsert)
        .select()

      if (itemsError) throw itemsError

      // 3. Handle Stock Updates and Movimientos
      for (const item of cart) {
        // Fetch current stock
        const { data: prodData } = await supabase
          .from('productos')
          .select('stock')
          .eq('id', item.producto.id)
          .single()
        
        const currentStock = prodData?.stock || 0
        const newStock = Math.max(0, currentStock - item.cantidad) // Prevent negative stock

        // Update product stock
        await supabase
          .from('productos')
          .update({ stock: newStock })
          .eq('id', item.producto.id)

        // Insert stock movement
        await supabase
          .from('movimientos_stock')
          .insert({
            fecha: new Date().toISOString(),
            producto_id: item.producto.id,
            tipo: 'salida',
            cantidad: item.cantidad,
            motivo: 'Venta a cliente',
            referencia_tipo: 'venta',
            referencia_id: ventaId,
            usuario_id: user?.id
          })
      }

      const clienteNombre = clienteId
        ? clientes.find((c) => c.id === Number(clienteId))?.nombre ?? 'Desconocido'
        : 'Sin cliente'

      // Audit
      logAuditoria('ventas', 'Registro de venta', {
        ventaId,
        cliente: clienteNombre,
        total: cartTotal,
        items: cart.length,
      })

      const itemsWithProducts = itemsData.map((item: any) => {
        const cartItem = cart.find(c => c.producto.id === item.producto_id)
        return {
          ...item,
          producto: cartItem?.producto
        }
      })

      toast.success('Venta registrada exitosamente')
      setSuccessVenta({ 
        venta: { ...ventaData, cliente_nombre: clienteNombre }, 
        items: itemsWithProducts 
      })

      // Reset
      setCreateModalOpen(false)
      setCart([])
      setClienteId('')
      setMetodoPago('Efectivo')
      loadData()
    } catch (error: any) {
      console.error('Error saving venta:', error)
      toast.error(error.message || 'Error al registrar la venta')
    }
  }

  // ---- Delete venta ----

  const openDelete = (venta: Venta) => {
    setSelectedVenta(venta)
    setDeleteDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!selectedVenta) return
    
    try {
      const { error } = await supabase
        .from('ventas')
        .delete()
        .eq('id', selectedVenta.id)

      if (error) throw error

      logAuditoria('ventas', 'Eliminación de venta', { ventaId: selectedVenta.id })
      toast.success('Venta eliminada exitosamente')
      setDeleteDialogOpen(false)
      setSelectedVenta(null)
      loadData()
    } catch (error: any) {
      console.error('Error deleting venta:', error)
      toast.error(error.message || 'Error al eliminar la venta')
    }
  }

  // ---- View detail ----

  const openView = async (venta: Venta) => {
    setSelectedVenta(venta)
    try {
      const { data, error } = await supabase
        .from('venta_items')
        .select('*, producto:productos(*)')
        .eq('venta_id', venta.id)
        
      if (error) throw error
      setSelectedItems(data || [])
      setViewModalOpen(true)
    } catch (error: any) {
      console.error('Error fetching items:', error)
      toast.error('Error al cargar detalle de venta')
    }
  }

  // ---- PDF ----

  const downloadComprobante = async (venta: Venta, items?: VentaItem[]) => {
    let ventaItems = items
    
    if (!ventaItems) {
      const { data } = await supabase
        .from('venta_items')
        .select('*, producto:productos(*)')
        .eq('venta_id', venta.id)
      ventaItems = data || []
    }

    const cli = venta.cliente_id
      ? clientes.find((c) => c.id === venta.cliente_id)
      : null

    const clienteNombre = (venta as any).cliente_nombre || cli?.nombre || 'Sin cliente'

    generatePdf({
      title: `Comprobante de Venta #${venta.id}`,
      infoLeft: [
        { label: 'ID Venta:', value: `#${venta.id}` },
        { label: 'Fecha:', value: formatDateTime(venta.fecha) },
      ],
      infoRight: [
        { label: 'Cliente:', value: clienteNombre },
        { label: 'Método:', value: venta.metodo_pago },
      ],
      columns: [
        { header: 'Producto', dataKey: 'producto' },
        { header: 'Cant.', dataKey: 'cantidad' },
        { header: 'P. Unit.', dataKey: 'precio_unitario' },
        { header: 'Subtotal', dataKey: 'subtotal' },
      ],
      rows: ventaItems.map((i: any) => ({
        producto: i.producto?.nombre ?? 'Producto Eliminado',
        cantidad: i.cantidad,
        precio_unitario: formatCurrency(i.precio_unitario),
        subtotal: formatCurrency(i.subtotal),
      })),
      totalLabel: 'TOTAL',
      totalValue: formatCurrency(venta.total),
      totalColor: [34, 197, 94], // green
      fileName: `comprobante_venta_${venta.id}.pdf`,
    })
  }

  // ---- Table columns ----

  const columns: Column<Venta & { cliente_nombre?: string; items_count?: number }>[] = [
    {
      key: 'id',
      header: 'ID',
      sortable: true,
      render: (v) => (
        <span className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          #{v.id}
        </span>
      ),
    },
    {
      key: 'fecha',
      header: 'Fecha',
      render: (v) => formatDate(v.fecha),
      sortable: true,
    },
    {
      key: 'cliente_nombre',
      header: 'Cliente',
      render: (v) => (
        <span className="font-medium">{v.cliente_nombre ?? '—'}</span>
      ),
    },
    {
      key: 'items_count',
      header: 'Items',
      render: (v) => (
        <span className="badge badge-info">
          {v.items_count ?? 0} productos
        </span>
      ),
    },
    {
      key: 'total',
      header: 'Total',
      render: (v) => (
        <span className="font-semibold" style={{ color: 'var(--color-success-600)' }}>
          {formatCurrency(v.total)}
        </span>
      ),
      sortable: true,
    },
    {
      key: 'metodo_pago',
      header: 'Método de Pago',
      render: (v) => (
        <span className="badge badge-primary">
          {v.metodo_pago}
        </span>
      ),
    },
  ]

  // Available products (not already in cart or with remaining stock)
  const availableProducts = productos.filter((p) => {
    const inCart = cart.find((c) => c.producto.id === p.id)
    if (!inCart) return true
    return inCart.cantidad < p.stock
  })

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between" style={{ marginBottom: '36px' }}>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
            Gestión de Ventas
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
            {totalVentas} de {totalVentas} ventas registradas
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            className="btn btn-outline"
            onClick={() => navigate('/')}
          >
            <ArrowLeft size={18} />
            Volver al Menú Principal
          </button>
          {canCreate && (
            <button className="btn btn-primary" onClick={() => setCreateModalOpen(true)}>
              <Plus size={18} />
              Nueva Venta
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4" style={{ marginBottom: '36px' }}>
        <StatCard
          title="Total Ventas"
          value={totalVentas}
          icon={<ShoppingCart size={24} />}
          color="#7c3aed"
        />
        <StatCard
          title="Ingresos Totales"
          value={formatCurrency(ingresosTotales)}
          icon={<ShoppingCart size={24} />}
          color="#16a34a"
        />
        <StatCard
          title="Promedio por Venta"
          value={formatCurrency(promedioPorVenta)}
          icon={<ShoppingCart size={24} />}
          color="#2563eb"
        />
      </div>

      {/* Table */}
      <DataTable
        data={ventas}
        columns={columns}
        searchPlaceholder="Buscar ventas..."
        searchKeys={['cliente_nombre', 'metodo_pago']}
        emptyMessage="No se encontraron ventas"
        actions={(venta) => (
          <>
            <button
              className="btn btn-icon btn-outline btn-sm"
              onClick={(e) => { e.stopPropagation(); openView(venta) }}
              title="Ver detalle"
            >
              <Eye size={15} />
            </button>
            <button
              className="btn btn-icon btn-outline btn-sm"
              onClick={(e) => { e.stopPropagation(); downloadComprobante(venta) }}
              title="Descargar comprobante"
            >
              <Download size={15} />
            </button>
            {canDelete && (
              <button
                className="btn btn-icon btn-outline btn-sm"
                style={{ color: 'var(--color-danger-600)' }}
                onClick={(e) => { e.stopPropagation(); openDelete(venta) }}
                title="Eliminar venta"
              >
                <Trash2 size={15} />
              </button>
            )}
          </>
        )}
      />

      {/* ============================================
          CREATE VENTA MODAL
          ============================================ */}
      <CrudModal
        open={createModalOpen}
        title="Registrar Nueva Venta"
        subtitle="Complete los datos de la venta y agregue los productos."
        maxWidth={720}
        onClose={() => {
          setCreateModalOpen(false)
          setCart([])
          setClienteId('')
          setMetodoPago('Efectivo')
        }}
        footer={
          <div className="flex items-center justify-center gap-3 w-full">
            <button
              className="btn btn-outline"
              onClick={() => {
                setCreateModalOpen(false)
                setCart([])
                setClienteId('')
                setMetodoPago('Efectivo')
              }}
            >
              Cancelar
            </button>
            <button className="btn btn-primary" onClick={handleSave} disabled={cart.length === 0}>
              Registrar Venta
            </button>
          </div>
        }
      >
        <div className="flex flex-col gap-6">
          {/* Client & payment method */}
          <div className="grid grid-cols-2 gap-5">
            <div className="form-group">
              <label className="form-label">Cliente *</label>
              <select
                className="select"
                value={clienteId}
                onChange={(e) => setClienteId(e.target.value)}
              >
                <option value="">Seleccionar cliente</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Método de Pago *</label>
              <select
                className="select"
                value={metodoPago}
                onChange={(e) => setMetodoPago(e.target.value as MetodoPago)}
              >
                <option value="" disabled>Seleccionar método</option>
                {METODOS_PAGO.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Add product section — bordered card */}
          <div
            className="rounded-xl"
            style={{
              border: '1px solid var(--color-border)',
              background: 'var(--color-surface)',
              padding: '24px',
            }}
          >
            <h3
              className="text-base font-semibold mb-4"
              style={{ color: 'var(--color-text-primary)' }}
            >
              Agregar Productos
            </h3>
            <div className="grid gap-2" style={{ gridTemplateColumns: '1fr auto auto' }}>
              <div className="form-group">
                <label className="form-label text-xs">Producto</label>
                <select
                  className="select"
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                >
                  <option value="">Seleccionar producto</option>
                  {availableProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} — {formatCurrency(p.precio_venta)} (Stock: {p.stock})
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label text-xs">Cantidad</label>
                <input
                  className="input"
                  type="number"
                  min={1}
                  style={{ width: 80 }}
                  value={selectedCantidad}
                  onChange={(e) => setSelectedCantidad(e.target.value)}
                />
              </div>
              <div className="form-group" style={{ justifyContent: 'flex-end' }}>
                <button className="btn btn-primary" onClick={addToCart}>
                  <Plus size={16} />
                  Agregar
                </button>
              </div>
            </div>
          </div>

          {/* Cart items */}
          {cart.length > 0 && (
            <div>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Cantidad</th>
                    <th>Precio Unit.</th>
                    <th>Subtotal</th>
                    <th style={{ width: 50 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {cart.map((item, idx) => (
                    <tr key={item.producto.id}>
                      <td className="font-medium">{item.producto.nombre}</td>
                      <td>{item.cantidad}</td>
                      <td>{formatCurrency(item.precio_unitario)}</td>
                      <td className="font-semibold">{formatCurrency(item.subtotal)}</td>
                      <td>
                        <button
                          className="btn btn-icon btn-sm"
                          style={{ color: 'var(--color-danger-600)', background: 'transparent', border: 'none' }}
                          onClick={() => removeFromCart(idx)}
                        >
                          <X size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Total */}
              <div
                className="flex items-center justify-end mt-3 rounded-lg"
                style={{ 
                  background: 'var(--color-success-50)',
                  padding: '16px 24px',
                  gap: '12px'
                }}
              >
                <span className="text-sm font-medium">Total de la Venta:</span>
                <span
                  className="text-xl font-bold"
                  style={{ color: 'var(--color-success-600)' }}
                >
                  {formatCurrency(cartTotal)}
                </span>
              </div>
            </div>
          )}

          {cart.length === 0 && (
            <div
              className="flex items-center gap-2 p-3 rounded-lg text-sm"
              style={{ background: 'var(--color-surface-secondary)', color: 'var(--color-text-muted)' }}
            >
              <AlertCircle size={16} />
              Agregá productos para registrar la venta
            </div>
          )}
        </div>
      </CrudModal>

      {/* ============================================
          VIEW DETAIL MODAL
          ============================================ */}
      <CrudModal
        open={viewModalOpen}
        title={`Detalle de Venta #${selectedVenta?.id}`}
        subtitle="Consulte la información completa de esta venta"
        maxWidth={680}
        onClose={() => {
          setViewModalOpen(false)
          setSelectedVenta(null)
          setSelectedItems([])
        }}
        footer={
          <div className="flex items-center justify-end gap-3">
            <button
              className="btn btn-outline"
              onClick={() => selectedVenta && downloadComprobante(selectedVenta, selectedItems)}
            >
              <Download size={16} />
              Descargar Comprobante
            </button>
            <button
              className="btn"
              style={{
                background: 'var(--color-primary-50)',
                color: 'var(--color-primary-600)',
                border: 'none',
              }}
              onClick={() => {
                setViewModalOpen(false)
                setSelectedVenta(null)
                setSelectedItems([])
              }}
            >
              Cerrar
            </button>
          </div>
        }
      >
        {selectedVenta && (
          <div className="flex flex-col gap-5">
            {/* Info card */}
            <div
              className="rounded-lg grid grid-cols-2 gap-y-4 gap-x-8"
              style={{ background: 'var(--color-surface-secondary)', padding: '24px' }}
            >
              <div>
                <p className="text-xs font-medium mb-1" style={{ color: 'var(--color-text-muted)' }}>
                  ID Venta
                </p>
                <p className="text-sm font-bold text-gray-900">#{selectedVenta.id}</p>
              </div>
              <div>
                <p className="text-xs font-medium mb-1" style={{ color: 'var(--color-text-muted)' }}>
                  Fecha
                </p>
                <p className="text-sm font-medium text-gray-800">{formatDate(selectedVenta.fecha)}</p>
              </div>
              <div>
                <p className="text-xs font-medium mb-1" style={{ color: 'var(--color-text-muted)' }}>
                  Cliente
                </p>
                <p className="text-sm font-bold text-gray-900">
                  {selectedVenta.cliente_id
                    ? (selectedVenta as any).cliente_nombre ?? '—'
                    : 'Sin cliente'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium mb-1" style={{ color: 'var(--color-text-muted)' }}>
                  Método de Pago
                </p>
                <p className="text-sm font-bold text-gray-900">{selectedVenta.metodo_pago}</p>
              </div>
            </div>

            {/* Items table */}
            <div>
              <h4 className="text-sm font-bold mb-3 text-gray-900">Productos Vendidos</h4>
              <div 
                className="rounded-lg overflow-hidden" 
                style={{ border: '1px solid var(--color-border-light)' }}
              >
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--color-border-light)' }}>
                      <th className="text-sm font-medium" style={{ color: 'var(--color-text-primary)', padding: '16px' }}>Producto</th>
                      <th className="text-sm font-medium" style={{ color: 'var(--color-text-primary)', padding: '16px' }}>Cantidad</th>
                      <th className="text-sm font-medium" style={{ color: 'var(--color-text-primary)', padding: '16px' }}>Precio Unit.</th>
                      <th className="text-sm font-medium" style={{ color: 'var(--color-text-primary)', padding: '16px' }}>Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedItems.map((item, idx) => (
                      <tr 
                        key={item.id}
                        style={{ 
                          borderBottom: idx === selectedItems.length - 1 ? 'none' : '1px solid var(--color-border-light)' 
                        }}
                      >
                        <td className="text-sm text-gray-700" style={{ padding: '16px' }}>{item.producto?.nombre ?? '—'}</td>
                        <td className="text-sm text-gray-700" style={{ padding: '16px' }}>{item.cantidad}</td>
                        <td className="text-sm text-gray-700" style={{ padding: '16px' }}>{formatCurrency(item.precio_unitario)}</td>
                        <td className="text-sm text-gray-700" style={{ padding: '16px' }}>{formatCurrency(item.subtotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Total */}
            <div
              className="flex items-center justify-between rounded-lg"
              style={{ background: 'var(--color-surface-secondary)', padding: '20px 24px' }}
            >
              <span className="text-sm font-bold text-gray-900">Total de la Venta:</span>
              <span
                className="text-2xl font-bold"
                style={{ color: 'var(--color-success-600)' }}
              >
                {formatCurrency(selectedVenta.total)}
              </span>
            </div>
          </div>
        )}
      </CrudModal>

      {/* ============================================
          DELETE MODAL
          ============================================ */}
      <ConfirmDialog
        open={deleteDialogOpen}
        title="Eliminar Venta"
        message={`¿Estás seguro de que deseas eliminar la venta #${selectedVenta?.id}? Esta acción no se puede deshacer y los productos serán devueltos al stock.`}
        confirmLabel="Eliminar Venta"
        cancelLabel="Cancelar"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => {
          setDeleteDialogOpen(false)
          setSelectedVenta(null)
        }}
      />

      {/* ============================================
          SUCCESS MODAL
          ============================================ */}
      <ConfirmDialog
        open={successVenta !== null}
        title="Venta Exitosa"
        message="¿Deseas descargar el comprobante de la venta?"
        icon={<CheckCircle size={24} />}
        confirmLabel={
          <>
            <Download size={18} />
            Descargar Comprobante
          </>
        }
        cancelLabel="Cerrar"
        variant="primary"
        onConfirm={() => {
          if (successVenta) {
            downloadComprobante(successVenta.venta, successVenta.items)
            setSuccessVenta(null)
          }
        }}
        onCancel={() => setSuccessVenta(null)}
      />
    </div>
  )
}
