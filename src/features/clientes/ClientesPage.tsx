import { useState, useEffect, useCallback } from 'react'
import { UserPlus, Eye, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import DataTable from '@/components/shared/DataTable'
import CrudModal from '@/components/shared/CrudModal'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { useAuth } from '@/hooks/useAuth'
import { useAuditoria } from '@/hooks/useAuditoria'
import { canPerform } from '@/lib/permissions'
import { supabase } from '@/lib/supabase'
import type { Cliente } from '@/lib/types'
import type { Column } from '@/lib/types'

export default function ClientesPage() {
  const { user } = useAuth()
  const { logAuditoria } = useAuditoria()
  const role = user?.role ?? 'vendedor'
  const canCreate = canPerform(role, 'clientes', 'create')
  const canEdit = canPerform(role, 'clientes', 'update')
  const canDelete = canPerform(role, 'clientes', 'delete')

  const [clientes, setClientes] = useState<Cliente[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [viewModalOpen, setViewModalOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null)
  const [isEditing, setIsEditing] = useState(false)

  // Form state
  const [form, setForm] = useState({
    nombre: '',
    telefono: '',
    email: '',
    direccion: '',
    observaciones: '',
  })

  const loadClientes = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .eq('activo', true)
        .order('id', { ascending: false })
      
      if (error) throw error
      setClientes(data || [])
    } catch (error) {
      console.error('Error fetching clientes:', error)
      toast.error('Error al cargar los clientes')
    }
  }, [])

  useEffect(() => {
    loadClientes()
  }, [loadClientes])

  const resetForm = () => {
    setForm({ nombre: '', telefono: '', email: '', direccion: '', observaciones: '' })
    setSelectedCliente(null)
    setIsEditing(false)
  }

  const openCreate = () => {
    resetForm()
    setModalOpen(true)
  }

  const openEdit = (cliente: Cliente) => {
    setForm({
      nombre: cliente.nombre,
      telefono: cliente.telefono ?? '',
      email: cliente.email ?? '',
      direccion: cliente.direccion ?? '',
      observaciones: cliente.observaciones ?? '',
    })
    setSelectedCliente(cliente)
    setIsEditing(true)
    setModalOpen(true)
  }

  const openView = (cliente: Cliente) => {
    setSelectedCliente(cliente)
    setViewModalOpen(true)
  }

  const openDelete = (cliente: Cliente) => {
    setSelectedCliente(cliente)
    setDeleteDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.nombre.trim()) {
      toast.error('El nombre es obligatorio')
      return
    }

    try {
      const clienteData = {
        nombre: form.nombre.trim(),
        telefono: form.telefono.trim() || null,
        email: form.email.trim() || null,
        direccion: form.direccion.trim() || null,
        observaciones: form.observaciones.trim() || null,
      }

      if (isEditing && selectedCliente) {
        // Update
        const { error } = await supabase
          .from('clientes')
          .update(clienteData)
          .eq('id', selectedCliente.id)

        if (error) throw error
        
        logAuditoria('clientes', 'Actualización de cliente', {
          clienteId: selectedCliente.id,
          nombre: form.nombre,
        })
        toast.success('Cliente actualizado exitosamente')
      } else {
        // Create
        const { data, error } = await supabase
          .from('clientes')
          .insert([clienteData])
          .select()
          .single()

        if (error) throw error

        logAuditoria('clientes', 'Creación de cliente', {
          clienteId: data.id,
          nombre: data.nombre,
        })
        toast.success('Cliente creado exitosamente')
      }

      setModalOpen(false)
      resetForm()
      loadClientes()
    } catch (error: any) {
      console.error('Error saving cliente:', error)
      toast.error(error.message || 'Error al guardar el cliente')
    }
  }

  const handleDelete = async () => {
    if (!selectedCliente) return
    
    try {
      const { error } = await supabase
        .from('clientes')
        .update({ activo: false })
        .eq('id', selectedCliente.id)

      if (error) throw error

      logAuditoria('clientes', 'Eliminación de cliente', {
        clienteId: selectedCliente.id,
        nombre: selectedCliente.nombre,
      })
      toast.success('Cliente eliminado exitosamente')
      setDeleteDialogOpen(false)
      setSelectedCliente(null)
      loadClientes()
    } catch (error: any) {
      console.error('Error deleting cliente:', error)
      toast.error(error.message || 'Error al eliminar el cliente')
    }
  }

  // Stats (computed for potential future use)

  const columns: Column<Cliente>[] = [
    { 
      key: 'id', 
      header: 'ID', 
      sortable: true,
      render: (c) => <span className="font-semibold" style={{ color: 'var(--color-primary-600)' }}>{c.id}</span>
    },
    { key: 'nombre', header: 'Nombre', sortable: true },
    { key: 'telefono', header: 'Teléfono', render: (c) => c.telefono ?? '—' },
    { key: 'email', header: 'Email', render: (c) => c.email ?? '—' },
  ]

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between" style={{ marginBottom: '40px' }}>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
            Gestión de Clientes
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
            {clientes.length} clientes registrados
          </p>
        </div>
        {canCreate && (
          <button className="btn btn-primary" onClick={openCreate} style={{ padding: '0.6rem 1.2rem', borderRadius: '8px' }}>
            <UserPlus size={18} />
            Nuevo Cliente
          </button>
        )}
      </div>

      {/* Table */}
      <DataTable
        data={clientes}
        columns={columns}
        searchPlaceholder="Buscar clientes..."
        searchKeys={['nombre', 'email', 'telefono']}
        emptyMessage="No se encontraron clientes"
        actions={(cliente) => (
          <>
            <button
              className="btn btn-icon btn-ghost btn-sm"
              onClick={(e) => { e.stopPropagation(); openView(cliente) }}
              title="Ver detalle"
            >
              <Eye size={18} style={{ color: 'var(--color-text-secondary)' }} />
            </button>
            {canEdit && (
              <button
                className="btn btn-icon btn-ghost btn-sm"
                onClick={(e) => { e.stopPropagation(); openEdit(cliente) }}
                title="Editar"
              >
                <Pencil size={18} style={{ color: 'var(--color-text-secondary)' }} />
              </button>
            )}
            {canDelete && (
              <button
                className="btn btn-icon btn-ghost btn-sm"
                onClick={(e) => { e.stopPropagation(); openDelete(cliente) }}
                title="Eliminar"
              >
                <Trash2 size={18} style={{ color: 'var(--color-danger-500)' }} />
              </button>
            )}
          </>
        )}
      />

      {/* Create/Edit Modal */}
      <CrudModal
        open={modalOpen}
        title={isEditing ? 'Editar Cliente' : 'Nuevo Cliente'}
        subtitle={isEditing ? 'Modifique los datos del cliente' : 'Complete los datos del nuevo cliente'}
        onClose={() => { setModalOpen(false); resetForm() }}
        footer={
          <>
            <button className="btn btn-outline" onClick={() => { setModalOpen(false); resetForm() }}>
              Cancelar
            </button>
            <button className="btn btn-primary" onClick={handleSave}>
              {isEditing ? 'Guardar Cambios' : 'Crear Cliente'}
            </button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="form-group">
            <label className="form-label">Nombre *</label>
            <input
              className="input"
              placeholder="Nombre completo o razón social"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="form-group">
              <label className="form-label">Teléfono</label>
              <input
                className="input"
                placeholder="Ej: 0381-155-1234"
                value={form.telefono}
                onChange={(e) => setForm({ ...form, telefono: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                className="input"
                type="email"
                placeholder="email@ejemplo.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
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
          <div className="form-group">
            <label className="form-label">Observaciones</label>
            <textarea
              className="textarea"
              placeholder="Notas adicionales sobre el cliente"
              value={form.observaciones}
              onChange={(e) => setForm({ ...form, observaciones: e.target.value })}
            />
          </div>
        </div>
      </CrudModal>

      {/* View Detail Modal */}
      <CrudModal
        open={viewModalOpen}
        title={`Detalle de Cliente #${selectedCliente?.id}`}
        subtitle="Información completa del cliente"
        onClose={() => { setViewModalOpen(false); setSelectedCliente(null) }}
        footer={
          <button className="btn btn-primary" onClick={() => { setViewModalOpen(false); setSelectedCliente(null) }}>
            Cerrar
          </button>
        }
      >
        {selectedCliente && (
          <div className="flex flex-col gap-4">
            <div
              className="rounded-lg p-4 grid grid-cols-2 gap-4"
              style={{ background: 'var(--color-surface-secondary)' }}
            >
              <div>
                <p className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Nombre</p>
                <p className="text-sm font-semibold">{selectedCliente.nombre}</p>
              </div>
              <div>
                <p className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Estado</p>
                <span className={`badge ${selectedCliente.activo ? 'badge-primary' : 'badge-danger'}`}>
                  {selectedCliente.activo ? 'Activo' : 'Inactivo'}
                </span>
              </div>
              <div>
                <p className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Teléfono</p>
                <p className="text-sm">{selectedCliente.telefono ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Email</p>
                <p className="text-sm">{selectedCliente.email ?? '—'}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Dirección</p>
                <p className="text-sm">{selectedCliente.direccion ?? '—'}</p>
              </div>
              {selectedCliente.observaciones && (
                <div className="col-span-2">
                  <p className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Observaciones</p>
                  <p className="text-sm">{selectedCliente.observaciones}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </CrudModal>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={deleteDialogOpen}
        title="Eliminar Cliente"
        message={`¿Estás seguro de que deseas eliminar a "${selectedCliente?.nombre}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        onConfirm={handleDelete}
        onCancel={() => { setDeleteDialogOpen(false); setSelectedCliente(null) }}
      />
    </div>
  )
}
