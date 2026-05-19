import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function PUT(request: Request) {
    try {
        const body = await request.json()
        const { id, activity_name, activity_description, hours_dedicated } = body

        if (!id || !activity_description) {
            return NextResponse.json({ ok: false, message: 'Faltan datos requeridos.' }, { status: 400 })
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

        if (!supabaseUrl || !serviceRoleKey) {
            return NextResponse.json({ ok: false, message: 'Error de configuración del servidor.' }, { status: 500 })
        }

        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
            auth: { autoRefreshToken: false, persistSession: false }
        })

        const { error: dbError } = await supabaseAdmin
            .from('workday_activities')
            .update({
                activity_name,
                activity_description,
                hours_dedicated
            })
            .eq('id', id)

        if (dbError) {
            console.error('DB update error:', dbError)
            return NextResponse.json({ ok: false, message: `Error al actualizar en BD: ${dbError.message}` }, { status: 400 })
        }

        return NextResponse.json({ ok: true })

    } catch (error: any) {
        console.error('Update activity error:', error)
        return NextResponse.json({ ok: false, message: `Error inesperado: ${error.message}` }, { status: 500 })
    }
}
