import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Eye,
  Download,
  ArrowUpCircle,
  ArrowDownCircle,
  Wallet,
  TrendingUp,
  ClipboardList,
  Archive,
  LockKeyhole
} from 'lucide-react'
import { toast } from 'sonner'
import DataTable from '@/components/shared/DataTable'
import CrudModal from '@/components/shared/CrudModal'
import { useAuth } from '@/hooks/useAuth'
import { useAuditoria } from '@/hooks/useAuditoria'
import { supabase } from '@/lib/supabase'
import { generatePdf, formatCurrency, formatDateTime } from '@/lib/pdf/pdfGenerator'
import type { Column, CajaSesion, CajaMovimiento } from '@/lib/types'

export default function CajaPage() {
  const { user } = useAuth()
  const { logAuditoria } = useAuditoria()


  // Data state
  const [sesiones, setSesiones] = useState<CajaSesion[]>([])
  const [movimientos, setMovimientos] = useState<CajaMovimiento[]>([])

  const openSession = useMemo(() => sesiones.find(s => s.estado === 'abierta'), [sesiones])
  
  // Modals state
  const [aperturaModalOpen, setAperturaModalOpen] = useState(false)
  const [cierreModalOpen, setCierreModalOpen] = useState(false)
  const [movimientoModalOpen, setMovimientoModalOpen] = useState(false)
  const [viewSessionModalOpen, setViewSessionModalOpen] = useState(false)
  
  const [selectedSession, setSelectedSession] = useState<CajaSesion | null>(null)

  // Forms state
  const [montoInicial, setMontoInicial] = useState('')
  const [montoDeclarado, setMontoDeclarado] = useState('')
  const [observacionesCaja, setObservacionesCaja] = useState('')
  
  const [movTipo, setMovTipo] = useState<'ingreso' | 'egreso'>('ingreso')
  const [movMonto, setMovMonto] = useState('')
  const [movDesc, setMovDesc] = useState('')

  const loadData = useCallback(async () => {
    try {
      const { data: sesionesData, error: sesionesError } = await supabase
        .from('caja_sesiones')
        .select('*')
        .order('id', { ascending: false })
      
      if (sesionesError) throw sesionesError
      
      const loadedSesiones = sesionesData || []
      setSesiones(loadedSesiones)

      const activeSession = loadedSesiones.find((s: any) => s.estado === 'abierta')
      
      if (activeSession) {
        const { data: movsData, error: movsError } = await supabase
          .from('caja_movimientos')
          .select('*')
          .eq('sesion_id', activeSession.id)
          .order('id', { ascending: false })
        
        if (movsError) throw movsError
        setMovimientos(movsData || [])
      } else {
        setMovimientos([])
      }
    } catch (error: any) {
      console.error('Error fetching caja data:', error)
      toast.error('Error al cargar datos de caja')
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // ---- Stats calculations ----
  const calcTotalIngresos = movimientos.filter(m => m.tipo === 'ingreso').reduce((acc, m) => acc + m.monto, 0)
  const calcTotalEgresos = movimientos.filter(m => m.tipo === 'egreso').reduce((acc, m) => acc + m.monto, 0)
  const montoCalculadoActual = (openSession?.monto_inicial || 0) + calcTotalIngresos - calcTotalEgresos

  // ---- Handlers ----
  const handleAbrirCaja = async () => {
    if (openSession) return
    const m = parseFloat(montoInicial)
    if (isNaN(m) || m < 0) {
      toast.error('Ingresá un monto inicial válido')
      return
    }

    try {
      const now = new Date().toISOString()
      
      const { data: newSession, error } = await supabase
        .from('caja_sesiones')
        .insert([{
          usuario_id: user?.id,
          fecha_apertura: now,
          monto_inicial: m,
          estado: 'abierta',
          observaciones_apertura: observacionesCaja || null,
        }])
        .select()
        .single()

      if (error) throw error

      logAuditoria('caja', 'Apertura de caja', { sesion: newSession.id, monto_inicial: m })
      toast.success('Caja abierta correctamente')
      setAperturaModalOpen(false)
      setMontoInicial('')
      setObservacionesCaja('')
      
      loadData()
    } catch (error: any) {
      console.error('Error opening session:', error)
      toast.error(error.message || 'Error al abrir la caja')
    }
  }

  const handleCerrarCaja = async () => {
    if (!openSession) return
    const decl = parseFloat(montoDeclarado)
    if (isNaN(decl) || decl < 0) {
      toast.error('Ingresá el monto real contado en caja')
      return
    }

    try {
      const diff = decl - montoCalculadoActual
      const now = new Date().toISOString()
      
      if (diff !== 0) {
        const { error: movError } = await supabase
          .from('caja_movimientos')
          .insert([{
            sesion_id: openSession.id,
            tipo: 'arqueo',
            monto: Math.abs(diff),
            descripcion: `Diferencia de arqueo: ${diff >= 0 ? 'Sobrante' : 'Faltante'}`,
            fecha: now,
            usuario_id: user?.id,
          }])
        if (movError) throw movError
      }

      const { data: updatedSession, error: updateError } = await supabase
        .from('caja_sesiones')
        .update({
          fecha_cierre: now,
          monto_declarado: decl,
          monto_calculado: montoCalculadoActual,
          diferencia: diff,
          estado: 'cerrada',
          observaciones_cierre: observacionesCaja || null,
        })
        .eq('id', openSession.id)
        .select()
        .single()

      if (updateError) throw updateError

      logAuditoria('caja', 'Cierre de caja', { sesion: openSession.id, declarado: decl, diferencia: diff })
      
      toast.success('Caja cerrada con éxito', {
        action: {
          label: 'Descargar Comprobante',
          onClick: () => downloadPDFCierre(updatedSession)
        }
      })
      
      setCierreModalOpen(false)
      setMontoDeclarado('')
      setObservacionesCaja('')
      loadData()
    } catch (error: any) {
      console.error('Error closing session:', error)
      toast.error(error.message || 'Error al cerrar la caja')
    }
  }

  const handleRegistrarMovimiento = async () => {
    if (!openSession) return
    const m = parseFloat(movMonto)
    if (isNaN(m) || m <= 0) {
      toast.error('El monto debe ser mayor a 0')
      return
    }
    if (!movDesc) {
      toast.error('Ingresá una descripción para el movimiento')
      return
    }

    try {
      const { error } = await supabase
        .from('caja_movimientos')
        .insert([{
          sesion_id: openSession.id,
          tipo: movTipo,
          monto: m,
          descripcion: movDesc,
          fecha: new Date().toISOString(),
          usuario_id: user?.id,
        }])

      if (error) throw error

      logAuditoria('caja', `Registro ${movTipo} de caja`, { sesion: openSession.id, monto: m, desc: movDesc })
      toast.success(`Movimiento de ${movTipo} registrado`)
      
      setMovimientoModalOpen(false)
      setMovMonto('')
      setMovDesc('')
      setMovTipo('ingreso')
      
      loadData()
    } catch (error: any) {
      console.error('Error saving movement:', error)
      toast.error(error.message || 'Error al registrar el movimiento')
    }
  }

  // ---- View and PDF ----
  const openViewSession = (s: CajaSesion) => {
    setSelectedSession(s)
    setViewSessionModalOpen(true)
  }

  const downloadPDFCierre = (s: CajaSesion) => {
    generatePdf({
      title: `Cierre de Caja - Sesión #${s.id}`,
      infoLeft: [
        { label: 'Apertura:', value: formatDateTime(s.fecha_apertura) },
        { label: 'Cierre:', value: s.fecha_cierre ? formatDateTime(s.fecha_cierre) : 'N/A' },
      ],
      infoRight: [
        { label: 'Monto Inicial:', value: formatCurrency(s.monto_inicial) },
        { label: 'Monto Calculado:', value: formatCurrency(s.monto_calculado || 0) },
      ],
      columns: [
        { header: 'Concepto', dataKey: 'concepto' },
        { header: 'Monto', dataKey: 'monto' },
      ],
      rows: [
        { concepto: 'Monto Declarado (Contado)', monto: formatCurrency(s.monto_declarado || 0) },
        { concepto: 'Diferencia (Sobrante/Faltante)', monto: formatCurrency(s.diferencia || 0) },
      ],
      totalLabel: 'MONTO FINAL',
      totalValue: formatCurrency(s.monto_declarado || 0),
      totalColor: s.diferencia && s.diferencia < 0 ? [220, 38, 38] : [22, 163, 74], 
      fileName: `cierre_caja_${s.id}.pdf`
    })
  }

  // ---- Columns ----
  const colsMovimientos: Column<CajaMovimiento>[] = [
    { key: 'fecha', header: 'Hora', render: m => formatDateTime(m.fecha).split(' ')[1] },
    { 
      key: 'tipo', 
      header: 'Tipo',
      render: m => m.tipo === 'ingreso' ? 
        <span className="flex items-center gap-1 text-green-600 font-medium"><ArrowUpCircle size={14}/> Ingreso</span> :
        (m.tipo === 'egreso' ? <span className="flex items-center gap-1 text-red-600 font-medium"><ArrowDownCircle size={14}/> Egreso</span> : 
        <span className="text-gray-500 font-medium">Arqueo</span>)
    },
    { key: 'descripcion', header: 'Descripción' },
    { 
      key: 'monto', 
      header: 'Monto', 
      render: m => <span className={`font-semibold ${m.tipo === 'ingreso' ? 'text-green-600' : (m.tipo === 'egreso' ? 'text-red-600' : 'text-gray-800')}`}>{formatCurrency(m.monto)}</span> 
    }
  ]

  const colsSesiones: Column<CajaSesion>[] = [
    { key: 'id', header: '#' },
    { key: 'usuario_id', header: 'Usuario', render: s => s.usuario_id === 'demo' ? 'Administrador' : s.usuario_id },
    { key: 'fecha_apertura', header: 'Apertura', render: s => formatDateTime(s.fecha_apertura) },
    { key: 'fecha_cierre', header: 'Cierre', render: s => s.fecha_cierre ? formatDateTime(s.fecha_cierre) : '—' },
    { key: 'monto_inicial', header: 'Inicial', render: s => formatCurrency(s.monto_inicial) },
    { key: 'monto_declarado', header: 'Declarado', render: s => s.monto_declarado !== null ? formatCurrency(s.monto_declarado) : '—' },
    { key: 'monto_calculado', header: 'Calculado', render: s => s.monto_calculado !== null ? formatCurrency(s.monto_calculado) : '—' },
    { 
      key: 'diferencia', 
      header: 'Diferencia', 
      render: s => s.diferencia !== null ? 
        <span className={`font-semibold ${s.diferencia < 0 ? 'text-red-600' : 'text-green-600'}`}>{formatCurrency(s.diferencia)}</span> : '—' 
    },
    { 
      key: 'estado', 
      header: 'Estado', 
      render: s => (
        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
          s.estado === 'abierta' ? 'bg-primary-600 text-white' : 'bg-primary-50 text-primary-700'
        }`}>
          {s.estado}
        </span>
      ) 
    }
  ]

  return (
    <div className="animate-fade-in pb-12">
      <div className="flex items-center justify-between" style={{ marginBottom: '40px' }}>
        <div>
          <h1 className="text-2xl font-extrabold text-[#1e1e1e] tracking-tight">
            Caja
          </h1>
          <p className="text-gray-500 mt-1 font-medium">
            Apertura, cierre, arqueo y movimientos de caja
          </p>
        </div>
        <div className="flex gap-2">
          {openSession ? (
            <button className="btn btn-primary bg-red-600 border-red-600 hover:bg-red-700 font-semibold" onClick={() => setCierreModalOpen(true)}>
              <LockKeyhole size={18} />
              Cerrar Caja
            </button>
          ) : (
            <button className="btn btn-primary font-semibold" onClick={() => setAperturaModalOpen(true)}>
              <Archive size={18} />
              Abrir Caja
            </button>
          )}
        </div>
      </div>

      {!openSession && (
        <div 
          className="bg-white rounded-xl border border-gray-200 flex flex-col items-center justify-center text-center shadow-sm"
          style={{ minHeight: '200px', marginBottom: '32px' }}
        >
          <Wallet className="w-16 h-16 text-gray-400 mb-6" strokeWidth={1.5} />
          <p className="text-gray-500 text-lg mb-8 font-medium">
            No hay caja abierta. Abrí una nueva sesión para comenzar a registrar movimientos.
          </p>
          <button className="btn btn-primary font-semibold" onClick={() => setAperturaModalOpen(true)}>
            <Archive size={18} />
            Abrir Caja
          </button>
        </div>
      )}

      {openSession && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8 shadow-sm">
          <div className="flex justify-between items-start mb-6">
            <div className="flex gap-3">
              <div className="text-primary-600 mt-1">
                <Wallet className="w-6 h-6" strokeWidth={1.5} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Caja #{openSession.id} — Abierta</h2>
                <p className="text-sm text-gray-500 font-medium">Por {openSession.usuario_id === 'demo' ? 'Administrador' : openSession.usuario_id} · desde {formatDateTime(openSession.fecha_apertura)}</p>
              </div>
            </div>
            <div>
              <span className="bg-primary-600 text-white px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider">
                Abierta
              </span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <div className="p-4 rounded-xl border border-gray-200 bg-white">
              <p className="text-xs text-gray-500 font-medium mb-1">Monto Inicial</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(openSession.monto_inicial)}</p>
            </div>
            <div className="p-4 rounded-xl border border-gray-200 bg-white">
              <p className="text-xs text-gray-500 font-medium mb-1 flex items-center gap-1">
                <TrendingUp size={14} className="text-green-500" /> Ventas
              </p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(0)}</p>
            </div>
            <div className="p-4 rounded-xl border border-gray-200 bg-white">
              <p className="text-xs text-gray-500 font-medium mb-1 flex items-center gap-1">
                <ArrowDownCircle size={14} className="text-green-500" /> Ingresos
              </p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(calcTotalIngresos)}</p>
            </div>
            <div className="p-4 rounded-xl border border-gray-200 bg-white">
              <p className="text-xs text-gray-500 font-medium mb-1 flex items-center gap-1">
                <ArrowUpCircle size={14} className="text-red-500" /> Egresos
              </p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(calcTotalEgresos)}</p>
            </div>
            <div className="p-4 rounded-xl border border-primary-100 bg-primary-50">
              <p className="text-xs text-primary-600 font-medium mb-1">Saldo Calculado</p>
              <p className="text-2xl font-bold text-primary-700">{formatCurrency(montoCalculadoActual)}</p>
            </div>
          </div>
          
          <div className="flex gap-3">
            <button className="btn btn-outline bg-white border-gray-200 text-gray-700 hover:bg-gray-50 font-medium" onClick={() => { setMovTipo('ingreso'); setMovimientoModalOpen(true); }}>
              <ArrowDownCircle size={16} /> Ingreso
            </button>
            <button className="btn btn-outline bg-white border-gray-200 text-gray-700 hover:bg-gray-50 font-medium" onClick={() => { setMovTipo('egreso'); setMovimientoModalOpen(true); }}>
              <ArrowUpCircle size={16} /> Egreso
            </button>
            <button className="btn btn-outline bg-white border-gray-200 text-gray-700 hover:bg-gray-50 font-medium" onClick={() => setCierreModalOpen(true)}>
              <ClipboardList size={16} /> Arqueo
            </button>
          </div>
        </div>
      )}

      {openSession && (
        <div className="mb-8">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Movimientos de la sesión</h3>
          {movimientos.length === 0 ? (
            <div className="card p-6 text-center text-gray-500 font-medium">Aún no hay movimientos registrados.</div>
          ) : (
            <DataTable
              data={movimientos}
              columns={colsMovimientos}
              searchPlaceholder="Buscar por descripción..."
              searchKeys={['descripcion']}
              emptyMessage="No hay movimientos"
            />
          )}
        </div>
      )}

      <div>
        <h3 className="text-xl font-bold text-gray-900 mb-4">Historial de Sesiones</h3>
        <DataTable
          data={sesiones}
          columns={colsSesiones}
          searchPlaceholder="Buscar por ID o Usuario..."
          searchKeys={['id', 'usuario_id']}
          emptyMessage="No hay historial de sesiones"
          actions={(s) => (
            <>
              <button className="btn btn-icon btn-outline btn-sm border-gray-200 text-gray-600 hover:bg-gray-50" onClick={() => openViewSession(s)} title="Ver detalle">
                <Eye size={15} />
              </button>
              {s.estado === 'cerrada' && (
                <button className="btn btn-icon btn-outline btn-sm border-gray-200 text-gray-600 hover:bg-gray-50" onClick={() => downloadPDFCierre(s)} title="Descargar Cierre">
                  <Download size={15} />
                </button>
              )}
            </>
          )}
        />
      </div>

      {/* ================= MODALS ================= */}

      {/* APERTURA */}
      <CrudModal
        open={aperturaModalOpen}
        title="Apertura de Caja"
        subtitle="Ingresá el monto de dinero inicial con el que comienza la jornada"
        maxWidth={400}
        onClose={() => { setAperturaModalOpen(false); setMontoInicial(''); setObservacionesCaja(''); }}
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setAperturaModalOpen(false)}>Cancelar</button>
            <button className="btn btn-primary bg-green-600 border-green-600" onClick={handleAbrirCaja}>Abrir Caja</button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="form-group">
            <label className="form-label font-semibold">Monto Inicial en Efectivo *</label>
            <input 
              type="number" 
              className="input text-lg font-bold" 
              min="0" 
              step="0.01"
              value={montoInicial}
              onChange={e => setMontoInicial(e.target.value)}
              placeholder="0.00"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Observaciones (Opcional)</label>
            <textarea 
              className="input min-h-[80px]" 
              value={observacionesCaja} 
              onChange={e => setObservacionesCaja(e.target.value)}
              placeholder="Detalles sobre el inicio..."
            />
          </div>
        </div>
      </CrudModal>

      {/* CIERRE */}
      <CrudModal
        open={cierreModalOpen}
        title="Cierre de Caja (Arqueo)"
        subtitle="Verificá el monto calculado e ingresá el monto real (físico) para cerrar"
        maxWidth={450}
        onClose={() => { setCierreModalOpen(false); setMontoDeclarado(''); setObservacionesCaja(''); }}
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setCierreModalOpen(false)}>Cancelar</button>
            <button className="btn btn-primary bg-red-600 border-red-600" onClick={handleCerrarCaja}>Confirmar Cierre</button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="p-3 bg-gray-50 border rounded-lg text-center mb-2">
            <p className="text-sm text-gray-500 font-semibold mb-1">Monto Calculado por Sistema</p>
            <p className="text-2xl font-bold text-primary-700">{formatCurrency(montoCalculadoActual)}</p>
          </div>

          <div className="form-group">
            <label className="form-label font-semibold">Monto Real en Caja (Contado) *</label>
            <input 
              type="number" 
              className="input text-lg font-bold" 
              min="0" 
              step="0.01"
              value={montoDeclarado}
              onChange={e => setMontoDeclarado(e.target.value)}
              placeholder="0.00"
            />
          </div>

          {montoDeclarado && !isNaN(parseFloat(montoDeclarado)) && (
            <div className={`p-3 rounded-lg flex items-center justify-between font-medium border ${parseFloat(montoDeclarado) - montoCalculadoActual < 0 ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
              <span>Diferencia de Arqueo:</span>
              <span className="text-lg">{formatCurrency(parseFloat(montoDeclarado) - montoCalculadoActual)}</span>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Observaciones del Cierre (Opcional)</label>
            <textarea 
              className="input min-h-[80px]" 
              value={observacionesCaja} 
              onChange={e => setObservacionesCaja(e.target.value)}
              placeholder="Justificación de diferencias u otros..."
            />
          </div>
        </div>
      </CrudModal>

      {/* NUEVO MOVIMIENTO */}
      <CrudModal
        open={movimientoModalOpen}
        title="Nuevo Movimiento de Caja"
        subtitle="Registrá un ingreso o retiro manual (ej: pago de servicios, cobro extra)"
        maxWidth={450}
        onClose={() => { setMovimientoModalOpen(false); setMovMonto(''); setMovDesc(''); setMovTipo('ingreso'); }}
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setMovimientoModalOpen(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={handleRegistrarMovimiento}>Guardar Movimiento</button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="form-group">
            <label className="form-label">Tipo de Movimiento</label>
            <div className="flex gap-2">
              <button 
                className={`flex-1 py-2 rounded-lg border font-medium flex items-center justify-center gap-2 transition-colors ${movTipo === 'ingreso' ? 'bg-green-50 border-green-500 text-green-700' : 'bg-white border-gray-200'}`}
                onClick={() => setMovTipo('ingreso')}
              >
                <ArrowUpCircle size={18} /> Ingreso
              </button>
              <button 
                className={`flex-1 py-2 rounded-lg border font-medium flex items-center justify-center gap-2 transition-colors ${movTipo === 'egreso' ? 'bg-red-50 border-red-500 text-red-700' : 'bg-white border-gray-200'}`}
                onClick={() => setMovTipo('egreso')}
              >
                <ArrowDownCircle size={18} /> Egreso (Retiro)
              </button>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Monto *</label>
            <input 
              type="number" 
              className="input font-semibold" 
              min="0.01" 
              step="0.01"
              value={movMonto}
              onChange={e => setMovMonto(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Descripción *</label>
            <input 
              type="text" 
              className="input" 
              value={movDesc}
              onChange={e => setMovDesc(e.target.value)}
              placeholder="Ej: Pago de internet, Viáticos..."
            />
          </div>
        </div>
      </CrudModal>

      {/* VIEW SESSION DETALLE */}
      <CrudModal
        open={viewSessionModalOpen}
        title={`Detalle de Sesión #${selectedSession?.id}`}
        subtitle="Información general del cierre de caja"
        maxWidth={450}
        onClose={() => setViewSessionModalOpen(false)}
        footer={
          <button className="btn btn-primary" onClick={() => setViewSessionModalOpen(false)}>Cerrar</button>
        }
      >
        {selectedSession && (
          <div className="flex flex-col gap-3">
            <p><strong>Apertura:</strong> {formatDateTime(selectedSession.fecha_apertura)}</p>
            <p><strong>Cierre:</strong> {selectedSession.fecha_cierre ? formatDateTime(selectedSession.fecha_cierre) : <span className="text-green-600 font-semibold">En curso</span>}</p>
            <hr className="my-2" />
            <p><strong>Monto Inicial:</strong> {formatCurrency(selectedSession.monto_inicial)}</p>
            <p><strong>Monto Calculado:</strong> {selectedSession.monto_calculado !== null ? formatCurrency(selectedSession.monto_calculado) : '—'}</p>
            <p><strong>Monto Declarado:</strong> {selectedSession.monto_declarado !== null ? formatCurrency(selectedSession.monto_declarado) : '—'}</p>
            <p>
              <strong>Diferencia:</strong>{' '}
              {selectedSession.diferencia !== null ? (
                <span className={selectedSession.diferencia < 0 ? 'text-red-600 font-semibold' : 'text-green-600 font-semibold'}>
                  {formatCurrency(selectedSession.diferencia)}
                </span>
              ) : '—'}
            </p>
            <hr className="my-2" />
            <p><strong>Obs. Apertura:</strong> {selectedSession.observaciones_apertura || '—'}</p>
            <p><strong>Obs. Cierre:</strong> {selectedSession.observaciones_cierre || '—'}</p>
          </div>
        )}
      </CrudModal>
    </div>
  )
}
