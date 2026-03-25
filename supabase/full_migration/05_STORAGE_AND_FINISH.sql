-- =========================================================================
-- PARTE 5: ALMACENAMIENTO (STORAGE) E ÍNDICES FINALES
-- =========================================================================

-- 5.1 Índices para Optimización de Consultas
CREATE INDEX IF NOT EXISTS idx_workday_events_emp_date ON workday_events(employee_id, date);
CREATE INDEX IF NOT EXISTS idx_workday_activities_emp_date ON workday_activities(employee_id, date);
CREATE INDEX IF NOT EXISTS idx_workday_approval_status_emp_date ON workday_approval_status(employee_id, date);
CREATE INDEX IF NOT EXISTS idx_payroll_bonus_emp_period ON payroll_bonus(employee_id, period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_empleados_celular ON empleados(telefono);
CREATE INDEX IF NOT EXISTS idx_empleados_correo ON empleados(correo_electronico);

-- 5.2 Configuración de Timezone
ALTER DATABASE postgres SET timezone TO 'America/Mexico_City';

-- =========================================================================
-- INSTRUCCIONES MANUALES PARA STORAGE
-- =========================================================================
-- 1. Ve a la sección 'Storage' en tu panel de Supabase.
-- 2. Crea un nuevo Bucket llamado: worktrack-evidences
-- 3. IMPORTANTE: Marca el Bucket como PUBLIC (Público) para que las fotos sean visibles.
-- 4. Si deseas más seguridad, puedes dejarlo privado y añadir políticas RLS de Storage.
-- =========================================================================

-- 5.3 Trigger para actualización automática de 'updated_at' (Opcional pero recomendado)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_employee_pay_rules_updated_at ON employee_pay_rules;
CREATE TRIGGER update_employee_pay_rules_updated_at
BEFORE UPDATE ON employee_pay_rules
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_workday_approval_status_updated_at ON workday_approval_status;
CREATE TRIGGER update_workday_approval_status_updated_at
BEFORE UPDATE ON workday_approval_status
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
