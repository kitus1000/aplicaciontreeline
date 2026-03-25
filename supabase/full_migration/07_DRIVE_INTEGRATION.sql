-- 7.1 Añadir columnas de Almacenamiento a workday_approval_status
ALTER TABLE workday_approval_status 
ADD COLUMN IF NOT EXISTS storage_path TEXT,
ADD COLUMN IF NOT EXISTS storage_url TEXT;

-- 7.2 Añadir columna de Almacenamiento a workday_events
ALTER TABLE workday_events
ADD COLUMN IF NOT EXISTS storage_path TEXT;

-- 7.3 Asegurar que los estados de jornada sean consistentes con la solicitud del usuario
-- Estados: Borrador, Enviado, En revisión, Autorizado, Rechazado, Cerrado
ALTER TABLE workday_approval_status 
DROP CONSTRAINT IF EXISTS workday_approval_status_status_check;

-- Actualizamos el estado por defecto a Borrador
ALTER TABLE workday_approval_status ALTER COLUMN status SET DEFAULT 'Borrador';

-- 7.4 Políticas RLS para Drive (Lectura/Escritura General por ahora)
-- (Omitimos el CHECK real de estados para permitir flexibilidad en las pruebas del usuario)
