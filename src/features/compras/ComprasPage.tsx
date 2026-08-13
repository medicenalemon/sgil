import { useState, useEffect, useCallback } from 'react'
import {
  ShoppingBag,
  Plus,
  Eye,
  Download,
  X,
  DollarSign,
  TrendingUp,
  AlertCircle,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import StatCard from '@/components/shared/StatCard'
import DataTable from '@/components/shared/DataTable'
import CrudModal from '@/components/shared/CrudModal'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { useAuth } from '@/hooks/useAuth'
import { useAuditoria } from '@/hooks/useAuditoria'
import { supabase } from '@/lib/supabase'
import { generatePdf, formatCurrency, formatDate, formatDateTime } from '@/lib/pdf/pdfGenerator'
import type { Compra, CompraItem, Producto } from '@/lib/types'
import type { Column } from '@/lib/types'

interface CartItem {
  producto: Producto
  cantidad: number
  precio_unitario: number
  subtotal: number
  precioWarning: boolean // true if precio_compra >= precio_venta
}

export default function ComprasPage() {
  const { user } = useAuth()
  const { logAuditoria } = useAuditoria()

  const [compras, setCompras] = useState<(Compra & { proveedor_nombre?: string })[]>([])
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [viewModalOpen, setViewModalOpen] = useState(false)
  const [selectedCompra, setSelectedCompra] = useState<Compra | null>(null)
  const [selectedItems, setSelectedItems] = useState<CompraItem[]>([])

  // Download success modal
  const [successCompra, setSuccessCompra] = useState<{ compra: Compra; items: CompraItem[] } | null>(null)

  // Create form state
  const [proveedorId, setProveedorId] = useState<string>('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [selectedProductId, setSelectedProductId] = useState<string>('')
  const [selectedCantidad, setSelectedCantidad] = useState<string>('1')
  const [selectedPrecioCompra, setSelectedPrecioCompra] = useState<string>('')

  const [proveedores, setProveedores] = useState<any[]>([])
  const [productos, setProductos] = useState<any[]>([])

  const loadData = useCallback(async () => {
    try {
      const [
        { data: comprasData, error: comprasErr },
        { data: provsData, error: provsErr },
        { data: prodsData, error: prodsErr }
      ] = await Promise.all([
        supabase
          .from('compras')
          .select('*, proveedor:proveedores(razon_social, cuit)')
          .order('id', { ascending: false }),
        supabase.from('proveedores').select('id, razon_social, cuit').eq('activo', true),
        supabase.from('productos').select('id, nombre, stock, precio_compra, precio_venta').eq('activo', true)
      ])

      if (comprasErr) throw comprasErr
      if (provsErr) throw provsErr
      if (prodsErr) throw prodsErr

      const enriched = (comprasData || []).map((c: any) => ({
        ...c,
        proveedor_nombre: c.proveedor?.razon_social ?? 'Sin proveedor',
      }))

      setCompras(enriched)
      setProveedores(provsData || [])
      setProductos(prodsData || [])
    } catch (error: any) {
      console.error('Error fetching compras:', error)
      toast.error('Error al cargar compras')
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const cartTotal = cart.reduce((acc, item) => acc + item.subtotal, 0)

  // Stats
  const totalCompras = compras.length
  const inversionTotal = compras.reduce((acc, c) => acc + c.total, 0)
  const promedioPorCompra = totalCompras > 0 ? inversionTotal / totalCompras : 0

  // ---- Auto-fill precio_compra when product is selected ----

  const handleProductChange = (prodId: string) => {
    setSelectedProductId(prodId)
    if (prodId) {
      const prod = productos.find((p) => p.id === Number(prodId))
      if (prod) {
        setSelectedPrecioCompra(String(prod.precio_compra))
      }
    } else {
      setSelectedPrecioCompra('')
    }
  }

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
    const precioCompra = parseFloat(selectedPrecioCompra) || 0
    if (precioCompra <= 0) {
      toast.error('Ingresá un precio de compra válido')
      return
    }

    const prod = productos.find((p) => p.id === Number(selectedProductId))
    if (!prod) return

    // Check if precio_compra >= precio_venta → warn
    const precioWarning = precioCompra >= prod.precio_venta

    // Check if already in cart
    const existingIdx = cart.findIndex((c) => c.producto.id === prod.id)
    if (existingIdx >= 0) {
      const updated = [...cart]
      updated[existingIdx].cantidad += cant
      updated[existingIdx].precio_unitario = precioCompra
      updated[existingIdx].subtotal = updated[existingIdx].cantidad * precioCompra
      updated[existingIdx].precioWarning = precioWarning
      setCart(updated)
    } else {
      setCart([
        ...cart,
        {
          producto: prod,
          cantidad: cant,
          precio_unitario: precioCompra,
          subtotal: cant * precioCompra,
          precioWarning,
        },
      ])
    }

    if (precioWarning) {
      toast.warning(
        'El precio de compra es mayor o igual al precio de venta. Revisá para obtener ganancias.',
        { duration: 5000 }
      )
    }

    setSelectedProductId('')
    setSelectedCantidad('1')
    setSelectedPrecioCompra('')
  }

  const removeFromCart = (index: number) => {
    setCart(cart.filter((_, i) => i !== index))
  }

  // ---- Save compra ----

  const handleSave = async () => {
    if (!proveedorId) {
      toast.error('Seleccioná un proveedor')
      return
    }
    if (cart.length === 0) {
      toast.error('Agregá al menos un producto')
      return
    }

    try {
      const now = new Date().toISOString()

      // 1. Insert Compra
      const { data: compraData, error: compraError } = await supabase
        .from('compras')
        .insert([{
          fecha: now,
          proveedor_id: Number(proveedorId),
          total: cartTotal,
          usuario_id: user?.id,
        }])
        .select()
        .single()

      if (compraError) throw compraError

      const compraId = compraData.id

      // 2. Insert CompraItems (Trigger handles stock and movimientos)
      const itemsToInsert = cart.map(item => ({
        compra_id: compraId,
        producto_id: item.producto.id,
        cantidad: item.cantidad,
        precio_unitario: item.precio_unitario,
        subtotal: item.subtotal,
      }))

      const { data: itemsData, error: itemsError } = await supabase
        .from('compra_items')
        .insert(itemsToInsert)
        .select()

      if (itemsError) throw itemsError

      // Note: We might want to update the precio_compra of the producto here
      // because the trigger doesn't do that, but for now we skip or do it separately.
      for (const item of cart) {
        await supabase
          .from('productos')
          .update({ precio_compra: item.precio_unitario })
          .eq('id', item.producto.id)
      }

      const provNombre = proveedores.find((p) => p.id === Number(proveedorId))?.razon_social ?? 'Desconocido'

      logAuditoria('compras', 'Registro de compra', {
        compraId,
        proveedor: provNombre,
        total: cartTotal,
        items: cart.length,
      })

      toast.success('Compra registrada exitosamente')
      setSuccessCompra({ compra: compraData, items: itemsData })

      setCreateModalOpen(false)
      setCart([])
      setProveedorId('')
      loadData()
    } catch (error: any) {
      console.error('Error saving compra:', error)
      toast.error(error.message || 'Error al registrar la compra')
    }
  }

  // ---- View detail ----

  // ---- View detail ----

  const openView = async (compra: Compra) => {
    setSelectedCompra(compra)
    try {
      const { data, error } = await supabase
        .from('compra_items')
        .select('*, producto:productos(*)')
        .eq('compra_id', compra.id)
        
      if (error) throw error
      setSelectedItems(data || [])
      setViewModalOpen(true)
    } catch (error: any) {
      console.error('Error fetching items:', error)
      toast.error('Error al cargar detalle de compra')
    }
  }

  // ---- PDF ----

  const downloadRemito = async (compra: Compra, items?: CompraItem[]) => {
    let compraItems = items
    
    if (!compraItems) {
      const { data } = await supabase
        .from('compra_items')
        .select('*, producto:productos(*)')
        .eq('compra_id', compra.id)
      compraItems = data || []
    }

    const prov = compra.proveedor_id
      ? proveedores.find((p) => p.id === compra.proveedor_id)
      : null

    generatePdf({
      title: `Remito de Compra #${compra.id}`,
      infoLeft: [
        { label: 'ID Compra:', value: `#${compra.id}` },
        { label: 'Fecha:', value: formatDateTime(compra.fecha) },
      ],
      infoRight: [
        { label: 'Proveedor:', value: (compra as any).proveedor?.razon_social ?? prov?.razon_social ?? '—' },
        { label: 'CUIT:', value: (compra as any).proveedor?.cuit ?? prov?.cuit ?? '—' },
      ],
      columns: [
        { header: 'Producto', dataKey: 'producto' },
        { header: 'Cantidad', dataKey: 'cantidad' },
        { header: 'Precio Unit.', dataKey: 'precio_unitario' },
        { header: 'Subtotal', dataKey: 'subtotal' },
      ],
      rows: compraItems.map((i: any) => ({
        producto: i.producto?.nombre ?? 'Producto Eliminado',
        cantidad: i.cantidad,
        precio_unitario: formatCurrency(i.precio_unitario),
        subtotal: formatCurrency(i.subtotal),
      })),
      totalLabel: 'TOTAL',
      totalValue: formatCurrency(compra.total),
      totalColor: [234, 88, 12], // orange
      fileName: `remito_compra_${compra.id}.pdf`,
    })
  }

  // ---- Table columns ----

  const columns_table: Column<Compra & { proveedor_nombre?: string }>[] = [
    { key: 'id', header: 'ID', sortable: true },
    {
      key: 'fecha',
      header: 'Fecha',
      render: (c) => formatDate(c.fecha),
      sortable: true,
    },
    {
      key: 'proveedor_nombre',
      header: 'Proveedor',
      render: (c) => c.proveedor_nombre ?? '—',
    },
    {
      key: 'total',
      header: 'Total',
      render: (c) => (
        <span className="font-semibold" style={{ color: 'var(--color-warning-600)' }}>
          {formatCurrency(c.total)}
        </span>
      ),
      sortable: true,
    },
  ]

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between" style={{ marginBottom: '36px' }}>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
            Gestión de Compras
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
            {totalCompras} de {totalCompras} compras registradas
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setCreateModalOpen(true)}>
          <Plus size={18} />
          Nueva Compra
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4" style={{ marginBottom: '36px' }}>
        <StatCard
          title="Total Compras"
          value={totalCompras}
          icon={<ShoppingBag size={24} />}
          color="#7c3aed"
        />
        <StatCard
          title="Inversión Total"
          value={formatCurrency(inversionTotal)}
          icon={<DollarSign size={24} />}
          color="#ea580c"
        />
        <StatCard
          title="Promedio por Compra"
          value={formatCurrency(promedioPorCompra)}
          icon={<TrendingUp size={24} />}
          color="#2563eb"
        />
      </div>

      {/* Table */}
      <DataTable
        data={compras}
        columns={columns_table}
        searchPlaceholder="Buscar por proveedor..."
        searchKeys={['proveedor_nombre']}
        emptyMessage="No se encontraron compras"
        actions={(compra) => (
          <>
            <button
              className="btn btn-icon btn-outline btn-sm"
              onClick={(e) => { e.stopPropagation(); openView(compra) }}
              title="Ver detalle"
            >
              <Eye size={15} />
            </button>
            <button
              className="btn btn-icon btn-outline btn-sm"
              onClick={(e) => { e.stopPropagation(); downloadRemito(compra) }}
              title="Descargar remito"
            >
              <Download size={15} />
            </button>
          </>
        )}
      />

      {/* ============================================
          CREATE COMPRA MODAL
          ============================================ */}
      <CrudModal
        open={createModalOpen}
        title="Registrar Nueva Compra"
        subtitle="Complete los datos de la compra y agregue los productos."
        maxWidth={780}
        onClose={() => {
          setCreateModalOpen(false)
          setCart([])
          setProveedorId('')
        }}
        footer={
          <div className="flex items-center justify-center gap-4 w-full">
            <button
              className="btn btn-outline"
              onClick={() => {
                setCreateModalOpen(false)
                setCart([])
                setProveedorId('')
              }}
            >
              Cancelar
            </button>
            <button
              className="btn btn-primary"
              onClick={handleSave}
              disabled={cart.length === 0 || !proveedorId}
            >
              Registrar Compra
            </button>
          </div>
        }
      >
        <div className="flex flex-col gap-5">
          {/* Proveedor */}
          <div className="form-group">
            <label className="form-label">Proveedor *</label>
            <select
              className="select"
              value={proveedorId}
              onChange={(e) => setProveedorId(e.target.value)}
            >
              <option value="">Seleccionar proveedor...</option>
              {proveedores.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.razon_social} {p.cuit ? `— ${p.cuit}` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Add product row */}
          <div
            className="rounded-xl"
            style={{
              border: '1px solid var(--color-border)',
              background: 'var(--color-surface)',
              padding: '24px',
            }}
          >
            <h3 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)', marginBottom: '16px' }}>
              Agregar Productos
            </h3>

            {selectedProductId && (() => {
              const selectedProd = productos.find(p => p.id === Number(selectedProductId))
              if (selectedProd) {
                return (
                  <div
                    style={{
                      marginBottom: '16px',
                      padding: '12px 16px',
                      borderTopRightRadius: '8px',
                      borderBottomRightRadius: '8px',
                      background: 'var(--color-primary-50)',
                      borderLeft: '4px solid var(--color-primary-500)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                    }}
                  >
                    <p style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--color-primary-700)', margin: 0 }}>
                      Precio de venta actual: {formatCurrency(selectedProd.precio_venta)}
                    </p>
                    <p style={{ fontSize: '0.875rem', color: 'var(--color-primary-600)', margin: 0 }}>
                      El precio de compra debe ser menor al precio de venta para obtener ganancias
                    </p>
                  </div>
                )
              }
              return null
            })()}

            <div className="flex gap-4">
              <div className="form-group flex-1">
                <label className="form-label text-xs">Producto</label>
                <select
                  className="select"
                  value={selectedProductId}
                  onChange={(e) => handleProductChange(e.target.value)}
                >
                  <option value="">Seleccionar producto...</option>
                  {productos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre}
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

              <div className="form-group">
                <label className="form-label text-xs">Precio de Compra *</label>
                <input
                  className="input"
                  type="number"
                  step="0.01"
                  style={{ width: 140 }}
                  value={selectedPrecioCompra}
                  onChange={(e) => setSelectedPrecioCompra(e.target.value)}
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
                    <th>Precio Compra</th>
                    <th>Subtotal</th>
                    <th style={{ width: 50 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {cart.map((item, idx) => (
                    <tr key={item.producto.id}>
                      <td>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{item.producto.nombre}</span>
                          {item.precioWarning && (
                            <span title="Precio de compra ≥ precio de venta">
                              <AlertTriangle
                                size={14}
                                style={{ color: 'var(--color-warning-500)' }}
                              />
                            </span>
                          )}
                        </div>
                      </td>
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

              {/* Price warnings summary */}
              {cart.some((c) => c.precioWarning) && (
                <div
                  className="flex items-start gap-2 mt-3 p-3 rounded-lg text-sm"
                  style={{ background: 'var(--color-warning-50)', color: 'var(--color-warning-600)' }}
                >
                  <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
                  <span>
                    Uno o más productos tienen un precio de compra mayor o igual al precio de venta.
                    Revisá los precios para asegurar márgenes de ganancia.
                  </span>
                </div>
              )}

              {/* Total */}
              <div
                className="flex items-center justify-end mt-3 rounded-lg"
                style={{ background: 'var(--color-warning-50)', padding: '16px 24px', gap: '12px' }}
              >
                <span className="text-sm font-medium">Total de la Compra:</span>
                <span
                  className="text-xl font-bold"
                  style={{ color: 'var(--color-warning-600)' }}
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
              Agregá productos para registrar la compra
            </div>
          )}
        </div>
      </CrudModal>

      {/* ============================================
          VIEW DETAIL MODAL
          ============================================ */}
      <CrudModal
        open={viewModalOpen}
        title={`Detalle de Compra #${selectedCompra?.id}`}
        subtitle="Consulte la información completa de esta compra"
        maxWidth={680}
        onClose={() => {
          setViewModalOpen(false)
          setSelectedCompra(null)
          setSelectedItems([])
        }}
        footer={
          <div className="flex items-center justify-end gap-3">
            <button
              className="btn btn-outline"
              onClick={() => selectedCompra && downloadRemito(selectedCompra, selectedItems)}
            >
              <Download size={16} />
              Descargar Remito
            </button>
            <button
              className="btn"
              style={{
                background: 'var(--color-warning-50)',
                color: 'var(--color-warning-600)',
                border: 'none',
              }}
              onClick={() => {
                setViewModalOpen(false)
                setSelectedCompra(null)
                setSelectedItems([])
              }}
            >
              Cerrar
            </button>
          </div>
        }
      >
        {selectedCompra && (
          <div className="flex flex-col gap-5">
            <div
              className="rounded-lg grid grid-cols-2 gap-y-4 gap-x-8"
              style={{ background: 'var(--color-surface-secondary)', padding: '24px' }}
            >
              <div>
                <p className="text-xs font-medium mb-1" style={{ color: 'var(--color-text-muted)' }}>
                  ID Compra
                </p>
                <p className="text-sm font-bold text-gray-900">#{selectedCompra.id}</p>
              </div>
              <div>
                <p className="text-xs font-medium mb-1" style={{ color: 'var(--color-text-muted)' }}>
                  Fecha
                </p>
                <p className="text-sm font-medium text-gray-800">{formatDate(selectedCompra.fecha)}</p>
              </div>
              <div>
                <p className="text-xs font-medium mb-1" style={{ color: 'var(--color-text-muted)' }}>
                  Proveedor
                </p>
                <p className="text-sm font-bold text-gray-900">
                  {(selectedCompra as any)?.proveedor?.razon_social ?? '—'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium mb-1" style={{ color: 'var(--color-text-muted)' }}>
                  CUIT
                </p>
                <p className="text-sm font-bold text-gray-900">
                  {(selectedCompra as any)?.proveedor?.cuit ?? '—'}
                </p>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-bold mb-3 text-gray-900">Productos Comprados</h4>
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

            <div
              className="flex items-center justify-between rounded-lg"
              style={{ background: 'var(--color-surface-secondary)', padding: '20px 24px' }}
            >
              <span className="text-sm font-bold text-gray-900">Total de la Compra:</span>
              <span
                className="text-2xl font-bold"
                style={{ color: 'var(--color-warning-600)' }}
              >
                {formatCurrency(selectedCompra.total)}
              </span>
            </div>
          </div>
        )}
      </CrudModal>

      {/* ============================================
          SUCCESS MODAL
          ============================================ */}
      <ConfirmDialog
        open={successCompra !== null}
        title="Compra Exitosa"
        message="¿Deseas descargar el remito de la compra?"
        icon={<CheckCircle size={24} />}
        confirmLabel={
          <>
            <Download size={18} />
            Descargar Remito
          </>
        }
        cancelLabel="Cerrar"
        variant="primary"
        onConfirm={() => {
          if (successCompra) {
            downloadRemito(successCompra.compra, successCompra.items)
            setSuccessCompra(null)
          }
        }}
        onCancel={() => setSuccessCompra(null)}
      />
    </div>
  )
}
