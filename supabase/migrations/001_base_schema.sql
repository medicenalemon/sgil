-- ============================================
-- SGIL v2.0 — Migration 001: Base Schema
-- ============================================

-- Roles del sistema
create type user_role as enum ('administrador', 'encargado', 'vendedor');

-- Perfiles (extiende auth.users)
create table profiles (
  id uuid primary key references auth.users(id),
  username text unique not null,
  email text not null,
  role user_role not null,
  active boolean default true,
  protected boolean default false,
  created_at timestamptz default now()
);

-- Catálogos
create table categorias (id serial primary key, nombre text unique not null);
create table ubicaciones (id serial primary key, nombre text unique not null);

-- Proveedores
create table proveedores (
  id serial primary key,
  razon_social text not null,
  cuit text,
  telefono text,
  email text,
  contacto text,
  direccion text,
  activo boolean default true,
  created_at timestamptz default now()
);

-- Clientes
create table clientes (
  id serial primary key,
  nombre text not null,
  telefono text,
  email text,
  direccion text,
  observaciones text,
  activo boolean default true,
  created_at timestamptz default now()
);

-- Productos
create table productos (
  id serial primary key,
  codigo text unique not null,
  nombre text not null,
  descripcion text,
  precio_compra numeric(12,2) default 0,
  precio_venta numeric(12,2) default 0,
  stock int default 0,
  stock_minimo int default 0,
  categoria_id int references categorias(id),
  proveedor_id int references proveedores(id),
  ubicacion_id int references ubicaciones(id),
  activo boolean default true,
  created_at timestamptz default now()
);

-- Ventas
create table ventas (
  id serial primary key,
  fecha timestamptz default now(),
  cliente_id int references clientes(id),
  metodo_pago text check (metodo_pago in ('Efectivo','Tarjeta deb.','Tarjeta cred.','Transferencia','Mercado Pago')),
  total numeric(12,2) not null,
  usuario_id uuid references profiles(id)
);

create table venta_items (
  id serial primary key,
  venta_id int references ventas(id) on delete cascade,
  producto_id int references productos(id),
  cantidad int not null,
  precio_unitario numeric(12,2) not null,
  subtotal numeric(12,2) not null
);

-- Compras
create table compras (
  id serial primary key,
  fecha timestamptz default now(),
  proveedor_id int references proveedores(id),
  total numeric(12,2) not null,
  usuario_id uuid references profiles(id)
);

create table compra_items (
  id serial primary key,
  compra_id int references compras(id) on delete cascade,
  producto_id int references productos(id),
  cantidad int not null,
  precio_unitario numeric(12,2) not null,
  subtotal numeric(12,2) not null
);

-- Devoluciones de compra
create table devoluciones_compra (
  id serial primary key,
  fecha timestamptz default now(),
  compra_id int references compras(id),
  producto_id int references productos(id),
  cantidad int not null,
  motivo text check (motivo in ('Producto dañado','Producto defectuoso','Error en el pedido','Producto vencido','No coincide con orden de compra','Otro')),
  observaciones text,
  valor numeric(12,2) not null,
  usuario_id uuid references profiles(id)
);

-- Devoluciones de venta
create table devoluciones_venta (
  id serial primary key,
  fecha timestamptz default now(),
  venta_id int references ventas(id),
  producto_id int references productos(id),
  cantidad int not null,
  motivo text check (motivo in ('Producto defectuoso','Producto incorrecto','No cumple expectativas','Cliente arrepentido','Producto dañado en transporte','Otro')),
  observaciones text,
  valor numeric(12,2) not null,
  usuario_id uuid references profiles(id)
);

-- Movimientos de stock
create table movimientos_stock (
  id serial primary key,
  fecha timestamptz default now(),
  producto_id int references productos(id),
  tipo text check (tipo in ('entrada','salida')),
  cantidad int not null,
  motivo text not null,
  referencia_tipo text,
  referencia_id int,
  usuario_id uuid references profiles(id)
);

-- Caja
create table caja_sesiones (
  id serial primary key,
  usuario_id uuid references profiles(id),
  fecha_apertura timestamptz default now(),
  fecha_cierre timestamptz,
  monto_inicial numeric(12,2) not null,
  monto_declarado numeric(12,2),
  monto_calculado numeric(12,2),
  diferencia numeric(12,2),
  estado text check (estado in ('abierta','cerrada')) default 'abierta',
  observaciones_apertura text,
  observaciones_cierre text
);

create table caja_movimientos (
  id serial primary key,
  sesion_id int references caja_sesiones(id) on delete cascade,
  tipo text check (tipo in ('ingreso','egreso','arqueo')),
  monto numeric(12,2) not null,
  descripcion text,
  fecha timestamptz default now(),
  usuario_id uuid references profiles(id)
);

-- Auditoría
create table auditorias (
  id serial primary key,
  usuario_id uuid references profiles(id),
  fecha timestamptz default now(),
  modulo text not null,
  accion text not null,
  detalle jsonb
);
