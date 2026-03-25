-- =========================================================================
-- PARTE 2: NÚCLEO WORKTRACK RH (ASISTENCIA, PRENÓMINA Y SOLICITUDES)
-- =========================================================================

-- 2.1 Reglas de Pago
CREATE TABLE IF NOT EXISTS employee_pay_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scope_type TEXT NOT NULL DEFAULT 'global', -- 'global' | 'individual'
    employee_id UUID REFERENCES empleados(id_empleado) ON DELETE CASCADE,
    payment_type TEXT DEFAULT 'hora',
    hourly_rate NUMERIC(10,2) DEFAULT 0,
    daily_rate NUMERIC(10,2) DEFAULT 0,
    standard_hours NUMERIC(4,2) DEFAULT 8.0,
    overtime_threshold NUMERIC(4,2) DEFAULT 8.0,
    allow_overtime BOOLEAN DEFAULT TRUE,
    rounding_rule TEXT DEFAULT 'none',
    day_count_rule TEXT DEFAULT 'minimum_hours',
    min_hours_for_day NUMERIC(4,2) DEFAULT 4.0,
    meal_discount_enabled BOOLEAN DEFAULT FALSE,
    meal_discount_minutes INT DEFAULT 0,
    approval_mode TEXT DEFAULT 'daily',
    bonus_enabled BOOLEAN DEFAULT TRUE,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(scope_type, employee_id)
);

-- 2.2 Eventos de Jornada y Actividades
CREATE TABLE IF NOT EXISTS workday_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES empleados(id_empleado) ON DELETE CASCADE,
    date DATE NOT NULL,
    event_type TEXT NOT NULL,
    event_time TIMESTAMPTZ NOT NULL DEFAULT now(),
    location JSONB,
    notes TEXT,
    source TEXT DEFAULT 'web',
    evidence_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workday_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES empleados(id_empleado) ON DELETE CASCADE,
    date DATE NOT NULL,
    activity_name TEXT NOT NULL,
    description TEXT,
    hours_dedicated NUMERIC(4,2) NOT NULL DEFAULT 0,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2.3 Solicitudes y Aprobaciones
CREATE TABLE IF NOT EXISTS solicitudes (
    id_solicitud UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_tipo_solicitud UUID REFERENCES cat_tipos_solicitud(id_tipo_solicitud),
    id_empleado_objetivo UUID REFERENCES empleados(id_empleado),
    folio TEXT UNIQUE,
    estatus TEXT DEFAULT 'Borrador',
    payload JSONB,
    creado_por UUID,
    creado_el TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS solicitud_aprobaciones (
    id_solicitud UUID REFERENCES solicitudes(id_solicitud) ON DELETE CASCADE,
    orden INT NOT NULL,
    aprobador_user_id UUID NOT NULL,
    estatus TEXT DEFAULT 'Pendiente',
    comentario TEXT,
    decidido_el TIMESTAMPTZ,
    PRIMARY KEY (id_solicitud, orden)
);

CREATE TABLE IF NOT EXISTS reglas_aprobacion (
    id_regla UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_tipo_solicitud UUID REFERENCES cat_tipos_solicitud(id_tipo_solicitud),
    orden INT NOT NULL,
    aprobador_user_id UUID,
    filtro JSONB,
    activo BOOLEAN DEFAULT TRUE
);

-- 2.4 Bajas
CREATE TABLE IF NOT EXISTS cat_causas_baja (
    id_causa_baja UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    causa TEXT NOT NULL,
    requiere_evidencia BOOLEAN DEFAULT FALSE,
    rol_iniciador TEXT DEFAULT 'Jefe',
    activo BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS cat_causas_baja_imss (
    id_causa_imss UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clave TEXT NOT NULL,
    descripcion TEXT NOT NULL,
    activo BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS bajas (
    id_empleado UUID REFERENCES empleados(id_empleado) PRIMARY KEY,
    fecha_baja DATE NOT NULL,
    tipo_baja TEXT, 
    motivo_baja TEXT,
    id_solicitud UUID REFERENCES solicitudes(id_solicitud),
    id_causa_baja UUID REFERENCES cat_causas_baja(id_causa_baja),
    id_causa_imss UUID REFERENCES cat_causas_baja_imss(id_causa_imss),
    creado_el TIMESTAMPTZ DEFAULT now()
);

-- 2.5 Evidencias y Estados
CREATE TABLE IF NOT EXISTS workday_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES empleados(id_empleado) ON DELETE CASCADE,
    workday_id DATE NOT NULL,
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    storage_provider TEXT DEFAULT 'supabase',
    external_file_id TEXT,
    logical_path TEXT,
    uploaded_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workday_approval_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES empleados(id_empleado) ON DELETE CASCADE,
    date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft',
    reviewed_at TIMESTAMPTZ,
    comments TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(employee_id, date)
);

-- 2.6 Prenómina
CREATE TABLE IF NOT EXISTS payroll_bonus (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES empleados(id_empleado) ON DELETE CASCADE,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    bonus_type TEXT NOT NULL,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

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
    status TEXT DEFAULT 'pending',
    UNIQUE(employee_id, period_start, period_end)
);
