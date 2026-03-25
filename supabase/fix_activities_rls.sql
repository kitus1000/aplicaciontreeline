-- REPARACIÓN DE PERMISOS RLS PARA GUARDAR EVIDENCIAS Y ACTIVIDADES
-- Ejecuta este código en el panel de SQL Editor de Supabase.

-- Habilitamos explícitamente los permisos para insertar y actualizar actividades.
DROP POLICY IF EXISTS "Permitir insert workday_activities" ON workday_activities;
CREATE POLICY "Permitir insert workday_activities" 
ON workday_activities 
FOR INSERT 
WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir update workday_activities" ON workday_activities;
CREATE POLICY "Permitir update workday_activities" 
ON workday_activities 
FOR UPDATE 
USING (true);

DROP POLICY IF EXISTS "Permitir select workday_activities" ON workday_activities;
CREATE POLICY "Permitir select workday_activities" 
ON workday_activities 
FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Permitir delete workday_activities" ON workday_activities;
CREATE POLICY "Permitir delete workday_activities" 
ON workday_activities 
FOR DELETE 
USING (true);

-- Nos aseguramos también de que workday_events se pueda leer siempre (necesario para "Mi Trabajo Hoy")
DROP POLICY IF EXISTS "Permitir select workday_events" ON workday_events;
CREATE POLICY "Permitir select workday_events" 
ON workday_events 
FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Permitir insert workday_events" ON workday_events;
CREATE POLICY "Permitir insert workday_events" 
ON workday_events 
FOR INSERT 
WITH CHECK (true);
