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
  LockKeyhole,
  ShoppingCart
} from 'lucide-react'
import { toast } from 'sonner'
import DataTable from '@/components/shared/DataTable'
import CrudModal from '@/components/shared/CrudModal'
import { useAuth } from '@/hooks/useAuth'
import { useAuditoria } from '@/hooks/useAuditoria'
import { supabase } from '@/lib/supabase'
import { generatePdf, formatCurrency, formatDateTime } from '@/lib/pdf/pdfGenerator'
import type { Column, CajaSesion, CajaMovimiento } from '@/lib/types'

// Unified movement type that combines caja_movimientos + ventas
interface MovimientoUnificado {
  id: string
  fecha: string
  tipo: 'ingreso' | 'egreso' | 'arqueo' | 'venta'
  descripcion: string
  monto: number
}

export default function CajaPage() {
  const { user } = useAuth()
  const { logAuditoria } = useAuditoria()


  // Data state
  const [sesiones, setSesiones] = useState<CajaSesion[]>([])
  const [movimientos, setMovimientos] = useState<CajaMovimiento[]>([])
  const [totalVentasSesion, setTotalVentasSesion] = useState(0)
  const [movimientosUnificados, setMovimientosUnificados] = useState<MovimientoUnificado[]>([])

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
        .select('*, profiles(username)')
        .order('id', { ascending: false })
      
      if (sesionesError) throw sesionesError
      
      const loadedSesiones = (sesionesData || []).map((s: any) => ({
        ...s,
        username: s.profiles?.username || s.usuario_id
      }))
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

        // Fetch sales made during this session (with client name & payment method)
        const { data: ventasData, error: ventasError } = await supabase
          .from('ventas')
          .select('id, fecha, total, metodo_pago, clientes(nombre)')
          .gte('fecha', activeSession.fecha_apertura)
          .order('fecha', { ascending: false })
        
        if (ventasError) throw ventasError
        const ventas = ventasData || []
        const sumVentas = ventas.reduce((acc: number, v: any) => acc + Number(v.total), 0)
        setTotalVentasSesion(sumVentas)

        // Build unified movements list
        const movsUnif: MovimientoUnificado[] = (movsData || []).map((m: CajaMovimiento) => ({
          id: `mov-${m.id}`,
          fecha: m.fecha,
          tipo: m.tipo,
          descripcion: m.descripcion || '',
          monto: m.monto,
        }))

        const ventasUnif: MovimientoUnificado[] = ventas.map((v: any) => {
          const clienteNombre = v.clientes?.nombre || 'Sin cliente'
          return {
            id: `venta-${v.id}`,
            fecha: v.fecha,
            tipo: 'venta' as const,
            descripcion: `Venta #${v.id} — ${clienteNombre} — ${v.metodo_pago || 'S/M'}`,
            monto: Number(v.total),
          }
        })

        // Merge and sort by date descending
        const todos = [...movsUnif, ...ventasUnif].sort(
          (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
        )
        setMovimientosUnificados(todos)
      } else {
        setMovimientos([])
        setTotalVentasSesion(0)
        setMovimientosUnificados([])
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
  const ingresosManual = movimientos.filter(m => m.tipo === 'ingreso').reduce((acc, m) => acc + m.monto, 0)
  const calcTotalIngresos = totalVentasSesion + ingresosManual
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
  const colsMovimientosUnif: Column<MovimientoUnificado>[] = [
    { key: 'fecha' as any, header: 'Hora', render: m => formatDateTime(m.fecha).split(' ')[1] },
    { 
      key: 'tipo' as any, 
      header: 'Tipo',
      render: m => {
        switch (m.tipo) {
          case 'venta':
            return <span className="flex items-center gap-1 text-emerald-600 font-semibold"><ShoppingCart size={14}/> Venta</span>
          case 'ingreso':
            return <span className="flex items-center gap-1 text-green-600 font-semibold"><ArrowUpCircle size={14}/> Ingreso</span>
          case 'egreso':
            return <span className="flex items-center gap-1 text-red-600 font-semibold"><ArrowDownCircle size={14}/> Egreso</span>
          case 'arqueo':
            return <span className="text-gray-500 font-semibold">Arqueo</span>
          default:
            return <span className="text-gray-500">{m.tipo}</span>
        }
      }
    },
    { key: 'descripcion' as any, header: 'Descripción' },
    { 
      key: 'monto' as any, 
      header: 'Monto', 
      render: m => {
        const color = m.tipo === 'venta' ? 'text-emerald-600' : m.tipo === 'ingreso' ? 'text-green-600' : m.tipo === 'egreso' ? 'text-red-600' : 'text-gray-800'
        return <span className={`font-semibold ${color}`}>{m.tipo === 'egreso' ? '-' : '+'}{formatCurrency(m.monto)}</span>
      }
    }
  ]

  const colsSesiones: Column<CajaSesion>[] = [
    { key: 'id', header: '#' },
    { key: 'usuario_id', header: 'Usuario', render: s => <span className="font-medium text-gray-700">{s.username || s.usuario_id}</span> },
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
          s.estado === 'abierta' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'
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
        <div className="flex gap-3">
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
          className="bg-white rounded-2xl border border-gray-200 flex flex-col items-center justify-center text-center shadow-sm"
          style={{ minHeight: '220px', marginBottom: '32px' }}
        >
          <Wallet className="w-16 h-16 text-gray-400 mb-6" strokeWidth={1.5} />
          <p className="text-gray-500 text-[15px] mb-8 font-medium max-w-md">
            No hay caja abierta. Abrí una nueva sesión para comenzar a registrar movimientos y ventas.
          </p>
          <button className="btn btn-primary font-semibold px-6 py-2.5" onClick={() => setAperturaModalOpen(true)}>
            <Archive size={18} />
            Abrir Caja
          </button>
        </div>
      )}

      {openSession && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm" style={{ padding: '32px 36px', marginBottom: '32px' }}>
          {/* Header */}
          <div className="flex justify-between items-center" style={{ marginBottom: '28px' }}>
            <div className="flex items-center" style={{ gap: '16px' }}>
              <div className="text-primary-600 bg-primary-50 rounded-xl" style={{ padding: '10px' }}>
                <Wallet className="w-6 h-6" strokeWidth={1.5} />
              </div>
              <div>
                <h2 className="font-bold text-gray-900" style={{ fontSize: '18px', lineHeight: '1.3', marginBottom: '2px' }}>
                  Caja #{openSession.id} — Abierta
                </h2>
                <p className="text-gray-500 font-medium" style={{ fontSize: '13px' }}>
                  Por <span className="font-semibold text-gray-700">{openSession.username || openSession.usuario_id}</span> · desde el {formatDateTime(openSession.fecha_apertura)}
                </p>
              </div>
            </div>
            <span className="bg-primary-600 text-white rounded-full font-bold uppercase" style={{ padding: '5px 14px', fontSize: '11px', letterSpacing: '0.08em' }}>
              Abierta
            </span>
          </div>

          {/* Stat Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px', marginBottom: '28px' }}>
            <div className="rounded-xl border border-gray-100 bg-gray-50/60" style={{ padding: '16px 20px' }}>
              <p className="text-gray-500 font-semibold uppercase" style={{ fontSize: '10px', letterSpacing: '0.06em', marginBottom: '6px' }}>Monto Inicial</p>
              <p className="font-extrabold text-gray-900" style={{ fontSize: '16px' }}>{formatCurrency(openSession.monto_inicial)}</p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-gray-50/60" style={{ padding: '16px 20px' }}>
              <p className="text-gray-500 font-semibold uppercase flex items-center" style={{ fontSize: '10px', letterSpacing: '0.06em', marginBottom: '6px', gap: '4px' }}>
                <TrendingUp size={13} className="text-emerald-500" /> Ventas
              </p>
              <p className="font-extrabold text-gray-900" style={{ fontSize: '16px' }}>{formatCurrency(totalVentasSesion)}</p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-gray-50/60" style={{ padding: '16px 20px' }}>
              <p className="text-gray-500 font-semibold uppercase flex items-center" style={{ fontSize: '10px', letterSpacing: '0.06em', marginBottom: '6px', gap: '4px' }}>
                <ArrowDownCircle size={13} className="text-emerald-500" /> Ingresos
              </p>
              <p className="font-extrabold text-gray-900" style={{ fontSize: '16px' }}>{formatCurrency(calcTotalIngresos)}</p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-gray-50/60" style={{ padding: '16px 20px' }}>
              <p className="text-gray-500 font-semibold uppercase flex items-center" style={{ fontSize: '10px', letterSpacing: '0.06em', marginBottom: '6px', gap: '4px' }}>
                <ArrowUpCircle size={13} className="text-red-500" /> Egresos
              </p>
              <p className="font-extrabold text-gray-900" style={{ fontSize: '16px' }}>{formatCurrency(calcTotalEgresos)}</p>
            </div>
            <div className="rounded-xl border-2 border-primary-100 bg-primary-50/60 relative overflow-hidden" style={{ padding: '16px 20px' }}>
              <p className="text-primary-600 font-bold uppercase relative z-10" style={{ fontSize: '10px', letterSpacing: '0.06em', marginBottom: '6px' }}>Saldo Calculado</p>
              <p className="font-extrabold text-primary-700 relative z-10" style={{ fontSize: '16px' }}>{formatCurrency(montoCalculadoActual)}</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="border-t border-gray-100 flex items-center" style={{ paddingTop: '20px', gap: '12px' }}>
            <button className="btn btn-outline bg-white border-gray-200 text-gray-700 hover:bg-gray-50 font-semibold rounded-lg" style={{ padding: '8px 16px', fontSize: '13px' }} onClick={() => { setMovTipo('ingreso'); setMovimientoModalOpen(true); }}>
              <ArrowDownCircle size={16} className="text-emerald-600" /> Ingreso Manual
            </button>
            <button className="btn btn-outline bg-white border-gray-200 text-gray-700 hover:bg-gray-50 font-semibold rounded-lg" style={{ padding: '8px 16px', fontSize: '13px' }} onClick={() => { setMovTipo('egreso'); setMovimientoModalOpen(true); }}>
              <ArrowUpCircle size={16} className="text-red-600" /> Egreso Manual
            </button>
            <button className="btn btn-outline bg-white border-gray-200 text-gray-700 hover:bg-gray-50 font-semibold rounded-lg" style={{ padding: '8px 16px', fontSize: '13px' }} onClick={() => setCierreModalOpen(true)}>
              <ClipboardList size={16} className="text-primary-600" /> Arqueo de Caja
            </button>
          </div>
        </div>
      )}

      {openSession && (
        <div style={{ marginBottom: '48px' }}>
          <h3 className="text-xl font-extrabold text-gray-900 flex items-center gap-2" style={{ marginBottom: '20px' }}>
            Movimientos de la sesión
            <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-sm font-bold">{movimientosUnificados.length}</span>
          </h3>
          {movimientosUnificados.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center text-gray-500 font-medium shadow-sm">
              <ClipboardList className="w-12 h-12 mx-auto text-gray-300 mb-4" />
              Aún no hay movimientos registrados en esta sesión.
            </div>
          ) : (
            <DataTable
              data={movimientosUnificados}
              columns={colsMovimientosUnif as any}
              searchPlaceholder="Buscar por descripción..."
              searchKeys={['descripcion']}
              emptyMessage="No hay movimientos"
            />
          )}
        </div>
      )}

      <div style={{ paddingTop: '8px' }}>
        <h3 className="text-xl font-extrabold text-gray-900 flex items-center gap-2" style={{ marginBottom: '20px' }}>
          Historial de Sesiones
          <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-sm font-bold">{sesiones.length}</span>
        </h3>

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
