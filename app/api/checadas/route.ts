import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
}

export async function OPTIONS() {
    return NextResponse.json({}, { headers: corsHeaders })
}

export async function POST(request: Request) {
    try {
        let body;
        try {
            body = await request.json()
        } catch (parseError) {
            console.error("Error parsing JSON body:", parseError);
            return NextResponse.json({ ok: false, error_code: 'BAD_REQUEST', mensaje: 'Cuerpo de la petición inválido.' }, { status: 400, headers: corsHeaders })
        }

        const { id_empleado_token, tipo_checada, codigo_autorizacion, metodo, timestamp_local, timestamp_manual, origen: origenInput, es_manual } = body

        if (!id_empleado_token) {
            return NextResponse.json({ ok: false, error_code: 'MISSING_DATA', mensaje: 'Falta el id del empleado.' }, { status: 400, headers: corsHeaders })
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

        if (!supabaseUrl || !supabaseKey) {
            console.error("Missing Supabase Env Variables", { url: !!supabaseUrl, key: !!supabaseKey });
            return NextResponse.json({ ok: false, error_code: 'CONFIG_ERROR', mensaje: 'Falta configurar SUPABASE_SERVICE_ROLE_KEY en el servidor.' }, { status: 500, headers: corsHeaders })
        }

        const supabase = createClient(supabaseUrl, supabaseKey)

        // 0. Obtener configuración de zona horaria
        const { data: config } = await supabase.from('configuracion_empresa').select('timezone').limit(1).single()
        const timezone = config?.timezone || 'America/Mexico_City'

        // 1. Buscar Empleado por número de empleado (MVP usa idManual que es el numero_empleado)
        const { data: emp, error: empError } = await supabase
            .from('empleados')
            .select('id_empleado, nombre, apellido_paterno, apellido_materno, estado_empleado, id_turno')
            .eq('numero_empleado', id_empleado_token)
            .single()

        if (empError || !emp) {
            return NextResponse.json({ ok: false, error_code: 'ID_INVALIDO', mensaje: 'No se encontró al empleado.' }, { status: 400, headers: corsHeaders })
        }
        if (emp.estado_empleado !== 'Activo') {
            return NextResponse.json({ ok: false, error_code: 'EMPLEADO_BAJA', mensaje: 'El empleado no está activo.' }, { status: 400, headers: corsHeaders })
        }

        let permisoValidoId = null

        // 2. Validar Código de Autorización (si aplica)
        if (codigo_autorizacion) {
            const { data: permiso, error: permError } = await supabase
                .from('permisos_autorizados')
                .select('*')
                .eq('codigo', codigo_autorizacion)
                .single()

            if (permError || !permiso) {
                return NextResponse.json({ ok: false, error_code: 'CODIGO_INVALIDO', mensaje: 'Código inválido o no existe.' }, { status: 400, headers: corsHeaders })
            }
            if (permiso.estatus !== 'Activo') {
                return NextResponse.json({ ok: false, error_code: 'CODIGO_USADO', mensaje: 'El código ya fue utilizado o cancelado.' }, { status: 400, headers: corsHeaders })
            }
            if (permiso.id_empleado !== emp.id_empleado) {
                return NextResponse.json({ ok: false, error_code: 'CODIGO_EMPLEADO', mensaje: 'Código pertenece a otro empleado.' }, { status: 400, headers: corsHeaders })
            }
            if (permiso.tipo_checada !== tipo_checada) {
                return NextResponse.json({ ok: false, error_code: 'CODIGO_TIPO', mensaje: 'Código no es para este trámite.' }, { status: 400, headers: corsHeaders })
            }

            const now = new Date()
            if (now < new Date(permiso.vigencia_desde) || now > new Date(permiso.vigencia_hasta)) {
                return NextResponse.json({ ok: false, error_code: 'CODIGO_VENCIDO', mensaje: 'Código expirado o aún no vigente.' }, { status: 400, headers: corsHeaders })
            }

            // Marcar como usado
            await supabase
                .from('permisos_autorizados')
                .update({ estatus: 'Usado', usos_realizados: permiso.usos_realizados + 1, usado_en: new Date().toISOString() })
                .eq('id', permiso.id)

            permisoValidoId = permiso.id
        }

        // 3. Reglas de Puntualidad y Turnos
        let estatus_puntualidad = 'PUNTUAL'
        let retardo_minutos = 0
        let turnoSeleccionado: any = null

        let baseDate: Date
        if (timestamp_manual) {
            // El formato es yyyy-mm-ddThh:mm:ss (local)
            // Para que JS no lo asuma UTC, lo parseamos como partes
            const [dPart, tPart] = timestamp_manual.split('T')
            const [y, m, d] = dPart.split('-').map(Number)
            const [hh, mm] = tPart.split(':').map(Number)
            
            // Creamos una fecha local al servidor pero con los números correctos
            const localDate = new Date(y, m - 1, d, hh, mm, 0)
            
            // Ahora calculamos el offset de la zona horaria destino (ej. Mexico_City)
            // para convertir esa "hora visual" a un timestamp UTC real
            const targetTimeZone = timezone
            const intlOpts: Intl.DateTimeFormatOptions = {
                timeZone: targetTimeZone,
                year: 'numeric',
                month: 'numeric',
                day: 'numeric',
                hour: 'numeric',
                minute: 'numeric',
                second: 'numeric',
                hour12: false
            }
            
            // Obtenemos la diferencia entre lo que cree el servidor y lo que debería ser en el target
            const formatter = new Intl.DateTimeFormat('en-US', intlOpts)
            const parts = formatter.formatToParts(localDate)
            const getPart = (type: string) => parseInt(parts.find(p => p.type === type)?.value || '0')
            
            const targetDate = new Date(
                getPart('year'),
                getPart('month') - 1,
                getPart('day'),
                getPart('hour'),
                getPart('minute'),
                getPart('second')
            )
            
            const offset = localDate.getTime() - targetDate.getTime()
            baseDate = new Date(localDate.getTime() + offset)
        } else {
            baseDate = new Date()
        }

        // Helpers para tiempo en la zona horaria seleccionada
        const formatter = new Intl.DateTimeFormat('es-MX', {
            timeZone: timezone,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        })
        const dayFormatter = new Intl.DateTimeFormat('en-CA', { // yyyy-mm-dd
            timeZone: timezone
        })

        const ahoraLocalParts = formatter.formatToParts(baseDate)
        const horaActual = parseInt(ahoraLocalParts.find(p => p.type === 'hour')?.value || '0')
        const minActual = parseInt(ahoraLocalParts.find(p => p.type === 'minute')?.value || '0')
        const totalMinutosActual = (horaActual * 60) + minActual

        const fecha_local = dayFormatter.format(baseDate)

        if (tipo_checada === 'REGRESO_PERMISO_PERSONAL' || tipo_checada === 'REGRESO_OPERACIONES') {
            const tipoPermisoBuscado = tipo_checada === 'REGRESO_PERMISO_PERSONAL' ? 'PERMISO_PERSONAL' : 'SALIDA_OPERACIONES'

            const { data: ultimoPermiso } = await supabase
                .from('permisos_autorizados')
                .select('*')
                .eq('id_empleado', emp.id_empleado)
                .eq('estatus', 'Usado')
                .eq('tipo_checada', tipoPermisoBuscado)
                .gte('usado_en', fecha_local)
                .order('usado_en', { ascending: false })
                .limit(1)
                .single()

            if (ultimoPermiso) {
                permisoValidoId = ultimoPermiso.id

                const ahoraMs = baseDate.getTime()
                const maximoMs = new Date(ultimoPermiso.vigencia_hasta).getTime()

                if (ahoraMs > maximoMs) {
                    const difMins = Math.floor((ahoraMs - maximoMs) / 60000)
                    if (difMins > 0) {
                        const { data: confTipo } = await supabase
                            .from('cat_tipos_checada')
                            .select('tolerancia_retorno_min')
                            .eq('tipo', tipoPermisoBuscado)
                            .single()

                        const toleranciaConfig = confTipo?.tolerancia_retorno_min ?? 5
                        if (difMins > toleranciaConfig) {
                            estatus_puntualidad = 'RETARDO'
                            retardo_minutos = difMins
                        }
                    }
                }

                await supabase
                    .from('permisos_autorizados')
                    .update({ estatus: 'Completado' })
                    .eq('id', permisoValidoId)
            }
        }
        else if (emp.id_turno && (tipo_checada === 'ENTRADA' || tipo_checada === 'COMIDA_REGRESO')) {
            const { data: turno } = await supabase.from('turnos').select('*').eq('id', emp.id_turno).single()

            if (turno) {
                turnoSeleccionado = turno

                const horaObjetivoStr = turno.hora_inicio
                const [horaTurno, minTurno] = horaObjetivoStr.split(':').map(Number)
                const totalMinutosTurno = (horaTurno * 60) + minTurno

                const difMinutos = totalMinutosActual - totalMinutosTurno

                if (difMinutos > (turno.limite_falta_min || 60)) {
                    estatus_puntualidad = 'FALTA'
                    retardo_minutos = difMinutos
                } else if (difMinutos > (turno.tolerancia_min || 0)) {
                    estatus_puntualidad = 'RETARDO'
                    retardo_minutos = difMinutos
                }
            } else {
                estatus_puntualidad = 'SIN_TURNO'
            }
        } else if (!emp.id_turno && (tipo_checada === 'ENTRADA' || tipo_checada === 'COMIDA_REGRESO')) {
            estatus_puntualidad = 'SIN_TURNO'
        }

        // Insertar en workday_events (Tabla actual de RH)
        const { data: eventData, error: insertError } = await supabase.from('workday_events').insert([{
            employee_id: emp.id_empleado,
            date: fecha_local,
            event_type: tipo_checada,
            event_time: baseDate.toISOString(),
            source: origenInput || 'kiosko'
        }]).select().single()

        if (insertError) {
            console.error('Error insertando evento de asistencia:', insertError)
            return NextResponse.json({ ok: false, error_code: 'DB_ERROR', mensaje: `No se pudo guardar la asistencia. ${insertError.message}` }, { status: 500, headers: corsHeaders })
        }

        const nombreCompleto = `${emp.nombre} ${emp.apellido_paterno} ${emp.apellido_materno || ''}`.trim()

        const responseData = {
            ok: true,
            checada: {
                id: eventData.id,
                id_empleado: emp.id_empleado,
                tipo_checada: tipo_checada,
                timestamp_checada: baseDate.toISOString(),
                empleado_nombre: nombreCompleto,
                turno: turnoSeleccionado ? {
                    nombre: turnoSeleccionado.nombre,
                    hora_inicio: turnoSeleccionado.hora_inicio,
                    hora_fin: turnoSeleccionado.hora_fin
                } : null
            },
            empleado: {
                nombre: nombreCompleto,
                numero_empleado: id_empleado_token,
                horario: turnoSeleccionado ? `${turnoSeleccionado.hora_inicio.slice(0, 5)} - ${turnoSeleccionado.hora_fin.slice(0, 5)}` : 'Sin horario'
            },
            tipo: tipo_checada,
            timestamp: baseDate.toISOString(),
            estatus_puntualidad,
            retardo_minutos
        }

        if (estatus_puntualidad === 'FALTA') {
            return NextResponse.json({
                ...responseData,
                ok: false,
                error_code: 'ACCESO_DENEGADO_FALTA',
                mensaje: `ACCESO DENEGADO. Has excedido el límite de tolerancia (${retardo_minutos} min). Tu entrada ha sido registrada como FALTA.`
            }, { status: 403, headers: corsHeaders })
        }

        return NextResponse.json(responseData, { headers: corsHeaders })

    } catch (error: any) {
        console.error('Checadas API EXCEPTION:', error.message, error.stack)
        return NextResponse.json({ ok: false, error_code: 'SERVER_ERROR', mensaje: `Error interno: ${error.message}` }, { status: 500, headers: corsHeaders })
    }
}
