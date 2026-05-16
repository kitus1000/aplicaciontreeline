import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { userId, password } = body

        if (!userId || !password) {
            return NextResponse.json(
                { ok: false, message: 'Faltan datos obligatorios (userId, password)' },
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

        // Actualizar contraseña en Auth
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.updateUserById(
            userId,
            { password: password }
        )

        if (authError) {
            console.error('Error actualizando contraseña en Auth:', authError)
            return NextResponse.json(
                { ok: false, message: `Error de Auth: ${authError.message}` },
                { status: 400 }
            )
        }

        return NextResponse.json({
            ok: true,
            message: 'Contraseña actualizada exitosamente',
            user: authData.user
        })

    } catch (error: any) {
        console.error('Error inesperado al actualizar contraseña:', error)
        return NextResponse.json(
            { ok: false, message: `Error en servidor: ${error.message}` },
            { status: 500 }
        )
    }
}
