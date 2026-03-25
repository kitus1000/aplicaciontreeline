-- =========================================================================
-- SCRIPT DE BASE DE DATOS - WORKTRACK RH (Fase 1)
-- Ejecutar en el Editor SQL de Supabase
-- =========================================================================

-- 1. REGLAS DE PAGO (Globales y Excepciones)
CREATE TABLE IF NOT EXISTS employee_pay_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scope_type TEXT NOT NULL DEFAULT 'global', -- 'global' | 'individual'
    employee_id UUID REFERENCES empleados(id_empleado) ON DELETE CASCADE,
    payment_type TEXT DEFAULT 'hora', -- 'hora' | 'dia' | 'mixto'
    hourly_rate NUMERIC(10,2) DEFAULT 0,
    daily_rate NUMERIC(10,2) DEFAULT 0,
    standard_hours NUMERIC(4,2) DEFAULT 8.0,
    overtime_threshold NUMERIC(4,2) DEFAULT 8.0,
    allow_overtime BOOLEAN DEFAULT TRUE,
    rounding_rule TEXT DEFAULT 'none', -- 'none' | '15min' | '30min' | '1hour'
    day_count_rule TEXT DEFAULT 'minimum_hours', -- 'any' | 'minimum_hours' | 'half_full'
    min_hours_for_day NUMERIC(4,2) DEFAULT 4.0,
    meal_discount_enabled BOOLEAN DEFAULT FALSE,
    meal_discount_minutes INT DEFAULT 0,
    approval_mode TEXT DEFAULT 'daily', -- 'daily' | 'weekly'
    bonus_enabled BOOLEAN DEFAULT TRUE,
    notes TEXT,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(scope_type, employee_id) -- Solo una regla individual por empleado, una global
);

-- 2. EVENTOS DE JORNADA (Asistencia ampliada)
-- Nota: Basado en la tabla 'checadas' pero con la estructura solicitada
CREATE TABLE IF NOT EXISTS workday_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES empleados(id_empleado) ON DELETE CASCADE,
    date DATE NOT NULL,
    event_type TEXT NOT NULL, -- ENTRADA, SALIDA, COMIDA_IN, COMIDA_OUT, etc.
    event_time TIMESTAMPTZ NOT NULL DEFAULT now(),
    location JSONB, -- { latitude, longitude, accuracy }
    notes TEXT,
    source TEXT DEFAULT 'web', -- web | móvil | kiosco
    evidence_url TEXT,
    language TEXT DEFAULT 'es',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. ACTIVIDADES DIARIAS (Trabajo realizado)
CREATE TABLE IF NOT EXISTS workday_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES empleados(id_empleado) ON DELETE CASCADE,
    date DATE NOT NULL,
    project_id UUID, -- Referencia opcional a proyectos si existen
    area_id UUID,    -- Referencia opcional a áreas si existen
    activity_name TEXT NOT NULL,
    description TEXT,
    hours_dedicated NUMERIC(4,2) NOT NULL DEFAULT 0,
    status TEXT DEFAULT 'pending', -- pending | completed
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. EVIDENCIAS / ADJUNTOS
CREATE TABLE IF NOT EXISTS workday_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES empleados(id_empleado) ON DELETE CASCADE,
    workday_id DATE NOT NULL, -- Agrupamos por fecha
    activity_id UUID REFERENCES workday_activities(id) ON DELETE SET NULL,
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    storage_provider TEXT DEFAULT 'google_drive',
    external_file_id TEXT, -- ID de Google Drive
    logical_path TEXT, -- Carpeta en Drive: 2026/03-Marzo/2026-03-23/JuanPerez
    uploaded_at TIMESTAMPTZ DEFAULT now()
);

