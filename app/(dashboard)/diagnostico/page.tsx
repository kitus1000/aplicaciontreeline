'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/utils/supabase/client'

export default function DiagnosticoPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])

  async function runDiag() {
    setLoading(true)
    const results: any = {}

    // 1. Empleados activos
    const { data: emps, error: empError } = await supabase
      .from('empleados')
      .select('id_empleado, numero_empleado, nombre, apellido_paterno, estado_empleado')
      .eq('estado_empleado', 'Activo')
    results.empleados = { count: emps?.length ?? 0, sample: emps?.slice(0, 5), error: empError?.message }

    // 2. workday_events HOY - sin filtro primero
    const { data: we, error: weErr } = await supabase
      .from('workday_events')
      .select('*')
      .eq('date', selectedDate)
    results.workday_events_hoy = { count: we?.length ?? 0, data: we, error: weErr?.message }

    // 3. workday_events TODOS - ver columnas
    const { data: weAll, error: weAllErr } = await supabase
      .from('workday_events')
      .select('*')
      .limit(5)
    results.workday_events_sample = { count: weAll?.length ?? 0, data: weAll, error: weAllErr?.message }

    // 4. checadas HOY
    const { data: ch, error: chErr } = await supabase
      .from('checadas')
      .select('*')
      .eq('fecha_local', selectedDate)
    results.checadas_hoy = { count: ch?.length ?? 0, data: ch, error: chErr?.message }

    // 5. checadas MUESTRA para ver columnas
    const { data: chSample, error: chSampleErr } = await supabase
      .from('checadas')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5)
    results.checadas_sample = { count: chSample?.length ?? 0, data: chSample, error: chSampleErr?.message }

    // 6. workday_approval_status HOY
    const { data: appr, error: apprErr } = await supabase
      .from('workday_approval_status')
      .select('*')
      .eq('date', selectedDate)
    results.approvals_hoy = { count: appr?.length ?? 0, data: appr, error: apprErr?.message }

    // 7. workday_activities muestra
    const { data: acts, error: actsErr } = await supabase
      .from('workday_activities')
      .select('*')
      .limit(10)
    results.workday_activities = { count: acts?.length ?? 0, data: acts, error: actsErr?.message }

    // 8. permisos_autorizados
    const { data: perms, error: permsErr } = await supabase
      .from('permisos_autorizados')
      .select('*')
      .limit(10)
    results.permisos_autorizados = { count: perms?.length ?? 0, data: perms, error: permsErr?.message }

    // 9. Comparar employee_id de workday_events vs id_empleado de empleados
    if (we && we.length > 0 && emps && emps.length > 0) {
      const empIds = new Set(emps.map((e: any) => String(e.id_empleado).toLowerCase()))
      const empNums = new Set(emps.map((e: any) => String(e.numero_empleado).toLowerCase()))
      
      results.match_test = we.map((ev: any) => {
        const evEmpId = String(ev.employee_id || '').toLowerCase()
        const matchById = empIds.has(evEmpId)
        const matchByNum = empNums.has(evEmpId)
        return {
          event_employee_id: ev.employee_id,
          event_type: ev.event_type,
          event_time: ev.event_time,
          matched_by_uuid: matchById,
          matched_by_num: matchByNum,
          ANY_MATCH: matchById || matchByNum
        }
      })
    }

    // 10. Misma comparacion con checadas
    if (ch && ch.length > 0 && emps && emps.length > 0) {
      const empIds = new Set(emps.map((e: any) => String(e.id_empleado).toLowerCase()))
      const empNums = new Set(emps.map((e: any) => String(e.numero_empleado).toLowerCase()))

      results.checadas_match_test = ch.map((c: any) => {
        const id1 = String(c.id_empleado || '').toLowerCase()
        const id2 = String(c.id_empleado_token || '').toLowerCase()
        return {
          id_empleado: c.id_empleado,
          id_empleado_token: c.id_empleado_token,
          tipo_checada: c.tipo_checada,
          fecha_local: c.fecha_local,
          match_by_uuid_id1: empIds.has(id1),
          match_by_uuid_id2: empIds.has(id2),
          match_by_num_id1: empNums.has(id1),
          match_by_num_id2: empNums.has(id2),
          ANY_MATCH: empIds.has(id1) || empIds.has(id2) || empNums.has(id1) || empNums.has(id2)
        }
      })
    }

    // 11. Ver otras fechas recientes en workday_events
    const { data: weRecent } = await supabase
      .from('workday_events')
      .select('date, employee_id, event_type')
      .order('date', { ascending: false })
      .limit(20)
    results.workday_events_recent_dates = weRecent

    // 12. Ver otras fechas recientes en checadas
    const { data: chRecent } = await supabase
      .from('checadas')
      .select('fecha_local, id_empleado, tipo_checada')
      .order('fecha_local', { ascending: false })
      .limit(20)
    results.checadas_recent_dates = chRecent

    setData(results)
    setLoading(false)
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-black text-white">🔍 Diagnóstico de Base de Datos</h1>
        <input
          type="date"
          value={selectedDate}
          onChange={e => setSelectedDate(e.target.value)}
          className="bg-gray-800 border border-gray-600 text-white p-2 rounded-xl text-sm"
        />
        <button
          onClick={runDiag}
          disabled={loading}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-black px-6 py-2 rounded-xl"
        >
          {loading ? '⏳ Analizando...' : '🚀 Ejecutar Diagnóstico'}
        </button>
      </div>

      {data && (
        <div className="space-y-6">
          {/* Resumen rápido */}
          <div className="bg-gray-900 rounded-2xl p-5 border border-gray-700">
            <h2 className="text-lg font-black text-white mb-4">📋 Resumen Rápido</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <SummaryCard label="Empleados Activos" value={data.empleados?.count} color="indigo" />
              <SummaryCard label="workday_events HOY" value={data.workday_events_hoy?.count} color="emerald" />
              <SummaryCard label="checadas HOY" value={data.checadas_hoy?.count} color="amber" />
              <SummaryCard label="Approvals HOY" value={data.approvals_hoy?.count} color="purple" />
            </div>
          </div>

          {/* Fechas recientes en workday_events */}
          <Section title="📅 Fechas Recientes en workday_events" color="emerald">
            <pre className="text-xs text-emerald-300 overflow-x-auto">{JSON.stringify(data.workday_events_recent_dates, null, 2)}</pre>
          </Section>

          {/* Fechas recientes en checadas */}
          <Section title="📅 Fechas Recientes en checadas" color="amber">
            <pre className="text-xs text-amber-300 overflow-x-auto">{JSON.stringify(data.checadas_recent_dates, null, 2)}</pre>
          </Section>

          {/* Match test workday_events */}
          {data.match_test && (
            <Section title="🔗 Match de IDs: workday_events vs empleados (HOY)" color="blue">
              {data.match_test.map((m: any, i: number) => (
                <div key={i} className={`p-3 rounded-xl mb-2 ${m.ANY_MATCH ? 'bg-emerald-900/40 border border-emerald-500/40' : 'bg-red-900/40 border border-red-500/40'}`}>
                  <span className={`font-black ${m.ANY_MATCH ? 'text-emerald-400' : 'text-red-400'}`}>
                    {m.ANY_MATCH ? '✅ MATCH' : '❌ NO MATCH'}
                  </span>
                  <span className="text-gray-300 text-xs ml-3">
                    employee_id: <b>{m.event_employee_id}</b> | tipo: {m.event_type}
                  </span>
                  <span className="text-gray-500 text-xs ml-3">
                    (por UUID: {m.matched_by_uuid ? '✅' : '❌'}, por número: {m.matched_by_num ? '✅' : '❌'})
                  </span>
                </div>
              ))}
            </Section>
          )}

          {/* Match test checadas */}
          {data.checadas_match_test && (
            <Section title="🔗 Match de IDs: checadas vs empleados (HOY)" color="orange">
              {data.checadas_match_test.map((m: any, i: number) => (
                <div key={i} className={`p-3 rounded-xl mb-2 ${m.ANY_MATCH ? 'bg-emerald-900/40 border border-emerald-500/40' : 'bg-red-900/40 border border-red-500/40'}`}>
                  <span className={`font-black ${m.ANY_MATCH ? 'text-emerald-400' : 'text-red-400'}`}>
                    {m.ANY_MATCH ? '✅ MATCH' : '❌ NO MATCH'}
                  </span>
                  <span className="text-gray-300 text-xs ml-3">
                    id_empleado: <b>{m.id_empleado}</b> | token: <b>{m.id_empleado_token}</b> | tipo: {m.tipo_checada}
                  </span>
                </div>
              ))}
            </Section>
          )}

          {/* Workday events sample - ver columnas */}
          <Section title="📦 workday_events - Muestra de columnas (últimos 5)" color="cyan">
            <pre className="text-xs text-cyan-300 overflow-x-auto">{JSON.stringify(data.workday_events_sample?.data, null, 2)}</pre>
          </Section>

          {/* Checadas sample */}
          <Section title="📦 checadas - Muestra de columnas (últimas 5)" color="yellow">
            <pre className="text-xs text-yellow-300 overflow-x-auto">{JSON.stringify(data.checadas_sample?.data, null, 2)}</pre>
          </Section>

          {/* Errors */}
          <Section title="⚠️ Errores de Consultas" color="red">
            {Object.entries(data).map(([key, val]: any) => 
              val?.error ? (
                <div key={key} className="p-3 rounded-xl mb-2 bg-red-900/40 border border-red-500/40">
                  <span className="text-red-400 font-black text-xs">{key}:</span>
                  <span className="text-red-300 text-xs ml-2">{val.error}</span>
                </div>
              ) : null
            )}
            {!Object.values(data).some((v: any) => v?.error) && (
              <p className="text-emerald-400 text-sm font-bold">✅ Sin errores en ninguna consulta</p>
            )}
          </Section>

          {/* Muestra empleados */}
          <Section title="👷 Empleados Activos (primeros 5)" color="purple">
            <pre className="text-xs text-purple-300 overflow-x-auto">{JSON.stringify(data.empleados?.sample, null, 2)}</pre>
          </Section>
        </div>
      )}
    </div>
  )
}

function SummaryCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colors: any = {
    indigo: 'text-indigo-400 border-indigo-500/30 bg-indigo-500/10',
    emerald: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
    amber: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
    purple: 'text-purple-400 border-purple-500/30 bg-purple-500/10',
  }
  return (
    <div className={`rounded-2xl p-4 border ${colors[color] || colors.indigo}`}>
      <p className="text-[10px] font-black uppercase text-gray-500">{label}</p>
      <p className={`text-3xl font-black ${colors[color]?.split(' ')[0]}`}>{value ?? 0}</p>
    </div>
  )
}

function Section({ title, children, color }: { title: string; children: any; color: string }) {
  const [open, setOpen] = useState(true)
  return (
    <div className="bg-gray-900 rounded-2xl border border-gray-700 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-800 transition-colors"
      >
        <h3 className="text-sm font-black text-white">{title}</h3>
        <span className="text-gray-400 text-xs">{open ? '▲ Colapsar' : '▼ Expandir'}</span>
      </button>
      {open && (
        <div className="p-4 border-t border-gray-700">
          {children}
        </div>
      )}
    </div>
  )
}
