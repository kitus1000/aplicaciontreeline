import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { employee_id, date, activity_name, activity_description, hours_dedicated } = body

        if (!employee_id || !date || !activity_description) {
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

        const { error: dbError } = await supabaseAdmin.from('workday_activities').insert([{
            employee_id,
            date,
            activity_name,
            activity_description,
            hours_dedicated,
            storage_url: null
        }])

        if (dbError) {
            console.error('DB insert error:', dbError)
            return NextResponse.json({ ok: false, message: `Error al guardar en BD: ${dbError.message}` }, { status: 400 })
        }

        return NextResponse.json({ ok: true })

    } catch (error: any) {
        console.error('Save activity error:', error)
        return NextResponse.json({ ok: false, message: `Error inesperado: ${error.message}` }, { status: 500 })
    }
}
