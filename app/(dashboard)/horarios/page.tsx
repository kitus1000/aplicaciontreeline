'use client'

import { useState, useEffect } from 'react'
import { Clock, Plus, Trash2, Edit, X, Check, CalendarDays, ShieldAlert, ArrowLeft, Coffee } from 'lucide-react'
import Link from 'next/link'
import { supabase } from '@/utils/supabase/client'
import { useI18n } from '@/lib/i18n'
import { cn } from '@/utils/cn'

export default function FastHorariosPage() {
    const { t, language } = useI18n()
    const [turnos, setTurnos] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [editId, setEditId] = useState<string | null>(null)
    const [showModal, setShowModal] = useState(false)

    const allDays = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

    // Formulario de Horario Rápido
    const [form, setForm] = useState({
        nombre: '',
        hora_inicio: '08:00',
        hora_fin: '17:00',
        tolerancia_min: 15,
        limite_falta_min: 60,
        ventana_desde: '04:00',
        ventana_hasta: '12:00',
        dias_descanso: ['Domingo'] as string[]
    })

    useEffect(() => {
        fetchTurnos()
    }, [])

    async function fetchTurnos() {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('turnos')
                .select('*')
                .order('created_at', { ascending: false })
            if (data) setTurnos(data)
        } catch (error: any) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    const openCreateModal = () => {
        setEditId(null)
        setForm({
            nombre: '',
            hora_inicio: '08:00',
            hora_fin: '17:00',
            tolerancia_min: 15,
            limite_falta_min: 60,
            ventana_desde: '04:00',
            ventana_hasta: '12:00',
            dias_descanso: ['Domingo']
        })
        setShowModal(true)
    }

    function loadToEdit(t: any) {
        setEditId(t.id)
        
        let descansoList: string[] = ['Domingo']
        if (Array.isArray(t.dias_descanso)) {
            descansoList = t.dias_descanso
        } else if (typeof t.dias_descanso === 'string' && t.dias_descanso) {
            descansoList = t.dias_descanso.split(',').map((s: string) => s.trim())
        }

        setForm({
            nombre: t.nombre,
            hora_inicio: t.hora_inicio ? t.hora_inicio.slice(0, 5) : '08:00',
            hora_fin: t.hora_fin ? t.hora_fin.slice(0, 5) : '17:00',
            tolerancia_min: t.tolerancia_min || 15,
            limite_falta_min: t.limite_falta_min || 60,
            ventana_desde: t.ventana_desde ? t.ventana_desde.slice(0, 5) : '04:00',
            ventana_hasta: t.ventana_hasta ? t.ventana_hasta.slice(0, 5) : '12:00',
            dias_descanso: descansoList
        })
        setShowModal(true)
    }

    const toggleRestDay = (day: string) => {
        setForm(prev => {
            const exists = prev.dias_descanso.includes(day)
            const updated = exists 
                ? prev.dias_descanso.filter(d => d !== day)
                : [...prev.dias_descanso, day]
            return { ...prev, dias_descanso: updated }
        })
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setIsSubmitting(true)

        const payload = {
            ...form,
            dias_descanso: form.dias_descanso // Store array or string
        }

        try {
            if (editId) {
                const { error } = await supabase.from('turnos').update(payload).eq('id', editId)
                if (error) throw error
            } else {
                const { error } = await supabase.from('turnos').insert(payload)
                if (error) throw error
            }

            setShowModal(false)
            setEditId(null)
            fetchTurnos()
        } catch (error: any) {
            alert('Error al guardar el horario: ' + error.message)
        } finally {
            setIsSubmitting(false)
        }
    }

    async function handleDelete(id: string) {
        if (!confirm('¿Seguro que deseas eliminar este horario de trabajo?')) return
        try {
            const { error } = await supabase.from('turnos').delete().eq('id', id)
            if (error) throw error
            fetchTurnos()
        } catch (err: any) {
            alert('Error al eliminar: ' + err.message)
        }
    }

    return (
        <div className="max-w-6xl mx-auto space-y-6 page-transition pb-16">
            
            {/* Header Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-color)] pb-6">
                <div>
                    <h1 className="text-3xl font-black text-[var(--text-main)] tracking-tight flex items-center gap-3">
                        <Clock className="w-8 h-8 text-amber-400" />
                        <span>Horarios de Trabajo y Días de Descanso</span>
                    </h1>
                    <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mt-1">
                      Configura turnos de entrada, salida y días de descanso oficiales para evitar faltas injustificadas
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <Link
                        href="/empleados"
                        className="px-4 py-2.5 glass hover:border-indigo-500/40 text-[var(--text-muted)] hover:text-white rounded-2xl text-xs font-bold transition-all flex items-center gap-2"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Volver a Empleados</span>
                    </Link>

                    <button
                        onClick={openCreateModal}
                        className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-2xl font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-amber-500/20 flex items-center gap-2 float-btn"
                    >
                        <Plus className="w-4 h-4" />
                        <span>+ Crear Nuevo Horario</span>
                    </button>
                </div>
            </div>

            {/* Grid de Horarios / Turnos */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    <div className="col-span-full py-20 text-center space-y-4">
                        <div className="w-10 h-10 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin mx-auto"></div>
                        <p className="text-xs text-[var(--text-muted)] font-black uppercase tracking-widest animate-pulse">Cargando horarios de trabajo...</p>
                    </div>
                ) : turnos.length === 0 ? (
                    <div className="col-span-full py-16 glass-card rounded-3xl border border-[var(--border-color)] text-center space-y-3">
                        <Clock className="w-12 h-12 text-amber-400 mx-auto opacity-40" />
                        <h3 className="text-base font-black text-[var(--text-main)]">No hay horarios registrados</h3>
                        <p className="text-xs text-[var(--text-muted)] font-semibold">Haz clic en "+ Crear Nuevo Horario" para configurar turnos de entrada, salida y descansos.</p>
                    </div>
                ) : (
                    turnos.map((t) => {
                        let restList: string[] = []
                        if (Array.isArray(t.dias_descanso)) restList = t.dias_descanso
                        else if (typeof t.dias_descanso === 'string' && t.dias_descanso) restList = t.dias_descanso.split(',')
                        else restList = ['Domingo']

                        return (
                            <div key={t.id} className="cyber-card rounded-3xl p-6 border border-[var(--border-color)] shadow-xl flex flex-col justify-between space-y-4 float-btn">
                                
                                <div className="flex items-start justify-between border-b border-[var(--border-color)] pb-3">
                                    <div>
                                        <h3 className="text-base font-black text-[var(--text-main)] tracking-tight">{t.nombre}</h3>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                                                Tol: {t.tolerancia_min} mins
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button onClick={() => loadToEdit(t)} className="p-1.5 text-[var(--text-muted)] hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors">
                                            <Edit className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => handleDelete(t.id)} className="p-1.5 text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3 text-xs">
                                    <div className="p-3 rounded-2xl glass border border-[var(--border-color)]">
                                        <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Entrada Oficial</p>
                                        <p className="text-sm font-black text-emerald-400 mt-0.5">{t.hora_inicio?.slice(0, 5)} hrs</p>
                                    </div>
                                    <div className="p-3 rounded-2xl glass border border-[var(--border-color)]">
                                        <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Salida Oficial</p>
                                        <p className="text-sm font-black text-indigo-400 mt-0.5">{t.hora_fin?.slice(0, 5)} hrs</p>
                                    </div>
                                </div>

                                {/* Rest Days Badges */}
                                <div className="p-3 rounded-2xl glass border border-[var(--border-color)] space-y-1.5">
                                    <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1">
                                        <Coffee className="w-3 h-3 text-purple-400" /> Días de Descanso Oficiales
                                    </p>
                                    <div className="flex flex-wrap gap-1">
                                        {restList.map((day, idx) => (
                                            <span key={idx} className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-purple-500/10 text-purple-300 border border-purple-500/30">
                                                🏖️ {day.trim()}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                <div className="text-[10px] font-semibold text-[var(--text-muted)] pt-2 border-t border-[var(--border-color)] flex items-center justify-between">
                                    <span>Límite Retardo: {t.limite_falta_min || 60} mins</span>
                                    <span className="text-emerald-400 font-bold">Activo</span>
                                </div>

                            </div>
                        )
                    })
                )}
            </div>

            {/* Modal para Crear/Editar Horario Rápido */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={() => setShowModal(false)} />
                    
                    <div className="relative w-full max-w-lg glass-card border border-amber-500/30 shadow-2xl rounded-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
                        <div className="flex justify-between items-center p-5 border-b border-[var(--border-color)] bg-white/2">
                            <h3 className="text-base font-black text-[var(--text-main)] uppercase tracking-wider flex items-center gap-2">
                                <Clock className="w-5 h-5 text-amber-400" />
                                <span>{editId ? 'Editar Horario de Trabajo' : 'Nuevo Horario de Trabajo'}</span>
                            </h3>
                            <button onClick={() => setShowModal(false)} className="text-[var(--text-muted)] hover:text-white"><X className="w-5 h-5"/></button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Nombre del Horario / Turno (ej. Turno Obra Matutino)</label>
                                <input 
                                  type="text" 
                                  required 
                                  placeholder="Ej. Obra General 08:00 a 17:00"
                                  value={form.nombre} 
                                  onChange={e => setForm({...form, nombre: e.target.value})} 
                                  className="w-full h-11 px-4 text-xs font-semibold rounded-xl input-executive" 
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Hora Entrada (HH:MM)</label>
                                    <input 
                                      type="time" 
                                      required 
                                      value={form.hora_inicio} 
                                      onChange={e => setForm({...form, hora_inicio: e.target.value})} 
                                      className="w-full h-11 px-4 text-xs font-semibold rounded-xl input-executive" 
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Hora Salida (HH:MM)</label>
                                    <input 
                                      type="time" 
                                      required 
                                      value={form.hora_fin} 
                                      onChange={e => setForm({...form, hora_fin: e.target.value})} 
                                      className="w-full h-11 px-4 text-xs font-semibold rounded-xl input-executive" 
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Tolerancia (Minutos)</label>
                                    <input 
                                      type="number" 
                                      required 
                                      value={form.tolerancia_min} 
                                      onChange={e => setForm({...form, tolerancia_min: parseInt(e.target.value) || 0})} 
                                      className="w-full h-11 px-4 text-xs font-semibold rounded-xl input-executive" 
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Límite para Falta (Minutos)</label>
                                    <input 
                                      type="number" 
                                      required 
                                      value={form.limite_falta_min} 
                                      onChange={e => setForm({...form, limite_falta_min: parseInt(e.target.value) || 0})} 
                                      className="w-full h-11 px-4 text-xs font-semibold rounded-xl input-executive" 
                                    />
                                </div>
                            </div>

                            {/* Selector de Días de Descanso */}
                            <div className="space-y-2 pt-1">
                                <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest flex items-center gap-1">
                                    <Coffee className="w-3.5 h-3.5 text-purple-400" /> Selecciona los Días de Descanso Oficiales
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {allDays.map(day => {
                                        const isSelected = form.dias_descanso.includes(day)
                                        return (
                                            <button
                                                type="button"
                                                key={day}
                                                onClick={() => toggleRestDay(day)}
                                                className={cn(
                                                    "px-3 py-1.5 rounded-xl text-xs font-bold transition-all border",
                                                    isSelected 
                                                        ? "bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-600/30 scale-105" 
                                                        : "glass text-[var(--text-muted)] hover:text-white border-[var(--border-color)]"
                                                )}
                                            >
                                                {isSelected ? `✓ ${day}` : day}
                                            </button>
                                        )
                                    })}
                                </div>
                                <p className="text-[10px] text-[var(--text-muted)] italic">
                                    * En los días seleccionados, si el trabajador no checa, el sistema marcará "DESCANSO" en lugar de Falta.
                                </p>
                            </div>

                            <div className="pt-3 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 glass hover:bg-white/10 text-[var(--text-main)] py-3 rounded-2xl text-xs font-bold transition-all"
                                >
                                    Cancelar
                                </button>
                                <button 
                                  type="submit" 
                                  disabled={isSubmitting}
                                  className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
                                >
                                    <Check className="w-4 h-4" />
                                    <span>{isSubmitting ? 'Guardando...' : 'Guardar Horario'}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
