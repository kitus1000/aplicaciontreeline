-- =========================================================================
-- PARTE 6: SISTEMA DE TURNOS Y HORARIOS FIJOS
-- =========================================================================

-- 6.1 Tabla de Turnos (Catálogo)
CREATE TABLE IF NOT EXISTS turnos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    tolerancia_min INT DEFAULT 15,
    limite_falta_min INT DEFAULT 60,
    ventana_desde TIME DEFAULT '04:00',
    ventana_hasta TIME DEFAULT '12:00',
    activo BOOLEAN DEFAULT TRUE,
    creado_el TIMESTAMPTZ DEFAULT now()
);

-- 6.2 Relación con Empleados (Horario Fijo)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid = 'empleados'::regclass AND attname = 'id_turno') THEN
        ALTER TABLE empleados ADD COLUMN id_turno UUID REFERENCES turnos(id);
    END IF;
END $$;

-- 6.3 Políticas de Seguridad (RLS)
ALTER TABLE turnos ENABLE ROW LEVEL SECURITY;

-- Nota: Estas políticas asumen que el script 04_SECURITY_AND_POLICIES.sql 
-- ya definió la lógica de "Lectura General" y "Escritura General".
-- Si no, las definimos aquí específicamente para turnos:

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'turnos' AND policyname = 'Lectura General') THEN
        CREATE POLICY "Lectura General" ON turnos FOR SELECT USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'turnos' AND policyname = 'Escritura General Insert') THEN
        CREATE POLICY "Escritura General Insert" ON turnos FOR INSERT WITH CHECK (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'turnos' AND policyname = 'Escritura General Update') THEN
        CREATE POLICY "Escritura General Update" ON turnos FOR UPDATE USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'turnos' AND policyname = 'Escritura General Delete') THEN
        CREATE POLICY "Escritura General Delete" ON turnos FOR DELETE USING (true);
    END IF;
END $$;
