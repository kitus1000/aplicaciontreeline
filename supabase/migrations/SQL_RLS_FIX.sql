-- =========================================================================
-- FIX DE PERMISOS (RLS) PARA REGLAS DE PAGO Y EVIDENCIAS
-- Ejecutar en el Editor SQL de Supabase
-- =========================================================================

-- 1. Políticas para employee_pay_rules
-- Permitir insertar, actualizar y borrar reglas (para administradores/jefes)
DROP POLICY IF EXISTS "Permitir insert employee_pay_rules" ON employee_pay_rules;
CREATE POLICY "Permitir insert employee_pay_rules" ON employee_pay_rules FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir update employee_pay_rules" ON employee_pay_rules;
CREATE POLICY "Permitir update employee_pay_rules" ON employee_pay_rules FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Permitir delete employee_pay_rules" ON employee_pay_rules;
CREATE POLICY "Permitir delete employee_pay_rules" ON employee_pay_rules FOR DELETE USING (true);

-- 2. Asegurar que las evidencias permitan lectura y escritura
-- (Ya existen pero las reforzamos si es necesario)
DROP POLICY IF EXISTS "Permitir update workday_attachments" ON workday_attachments;
CREATE POLICY "Permitir update workday_attachments" ON workday_attachments FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Permitir delete workday_attachments" ON workday_attachments;
CREATE POLICY "Permitir delete workday_attachments" ON workday_attachments FOR DELETE USING (true);

-- NOTA: Asegúrate de crear el bucket 'worktrack-evidences' en Storage -> Buckets
-- Y configurarlo como PÚBLICO para que las URLs funcionen correctamente.
