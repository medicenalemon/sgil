import {
  ShoppingCart,
  Package,
  Wallet,
  DollarSign,
  AlertTriangle,
  TrendingUp
} from 'lucide-react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts'
import { supabase } from '@/lib/supabase'
import { useState, useEffect } from 'react'

// Custom Card to match the exact mockup design
const AnalyticsCard = ({ title, value, icon, color }: { title: string, value: string | number, icon: React.ReactNode, color: string }) => (
  <div className="card border shadow-sm rounded-xl bg-white flex justify-between items-center h-[120px]" style={{ padding: '24px' }}>
    <div className="flex flex-col justify-center h-full gap-2">
      <p className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>{title}</p>
      <p className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{value}</p>
    </div>
    <div className="flex items-center justify-center rounded-xl shrink-0 shadow-sm" style={{ backgroundColor: color, width: '56px', height: '56px', color: 'white' }}>
      {icon}
    </div>
  </div>
)

const CustomYAxisTick = (props: any) => {
  const { x, y, payload } = props;
  const lines = payload.value.split('\n');
  return (
    <text x={x} y={y} textAnchor="end" fill="#6b7280" fontSize={12} dy={-((lines.length - 1) * 14) / 2 + 4}>
      {lines.map((line: string, index: number) => (
        <tspan x={x - 10} dy={index === 0 ? 0 : 14} key={index}>
          {line}
        </tspan>
      ))}
    </text>
  );
};

