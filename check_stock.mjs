import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://bicvmqmbgntafofgwfin.supabase.co'
const supabaseAnonKey = 'sb_publishable_Dq8AFLFJdOEMs3GvNIM0tw_tulDylvR'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function main() {
  // Find products that contain "UNO"
  const { data: productos } = await supabase
    .from('productos')
    .select('id, nombre, stock')
    .ilike('nombre', '%UNO%')
    
  console.log('Productos:', productos)

  if (productos && productos.length > 0) {
    const ids = productos.map(p => p.id)
    const { data: movimientos } = await supabase
      .from('movimientos_stock')
      .select('*')
      .in('producto_id', ids)
      .order('fecha', { ascending: true })

    console.log('\nMovimientos de Stock:')
    movimientos.forEach(m => {
      const prodName = productos.find(p => p.id === m.producto_id)?.nombre
      console.log(`[${m.fecha}] ${prodName} | ${m.tipo.toUpperCase()} | Cantidad: ${m.cantidad} | Motivo: ${m.motivo} | Ref: ${m.referencia_tipo} #${m.referencia_id}`)
    })
  }
}

main()
