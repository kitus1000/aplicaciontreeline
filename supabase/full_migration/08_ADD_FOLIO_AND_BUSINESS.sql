-- ==========================================
-- MIGRACIÓN 08: FOLIO Y NEGOCIO
-- Agregar campos de control a transacciones
-- ==========================================

-- 1. Alterar tabla para agregar columnas
ALTER TABLE transacciones_financieras 
ADD COLUMN IF NOT EXISTS folio_ticket TEXT,
ADD COLUMN IF NOT EXISTS nombre_negocio TEXT;

-- 2. Asegurar que las políticas RLS incluyan estas columnas (por defecto ALL las incluye)
-- No se requiere acción extra si usaste FOR ALL.

-- 3. Instrucción Manual (Supabase Storage):
-- Debes crear un BUCKET llamado 'gastos_tickets' en el panel de Storage 
-- y marcarlo como 'Public' para que las fotos sean visibles.
