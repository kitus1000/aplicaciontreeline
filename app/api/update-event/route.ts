import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function PUT(request: Request) {
    try {
        const { id, event_time } = await request.json()
        if (!id || !event_time) {
            return NextResponse.json({ ok: false, message: 'ID and event_time are required' }, { status: 400 })
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

        if (!supabaseUrl || !serviceRoleKey) {
            return NextResponse.json({ ok: false, message: 'Missing server configuration' }, { status: 500 })
        }

        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
            auth: { autoRefreshToken: false, persistSession: false }
        })

        const { error } = await supabaseAdmin
            .from('workday_events')
            .update({ event_time })
            .eq('id', id)

        if (error) {
            return NextResponse.json({ ok: false, message: error.message }, { status: 400 })
        }

        return NextResponse.json({ ok: true })
    } catch (err: any) {
        return NextResponse.json({ ok: false, message: err.message }, { status: 500 })
    }
}
