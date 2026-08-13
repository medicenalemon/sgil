import { useState, useEffect, useCallback } from 'react'
import {
  UserPlus,
  Shield,
  Users,
  UserCheck,
  Info,
  Trash2
} from 'lucide-react'
import { toast } from 'sonner'
import DataTable from '@/components/shared/DataTable'
import CrudModal from '@/components/shared/CrudModal'
import { useAuth } from '@/hooks/useAuth'
import { useAuditoria } from '@/hooks/useAuditoria'
import { supabase } from '@/lib/supabase'
import { adminAuthApi } from '@/lib/supabase'
import type { Profile } from '@/lib/types'
import type { Column } from '@/lib/types'

type UserRow = Profile & { displayId: number }

const RoleCard = ({ title, description, icon, color, bg }: { title: string, description: string, icon: React.ReactNode, color: string, bg: string }) => (
  <div className="card border shadow-sm rounded-xl bg-white flex items-center h-[100px]" style={{ padding: '24px', gap: '20px' }}>
    <div className="flex items-center justify-center rounded-full shrink-0" style={{ backgroundColor: bg, color: color, width: '48px', height: '48px' }}>
      {icon}
    </div>
    <div className="flex flex-col gap-1">
      <p className="text-[17px] font-bold" style={{ color: 'var(--color-text-primary)' }}>{title}</p>
      <p className="text-[14px] font-medium" style={{ color: 'var(--color-text-secondary)' }}>{description}</p>
    </div>
  </div>
)

