'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/utils/supabase/client'
import { Activity, Clock, LogIn, LogOut, CheckCircle, RefreshCw, AlertCircle, Calendar, Trash2, Edit, Save, X, User, Plus, ShieldCheck, Coffee } from 'lucide-react'
import Link from 'next/link'
import { useI18n } from '@/lib/i18n'
import { cn } from '@/utils/cn'

export default function AsistenciaDashboard() {
    const { t } = useI18n()
    const [checadas, setChecadas] = useState<any[]>([])
    const [empleadosList, setEmpleadosList] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
    
    // Modal Permiso State
    const [showPermisoModal, setShowPermisoModal] = useState(false)
    const [isSavingPermiso, setIsSavingPermiso] = useState(false)
    const [permisoForm, setPermisoForm] = useState({
        id_empleado: '',
        tipo_permiso: 'PERMISO_CON_SUELDO', // 'PERMISO_CON_SUELDO' | 'PERMISO_SIN_SUELDO'
        fecha_inicio: new Date().toISOString().split('T')[0],
        fecha_fin: new Date().toISOString().split('T')[0],
        motivo: ''
    })

    const [stats, setStats] = useState({
        totalChecadas: 0,
        puntuales: 0,
        retardos: 0,
        faltas: 0,
        permisos: 0
    })

    useEffect(() => {
        fetchChecadas()
        fetchEmpleados()

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

    async function fetchEmpleados() {
        const { data } = await supabase
            .from('empleados')
            .select('id_empleado, numero_empleado, nombre, apellido_paterno, apellido_materno')
            .eq('estado_empleado', 'Activo')
            .order('nombre', { ascending: true })
        if (data) setEmpleadosList(data)
    }

    async function fetchChecadas() {
        setLoading(true)

        try {
            // 1. Fetch workday_events for selectedDate
            const { data: eventsData } = await supabase
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

            // 3. Fetch permisos_autorizados active on selectedDate
            const { data: permisosData } = await supabase
                .from('permisos_autorizados')
                .select(`
                    *,
                    empleados (id_empleado, nombre, apellido_paterno, apellido_materno, numero_empleado)
                `)
                .lte('fecha_inicio', selectedDate)
                .gte('fecha_fin', selectedDate)

            // Combine and format records
            const combinedRecords: any[] = []
            const seenIds = new Set<string>()

            // Add Permisos Autorizados first
            permisosData?.forEach(p => {
                const uniqueKey = `permiso_${p.id}`
                seenIds.add(uniqueKey)
                combinedRecords.push({
                    id: p.id,
                    dbTable: 'permisos_autorizados',
                    fecha_local: selectedDate,
                    timestamp_checada: p.created_at || selectedDate,
                    tipo_checada: p.tipo_permiso === 'PERMISO_CON_SUELDO' ? 'PERMISO CON SUELDO' : 'PERMISO SIN SUELDO',
                    estatus_puntualidad: p.tipo_permiso === 'PERMISO_CON_SUELDO' ? 'CON_SUELDO' : 'SIN_SUELDO',
                    source: 'ADMINISTRADOR',
                    motivo: p.motivo,
                    empleados: p.empleados
                })
            })

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
                faltas: combinedRecords.filter(r => r.estatus_puntualidad === 'FALTA').length,
                permisos: permisosData ? permisosData.length : 0
            })

        } catch (error) {
            console.error('Error fetching asistence:', error)
        } finally {
            setLoading(false)
        }
    }

    async function handleSavePermiso(e: React.FormEvent) {
        e.preventDefault()
        if (!permisoForm.id_empleado) {
            alert('Por favor selecciona un empleado.')
            return
        }

        setIsSavingPermiso(true)
        try {
            const { error } = await supabase.from('permisos_autorizados').insert({
                id_empleado: permisoForm.id_empleado,
                tipo_permiso: permisoForm.tipo_permiso,
                tipo_checada: permisoForm.tipo_permiso,
                fecha_inicio: permisoForm.fecha_inicio,
                fecha_fin: permisoForm.fecha_fin,
                vigencia_desde: permisoForm.fecha_inicio,
                vigencia_hasta: permisoForm.fecha_fin,
                motivo: permisoForm.motivo || 'Permiso Autorizado por Administrador',
                estatus: 'Activo'
            })

            if (error) throw error

            // Register status in workday_approval_status to prevent FALTA
            await supabase.from('workday_approval_status').insert({
                employee_id: permisoForm.id_empleado,
                date: permisoForm.fecha_inicio,
                status: permisoForm.tipo_permiso === 'PERMISO_CON_SUELDO' ? 'authorized' : 'authorized',
                comments: `PERMISO AUTORIZADO (${permisoForm.tipo_permiso === 'PERMISO_CON_SUELDO' ? 'Con Sueldo' : 'Sin Sueldo'}): ${permisoForm.motivo}`
            })

            setShowPermisoModal(false)
            setPermisoForm({
                id_empleado: '',
                tipo_permiso: 'PERMISO_CON_SUELDO',
                fecha_inicio: selectedDate,
                fecha_fin: selectedDate,
                motivo: ''
            })
            fetchChecadas()
        } catch (err: any) {
            alert('Error al guardar el permiso: ' + err.message)
        } finally {
            setIsSavingPermiso(false)
        }
    }

    async function eliminarChecada(record: any) {
        if (!confirm('¿Seguro que deseas revocar/eliminar este permiso? El trabajador podrá volver a realizar su marcaje de turno en su celular de inmediato.')) return
        const table = record.dbTable || 'workday_events'
        const { error } = await supabase.from(table).delete().eq('id', record.id)
        
        if (table === 'permisos_autorizados' && record.empleados?.id_empleado) {
            await supabase
                .from('workday_approval_status')
                .delete()
                .eq('employee_id', record.empleados.id_empleado)
                .eq('date', record.fecha_local)
        }

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
        <div className="max-w-7xl mx-auto space-y-6 page-transition pb-20">
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
                        onClick={() => setShowPermisoModal(true)}
                        className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-2xl font-black text-xs uppercase tracking-wider transition-all shadow-xl shadow-indigo-600/40 flex items-center gap-2 float-btn border border-indigo-400/40"
                    >
                        <ShieldCheck className="w-4.5 h-4.5 text-amber-300" />
                        <span>🏖️ + Registrar Permiso Autorizado</span>
                    </button>

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
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="glass-card p-4 rounded-2xl border border-[var(--border-color)]">
                    <p className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-wider">Total de Registros</p>
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
                <div className="glass-card p-4 rounded-2xl border border-indigo-500/30 bg-indigo-500/10 col-span-2 md:col-span-1">
                    <p className="text-[10px] font-black uppercase text-indigo-400 tracking-wider">Permisos Autorizados</p>
                    <p className="text-2xl font-black text-indigo-400 mt-1">{stats.permisos}</p>
                </div>
            </div>

            {/* Tabla de Registros de Checadas y Permisos */}
            <div className="glass-card rounded-3xl border border-[var(--border-color)] overflow-hidden shadow-xl">
                <div className="p-4 border-b border-[var(--border-color)] flex items-center justify-between">
                    <h3 className="text-sm font-black text-[var(--text-main)] uppercase tracking-wider flex items-center gap-2">
                        <Activity className="w-4 h-4 text-indigo-400" />
                        <span>Monitoreo de Asistencia y Permisos en Tiempo Real</span>
                    </h3>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setShowPermisoModal(true)}
                            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[11px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 border border-indigo-400/30 shadow-md"
                        >
                            <ShieldCheck className="w-3.5 h-3.5 text-amber-300" />
                            <span>🏖️ + Registrar Permiso</span>
                        </button>
                        <span className="text-[10px] font-bold text-[var(--text-muted)]">
                            {checadas.length} Registros en {selectedDate}
                        </span>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-[var(--border-color)] bg-white/2 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-wider">
                                <th className="p-4">Empleado</th>
                                <th className="p-4">Tipo Evento</th>
                                <th className="p-4">Hora Checada / Permiso</th>
                                <th className="p-4">Origen</th>
                                <th className="p-4">Estatus / Tipo Permiso</th>
                                <th className="p-4 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-color)] text-xs font-semibold">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="py-16 text-center text-[var(--text-muted)] font-black uppercase tracking-widest animate-pulse">
                                        Cargando asistencias y permisos en tiempo real...
                                    </td>
                                </tr>
                            ) : checadas.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-16 text-center text-[var(--text-muted)] font-bold">
                                        No hay registros de checadas o permisos para la fecha seleccionada ({selectedDate}).
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
                                            <span className={cn(
                                                "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border",
                                                r.dbTable === 'permisos_autorizados'
                                                    ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/30"
                                                    : "bg-slate-500/10 text-indigo-400 border-[var(--border-color)]"
                                            )}>
                                                {r.tipo_checada}
                                            </span>
                                        </td>
                                        <td className="p-4 font-black text-[var(--text-main)]">
                                            {r.dbTable === 'permisos_autorizados' ? '🏖️ Permiso Todo el Día' : formatHora(r.timestamp_checada)}
                                        </td>
                                        <td className="p-4 text-[10px] text-[var(--text-muted)] uppercase font-bold">
                                            {r.source || 'ADMINISTRADOR'}
                                        </td>
                                        <td className="p-4">
                                            <span className={cn(
                                                "px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border",
                                                r.estatus_puntualidad === 'CON_SUELDO' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" :
                                                r.estatus_puntualidad === 'SIN_SUELDO' ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/30" :
                                                r.estatus_puntualidad === 'RETARDO' ? "bg-amber-500/10 text-amber-400 border-amber-500/30" :
                                                r.estatus_puntualidad === 'FALTA' ? "bg-red-500/10 text-red-400 border-red-500/30" :
                                                "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                                            )}>
                                                {r.estatus_puntualidad === 'CON_SUELDO' ? '🟢 Con Sueldo' :
                                                 r.estatus_puntualidad === 'SIN_SUELDO' ? '🔵 Sin Sueldo' :
                                                 r.estatus_puntualidad}
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

            {/* Modal para Registrar Permiso con Sueldo / sin Sueldo */}
            {showPermisoModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={() => setShowPermisoModal(false)} />
                    <div className="relative w-full max-w-lg glass-card border border-indigo-500/40 shadow-2xl rounded-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
                        
                        <div className="flex justify-between items-center p-5 border-b border-[var(--border-color)] bg-white/2">
                            <h3 className="text-base font-black text-[var(--text-main)] uppercase tracking-wider flex items-center gap-2">
                                <ShieldCheck className="w-5 h-5 text-indigo-400" />
                                <span>Registrar Permiso Autorizado</span>
                            </h3>
                            <button onClick={() => setShowPermisoModal(false)} className="text-[var(--text-muted)] hover:text-white"><X className="w-5 h-5"/></button>
                        </div>

                        <form onSubmit={handleSavePermiso} className="p-6 space-y-4">
                            
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Selecciona el Empleado</label>
                                <select 
                                    required 
                                    value={permisoForm.id_empleado} 
                                    onChange={e => setPermisoForm({...permisoForm, id_empleado: e.target.value})}
                                    className="w-full h-11 px-4 text-xs font-semibold rounded-xl input-executive appearance-none"
                                >
                                    <option value="" className="bg-slate-900 text-white">-- Seleccionar Trabajador --</option>
                                    {empleadosList.map(emp => (
                                        <option key={emp.id_empleado} value={emp.id_empleado} className="bg-slate-900 text-white">
                                            {emp.nombre} {emp.apellido_paterno} (#{emp.numero_empleado})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Tipo de Permiso</label>
                                <div className="grid grid-cols-2 gap-3 pt-1">
                                    <button
                                        type="button"
                                        onClick={() => setPermisoForm({...permisoForm, tipo_permiso: 'PERMISO_CON_SUELDO'})}
                                        className={cn(
                                            "p-3 rounded-2xl border text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2",
                                            permisoForm.tipo_permiso === 'PERMISO_CON_SUELDO'
                                                ? "bg-emerald-500/20 text-emerald-400 border-emerald-500 shadow-md shadow-emerald-500/20 scale-105"
                                                : "glass text-[var(--text-muted)] border-[var(--border-color)]"
                                        )}
                                    >
                                        🟢 Con Goce de Sueldo
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setPermisoForm({...permisoForm, tipo_permiso: 'PERMISO_SIN_SUELDO'})}
                                        className={cn(
                                            "p-3 rounded-2xl border text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2",
                                            permisoForm.tipo_permiso === 'PERMISO_SIN_SUELDO'
                                                ? "bg-indigo-500/20 text-indigo-400 border-indigo-500 shadow-md shadow-indigo-500/20 scale-105"
                                                : "glass text-[var(--text-muted)] border-[var(--border-color)]"
                                        )}
                                    >
                                        🔵 Sin Goce de Sueldo
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Fecha Inicio</label>
                                    <input 
                                        type="date" 
                                        required 
                                        value={permisoForm.fecha_inicio} 
                                        onChange={e => setPermisoForm({...permisoForm, fecha_inicio: e.target.value})} 
                                        className="w-full h-11 px-4 text-xs font-semibold rounded-xl input-executive" 
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Fecha Fin</label>
                                    <input 
                                        type="date" 
                                        required 
                                        value={permisoForm.fecha_fin} 
                                        onChange={e => setPermisoForm({...permisoForm, fecha_fin: e.target.value})} 
                                        className="w-full h-11 px-4 text-xs font-semibold rounded-xl input-executive" 
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Motivo / Notas del Permiso</label>
                                <input 
                                    type="text" 
                                    placeholder="Ej. Asunto Médico o Trámite Personal" 
                                    value={permisoForm.motivo} 
                                    onChange={e => setPermisoForm({...permisoForm, motivo: e.target.value})} 
                                    className="w-full h-11 px-4 text-xs font-semibold rounded-xl input-executive" 
                                />
                            </div>

                            <div className="pt-3 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowPermisoModal(false)}
                                    className="flex-1 glass hover:bg-white/10 text-[var(--text-main)] py-3 rounded-2xl text-xs font-bold transition-all"
                                >
                                    Cancelar
                                </button>
                                <button 
                                  type="submit" 
                                  disabled={isSavingPermiso}
                                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
                                >
                                    <CheckCircle className="w-4 h-4" />
                                    <span>{isSavingPermiso ? 'Guardando...' : 'Autorizar Permiso'}</span>
                                </button>
                            </div>

                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
