-- =========================================================================
-- PARTE 1: ESTRUCTURA COMPLETA DE RECURSOS HUMANOS (BASE)
-- =========================================================================

-- 1.1 Catálogos
CREATE TABLE IF NOT EXISTS cat_unidades_trabajo (
    id_unidad UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unidad_trabajo TEXT NOT NULL,
    activo BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS cat_departamentos (
    id_departamento UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    departamento TEXT NOT NULL,
    activo BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS cat_puestos (
    id_puesto UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    puesto TEXT NOT NULL,
    id_departamento UUID REFERENCES cat_departamentos(id_departamento),
    activo BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS cat_cecos (
    id_ceco UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clave_ceco TEXT NOT NULL,
    descripcion_ceco TEXT,
    activo BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS cat_tipos_rol (
    id_tipo_rol UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo_rol TEXT NOT NULL,
    dias_trabajo INT NOT NULL,
    dias_descanso INT NOT NULL,
    descripcion TEXT,
    activo BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS cat_tipos_incidencia (
    id_tipo_incidencia UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo_incidencia TEXT NOT NULL,
    bloquea_asistencia BOOLEAN DEFAULT FALSE,
    requiere_evidencia BOOLEAN DEFAULT FALSE,
    cuenta_como_descanso BOOLEAN DEFAULT FALSE,
    activo BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS cat_tipos_solicitud (
    id_tipo_solicitud UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo_solicitud TEXT NOT NULL,
    activo BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS cat_periodos_vacacionales (
    id_periodo UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    periodo TEXT NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    activo BOOLEAN DEFAULT TRUE
);

-- 1.2 Empleados
CREATE TABLE IF NOT EXISTS empleados (
    id_empleado UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero_empleado INT UNIQUE NOT NULL,
    codigo_empleado TEXT UNIQUE,
    estado_empleado TEXT DEFAULT 'Activo',
    nombre TEXT NOT NULL,
    apellido_paterno TEXT NOT NULL,
    apellido_materno TEXT,
    sexo TEXT,
    fecha_nacimiento DATE,
    curp TEXT UNIQUE,
    rfc TEXT UNIQUE,
    nss TEXT UNIQUE,
    telefono TEXT,
    correo_electronico TEXT,
    estado_civil TEXT,
    tipo_residencia TEXT,
    hijos_numero INT DEFAULT 0,
    foto_url TEXT,
    fecha_creacion TIMESTAMPTZ DEFAULT now(),
    fecha_actualizacion TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS empleado_ingreso (
    id_empleado UUID REFERENCES empleados(id_empleado) PRIMARY KEY,
    fecha_ingreso DATE NOT NULL
);

CREATE TABLE IF NOT EXISTS empleado_domicilio (
    id_empleado UUID REFERENCES empleados(id_empleado) PRIMARY KEY,
    calle TEXT,
    numero_exterior TEXT,
    colonia TEXT,
    codigo_postal TEXT,
    municipio TEXT,
    estado TEXT,
    ciudad TEXT
);

CREATE TABLE IF NOT EXISTS empleado_banco (
    id_empleado UUID REFERENCES empleados(id_empleado) PRIMARY KEY,
    numero_cuenta TEXT,
    clabe TEXT,
    banco TEXT
);

-- 1.3 Historial, Roles e Incidencias
CREATE TABLE IF NOT EXISTS empleado_adscripciones (
    id_empleado UUID REFERENCES empleados(id_empleado),
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE,
    categoria TEXT,
    id_departamento UUID REFERENCES cat_departamentos(id_departamento),
    id_puesto UUID REFERENCES cat_puestos(id_puesto),
    id_unidad UUID REFERENCES cat_unidades_trabajo(id_unidad),
    id_ceco UUID REFERENCES cat_cecos(id_ceco),
    razon_social TEXT,
    jefe_directo_nombre TEXT,
    es_jefe BOOLEAN DEFAULT FALSE,
    PRIMARY KEY (id_empleado, fecha_inicio)
);

CREATE TABLE IF NOT EXISTS empleado_salarios (
    id_empleado UUID REFERENCES empleados(id_empleado),
    fecha_inicio_vigencia DATE NOT NULL,
    fecha_fin_vigencia DATE,
    salario_diario NUMERIC(10,2) NOT NULL,
    motivo TEXT,
    PRIMARY KEY (id_empleado, fecha_inicio_vigencia)
);

CREATE TABLE IF NOT EXISTS empleado_roles (
    id_empleado UUID REFERENCES empleados(id_empleado),
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE,
    id_tipo_rol UUID REFERENCES cat_tipos_rol(id_tipo_rol),
    PRIMARY KEY (id_empleado, fecha_inicio)
);

CREATE TABLE IF NOT EXISTS empleado_incidencias (
    id_incidencia UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_empleado UUID REFERENCES empleados(id_empleado) NOT NULL,
    id_tipo_incidencia UUID REFERENCES cat_tipos_incidencia(id_tipo_incidencia) NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    comentarios TEXT,
    evidencia_url TEXT,
    estado TEXT DEFAULT 'Capturada',
    creado_por UUID,
    creado_el TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS vacaciones_saldos (
    id_empleado UUID REFERENCES empleados(id_empleado),
    id_periodo UUID REFERENCES cat_periodos_vacacionales(id_periodo),
    dias_asignados INT DEFAULT 0,
    dias_tomados INT DEFAULT 0,
    PRIMARY KEY (id_empleado, id_periodo)
);

-- 1.4 Perfiles (Auth Link)
CREATE TABLE IF NOT EXISTS perfiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nombre_completo TEXT,
    rol TEXT DEFAULT 'Jefe',
    id_departamento UUID REFERENCES cat_departamentos(id_departamento),
    creado_el TIMESTAMPTZ DEFAULT now(),
    actualizado_el TIMESTAMPTZ DEFAULT now()
);
