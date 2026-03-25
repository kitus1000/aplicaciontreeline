-- CORRECCIÓN DE TABLA DE ACTIVIDADES Y EVIDENCIAS
-- Ejecuta este SQL en el panel de Supabase (SQL Editor)

-- 1. Agregar columnas faltantes a workday_activities
ALTER TABLE workday_activities ADD COLUMN IF NOT EXISTS storage_url TEXT;
ALTER TABLE workday_activities ADD COLUMN IF NOT EXISTS activity_description TEXT;

-- 2. Asegurar que el bucket existe (Si no existe, crearlo manualmente en Storage)
-- El bucket debe llamarse: worktrack-evidences
-- Debe ser PÚBLICO.
