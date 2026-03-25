import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
    try {
        const formData = await request.formData()
        const file = formData.get('file') as File
        const employeeId = formData.get('employeeId') as string
        const employeeName = formData.get('employeeName') as string
        const dateStr = formData.get('dateStr') as string
        const folderDate = formData.get('folderDate') as string

        if (!file || !employeeId || !dateStr) {
            return NextResponse.json({ ok: false, message: 'Faltan datos requeridos.' }, { status: 400 })
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

        if (!supabaseUrl || !serviceRoleKey) {
            return NextResponse.json({ ok: false, message: 'Error de configuración del servidor: falta SUPABASE_SERVICE_ROLE_KEY.' }, { status: 500 })
        }

        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
            auth: { autoRefreshToken: false, persistSession: false }
        })

        // 1. Subir archivo al Storage usando la Service Role Key (sin restricciones de RLS)
        const fileExt = file.name.split('.').pop() || 'jpg'
        const safeName = (employeeName || 'empleado').replace(/[^a-zA-Z0-9_-]/g, '_')
        const fileName = `${folderDate || dateStr}/${safeName}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`

        const arrayBuffer = await file.arrayBuffer()
        const buffer = new Uint8Array(arrayBuffer)

        const { error: uploadError } = await supabaseAdmin.storage
            .from('worktrack-evidences')
            .upload(fileName, buffer, { contentType: file.type || 'image/jpeg', upsert: false })

        if (uploadError) {
            console.error('Storage upload error:', uploadError)
            return NextResponse.json({ ok: false, message: `Error al subir archivo: ${uploadError.message}` }, { status: 400 })
        }

        const { data: publicUrlData } = supabaseAdmin.storage
            .from('worktrack-evidences')
            .getPublicUrl(fileName)

        const storageUrl = publicUrlData.publicUrl

        // 2. Guardar registro en workday_activities con Service Role Key (sin restricciones de RLS)
        const { error: dbError } = await supabaseAdmin.from('workday_activities').insert([{
            employee_id: employeeId,
            date: dateStr,
            activity_name: 'Evidencia Fotográfica',
            activity_description: 'Evidencia Fotográfica',
            hours_dedicated: 0,
            storage_url: storageUrl
        }])

        if (dbError) {
            console.error('DB insert error:', dbError)
            return NextResponse.json({ ok: false, message: `Error al guardar en BD: ${dbError.message}` }, { status: 400 })
        }

        return NextResponse.json({ ok: true, url: storageUrl })

    } catch (error: any) {
        console.error('Upload evidence error:', error)
        return NextResponse.json({ ok: false, message: `Error inesperado: ${error.message}` }, { status: 500 })
    }
}
