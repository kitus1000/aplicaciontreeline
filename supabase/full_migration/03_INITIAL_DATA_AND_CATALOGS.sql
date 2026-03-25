-- =========================================================================
-- PARTE 3: DATOS INICIALES Y CATÁLOGOS (REVISADO)
-- =========================================================================

-- 3.1 Unidades de Trabajo y Departamentos
INSERT INTO cat_unidades_trabajo (unidad_trabajo) VALUES ('Oficina Central'), ('Planta 1'), ('Campo') ON CONFLICT DO NOTHING;
INSERT INTO cat_departamentos (departamento) VALUES ('Recursos Humanos'), ('Operaciones'), ('Administración'), ('Ventas'), ('IT') ON CONFLICT DO NOTHING;

-- 3.2 Tipos de Solicitud e Incidencia
INSERT INTO cat_tipos_solicitud (tipo_solicitud) VALUES ('Vacaciones'), ('Permiso con Goce'), ('Permiso sin Goce'), ('Baja'), ('Reingreso') ON CONFLICT DO NOTHING;

INSERT INTO cat_tipos_incidencia (tipo_incidencia, bloquea_asistencia, requiere_evidencia) VALUES 
('Vacaciones', true, false),
('Incapacidad IMSS', true, true),
('Permiso Personal', false, false),
('Falta Injustificada', true, false),
('Suspensión', true, false)
ON CONFLICT DO NOTHING;

-- 3.3 Causas de Baja
INSERT INTO cat_causas_baja (causa, requiere_evidencia, rol_iniciador) VALUES 
('Término de contrato', FALSE, 'Sistema'),
('Separación voluntaria (renuncia)', FALSE, 'Empleado'),
('Abandono de empleo', TRUE, 'Jefe'),
('Defunción', FALSE, 'RH'),
('Rescisión de contrato', TRUE, 'Jefe'),
('Otra', TRUE, 'Jefe')
ON CONFLICT DO NOTHING;

-- 3.4 Tipos de Checada (Kiosko bilingüe)
CREATE TABLE IF NOT EXISTS cat_tipos_checada (
    tipo TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    requiere_codigo BOOLEAN DEFAULT FALSE,
    color TEXT,
    ordinal INT
);

INSERT INTO cat_tipos_checada (tipo, label, requiere_codigo, color, ordinal) VALUES
('ENTRADA', 'ENTRADA', false, 'bg-green-500', 1),
('SALIDA', 'SALIDA', false, 'bg-red-500', 2),
('COMIDA_SALIDA', 'SALIDA A COMER', false, 'bg-amber-500', 3),
('COMIDA_REGRESO', 'REGRESO DE COMER', false, 'bg-indigo-500', 4),
('PERMISO_PERSONAL', 'SALIDA PERMISO', true, 'bg-purple-500', 5),
('REGRESO_PERMISO_PERSONAL', 'REGRESO PERMISO', false, 'bg-blue-400', 6),
('SALIDA_OPERACIONES', 'SALIDA OPERACIONES', false, 'bg-cyan-500', 7),
('REGRESO_OPERACIONES', 'REGRESO OPERACIONES', false, 'bg-teal-500', 8),
('SALIDA_FINAL', 'SALIDA FINAL', false, 'bg-red-800', 9)
ON CONFLICT (tipo) DO UPDATE SET label = EXCLUDED.label, color = EXCLUDED.color, ordinal = EXCLUDED.ordinal;

-- 3.5 Regla Global
INSERT INTO employee_pay_rules (scope_type, payment_type, hourly_rate, daily_rate, standard_hours, overtime_threshold, allow_overtime, approval_mode)
VALUES ('global', 'hora', 0, 0, 8, 8, true, 'daily')
ON CONFLICT (scope_type, employee_id) DO NOTHING;
