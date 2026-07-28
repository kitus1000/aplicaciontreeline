'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/utils/supabase/client'
import { Activity, Clock, LogIn, LogOut, CheckCircle, RefreshCw, AlertCircle, Calendar, Trash2, Edit, Save, X, User } from 'lucide-react'
import Link from 'next/link'
import { useI18n } from '@/lib/i18n'
import { cn } from '@/utils/cn'

export default function AsistenciaDashboard() {
    const { t } = useI18n()
    const [checadas, setChecadas] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
    const [stats, setStats] = useState({
        totalChecadas: 0,
        puntuales: 0,
        retardos: 0,
        faltas: 0
    })

    useEffect(() => {
        fetchChecadas()

        // Supabase Realtime Subscriptions for live attendance sync
        const channel1 = supabase
            .channel('realtime-workday-events')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'workday_events' }, () => fetchChecadas())
            .subscribe()

        const channel2 = supabase
            .channel('realtime-checadas')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'checadas' }, () => fetchChecadas())
            .subscribe()

        return () => {
            supabase.removeChannel(channel1)
            supabase.removeChannel(channel2)
        }
    }, [selectedDate])

    async function fetchChecadas() {
        setLoading(true)

        try {
            // 1. Fetch workday_events for selectedDate (primary source from mi-trabajo)
            const { data: eventsData, error: eventsErr } = await supabase
                .from('workday_events')
                .select(`
                    *,
                    empleados (id_empleado, nombre, apellido_paterno, apellido_materno, numero_empleado)
                `)
                .eq('date', selectedDate)
                .order('event_time', { ascending: false })

            // 2. Fetch legacy checadas
            const { data: legacyData } = await supabase
                .from('checadas')
                .select(`
                    *,
                    empleados (id_empleado, nombre, apellido_paterno, apellido_materno, numero_empleado)
                `)
                .eq('fecha_local', selectedDate)
                .order('timestamp_checada', { ascending: false })

            // Combine and format records
            const combinedRecords: any[] = []
            const seenIds = new Set<string>()

            eventsData?.forEach(e => {
                const uniqueKey = `${e.employee_id}_${e.event_type}_${e.event_time}`
                seenIds.add(uniqueKey)
                combinedRecords.push({
                    id: e.id,
                    dbTable: 'workday_events',
                    fecha_local: e.date,
                    timestamp_checada: e.event_time,
                    tipo_checada: e.event_type,
                    estatus_puntualidad: e.estatus_puntualidad || 'PUNTUAL',
                    source: e.source || 'web_mi_trabajo',
                    empleados: e.empleados
                })
            })

            legacyData?.forEach(c => {
                const uniqueKey = `${c.id_empleado}_${c.tipo_checada}_${c.timestamp_checada}`
                if (!seenIds.has(uniqueKey)) {
                    combinedRecords.push({
                        id: c.id,
                        dbTable: 'checadas',
                        fecha_local: c.fecha_local,
                        timestamp_checada: c.timestamp_checada,
                        tipo_checada: c.tipo_checada,
                        estatus_puntualidad: c.estatus_puntualidad || 'PUNTUAL',
                        source: 'kiosko',
                        empleados: c.empleados
                    })
                }
            })

            setChecadas(combinedRecords)

            // Calculate KPIs
            setStats({
                totalChecadas: combinedRecords.length,
                puntuales: combinedRecords.filter(r => r.estatus_puntualidad === 'PUNTUAL' || !r.estatus_puntualidad).length,
                retardos: combinedRecords.filter(r => r.estatus_puntualidad === 'RETARDO').length,
                faltas: combinedRecords.filter(r => r.estatus_puntualidad === 'FALTA').length
            })

        } catch (error) {
            console.error('Error fetching asistence:', error)
        } finally {
            setLoading(false)
        }
    }

    async function eliminarChecada(record: any) {
        if (!confirm('¿Seguro que deseas eliminar este registro de asistencia?')) return
        const table = record.dbTable || 'workday_events'
        const { error } = await supabase.from(table).delete().eq('id', record.id)
        if (error) alert('Error al eliminar: ' + error.message)
        else fetchChecadas()
    }

    const formatHora = (isoStr: string) => {
        try {
            return new Date(isoStr).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
        } catch (e) {
            return isoStr
        }
    }

    return (
        <div className="max-w-7xl mx-auto space-y-6 page-transition">
            {/* Cabecera / Navegación */}
            <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-[var(--border-color)] gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-[var(--text-main)] tracking-tight">
                      {t('attendance_monitor_title')}
                    </h1>
                    <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mt-1">
                      {t('attendance_monitor_subtitle')}
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 glass px-3 py-2 rounded-xl border border-[var(--border-color)]">
                        <Calendar className="w-4 h-4 text-indigo-400" />
                        <input
                            type="date"
                            className="bg-transparent border-none p-0 text-xs font-bold text-[var(--text-main)] focus:ring-0 outline-none"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={fetchChecadas}
                        className="p-2.5 glass hover:border-indigo-500/40 rounded-xl text-[var(--text-main)] transition-all active:scale-95"
                        title="Actualizar Checadas"
                    >
                        <RefreshCw className={loading ? "animate-spin w-4 h-4 text-indigo-400" : "w-4 h-4 text-indigo-400"} />
                    </button>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="glass-card p-4 rounded-2xl border border-[var(--border-color)]">
                    <p className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-wider">Total de Checadas</p>
                    <p className="text-2xl font-black text-[var(--text-main)] mt-1">{stats.totalChecadas}</p>
                </div>
                <div className="glass-card p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10">
                    <p className="text-[10px] font-black uppercase text-emerald-400 tracking-wider">Puntuales</p>
                    <p className="text-2xl font-black text-emerald-400 mt-1">{stats.puntuales}</p>
                </div>
                <div className="glass-card p-4 rounded-2xl border border-amber-500/30 bg-amber-500/10">
                    <p className="text-[10px] font-black uppercase text-amber-400 tracking-wider">Retardos</p>
                    <p className="text-2xl font-black text-amber-400 mt-1">{stats.retardos}</p>
                </div>
                <div className="glass-card p-4 rounded-2xl border border-red-500/30 bg-red-500/10">
                    <p className="text-[10px] font-black uppercase text-red-400 tracking-wider">Faltas / Incidencias</p>
                    <p className="text-2xl font-black text-red-400 mt-1">{stats.faltas}</p>
                </div>
            </div>

            {/* Tabla de Registros de Checadas */}
            <div className="glass-card rounded-3xl border border-[var(--border-color)] overflow-hidden shadow-xl">
                <div className="p-4 border-b border-[var(--border-color)] flex items-center justify-between">
                    <h3 className="text-sm font-black text-[var(--text-main)] uppercase tracking-wider flex items-center gap-2">
                        <Activity className="w-4 h-4 text-indigo-400" />
                        <span>Monitoreo de Asistencia en Tiempo Real</span>
                    </h3>
                    <span className="text-[10px] font-bold text-[var(--text-muted)]">
                        {checadas.length} Registros en {selectedDate}
                    </span>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-[var(--border-color)] bg-white/2 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-wider">
                                <th className="p-4">Empleado</th>
                                <th className="p-4">Tipo Evento</th>
                                <th className="p-4">Hora Checada</th>
                                <th className="p-4">Origen</th>
                                <th className="p-4">Puntualidad</th>
                                <th className="p-4 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-color)] text-xs font-semibold">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="py-16 text-center text-[var(--text-muted)] font-black uppercase tracking-widest animate-pulse">
                                        Cargando asistencias en tiempo real...
                                    </td>
                                </tr>
                            ) : checadas.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-16 text-center text-[var(--text-muted)] font-bold">
                                        No hay registros de checadas para la fecha seleccionada ({selectedDate}).
                                    </td>
                                </tr>
                            ) : (
                                checadas.map(r => (
                                    <tr key={r.id} className="hover:bg-indigo-500/5 transition-colors">
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-xl bg-indigo-600/20 text-indigo-400 font-black text-xs flex items-center justify-center">
                                                    {r.empleados?.nombre ? r.empleados.nombre.charAt(0) : 'E'}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-[var(--text-main)]">
                                                        {r.empleados?.nombre} {r.empleados?.apellido_paterno}
                                                    </p>
                                                    <p className="text-[10px] text-[var(--text-muted)]">#{r.empleados?.numero_empleado}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-slate-500/10 border border-[var(--border-color)] text-indigo-400">
                                                {r.tipo_checada}
                                            </span>
                                        </td>
                                        <td className="p-4 font-black text-[var(--text-main)]">
                                            {formatHora(r.timestamp_checada)}
                                        </td>
                                        <td className="p-4 text-[10px] text-[var(--text-muted)] uppercase font-bold">
                                            {r.source || 'web_my_work'}
                                        </td>
                                        <td className="p-4">
                                            <span className={cn(
                                                "px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border",
                                                r.estatus_puntualidad === 'RETARDO' ? "bg-amber-500/10 text-amber-400 border-amber-500/30" :
                                                r.estatus_puntualidad === 'FALTA' ? "bg-red-500/10 text-red-400 border-red-500/30" :
                                                "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                                            )}>
                                                {r.estatus_puntualidad || 'PUNTUAL'}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <button
                                                onClick={() => eliminarChecada(r)}
                                                className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
                                                title="Eliminar Registro"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
