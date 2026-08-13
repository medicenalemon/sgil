import { useState, useEffect, useCallback } from 'react'
import { Plus, Eye, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import DataTable from '@/components/shared/DataTable'
import CrudModal from '@/components/shared/CrudModal'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { useAuditoria } from '@/hooks/useAuditoria'
import { supabase } from '@/lib/supabase'
import type { Proveedor } from '@/lib/types'
import type { Column } from '@/lib/types'

export default function ProveedoresPage() {
  const { logAuditoria } = useAuditoria()

  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [viewModalOpen, setViewModalOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedProveedor, setSelectedProveedor] = useState<Proveedor | null>(null)
  const [isEditing, setIsEditing] = useState(false)

  const [form, setForm] = useState({
    razon_social: '',
    cuit: '',
    telefono: '',
    email: '',
    contacto: '',
    direccion: '',
  })

  const loadProveedores = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('proveedores')
        .select('*')
        .eq('activo', true)
        .order('id', { ascending: false })
      
      if (error) throw error
      setProveedores(data || [])
    } catch (error) {
      console.error('Error fetching proveedores:', error)
      toast.error('Error al cargar los proveedores')
    }
  }, [])

  useEffect(() => {
    loadProveedores()
  }, [loadProveedores])

  const resetForm = () => {
    setForm({ razon_social: '', cuit: '', telefono: '', email: '', contacto: '', direccion: '' })
    setSelectedProveedor(null)
    setIsEditing(false)
  }

  const openCreate = () => {
    resetForm()
    setModalOpen(true)
  }

  const openEdit = (prov: Proveedor) => {
    setForm({
      razon_social: prov.razon_social,
      cuit: prov.cuit ?? '',
      telefono: prov.telefono ?? '',
      email: prov.email ?? '',
      contacto: prov.contacto ?? '',
      direccion: prov.direccion ?? '',
    })
    setSelectedProveedor(prov)
    setIsEditing(true)
    setModalOpen(true)
  }

  const openView = (prov: Proveedor) => {
    setSelectedProveedor(prov)
    setViewModalOpen(true)
  }

  const openDelete = (prov: Proveedor) => {
    setSelectedProveedor(prov)
    setDeleteDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.razon_social.trim()) {
      toast.error('La razón social es obligatoria')
      return
    }

    try {
      const provData = {
        razon_social: form.razon_social.trim(),
        cuit: form.cuit.trim() || null,
        telefono: form.telefono.trim() || null,
        email: form.email.trim() || null,
        contacto: form.contacto.trim() || null,
        direccion: form.direccion.trim() || null,
      }

      if (isEditing && selectedProveedor) {
        const { error } = await supabase
          .from('proveedores')
          .update(provData)
          .eq('id', selectedProveedor.id)

        if (error) throw error

        logAuditoria('proveedores', 'Actualización de proveedor', {
          proveedorId: selectedProveedor.id,
          razonSocial: form.razon_social,
        })
        toast.success('Proveedor actualizado exitosamente')
      } else {
        const { data, error } = await supabase
          .from('proveedores')
          .insert([provData])
          .select()
          .single()

        if (error) throw error

        logAuditoria('proveedores', 'Creación de proveedor', {
          proveedorId: data.id,
          razonSocial: data.razon_social,
        })
        toast.success('Proveedor creado exitosamente')
      }

      setModalOpen(false)
      resetForm()
      loadProveedores()
    } catch (error: any) {
      console.error('Error saving proveedor:', error)
      toast.error(error.message || 'Error al guardar el proveedor')
    }
  }

  const handleDelete = async () => {
    if (!selectedProveedor) return
    
    try {
      const { error } = await supabase
        .from('proveedores')
        .update({ activo: false })
        .eq('id', selectedProveedor.id)

      if (error) throw error

      logAuditoria('proveedores', 'Eliminación de proveedor', {
        proveedorId: selectedProveedor.id,
        razonSocial: selectedProveedor.razon_social,
      })
      toast.success('Proveedor eliminado exitosamente')
      setDeleteDialogOpen(false)
      setSelectedProveedor(null)
      loadProveedores()
    } catch (error: any) {
      console.error('Error deleting proveedor:', error)
      toast.error(error.message || 'Error al eliminar el proveedor')
    }
  }
  // Stats computed from data (used by template above)

  const columns: Column<Proveedor>[] = [
    { 
      key: 'id', 
      header: 'ID', 
      sortable: true,
      render: (p) => <span className="font-semibold" style={{ color: 'var(--color-primary-600)' }}>{p.id}</span>
    },
    { key: 'razon_social', header: 'Razón Social', sortable: true },
    { key: 'contacto', header: 'Contacto', render: (p) => p.contacto ?? '—' },
    { key: 'email', header: 'Email', render: (p) => p.email ?? '—' },
    { key: 'cuit', header: 'CUIT', render: (p) => p.cuit ?? '—' },
  ]

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between" style={{ marginBottom: '40px' }}>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
            Gestión de Proveedores
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
            {proveedores.length} proveedores registrados
          </p>
        </div>
        <button className="btn btn-primary" onClick={openCreate} style={{ padding: '0.6rem 1.2rem', borderRadius: '8px' }}>
          <Plus size={18} />
          Nuevo Proveedor
        </button>
      </div>

      {/* Table */}
      <DataTable
        data={proveedores}
        columns={columns}
        searchPlaceholder="Buscar proveedores..."
        searchKeys={['razon_social', 'cuit', 'contacto']}
        emptyMessage="No se encontraron proveedores"
        actions={(prov) => (
          <>
            <button
              className="btn btn-icon btn-ghost btn-sm"
              onClick={(e) => { e.stopPropagation(); openView(prov) }}
              title="Ver detalle"
            >
              <Eye size={18} style={{ color: 'var(--color-text-secondary)' }} />
            </button>
            <button
              className="btn btn-icon btn-ghost btn-sm"
              onClick={(e) => { e.stopPropagation(); openEdit(prov) }}
              title="Editar"
            >
              <Pencil size={18} style={{ color: 'var(--color-text-secondary)' }} />
            </button>
            <button
              className="btn btn-icon btn-ghost btn-sm"
              onClick={(e) => { e.stopPropagation(); openDelete(prov) }}
              title="Eliminar"
            >
              <Trash2 size={18} style={{ color: 'var(--color-danger-500)' }} />
            </button>
          </>
        )}
      />

      {/* Create/Edit Modal */}
      <CrudModal
        open={modalOpen}
        title={isEditing ? 'Editar Proveedor' : 'Nuevo Proveedor'}
        subtitle={isEditing ? 'Modifique los datos del proveedor' : 'Complete los datos del nuevo proveedor'}
        onClose={() => { setModalOpen(false); resetForm() }}
        footer={
          <>
            <button className="btn btn-outline" onClick={() => { setModalOpen(false); resetForm() }}>
              Cancelar
            </button>
            <button className="btn btn-primary" onClick={handleSave}>
              {isEditing ? 'Guardar Cambios' : 'Crear Proveedor'}
            </button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="form-group">
            <label className="form-label">Razón Social *</label>
            <input
              className="input"
              placeholder="Nombre o razón social del proveedor"
              value={form.razon_social}
              onChange={(e) => setForm({ ...form, razon_social: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="form-group">
              <label className="form-label">CUIT</label>
              <input
                className="input"
                placeholder="30-12345678-9"
                value={form.cuit}
                onChange={(e) => setForm({ ...form, cuit: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Teléfono</label>
              <input
                className="input"
                placeholder="0381-4567890"
                value={form.telefono}
                onChange={(e) => setForm({ ...form, telefono: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                className="input"
                type="email"
                placeholder="email@proveedor.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Contacto</label>
              <input
                className="input"
                placeholder="Nombre de la persona de contacto"
                value={form.contacto}
                onChange={(e) => setForm({ ...form, contacto: e.target.value })}
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Dirección</label>
            <input
              className="input"
              placeholder="Dirección completa"
              value={form.direccion}
              onChange={(e) => setForm({ ...form, direccion: e.target.value })}
            />
          </div>
        </div>
      </CrudModal>

      {/* View Detail Modal */}
      <CrudModal
        open={viewModalOpen}
        title={`Detalle de Proveedor #${selectedProveedor?.id}`}
        subtitle="Información completa del proveedor"
        onClose={() => { setViewModalOpen(false); setSelectedProveedor(null) }}
        footer={
          <button className="btn btn-primary" onClick={() => { setViewModalOpen(false); setSelectedProveedor(null) }}>
            Cerrar
          </button>
        }
      >
        {selectedProveedor && (
          <div
            className="rounded-lg p-4 grid grid-cols-2 gap-4"
            style={{ background: 'var(--color-surface-secondary)' }}
          >
            <div>
              <p className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Razón Social</p>
              <p className="text-sm font-semibold">{selectedProveedor.razon_social}</p>
            </div>
            <div>
              <p className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>CUIT</p>
              <p className="text-sm">{selectedProveedor.cuit ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Teléfono</p>
              <p className="text-sm">{selectedProveedor.telefono ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Email</p>
              <p className="text-sm">{selectedProveedor.email ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Contacto</p>
              <p className="text-sm">{selectedProveedor.contacto ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Estado</p>
              <span className={`badge ${selectedProveedor.activo ? 'badge-primary' : 'badge-danger'}`}>
                {selectedProveedor.activo ? 'Activo' : 'Inactivo'}
              </span>
            </div>
            <div className="col-span-2">
              <p className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Dirección</p>
              <p className="text-sm">{selectedProveedor.direccion ?? '—'}</p>
            </div>
          </div>
        )}
      </CrudModal>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={deleteDialogOpen}
        title="Eliminar Proveedor"
        message={`¿Estás seguro de que deseas eliminar a "${selectedProveedor?.razon_social}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        onConfirm={handleDelete}
        onCancel={() => { setDeleteDialogOpen(false); setSelectedProveedor(null) }}
      />
    </div>
  )
}
