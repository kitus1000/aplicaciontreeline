-- ==========================================
-- MÓDULO FINANCIERO Y PROYECTOS
-- Creado para: RH-System / Construcción
-- ==========================================

-- 1. TABLA: PROYECTOS
CREATE TABLE IF NOT EXISTS proyectos (
    id_proyecto UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    direccion TEXT,
    fecha_inicio DATE,
    fecha_fin DATE,
    presupuesto_estimado NUMERIC(14, 2) DEFAULT 0.00,
    precio_cobrado NUMERIC(14, 2) DEFAULT 0.00,
    estatus TEXT DEFAULT 'Iniciado' CHECK (estatus IN ('Iniciado', 'Progreso', 'Finalizado')),
    is_deleted BOOLEAN DEFAULT FALSE,
    creado_el TIMESTAMPTZ DEFAULT now(),
    actualizado_el TIMESTAMPTZ DEFAULT now()
);

-- 2. TABLA: TRANSACCIONES (Gastos, Costos, Nómina)
CREATE TABLE IF NOT EXISTS transacciones_financieras (
    id_transaccion UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_proyecto UUID REFERENCES proyectos(id_proyecto) ON DELETE SET NULL,
    tipo_transaccion TEXT NOT NULL CHECK (tipo_transaccion IN ('Costo_Directo', 'Gasto_Indirecto', 'Nomina')),
    monto NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    descripcion_texto TEXT NOT NULL,
    url_foto_evidencia TEXT,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    creado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    is_deleted BOOLEAN DEFAULT FALSE,
    creado_el TIMESTAMPTZ DEFAULT now(),
    actualizado_el TIMESTAMPTZ DEFAULT now()
);

-- 3. HABILITAR ROW LEVEL SECURITY (RLS)
ALTER TABLE proyectos ENABLE ROW LEVEL SECURITY;
ALTER TABLE transacciones_financieras ENABLE ROW LEVEL SECURITY;

-- 4. POLÍTICAS DE SEGURIDAD (RLS)
-- Todos los usuarios autenticados pueden ver los proyectos no eliminados
CREATE POLICY "Public Read Proyectos" ON proyectos 
    FOR SELECT USING (is_deleted = FALSE);

-- Solo usuarios con ciertos roles pueden insertar/modificar proyectos (opcional: por ahora todos los autenticados)
CREATE POLICY "Authenticated All Proyectos" ON proyectos 
    FOR ALL USING (auth.uid() IS NOT NULL);

-- Transacciones
CREATE POLICY "Public Read Transacciones" ON transacciones_financieras 
    FOR SELECT USING (is_deleted = FALSE);

CREATE POLICY "Authenticated All Transacciones" ON transacciones_financieras 
    FOR ALL USING (auth.uid() IS NOT NULL);

-- 5. STORAGE BUCKETS (Para tickets/evidencias financieras si no existe)
-- Se asume que existe un bucket llamado 'archivos' o 'evidencias'.
-- En Supabase, debes asegurarte de que el bucket exista para subir las fotos de los gastos.
-- INSERT INTO storage.buckets (id, name, public) VALUES ('gastos_tickets', 'gastos_tickets', true) ON CONFLICT DO NOTHING;
-- CREATE POLICY "Public Access Gastos Tickets" ON storage.objects FOR SELECT USING (bucket_id = 'gastos_tickets');
-- CREATE POLICY "Authenticated Insert Gastos Tickets" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'gastos_tickets' AND auth.uid() IS NOT NULL);
