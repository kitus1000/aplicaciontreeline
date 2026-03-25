-- =========================================================================
-- PARTE 4: SEGURIDAD (RLS) Y PERMISOS (COMPLETO)
-- =========================================================================

-- 4.1 Activar RLS en todas las tablas (Incluyendo las de RRHH e Incidencias)
ALTER TABLE cat_unidades_trabajo ENABLE ROW LEVEL SECURITY;
ALTER TABLE cat_departamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE cat_puestos ENABLE ROW LEVEL SECURITY;
ALTER TABLE cat_cecos ENABLE ROW LEVEL SECURITY;
ALTER TABLE cat_tipos_rol ENABLE ROW LEVEL SECURITY;
ALTER TABLE cat_tipos_incidencia ENABLE ROW LEVEL SECURITY;
ALTER TABLE cat_tipos_solicitud ENABLE ROW LEVEL SECURITY;
ALTER TABLE cat_periodos_vacacionales ENABLE ROW LEVEL SECURITY;
ALTER TABLE cat_causas_baja ENABLE ROW LEVEL SECURITY;
ALTER TABLE cat_causas_baja_imss ENABLE ROW LEVEL SECURITY;

ALTER TABLE empleados ENABLE ROW LEVEL SECURITY;
ALTER TABLE empleado_ingreso ENABLE ROW LEVEL SECURITY;
ALTER TABLE empleado_domicilio ENABLE ROW LEVEL SECURITY;
ALTER TABLE empleado_banco ENABLE ROW LEVEL SECURITY;
ALTER TABLE empleado_adscripciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE empleado_salarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE empleado_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE empleado_incidencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE vacaciones_saldos ENABLE ROW LEVEL SECURITY;
ALTER TABLE solicitudes ENABLE ROW LEVEL SECURITY;
ALTER TABLE solicitud_aprobaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE reglas_aprobacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE bajas ENABLE ROW LEVEL SECURITY;
ALTER TABLE perfiles ENABLE ROW LEVEL SECURITY;

ALTER TABLE employee_pay_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE workday_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE workday_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE workday_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE workday_approval_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_bonus ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_period_summary ENABLE ROW LEVEL SECURITY;

-- 4.2 Políticas de Lectura General
DO $$
DECLARE
    table_name_var TEXT;
BEGIN
    FOR table_name_var IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "Lectura General" ON ' || table_name_var;
        EXECUTE 'CREATE POLICY "Lectura General" ON ' || table_name_var || ' FOR SELECT USING (true)';
    END LOOP;
END $$;

-- 4.3 Políticas de Escritura General (Administradores/Jefes/Sistema)
-- Nota: Para entorno de desarrollo, permitimos inserción/actualización total.
DO $$
DECLARE
    table_name_var TEXT;
BEGIN
    FOR table_name_var IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
    LOOP
        -- Permitir Insert
        EXECUTE 'DROP POLICY IF EXISTS "Escritura General Insert" ON ' || table_name_var;
        EXECUTE 'CREATE POLICY "Escritura General Insert" ON ' || table_name_var || ' FOR INSERT WITH CHECK (true)';
        -- Permitir Update
        EXECUTE 'DROP POLICY IF EXISTS "Escritura General Update" ON ' || table_name_var;
        EXECUTE 'CREATE POLICY "Escritura General Update" ON ' || table_name_var || ' FOR UPDATE USING (true)';
        -- Permitir Delete
        EXECUTE 'DROP POLICY IF EXISTS "Escritura General Delete" ON ' || table_name_var;
        EXECUTE 'CREATE POLICY "Escritura General Delete" ON ' || table_name_var || ' FOR DELETE USING (true)';
    END LOOP;
END $$;