export default function UsuariosPage() {
  const { user } = useAuth()
  const { logAuditoria } = useAuditoria()
  
  const [usersList, setUsersList] = useState<UserRow[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [viewModalOpen, setViewModalOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null)
  
  // For changing roles
  const [selectedRole, setSelectedRole] = useState<number>(3)

  // For changing password
  const [newPassword, setNewPassword] = useState('')

  // For creating users
  const [createEmail, setCreateEmail] = useState('')
  const [createPassword, setCreatePassword] = useState('')
  const [createUsername, setCreateUsername] = useState('')
  const [createRole, setCreateRole] = useState<number>(3)

  const loadData = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*, roles(nombre)')
        .order('created_at', { ascending: true })

      if (error) throw error
      
      const mapped = (data || []).map((p: any, i: number) => ({
        ...p,
        role: p.roles?.nombre || 'vendedor',
        displayId: i + 1
      }))
      
      setUsersList(mapped)
    } catch (error) {
      console.error('Error fetching users:', error)
      toast.error('Error al cargar los usuarios')
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleOpenView = (u: UserRow) => {
    setSelectedUser(u)
    setSelectedRole(u.role_id || 3)
    setViewModalOpen(true)
  }

  const handleRoleChange = async () => {
    if (!selectedUser || selectedUser.role_id === selectedRole) return
    
    // Prevent changing own role
    if (selectedUser.id === user?.id) {
      toast.error('No podés cambiar tu propio rol.')
      return
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role_id: selectedRole })
        .eq('id', selectedUser.id)

      if (error) throw error
      
      logAuditoria('usuarios', 'Cambio de rol', { userId: selectedUser.id, newRole: selectedRole })
      toast.success('Rol actualizado correctamente')
      loadData()
      setViewModalOpen(false)
    } catch (err: any) {
      toast.error(err.message || 'Error al actualizar el rol')
    }
  }

  const handleChangePassword = async () => {
    if (!selectedUser || !newPassword) return
    if (newPassword.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres')
      return
    }

    try {
      await adminAuthApi.updateUserById(selectedUser.id, {
        password: newPassword
      })

      logAuditoria('usuarios', 'Cambio de contraseña', { userId: selectedUser.id })
      toast.success('Contraseña actualizada correctamente')
      setNewPassword('')
    } catch (err: any) {
      toast.error(err.message || 'Error al cambiar la contraseña')
    }
  }

  const handleOpenCreate = () => {
    setCreateEmail('')
    setCreatePassword('')
    setCreateUsername('')
    setCreateRole(3)
    setModalOpen(true)
  }

  const handleCreateUser = async () => {
    if (!createEmail || !createPassword || !createUsername) {
      toast.error('Completá todos los campos')
      return
    }
    if (createPassword.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres')
      return
    }

    try {
      await adminAuthApi.createUser({
        email: createEmail,
        password: createPassword,
        email_confirm: true,
        user_metadata: {
          username: createUsername,
          role_id: createRole
        }
      })

      logAuditoria('usuarios', 'Usuario creado', { email: createEmail, username: createUsername, role: createRole })
      toast.success('Usuario creado correctamente')
      setModalOpen(false)
      loadData()
    } catch (err: any) {
      toast.error(err.message || 'Error al crear el usuario')
    }
  }

  const handleDelete = async (u: UserRow) => {
    if (u.protected) {
      toast.error('No podés eliminar un usuario protegido.')
      return
    }
    
    if (u.id === user?.id) {
      toast.error('No podés eliminar tu propio usuario.')
      return
    }

    if (!confirm(`¿Estás seguro que deseas eliminar permanentemente el usuario ${u.username}? Esta acción no se puede deshacer.`)) return;

    try {
      // First try to delete the auth user via Admin API
      // If the user has foreign keys (ventas, compras, etc.), it will throw an error
      await adminAuthApi.deleteUserById(u.id)

      logAuditoria('usuarios', 'Usuario eliminado', { id: u.id, username: u.username })
      toast.success('Usuario eliminado correctamente')
      loadData()
    } catch (err: any) {
      toast.error(err.message || 'Error al eliminar el usuario. Es posible que tenga registros asociados.')
    }
  }

  // ---- Table Columns ----
  const columns: Column<UserRow>[] = [
    { 
      key: 'displayId', 
      header: 'ID',
      render: (u) => <span className="font-semibold text-primary-600">{u.displayId}</span>,
      sortable: true
    },
    { 
      key: 'username', 
      header: 'Nombre de Usuario',
      render: (u) => <span className="font-medium text-gray-700">{u.username}</span>,
      sortable: true
    },
    { 
      key: 'role', 
      header: 'Rol',
      render: (u) => {
        if (u.role === 'administrador') return <span className="bg-red-50 text-red-600 px-3 py-1 rounded-full text-xs font-bold capitalize">Administrador</span>
        if (u.role === 'encargado') return <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-xs font-bold capitalize">Encargado</span>
        return <span className="bg-green-50 text-green-600 px-3 py-1 rounded-full text-xs font-bold capitalize">Vendedor</span>
      },
      sortable: true
    },
    { 
      key: 'password', 
      header: 'Contraseña',
      render: () => <span className="text-gray-400 font-bold tracking-widest text-lg leading-none">........</span>
    }
  ]

  return (
    <div className="animate-fade-in pb-10">
      <div style={{ marginBottom: '40px' }}>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
          Gestión de Usuarios y Roles
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
          {usersList.length} usuarios registrados
        </p>
      </div>

      {/* Role Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3" style={{ gap: '24px', marginBottom: '24px' }}>
        <RoleCard 
          title="Administrador"
          description="Acceso completo al sistema"
          icon={<Shield size={20} />}
          bg="#fef2f2"
          color="#ef4444"
        />
        <RoleCard 
          title="Encargado"
          description="Gestión operativa"
          icon={<Users size={20} />}
          bg="#eff6ff"
          color="#3b82f6"
        />
        <RoleCard 
          title="Vendedor"
          description="Ventas y consulta clientes"
          icon={<UserCheck size={20} />}
          bg="#f0fdf4"
          color="#10b981"
        />
      </div>

      <div className="flex justify-end" style={{ marginBottom: '32px' }}>
        <button className="btn btn-primary" onClick={handleOpenCreate}>
          <UserPlus size={18} />
          Nuevo Usuario
        </button>
      </div>

      <DataTable
        data={usersList}
        columns={columns}
        searchPlaceholder="Buscar por nombre de usuario..."
        searchKeys={['username']}
        emptyMessage="No se encontraron usuarios"
        actionsHeader="Acciones"
        actions={(u) => (
          <div className="flex items-center gap-4 justify-end pr-4">
            <button 
              className="btn btn-icon btn-ghost btn-sm p-0 h-auto w-auto" 
              onClick={(e) => { e.stopPropagation(); handleOpenView(u); }}
              title="Información"
            >
              <Info size={18} className="text-gray-700" />
            </button>
            
            {u.protected ? (
              <span className="px-3 py-1 rounded-full border text-xs font-semibold" style={{ color: 'var(--color-text-secondary)', borderColor: 'var(--color-border)' }}>
                Protegido
              </span>
            ) : (
              <button 
                className="btn btn-icon btn-ghost btn-sm p-0 h-auto w-auto" 
                onClick={(e) => { e.stopPropagation(); handleDelete(u); }} 
                title="Eliminar usuario"
              >
                <Trash2 size={18} className="text-red-500" />
              </button>
            )}
          </div>
        )}
      />

      {/* Permisos por Rol */}
      <div className="card border shadow-sm rounded-xl bg-white" style={{ padding: '32px', marginTop: '40px' }}>
        <h2 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)', marginBottom: '24px' }}>Permisos por Rol</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3" style={{ gap: '24px' }}>
          {/* Admin */}
          <div className="border rounded-xl bg-[#f8f9fc]" style={{ padding: '24px' }}>
            <div className="flex items-center" style={{ gap: '12px', marginBottom: '16px' }}>
               <div className="rounded-md bg-red-50 text-red-500" style={{ padding: '6px' }}><Shield size={20} /></div>
               <h3 className="font-bold text-lg">Administrador</h3>
            </div>
            <ul className="text-[14px] font-medium text-gray-500 list-disc marker:text-gray-400" style={{ paddingLeft: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <li>Acceso completo a todos los módulos</li>
              <li>Gestión de Usuarios y Roles</li>
              <li>Compras, Ventas y Devoluciones</li>
              <li>Stock, Productos y Movimientos</li>
              <li>Caja, Reportes y Auditorías</li>
            </ul>
          </div>
          {/* Encargado */}
          <div className="border rounded-xl bg-[#f8f9fc]" style={{ padding: '24px' }}>
            <div className="flex items-center" style={{ gap: '12px', marginBottom: '16px' }}>
               <div className="rounded-md bg-blue-50 text-blue-500" style={{ padding: '6px' }}><Users size={20} /></div>
               <h3 className="font-bold text-lg">Encargado</h3>
            </div>
            <ul className="text-[14px] font-medium text-gray-500 list-disc marker:text-gray-400" style={{ paddingLeft: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <li>Compras, Ventas y Devoluciones</li>
              <li>Stock, Productos y Movimientos</li>
              <li>Caja, Proveedores, Clientes</li>
              <li>Reportes y Auditorías</li>
              <li>Sin acceso a Usuarios y Roles</li>
            </ul>
          </div>
          {/* Vendedor */}
          <div className="border rounded-xl bg-[#f8f9fc]" style={{ padding: '24px' }}>
            <div className="flex items-center" style={{ gap: '12px', marginBottom: '16px' }}>
               <div className="rounded-md bg-green-50 text-green-500" style={{ padding: '6px' }}><UserCheck size={20} /></div>
               <h3 className="font-bold text-lg">Vendedor</h3>
            </div>
            <ul className="text-[14px] font-medium text-gray-500 list-disc marker:text-gray-400" style={{ paddingLeft: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <li>Ventas y consulta de Clientes</li>
              <li>Sin acceso a precios de compra</li>
              <li>Sin acceso a Stock ni Compras</li>
              <li>Sin acceso a Caja ni Reportes</li>
              <li>Sin acceso a Usuarios y Roles</li>
            </ul>
          </div>
        </div>
      </div>

      {/* CREATE MODAL */}
      <CrudModal
        open={modalOpen}
        title="Nuevo Usuario"
        subtitle="Creación de nuevo usuario y asignación de rol."
        maxWidth={500}
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setModalOpen(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={handleCreateUser}>Crear Usuario</button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="form-group">
            <label className="form-label">Email *</label>
            <input 
              type="email" 
              className="input" 
              value={createEmail}
              onChange={e => setCreateEmail(e.target.value)}
              placeholder="ejemplo@email.com"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Nombre de Usuario *</label>
            <input 
              type="text" 
              className="input" 
              value={createUsername}
              onChange={e => setCreateUsername(e.target.value)}
              placeholder="Nombre visible en el sistema"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Contraseña *</label>
            <input 
              type="password" 
              className="input" 
              value={createPassword}
              onChange={e => setCreatePassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Rol del Usuario *</label>
            <select 
              className="select" 
              value={createRole}
              onChange={e => setCreateRole(Number(e.target.value))}
            >
              <option value={1}>Administrador</option>
              <option value={2}>Encargado</option>
              <option value={3}>Vendedor</option>
            </select>
          </div>
        </div>
      </CrudModal>

      {/* VIEW MODAL */}
      <CrudModal
        open={viewModalOpen}
        title="Detalle del Usuario"
        subtitle="Información completa del registro."
        maxWidth={550}
        onClose={() => setViewModalOpen(false)}
        footer={
          <div className="flex justify-end w-full">
            <button className="btn btn-outline" onClick={() => setViewModalOpen(false)}>Cerrar</button>
          </div>
        }
      >
        {selectedUser && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 rounded-xl border bg-white" style={{ gap: '24px', padding: '24px', borderColor: 'var(--color-border-light)' }}>
              <div>
                <p className="text-xs font-medium mb-1" style={{ color: 'var(--color-text-muted)' }}>ID</p>
                <p className="text-[15px] font-bold" style={{ color: 'var(--color-text-primary)' }}>{selectedUser.displayId}</p>
              </div>
              <div>
                <p className="text-xs font-medium mb-1" style={{ color: 'var(--color-text-muted)' }}>Nombre de Usuario</p>
                <p className="text-[15px] font-bold" style={{ color: 'var(--color-text-primary)' }}>{selectedUser.username}</p>
              </div>
              <div>
                <p className="text-xs font-medium mb-1" style={{ color: 'var(--color-text-muted)' }}>Email</p>
                <p className="text-[15px] font-bold" style={{ color: 'var(--color-text-primary)' }}>{selectedUser.email}</p>
              </div>
              <div>
                <p className="text-xs font-medium mb-1" style={{ color: 'var(--color-text-muted)' }}>Rol</p>
                <div>
                  {selectedUser.role === 'administrador' && <span className="bg-red-50 text-red-600 px-3 py-1 rounded-full text-xs font-bold capitalize">Administrador</span>}
                  {selectedUser.role === 'encargado' && <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-xs font-bold capitalize">Encargado</span>}
                  {selectedUser.role === 'vendedor' && <span className="bg-green-50 text-green-600 px-3 py-1 rounded-full text-xs font-bold capitalize">Vendedor</span>}
                </div>
              </div>
              <div>
                <p className="text-xs font-medium mb-1" style={{ color: 'var(--color-text-muted)' }}>Creado</p>
                <p className="text-[15px] font-bold" style={{ color: 'var(--color-text-primary)' }}>
                  {new Date(selectedUser.created_at || Date.now()).toLocaleString('es-AR')}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium mb-1" style={{ color: 'var(--color-text-muted)' }}>Estado</p>
                <p className="text-[15px] font-bold" style={{ color: 'var(--color-text-primary)' }}>
                  {selectedUser.protected ? 'Protegido' : (selectedUser.active ? 'Activo' : 'Inactivo')}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border rounded-xl" style={{ padding: '24px', backgroundColor: '#fafafa', borderColor: 'var(--color-border-light)' }}>
                <p className="text-[15px] font-medium" style={{ color: 'var(--color-text-secondary)' }}>Cambiar Rol</p>
                <p className="text-sm" style={{ color: 'var(--color-text-muted)', marginTop: '8px' }}>
                  Podés ascender o limitar el acceso de este usuario.
                </p>
                <div className="flex items-center gap-3" style={{ marginTop: '20px' }}>
                  <select 
                    className="select flex-1 bg-white" 
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(Number(e.target.value))}
                    disabled={selectedUser.username === 'admin' || selectedUser.protected}
                  >
                    <option value={1}>Administrador</option>
                    <option value={2}>Encargado</option>
                    <option value={3}>Vendedor</option>
                  </select>
                  <button 
                    className="btn btn-primary" 
                    onClick={handleRoleChange}
                    disabled={selectedUser.username === 'admin' || selectedUser.protected}
                  >
                    Guardar
                  </button>
                </div>
                {(selectedUser.username === 'admin' || selectedUser.protected) && (
                  <p className="text-xs text-red-500 mt-2 font-medium">Este usuario es administrador por defecto y no se puede modificar.</p>
                )}
              </div>

              <div className="border rounded-xl" style={{ padding: '24px', backgroundColor: '#fafafa', borderColor: 'var(--color-border-light)' }}>
                <p className="text-[15px] font-medium" style={{ color: 'var(--color-text-secondary)' }}>Cambiar Contraseña</p>
                <p className="text-sm" style={{ color: 'var(--color-text-muted)', marginTop: '8px' }}>
                  Establecer una nueva contraseña para este usuario.
                </p>
                <div className="flex items-center gap-3" style={{ marginTop: '20px' }}>
                  <input 
                    type="password" 
                    className="input flex-1 bg-white" 
                    placeholder="Nueva contraseña" 
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <button className="btn btn-primary bg-red-600 border-red-600" onClick={handleChangePassword}>Cambiar</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </CrudModal>
    </div>
  )
}
