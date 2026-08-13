import { useState, useEffect, useCallback } from 'react'
import { Info, Search } from 'lucide-react'
import DataTable from '@/components/shared/DataTable'
import CrudModal from '@/components/shared/CrudModal'
import { supabase } from '@/lib/supabase'
import type { Auditoria, Column } from '@/lib/types'

export default function AuditoriasPage() {
  const [auditorias, setAuditorias] = useState<(Auditoria & { username?: string })[]>([])
  
  const [viewModalOpen, setViewModalOpen] = useState(false)
  const [selectedAuditoria, setSelectedAuditoria] = useState<Auditoria & { username?: string } | null>(null)

  // Filters
  const [dateFilter, setDateFilter] = useState('')
  const [searchFilter, setSearchFilter] = useState('')

  const loadData = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('auditorias')
        .select('*, profile:profiles(username)')
        .order('fecha', { ascending: false })
      
      if (error) throw error

      const enriched = (data || []).map((a: any) => ({
        ...a,
        username: a.profile?.username ?? 'Sistema / Desconocido'
      }))
      
      setAuditorias(enriched)
    } catch (err) {
      console.error('Error fetching auditorias:', err)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const openView = (a: Auditoria & { username?: string }) => {
    setSelectedAuditoria(a)
    setViewModalOpen(true)
  }

  const limpiarFiltros = () => {
    setDateFilter('')
    setSearchFilter('')
  }

  const filteredAuditorias = auditorias.filter((a) => {
    if (dateFilter) {
      const aDate = new Date(a.fecha).toISOString().split('T')[0]
      if (aDate !== dateFilter) return false
    }
    if (searchFilter) {
      if (!a.accion.toLowerCase().includes(searchFilter.toLowerCase())) return false
    }
    return true
  })

  // ---- Table Columns ----
  const columns: Column<Auditoria & { username?: string }>[] = [
    { key: 'username', header: 'Usuario' },
    { 
      key: 'fecha', 
      header: 'Fecha',
      render: (a) => new Date(a.fecha).toLocaleDateString('es-AR'),
      sortable: true
    },
    { key: 'accion', header: 'Acción' }
  ]

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between" style={{ marginBottom: '36px' }}>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
            Registro de Auditorías
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
            {filteredAuditorias.length} de {auditorias.length} registros de auditoría
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex justify-end gap-3 items-center" style={{ marginBottom: '32px' }}>
        <input 
          type="date" 
          className="input bg-white w-40" 
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
        />
        <div className="relative" style={{ width: '256px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
          <input 
            type="text" 
            className="input bg-white" 
            style={{ paddingLeft: '40px', width: '100%' }}
            placeholder="Buscar por acción..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
          />
        </div>
        <button className="btn btn-outline bg-white" onClick={limpiarFiltros}>
          Limpiar Filtros
        </button>
      </div>

      <DataTable
        data={filteredAuditorias}
        columns={columns}
        emptyMessage="No se encontraron registros de auditoría"
        actionsHeader="Detalle"
        actions={(a) => (
          <button 
            className="btn btn-icon btn-ghost btn-sm" 
            onClick={(e) => { e.stopPropagation(); openView(a) }} 
            title="Ver detalles"
          >
            <Info size={18} style={{ color: 'var(--color-text-secondary)' }} />
          </button>
        )}
      />

      {/* VIEW MODAL */}
      <CrudModal
        open={viewModalOpen}
        title="Detalle de Auditoría"
        maxWidth={600}
        onClose={() => setViewModalOpen(false)}
      >
        {selectedAuditoria && (
          <div className="flex flex-col gap-3">
            <p className="text-[15px]"><span className="text-gray-500">Usuario:</span> <span className="font-medium text-gray-900">{selectedAuditoria.username}</span></p>
            <p className="text-[15px]"><span className="text-gray-500">Fecha:</span> <span className="font-medium text-gray-900">{new Date(selectedAuditoria.fecha).toLocaleString('es-AR')}</span></p>
            <p className="text-[15px]"><span className="text-gray-500">Módulo:</span> <span className="font-medium text-gray-900 capitalize">{selectedAuditoria.modulo}</span></p>
            <p className="text-[15px]"><span className="text-gray-500">Acción:</span> <span className="font-medium text-gray-900">{selectedAuditoria.accion}</span></p>
            
            {selectedAuditoria.detalle && Object.keys(selectedAuditoria.detalle).length > 0 && (
              <>
                <p className="text-[15px] text-gray-500 mt-2">Detalle:</p>
                <div className="bg-[#f8f9fc] rounded-xl flex flex-col gap-2 text-sm mt-1" style={{ padding: '20px' }}>
                  {Object.entries(selectedAuditoria.detalle).map(([key, val]) => {
                    // Format camelCase key to Capitalized Words
                    const formattedKey = key
                      .replace(/([A-Z])/g, ' $1')
                      .replace(/^./, (str) => str.toUpperCase())
                    return (
                      <div key={key} className="flex justify-between items-start gap-4">
                        <span className="text-gray-500 shrink-0">{formattedKey}</span>
                        <span className="font-medium text-right text-gray-900 break-all">{String(val)}</span>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        )}
      </CrudModal>
    </div>
  )
}