export default function ReportesPage() {
  const [ventas7Dias, setVentas7Dias] = useState<any[]>([])
  const [metodosPago, setMetodosPago] = useState<any[]>([])
  const [topProductos, setTopProductos] = useState<any[]>([])
  const [comprasVsVentas, setComprasVsVentas] = useState<any[]>([])
  
  const [stats, setStats] = useState({
    ingresosHoy: 0,
    ventasMes: 0,
    productosBajoStock: 0,
    comprasPendientes: 0
  })

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [
          { data: ventas },
          { data: compras },
          { data: productos },
          { data: ventaItems }
        ] = await Promise.all([
          supabase.from('ventas').select('*'),
          supabase.from('compras').select('*'),
          supabase.from('productos').select('*'),
          supabase.from('venta_items').select('*, producto:productos(nombre)')
        ])

        const v = ventas || []
        const c = compras || []
        const p = productos || []
        const vi = ventaItems || []

        // Stats
        const today = new Date().toISOString().split('T')[0]
        const currentMonth = new Date().getMonth()
        
        const ingresosHoy = v.filter(x => x.fecha.startsWith(today)).reduce((sum, x) => sum + x.total, 0)
        const ventasMes = v.filter(x => new Date(x.fecha).getMonth() === currentMonth).length
        const bajoStock = p.filter(x => x.stock <= (x.stock_minimo || 5)).length

        setStats({
          ingresosHoy,
          ventasMes,
          productosBajoStock: bajoStock,
          comprasPendientes: 0 // Optional: compute based on pending logic if any
        })

        // Ventas 7 dias
        const last7Days = Array.from({length: 7}, (_, i) => {
          const d = new Date()
          d.setDate(d.getDate() - (6 - i))
          return d
        })

        const formatShortDate = (d: Date) => {
          const days = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb']
          return `${days[d.getDay()]} ${String(d.getDate()).padStart(2, '0')}`
        }

        const v7d = last7Days.map(d => {
          const dateStr = d.toISOString().split('T')[0]
          const total = v.filter(x => x.fecha.startsWith(dateStr)).reduce((sum, x) => sum + x.total, 0)
          return { date: formatShortDate(d), total }
        })
        setVentas7Dias(v7d)

        // Metodos pago
        const mpMap = v.reduce((acc, curr) => {
          const mp = curr.metodo_pago || 'Otro'
          acc[mp] = (acc[mp] || 0) + curr.total
          return acc
        }, {} as Record<string, number>)
        
        const mp = Object.entries(mpMap).map(([name, value]) => ({ name, value }))
        setMetodosPago(mp)

        // Top productos
        const prodMap = vi.reduce((acc, curr) => {
          const pName = curr.producto?.nombre || 'Desconocido'
          acc[pName] = (acc[pName] || 0) + curr.cantidad
          return acc
        }, {} as Record<string, number>)

        const tp = Object.entries(prodMap as Record<string, number>)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([name, cantidad]) => ({ 
            name: name.length > 20 ? name.substring(0, 20) + '...' : name, 
            cantidad 
          }))
        
        setTopProductos(tp.length ? tp : [{ name: 'Sin datos', cantidad: 0 }])

        // Compras vs Ventas (Last 6 months)
        const monthsStr = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
        const last6Months = Array.from({length: 6}, (_, i) => {
          const d = new Date()
          d.setMonth(d.getMonth() - (5 - i))
          return { monthNum: d.getMonth(), yearNum: d.getFullYear(), name: monthsStr[d.getMonth()] }
        })

        const cvsv = last6Months.map(m => {
          const vTotal = v.filter(x => {
            const d = new Date(x.fecha)
            return d.getMonth() === m.monthNum && d.getFullYear() === m.yearNum
          }).reduce((sum, x) => sum + x.total, 0)
          
          const cTotal = c.filter(x => {
            const d = new Date(x.fecha)
            return d.getMonth() === m.monthNum && d.getFullYear() === m.yearNum
          }).reduce((sum, x) => sum + x.total, 0)

          return { month: m.name, compras: cTotal, ventas: vTotal }
        })
        setComprasVsVentas(cvsv)

      } catch (err) {
        console.error('Error fetching reportes:', err)
      }
    }
    fetchData()
  }, [])

  const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

  return (
    <div className="animate-fade-in pb-10">
      <div style={{ marginBottom: '40px' }}>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
          Reportes y Analytics
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
          Métricas, indicadores y análisis del negocio
        </p>
      </div>

      <h2 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)', marginBottom: '20px' }}>Métricas Generales</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4" style={{ gap: '24px', marginBottom: '48px' }}>
        <AnalyticsCard
          title="Ingresos Hoy"
          value={new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(stats.ingresosHoy)}
          icon={<DollarSign size={24} />}
          color="#10b981"
        />
        <AnalyticsCard
          title="Ventas del Mes"
          value={stats.ventasMes.toString()}
          icon={<ShoppingCart size={24} />}
          color="#3b82f6"
        />
        <AnalyticsCard
          title="Productos Bajo Stock"
          value={stats.productosBajoStock.toString()}
          icon={<AlertTriangle size={24} />}
          color="#ef4444"
        />
        <AnalyticsCard
          title="Compras Pendientes"
          value={stats.comprasPendientes.toString()}
          icon={<Package size={24} />}
          color="#f59e0b"
        />
      </div>

      <h2 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)', marginBottom: '20px' }}>Indicadores Operativos</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4" style={{ gap: '24px', marginBottom: '48px' }}>
        <AnalyticsCard
          title="Caja Actual"
          value="$ 15.000,00"
          icon={<Wallet size={28} />}
          color="#10b981"
        />
        <AnalyticsCard
          title="Ganancia del Mes"
          value="$ 5.000,00"
          icon={<DollarSign size={28} />}
          color="#10b981"
        />
        <AnalyticsCard
          title="Stock Crítico"
          value="0"
          icon={<AlertTriangle size={28} />}
          color="#f59e0b"
        />
        <AnalyticsCard
          title="Crecimiento"
          value="100.0%"
          icon={<TrendingUp size={28} />}
          color="#8b5cf6"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2" style={{ gap: '32px' }}>
        {/* CHART 1: Ventas últimos 7 días */}
        <div className="card border shadow-sm rounded-xl bg-white flex flex-col h-[400px]" style={{ padding: '32px' }}>
          <h3 className="font-bold text-lg" style={{ color: 'var(--color-text-primary)', marginBottom: '24px' }}>Ventas últimos 7 días</h3>
          <div className="flex-1 w-full h-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={ventas7Dias} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={true} />
                <XAxis dataKey="date" tickLine={true} axisLine={true} tickMargin={10} tick={{ fontSize: 12, fill: '#6b7280' }} />
                <YAxis tickLine={true} axisLine={true} tickMargin={10} tickCount={5} tick={{ fontSize: 12, fill: '#6b7280' }} />
                <Tooltip />
                <Line type="monotone" dataKey="total" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CHART 2: Métodos de pago */}
        <div className="card border shadow-sm rounded-xl bg-white flex flex-col h-[400px]" style={{ padding: '32px' }}>
          <h3 className="font-bold text-lg" style={{ color: 'var(--color-text-primary)', marginBottom: '24px' }}>Métodos de pago (mes)</h3>
          <div className="flex-1 w-full h-full min-h-0 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={metodosPago}
                  cx="50%"
                  cy="50%"
                  outerRadius={110}
                  dataKey="value"
                  labelLine={true}
                  label={({ cx, cy, midAngle, outerRadius, value }: any) => {
                    const RADIAN = Math.PI / 180;
                    const radius = (outerRadius ?? 110) + 30;
                    const angle = midAngle ?? 0;
                    const x = (cx ?? 0) + radius * Math.cos(-angle * RADIAN);
                    const y = (cy ?? 0) + radius * Math.sin(-angle * RADIAN);
                    return (
                      <text x={x} y={y} fill="#3b82f6" textAnchor={x > (cx ?? 0) ? 'start' : 'end'} dominantBaseline="central" fontSize={14}>
                        {value}
                      </text>
                    );
                  }}
                >
                  {metodosPago.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36} iconType="circle" formatter={(value) => <span style={{ color: '#3b82f6' }}>{value}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CHART 3: Top 5 productos */}
        <div className="card border shadow-sm rounded-xl bg-white flex flex-col h-[400px]" style={{ padding: '32px' }}>
          <h3 className="font-bold text-lg" style={{ color: 'var(--color-text-primary)', marginBottom: '24px' }}>Top 5 productos vendidos (mes)</h3>
          <div className="flex-1 w-full h-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topProductos} layout="vertical" margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} vertical={true} />
                <XAxis type="number" tickLine={true} axisLine={true} tickCount={5} tick={{ fontSize: 12, fill: '#6b7280' }} />
                <YAxis dataKey="name" type="category" tickLine={true} axisLine={true} width={130} tick={<CustomYAxisTick />} />
                <Tooltip cursor={{ fill: 'transparent' }} />
                <Bar dataKey="cantidad" fill="#10b981" radius={[0, 4, 4, 0]} barSize={80} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CHART 4: Compras vs Ventas */}
        <div className="card border shadow-sm rounded-xl bg-white flex flex-col h-[400px]" style={{ padding: '32px' }}>
          <h3 className="font-bold text-lg" style={{ color: 'var(--color-text-primary)', marginBottom: '24px' }}>Compras vs Ventas (últimos 6 meses)</h3>
          <div className="flex-1 w-full h-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comprasVsVentas} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={true} />
                <XAxis dataKey="month" tickLine={true} axisLine={true} tickMargin={10} tick={{ fontSize: 12, fill: '#6b7280' }} />
                <YAxis tickLine={true} axisLine={true} tickMargin={10} tick={{ fontSize: 12, fill: '#6b7280' }} />
                <Tooltip cursor={{ fill: 'transparent' }} />
                <Legend verticalAlign="bottom" height={36} iconType="square" formatter={(value) => <span style={{ color: value === 'compras' ? '#f59e0b' : '#3b82f6' }}>{value}</span>} />
                <Bar dataKey="compras" name="compras" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={20} />
                <Bar dataKey="ventas" name="ventas" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}