-- 5. ESTADO DE AUTORIZACIÓN DE LA JORNADA
CREATE TABLE IF NOT EXISTS workday_approval_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES empleados(id_empleado) ON DELETE CASCADE,
    date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'sent', 'under_review', 'authorized', 'rejected', 'closed'
    reviewed_by UUID REFERENCES perfiles(id),
    reviewed_at TIMESTAMPTZ,
    comments TEXT,
    approval_mode TEXT DEFAULT 'daily', -- 'daily' | 'weekly'
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(employee_id, date)
);

-- 6. BONOS DE PRENÓMINA
CREATE TABLE IF NOT EXISTS payroll_bonus (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES empleados(id_empleado) ON DELETE CASCADE,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    bonus_type TEXT NOT NULL,
    reason TEXT,
    internal_notes TEXT,
    created_by UUID REFERENCES perfiles(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. RESUMEN DE PERIODO DE PRENÓMINA (Cache de cálculos)
CREATE TABLE IF NOT EXISTS payroll_period_summary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES empleados(id_empleado) ON DELETE CASCADE,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    total_hours_regular NUMERIC(10,2) DEFAULT 0,
    total_hours_overtime NUMERIC(10,2) DEFAULT 0,
    total_days_worked INT DEFAULT 0,
    total_base_pay NUMERIC(10,2) DEFAULT 0,
    total_bonus NUMERIC(10,2) DEFAULT 0,
    total_net_pay NUMERIC(10,2) DEFAULT 0,
    status TEXT DEFAULT 'pending', -- pending | authorized | paid
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(employee_id, period_start, period_end)
);

-- =========================================================================
-- ACTUALIZACIÓN DE CATÁLOGOS EXISTENTES
-- =========================================================================

-- Asegurar nuevos tipos de checada en 'cat_tipos_checada'
INSERT INTO cat_tipos_checada (tipo, label, requiere_codigo, color, ordinal) 
VALUES
  ('REGRESO_PERMISO_PERSONAL', 'REGRESO PERMISO PERSONAL', false, 'bg-blue-400', 7),
  ('REGRESO_OPERACIONES', 'REGRESO OPERACIONES', false, 'bg-indigo-400', 8),
  ('SALIDA_FINAL', 'SALIDA FINAL', false, 'bg-red-800', 9)
ON CONFLICT (tipo) DO NOTHING;

-- Índices para optimización
CREATE INDEX IF NOT EXISTS idx_workday_events_emp_date ON workday_events(employee_id, date);
CREATE INDEX IF NOT EXISTS idx_workday_activities_emp_date ON workday_activities(employee_id, date);
CREATE INDEX IF NOT EXISTS idx_workday_approval_status_emp_date ON workday_approval_status(employee_id, date);
CREATE INDEX IF NOT EXISTS idx_payroll_bonus_emp_period ON payroll_bonus(employee_id, period_start, period_end);

-- Políticas RLS Básicas (Siguiendo el estilo existente)
ALTER TABLE employee_pay_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE workday_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE workday_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE workday_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE workday_approval_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_bonus ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_period_summary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir lectura general" ON employee_pay_rules FOR SELECT USING (true);
CREATE POLICY "Permitir lectura general workday_events" ON workday_events FOR SELECT USING (true);
CREATE POLICY "Permitir insert workday_events" ON workday_events FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir lectura general workday_activities" ON workday_activities FOR SELECT USING (true);
CREATE POLICY "Permitir insert workday_activities" ON workday_activities FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir lectura general workday_attachments" ON workday_attachments FOR SELECT USING (true);
CREATE POLICY "Permitir insert workday_attachments" ON workday_attachments FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir lectura general workday_approval_status" ON workday_approval_status FOR SELECT USING (true);
CREATE POLICY "Permitir update workday_approval_status" ON workday_approval_status FOR UPDATE USING (true);
CREATE POLICY "Permitir lectura general payroll_bonus" ON payroll_bonus FOR SELECT USING (true);
CREATE POLICY "Permitir lectura general payroll_period_summary" ON payroll_period_summary FOR SELECT USING (true);
