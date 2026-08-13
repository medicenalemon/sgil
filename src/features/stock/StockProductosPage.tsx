import { useState, useEffect, useCallback } from 'react'
import { Plus, Info, Pencil, Trash2, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import DataTable from '@/components/shared/DataTable'
import CrudModal from '@/components/shared/CrudModal'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { useAuth } from '@/hooks/useAuth'
import { useAuditoria } from '@/hooks/useAuditoria'
import { canPerform } from '@/lib/permissions'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/pdf/pdfGenerator'
import type { Producto } from '@/lib/types'
import type { Column } from '@/lib/types'

export default function StockProductosPage() {
  const { user } = useAuth()
  const { logAuditoria } = useAuditoria()
  const role = user?.role ?? 'vendedor'
  const canCreate = canPerform(role, 'stock', 'create')
  const canEdit = canPerform(role, 'stock', 'update')
  const canDelete = canPerform(role, 'stock', 'delete')
  const showPrecioCompra = role !== 'vendedor'

  const [productos, setProductos] = useState<Producto[]>([])
  const [categorias, setCategorias] = useState<any[]>([])
  const [proveedores, setProveedores] = useState<any[]>([])
  const [ubicaciones, setUbicaciones] = useState<any[]>([])
  
  const [modalOpen, setModalOpen] = useState(false)
  const [viewModalOpen, setViewModalOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedProducto, setSelectedProducto] = useState<Producto | null>(null)
  const [isEditing, setIsEditing] = useState(false)

  const [form, setForm] = useState({
    codigo: '',
    nombre: '',
    descripcion: '',
    precio_compra: '',
    precio_venta: '',
    stock: '',
    stock_minimo: '',
    categoria_id: '',
    proveedor_id: '',
    ubicacion_id: '',
  })

  const loadData = useCallback(async () => {
    try {
      const [
        { data: prodData, error: prodErr },
        { data: catData, error: catErr },
        { data: provData, error: provErr },
        { data: ubiData, error: ubiErr },
      ] = await Promise.all([
        supabase
          .from('productos')
          .select('*, categoria:categorias(nombre), proveedor:proveedores(razon_social), ubicacion:ubicaciones(nombre)')
          .eq('activo', true)
          .order('id', { ascending: false }),
        supabase.from('categorias').select('*'),
        supabase.from('proveedores').select('*').eq('activo', true),
        supabase.from('ubicaciones').select('*'),
      ])

      if (prodErr) throw prodErr
      if (catErr) throw catErr
      if (provErr) throw provErr
      if (ubiErr) throw ubiErr

      setProductos(prodData || [])
      setCategorias(catData || [])
      setProveedores(provData || [])
      setUbicaciones(ubiData || [])
    } catch (error: any) {
      console.error('Error fetching data:', error)
      toast.error(error.message || 'Error al cargar los datos')
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const resetForm = () => {
    setForm({
      codigo: '', nombre: '', descripcion: '',
      precio_compra: '', precio_venta: '', stock: '', stock_minimo: '',
      categoria_id: '', proveedor_id: '', ubicacion_id: '',
    })
    setSelectedProducto(null)
    setIsEditing(false)
  }

  const openCreate = () => { resetForm(); setModalOpen(true) }

  const openEdit = (p: Producto) => {
    setForm({
      codigo: p.codigo,
      nombre: p.nombre,
      descripcion: p.descripcion ?? '',
      precio_compra: String(p.precio_compra),
      precio_venta: String(p.precio_venta),
      stock: String(p.stock),
      stock_minimo: String(p.stock_minimo),
      categoria_id: p.categoria_id ? String(p.categoria_id) : '',
      proveedor_id: p.proveedor_id ? String(p.proveedor_id) : '',
      ubicacion_id: p.ubicacion_id ? String(p.ubicacion_id) : '',
    })
    setSelectedProducto(p)
    setIsEditing(true)
    setModalOpen(true)
  }

  const openView = (p: Producto) => {
    setSelectedProducto(p)
    setViewModalOpen(true)
  }

  const openDelete = (p: Producto) => {
    setSelectedProducto(p)
    setDeleteDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.codigo.trim() || !form.nombre.trim()) {
      toast.error('Código y nombre son obligatorios')
      return
    }

    try {
      const prodData = {
        codigo: form.codigo.trim(),
        nombre: form.nombre.trim(),
        descripcion: form.descripcion.trim() || null,
        precio_compra: Number(form.precio_compra) || 0,
        precio_venta: Number(form.precio_venta) || 0,
        stock: Number(form.stock) || 0,
        stock_minimo: Number(form.stock_minimo) || 0,
        categoria_id: form.categoria_id ? Number(form.categoria_id) : null,
        proveedor_id: form.proveedor_id ? Number(form.proveedor_id) : null,
        ubicacion_id: form.ubicacion_id ? Number(form.ubicacion_id) : null,
      }

      if (isEditing && selectedProducto) {
        // Check if code exists for another product
        if (form.codigo.trim() !== selectedProducto.codigo) {
          const { data: exist } = await supabase.from('productos').select('id').eq('codigo', form.codigo.trim()).single()
          if (exist) {
            toast.error('Ya existe otro producto con ese código')
            return
          }
        }

        const { error } = await supabase
          .from('productos')
          .update(prodData)
          .eq('id', selectedProducto.id)

        if (error) throw error

        logAuditoria('stock', 'Actualización de producto', {
          productoId: selectedProducto.id,
          codigo: form.codigo,
          nombre: form.nombre,
        })
        toast.success('Producto actualizado exitosamente')
      } else {
        const { data: exist } = await supabase.from('productos').select('id').eq('codigo', form.codigo.trim()).maybeSingle()
        if (exist) {
          toast.error('Ya existe un producto con ese código')
          return
        }

        const { data, error } = await supabase
          .from('productos')
          .insert([prodData])
          .select()
          .single()

        if (error) throw error

        if (data.stock > 0) {
          // Log the initial stock as an 'entrada' movement
          await supabase.from('movimientos_stock').insert({
            fecha: new Date().toISOString(),
            producto_id: data.id,
            tipo: 'entrada',
            cantidad: data.stock,
            motivo: 'Stock Inicial',
            referencia_tipo: null,
            referencia_id: null,
            usuario_id: user?.id
          })
        }

        logAuditoria('stock', 'Creación de producto', {
          productoId: data.id,
          codigo: data.codigo,
          nombre: data.nombre,
        })
        toast.success('Producto creado exitosamente')
      }

      setModalOpen(false)
      resetForm()
      loadData()
    } catch (error: any) {
      console.error('Error saving producto:', error)
      toast.error(error.message || 'Error al guardar el producto')
    }
  }

  const handleDelete = async () => {
    if (!selectedProducto) return
    
    try {
      const { error } = await supabase
        .from('productos')
        .update({ activo: false })
        .eq('id', selectedProducto.id)

      if (error) throw error

      logAuditoria('stock', 'Eliminación de producto', {
        productoId: selectedProducto.id,
        nombre: selectedProducto.nombre,
      })
      toast.success('Producto eliminado exitosamente')
      setDeleteDialogOpen(false)
      setSelectedProducto(null)
      loadData()
    } catch (error: any) {
      console.error('Error deleting producto:', error)
      toast.error(error.message || 'Error al eliminar el producto')
    }
  }

  const productColumns: Column<Producto>[] = [
    { key: 'codigo', header: 'Código', sortable: true },
    { key: 'nombre', header: 'Nombre', sortable: true },
    {
      key: 'categoria_id',
      header: 'Categoría',
      render: (p: Producto) => categorias.find((c) => c.id === p.categoria_id)?.nombre ?? '—',
    },
    ...(showPrecioCompra
      ? [{ key: 'precio_compra', header: 'P. Compra', render: (p: Producto) => formatCurrency(p.precio_compra), sortable: true } as Column<Producto>]
      : []),
    { key: 'precio_venta', header: 'P. Venta', render: (p: Producto) => formatCurrency(p.precio_venta), sortable: true },
    {
      key: 'stock',
      header: 'Stock',
      sortable: true,
      render: (p: Producto) => (
        <span
          className="font-semibold"
          style={{ color: p.stock <= p.stock_minimo ? 'var(--color-danger-600)' : 'var(--color-text-primary)' }}
        >
          {p.stock}
          {p.stock <= p.stock_minimo && (
            <AlertTriangle
              size={14}
              className="inline ml-1"
              style={{ color: 'var(--color-danger-500)' }}
            />
          )}
        </span>
      ),
    },
    {
      key: 'activo',
      header: 'Estado',
      render: (p: Producto) => (
        <span 
          className="px-3 py-1 rounded-full text-xs font-semibold inline-block text-center min-w-[70px]"
          style={{ 
            background: p.activo ? 'var(--color-primary-600)' : 'var(--color-danger-600)',
            color: 'white' 
          }}
        >
          {p.activo ? 'Activo' : 'Inactivo'}
        </span>
      ),
    },
  ]

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between" style={{ marginBottom: '40px' }}>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
            Productos
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
            Catálogo, stock y precios.
          </p>
        </div>
        {canCreate && (
          <button className="btn btn-primary" onClick={openCreate} style={{ padding: '0.6rem 1.2rem', borderRadius: '8px' }}>
            <Plus size={18} />
            Nuevo producto
          </button>
        )}
      </div>

      <DataTable
        data={productos}
        columns={productColumns}
        searchPlaceholder="Buscar por código, nombre o categoría..."
        searchKeys={['codigo', 'nombre']}
        emptyMessage="No se encontraron productos"
        actions={(prod) => (
          <>
            <button className="btn btn-icon btn-outline btn-sm" onClick={(e) => { e.stopPropagation(); openView(prod) }} title="Ver detalle">
              <Info size={15} />
            </button>
            {canEdit && (
              <button className="btn btn-icon btn-outline btn-sm" onClick={(e) => { e.stopPropagation(); openEdit(prod) }} title="Editar">
                <Pencil size={15} />
              </button>
            )}
            {canDelete && (
              <button
                className="btn btn-icon btn-outline btn-sm"
                style={{ color: 'var(--color-danger-600)' }}
                onClick={(e) => { e.stopPropagation(); openDelete(prod) }}
                title="Eliminar"
              >
                <Trash2 size={15} />
              </button>
            )}
          </>
        )}
      />

      <CrudModal
        open={modalOpen}
        title={isEditing ? 'Editar Producto' : 'Nuevo Producto'}
        subtitle={isEditing ? 'Modifique los datos del producto' : 'Complete los datos del nuevo producto'}
        maxWidth={700}
        onClose={() => { setModalOpen(false); resetForm() }}
        footer={
          <>
            <button className="btn btn-outline" onClick={() => { setModalOpen(false); resetForm() }}>
              Cancelar
            </button>
            <button className="btn btn-primary" onClick={handleSave}>
              {isEditing ? 'Guardar Cambios' : 'Crear Producto'}
            </button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="form-group">
              <label className="form-label">Código *</label>
              <input className="input" placeholder="LIB-006" value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Nombre *</label>
              <input className="input" placeholder="Nombre del producto" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Descripción</label>
            <textarea className="textarea" placeholder="Descripción del producto" value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            {showPrecioCompra && (
              <div className="form-group">
                <label className="form-label">Precio de Compra</label>
                <input className="input" type="number" step="0.01" placeholder="0.00" value={form.precio_compra} onChange={(e) => setForm({ ...form, precio_compra: e.target.value })} />
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Precio de Venta</label>
              <input className="input" type="number" step="0.01" placeholder="0.00" value={form.precio_venta} onChange={(e) => setForm({ ...form, precio_venta: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="form-group">
              <label className="form-label">Stock</label>
              <input className="input" type="number" placeholder="0" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Stock Mínimo</label>
              <input className="input" type="number" placeholder="0" value={form.stock_minimo} onChange={(e) => setForm({ ...form, stock_minimo: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="form-group">
              <label className="form-label">Categoría</label>
              <select className="select" value={form.categoria_id} onChange={(e) => setForm({ ...form, categoria_id: e.target.value })}>
                <option value="">Sin categoría</option>
                {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Proveedor</label>
              <select className="select" value={form.proveedor_id} onChange={(e) => setForm({ ...form, proveedor_id: e.target.value })}>
                <option value="">Sin proveedor</option>
                {proveedores.map((p) => <option key={p.id} value={p.id}>{p.razon_social}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Ubicación</label>
              <select className="select" value={form.ubicacion_id} onChange={(e) => setForm({ ...form, ubicacion_id: e.target.value })}>
                <option value="">Sin ubicación</option>
                {ubicaciones.map((u) => <option key={u.id} value={u.id}>{u.nombre}</option>)}
              </select>
            </div>
          </div>
        </div>
      </CrudModal>

      <CrudModal
        open={viewModalOpen}
        title={`Detalle de Producto — ${selectedProducto?.codigo}`}
        subtitle="Información completa del producto"
        onClose={() => { setViewModalOpen(false); setSelectedProducto(null) }}
        footer={
          <button className="btn btn-primary" onClick={() => { setViewModalOpen(false); setSelectedProducto(null) }}>
            Cerrar
          </button>
        }
      >
        {selectedProducto && (
          <div className="flex flex-col gap-4">
            <div className="rounded-lg p-4 grid grid-cols-2 gap-4" style={{ background: 'var(--color-surface-secondary)' }}>
              <div>
                <p className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Código</p>
                <p className="text-sm font-semibold">{selectedProducto.codigo}</p>
              </div>
              <div>
                <p className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Nombre</p>
                <p className="text-sm font-semibold">{selectedProducto.nombre}</p>
              </div>
              {showPrecioCompra && (
                <div>
                  <p className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Precio de Compra</p>
                  <p className="text-sm">{formatCurrency(selectedProducto.precio_compra)}</p>
                </div>
              )}
              <div>
                <p className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Precio de Venta</p>
                <p className="text-sm">{formatCurrency(selectedProducto.precio_venta)}</p>
              </div>
              <div>
                <p className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Stock</p>
                <p className="text-sm font-semibold" style={{ color: selectedProducto.stock <= selectedProducto.stock_minimo ? 'var(--color-danger-600)' : 'var(--color-success-600)' }}>
                  {selectedProducto.stock} unidades
                </p>
              </div>
              <div>
                <p className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Stock Mínimo</p>
                <p className="text-sm">{selectedProducto.stock_minimo} unidades</p>
              </div>
              <div>
                <p className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Categoría</p>
                <p className="text-sm">{selectedProducto.categoria?.nombre ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Proveedor</p>
                <p className="text-sm">{selectedProducto.proveedor?.razon_social ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Ubicación</p>
                <p className="text-sm">{selectedProducto.ubicacion?.nombre ?? '—'}</p>
              </div>
              {selectedProducto.descripcion && (
                <div className="col-span-2">
                  <p className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Descripción</p>
                  <p className="text-sm">{selectedProducto.descripcion}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </CrudModal>

      <ConfirmDialog
        open={deleteDialogOpen}
        title="Eliminar Producto"
        message={`¿Estás seguro de que deseas eliminar "${selectedProducto?.nombre}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        onConfirm={handleDelete}
        onCancel={() => { setDeleteDialogOpen(false); setSelectedProducto(null) }}
      />
    </div>
  )
}
