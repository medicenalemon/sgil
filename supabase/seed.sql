-- ============================================
-- SGIL v2.0 — Seed Data
-- Datos de ejemplo iguales a las capturas de referencia
-- ============================================

-- Categorías
INSERT INTO categorias (nombre) VALUES
  ('Libros'),
  ('Cuadernos y Anotadores'),
  ('Útiles Escolares'),
  ('Arte y Manualidades'),
  ('Juegos y Juguetes');

-- Ubicaciones
INSERT INTO ubicaciones (nombre) VALUES
  ('Estante A - Planta Baja'),
  ('Estante B - Planta Baja'),
  ('Estante C - Primer Piso'),
  ('Depósito'),
  ('Vitrina Principal');

-- Proveedores
INSERT INTO proveedores (razon_social, cuit, telefono, email, contacto, direccion) VALUES
  ('Papelera Tucumán S.A.', '30-71234567-8', '0381-4567890', 'ventas@papeleratucuman.com.ar', 'Carlos Medina', 'Av. Sáenz Peña 450, San Miguel de Tucumán'),
  ('Tucujuegos S.R.L.', '30-71987654-3', '0381-4321098', 'info@tucujuegos.com.ar', 'María García', 'Calle Junín 230, San Miguel de Tucumán'),
  ('Editorial Kapelusz', '30-50112233-9', '011-4555-6677', 'distribuidores@kapelusz.com.ar', 'Roberto Sánchez', 'Av. Corrientes 1500, CABA'),
  ('Distribuidora del Norte', '30-71555888-1', '0381-4888999', 'pedidos@distrinorte.com.ar', 'Ana López', 'Ruta 9 Km 1290, Yerba Buena');

-- Clientes
INSERT INTO clientes (nombre, telefono, email, direccion, observaciones) VALUES
  ('Mauricio Montero', '0381-155-1234', 'mauricio.montero@gmail.com', 'Calle Laprida 567, San Miguel de Tucumán', 'Cliente frecuente'),
  ('Gabriela Montero', '0381-155-5678', 'gabriela.montero@gmail.com', 'Calle San Martín 890, San Miguel de Tucumán', NULL),
  ('Escuela Nº 42 "Belgrano"', '0381-4222333', 'escuela42@tucuman.edu.ar', 'Av. Mate de Luna 2000, San Miguel de Tucumán', 'Compras institucionales'),
  ('Librería El Estudiante', '0381-4111222', 'contacto@elestudiante.com.ar', 'Calle 24 de Septiembre 300, San Miguel de Tucumán', 'Reventa - mayorista'),
  ('Ana Rodríguez', '0381-155-9012', 'ana.rodriguez@gmail.com', 'B° Sur, Mz. 5, Casa 12, Tucumán', NULL);

-- Productos
INSERT INTO productos (codigo, nombre, descripcion, precio_compra, precio_venta, stock, stock_minimo, categoria_id, proveedor_id, ubicacion_id) VALUES
  ('LIB-001', 'Cuaderno Rivadavia 48 hojas', 'Cuaderno tapa dura, rayado, 48 hojas', 350.00, 550.00, 150, 20, 2, 1, 1),
  ('LIB-002', 'Resma A4 75gr (500 hojas)', 'Resma de papel A4, 75 gramos, 500 hojas', 2800.00, 4200.00, 45, 10, 3, 1, 4),
  ('LIB-003', 'Set de Pinturas Acrílicas x12', 'Set de 12 colores acrílicos, tubos de 20ml', 1500.00, 2800.00, 30, 5, 4, 4, 5),
  ('LIB-004', 'Rompecabezas 1000 piezas', 'Rompecabezas paisaje de montaña, 1000 piezas', 3200.00, 5500.00, 12, 3, 5, 2, 3),
  ('LIB-005', 'El Principito - Saint-Exupéry', 'Edición ilustrada de El Principito', 1200.00, 2100.00, 25, 5, 1, 3, 1);
