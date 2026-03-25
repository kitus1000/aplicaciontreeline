import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { email, password, nombreCompleto, rol, idEmpleado } = body

        if (!email || !password || !nombreCompleto || !rol) {
            return NextResponse.json(
                { ok: false, message: 'Faltan datos obligatorios (email, password, nombre, rol)' },
                { status: 400 }
            )
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

        if (!supabaseUrl || !serviceRoleKey) {
            console.error('Falta configuración de SUPABASE_SERVICE_ROLE_KEY en el servidor.')
            return NextResponse.json(
                { ok: false, message: 'Error de configuración del servidor' },
                { status: 500 }
            )
        }

        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        })

        // 1. Crear usuario en Auth
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true, // Auto-confirm email
            user_metadata: {
                nombre_completo: nombreCompleto,
                rol: rol
            }
        })

        if (authError) {
            console.error('Error creando usuario Auth:', authError)
            return NextResponse.json(
                { ok: false, message: `Error de Auth: ${authError.message}` },
                { status: 400 }
            )
        }

        // 2. Insertar / Actualizar Perfil correspondientemente. 
        // Normalmente hay un trigger en la base de datos que crea el perfil tras el registro en auth.
        // Verificamos si podemos actualizar el rol inmediatamente.
        const userId = authData.user.id
        
        const { error: profileError } = await supabaseAdmin
            .from('perfiles')
            .upsert({ id: userId, rol: rol, nombre_completo: nombreCompleto })

        if (profileError) {
             console.error('Error actualizando perfil:', profileError)
             // Even if profile fails, user was created. Not fatal but should warn.
        }

        // 3. Vincular con Empleado si se proveyó idEmpleado y es trabajador
        if (idEmpleado) {
             const { error: empError } = await supabaseAdmin
                 .from('empleados')
                 .update({ correo_electronico: email })
                 .eq('id_empleado', idEmpleado)
                 
             if (empError) console.error('Error vinculando empleado con correo:', empError)
        }

        return NextResponse.json({
            ok: true,
            message: 'Usuario creado exitosamente',
            user: authData.user
        })

    } catch (error: any) {
        console.error('Error inesperado en registro:', error)
        return NextResponse.json(
            { ok: false, message: `Error en servidor: ${error.message}` },
            { status: 500 }
        )
    }
}
