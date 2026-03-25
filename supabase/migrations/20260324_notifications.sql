-- =========================================================================
-- SISTEMA DE NOTIFICACIONES BILINGÜE
-- =========================================================================

-- 1. Tabla de Notificaciones
CREATE TABLE IF NOT EXISTS app_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID REFERENCES empleados(id_empleado) ON DELETE CASCADE,
    title_es TEXT NOT NULL,
    title_en TEXT NOT NULL,
    message_es TEXT NOT NULL,
    message_en TEXT NOT NULL,
    type TEXT DEFAULT 'info', -- 'info', 'warning', 'error', 'success'
    is_read BOOLEAN DEFAULT false,
    link TEXT, -- Opcional: link para navegar al hacer click
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_notifications_emp_read ON app_notifications(employee_id, is_read);

-- 2. Función para notificar rechazos automáticamente
CREATE OR REPLACE FUNCTION fn_notify_workday_rejection()
RETURNS TRIGGER AS $$
BEGIN
    -- Si el estatus cambia a 'rejected'
    IF NEW.status = 'rejected' AND OLD.status != 'rejected' THEN
        INSERT INTO app_notifications (
            employee_id,
            title_es,
            title_en,
            message_es,
            message_en,
            type,
            link
        ) VALUES (
            NEW.employee_id,
            'Jornada Rechazada',
            'Workday Rejected',
            'Tu jornada del ' || NEW.date || ' fue rechazada. Motivo: ' || COALESCE(NEW.comments, 'Sin motivo especificado'),
            'Your workday from ' || NEW.date || ' was rejected. Reason: ' || COALESCE(NEW.comments, 'No reason specified'),
            'error',
            '/mi-trabajo?date=' || NEW.date
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Trigger en la tabla de estatus de jornada
DROP TRIGGER IF EXISTS tr_on_workday_rejection ON workday_approval_status;
CREATE TRIGGER tr_on_workday_rejection
AFTER UPDATE ON workday_approval_status
FOR EACH ROW
EXECUTE FUNCTION fn_notify_workday_rejection();
