'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/utils/supabase/client'
import { Calendar, CheckCircle2, XCircle, ExternalLink, Filter, Search, ChevronRight } from 'lucide-react'
import { cn } from '@/utils/cn'
import { useI18n } from '@/lib/i18n'
import Link from 'next/link'

export default function AutorizacionesJornadasPage() {
    const { t } = useI18n()
    const [jornadas, setJornadas] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [filterStatus, setFilterStatus] = useState<string>('Enviado')

    const statusMap: Record<string, string> = {
        'Enviado': 'status_sent',
        'En revisión': 'status_under_review',
        'Autorizado': 'status_authorized',
        'Rechazado': 'status_rejected'
    }

    const statusOptions = ['Enviado', 'En revisión', 'Autorizado', 'Rechazado']

    useEffect(() => {
        fetchJornadas()
    }, [filterStatus])

    async function fetchJornadas() {
        setLoading(true)
        // Obtenemos los estados de aprobación junto con los datos del empleado
        const { data, error } = await supabase
            .from('workday_approval_status')
            .select(`
                *,
                empleados (nombre, apellido_paterno, apellido_materno)
            `)
            .eq('status', filterStatus)
            .order('date', { ascending: false })

        if (!error && data) {
            setJornadas(data)
        }
        setLoading(false)
    }

    async function updateStatus(rowId: string, newStatus: string) {
        if (!confirm(`${t('confirm')} ${t(statusMap[newStatus] || newStatus)}?`)) return
        
        const { error } = await supabase
            .from('workday_approval_status')
            .update({ status: newStatus, reviewed_at: new Date().toISOString() })
            .eq('id', rowId)

        if (error) alert('Error: ' + error.message)
        else fetchJornadas()
    }

    return (
        <div className="space-y-8 max-w-7xl mx-auto page-transition px-4 md:px-0">
            {/* Cabecera Futurista */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-white/5 pb-8">
                <div>
                    <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic">
                        {t('auth_title').split(' ')[0]} <span className="text-indigo-400">{t('auth_title').split(' ').slice(1).join(' ')}</span>
                    </h1>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-[0.3em] mt-1">{t('auth_subtitle')}</p>
                </div>

                <div className="flex glass p-1.5 rounded-2xl shadow-2xl overflow-x-auto whitespace-nowrap">
                    {statusOptions.map(st => (
                        <button
                            key={st}
                            onClick={() => setFilterStatus(st)}
                            className={cn(
                                "px-5 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all duration-300",
                                filterStatus === st 
                                    ? "bg-indigo-600 text-white shadow-[0_0_15px_rgba(99,102,241,0.5)] scale-105" 
                                    : "text-slate-500 hover:text-white"
                            )}
                        >
                            {t(statusMap[st] || st)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Grid de Jornadas */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                {loading ? (
                    <div className="col-span-full py-40 text-center space-y-4">
                        <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mx-auto"></div>
                        <p className="text-slate-500 text-xs font-black uppercase tracking-[0.5em] animate-pulse">{t('syncing_network')}</p>
                    </div>
                ) : jornadas.length === 0 ? (
                    <div className="col-span-full py-20 glass-dark rounded-3xl border border-white/5 text-center space-y-6">
                        <div className="w-20 h-20 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto neon-border">
                           <Calendar className="w-10 h-10 text-slate-600" />
                        </div>
                        <div>
                           <h3 className="text-xl font-bold text-white tracking-tight uppercase italic">{t('no_pending_movements')}</h3>
                           <p className="text-slate-500 text-xs uppercase font-bold tracking-widest mt-2 px-8 leading-relaxed max-w-md mx-auto">{t('no_workdays_status')}</p>
                        </div>
                    </div>
                ) : (
                    jornadas.map(j => (
                        <div key={j.id} className="glass-dark rounded-3xl border border-white/5 shadow-2xl relative overflow-hidden group flex flex-col hover:border-indigo-500/30 transition-all duration-500">
                            {/* Accent line */}
                            <div className="absolute top-0 left-0 w-full h-[2px] bg-indigo-500/20 group-hover:bg-indigo-500 transition-colors"></div>
                            
                            {/* Header Tarjeta */}
                            <div className="p-6 border-b border-white/5 bg-white/2">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg ring-1 ring-white/10 group-hover:scale-110 transition-transform">
                                            {j.empleados?.nombre.charAt(0)}{j.empleados?.apellido_paterno.charAt(0)}
                                        </div>
                                        <div>
                                            <h4 className="font-black text-white text-lg tracking-tight leading-tight">{j.empleados?.nombre} {j.empleados?.apellido_paterno}</h4>
                                            <div className="flex items-center gap-2 mt-1">
                                               <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 bg-slate-800 px-2 py-0.5 rounded">{j.date}</span>
                                               <span className="text-[10px] text-indigo-400 font-bold">#PRO</span>
                                            </div>
                                        </div>
                                    </div>
                                    <span className={cn(
                                        "px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-tighter border",
                                        j.status === 'Enviado' ? 'bg-amber-500/10 text-amber-500 border-amber-500/30' :
                                        j.status === 'Autorizado' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                                        'bg-slate-800 text-slate-400 border-slate-700'
                                    )}>
                                        {t(statusMap[j.status] || j.status)}
                                    </span>
                                </div>
                            </div>

                            {/* Contenido */}
                            <div className="p-6 flex-1 space-y-6">
                                <div className="flex items-center gap-4">
                                    <div className="flex-1 p-4 bg-slate-800/30 rounded-2xl border border-slate-700/50 hover:bg-slate-800/50 transition-colors group/ev">
                                        <p className="text-[10px] uppercase font-black text-slate-500 mb-2 tracking-widest">{t('evidence_step')}</p>
                                        {j.storage_url ? (
                                            <a 
                                                href={j.storage_url} 
                                                target="_blank" 
                                                rel="noreferrer"
                                                className="flex items-center gap-2 text-indigo-400 font-black text-xs hover:text-white transition-colors"
                                            >
                                                <ExternalLink className="w-4 h-4" />
                                                {t('view_on_drive')}
                                            </a>
                                        ) : (
                                            <div className="flex items-center gap-2 text-slate-600 italic text-xs font-bold">
                                               <XCircle className="w-4 h-4" />
                                               {t('no_files')}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {j.comments && (
                                    <div className="text-xs p-4 bg-red-500/10 text-red-400 rounded-2xl italic border border-red-500/20 relative">
                                        <div className="absolute -top-2 left-4 px-2 bg-slate-900 border border-red-500/20 text-[9px] font-black text-red-400 uppercase">{t('notes')}</div>
                                        "{j.comments}"
                                    </div>
                                )}
                            </div>

                            {/* Acciones Futuristas */}
                            <div className="p-6 bg-white/2 border-t border-white/5 flex gap-3">
                                {filterStatus === 'Enviado' || filterStatus === 'En revisión' ? (
                                    <>
                                        <button 
                                            onClick={() => updateStatus(j.id, 'Autorizado')}
                                            className="flex-1 bg-white text-slate-900 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-indigo-500 hover:text-white transition-all shadow-xl active:scale-95"
                                        >
                                            {t('authorize')}
                                        </button>
                                        <button 
                                            onClick={() => {
                                                const reason = prompt(t('rejection_reason_prompt'))
                                                if (reason) updateStatus(j.id, 'Rechazado')
                                            }}
                                            className="px-5 py-3 border border-slate-700 text-slate-400 hover:text-red-500 hover:border-red-500 hover:bg-red-500/5 rounded-2xl transition-all active:scale-95"
                                            title="Rechazar"
                                        >
                                            <XCircle className="w-5 h-5" />
                                        </button>
                                    </>
                                ) : (
                                    <button 
                                        onClick={() => updateStatus(j.id, 'En revisión')}
                                        className="w-full border border-slate-700 text-slate-500 py-3 rounded-2xl text-[10px] font-black hover:bg-white/5 hover:text-indigo-400 transition-all uppercase tracking-widest"
                                    >
                                        {t('rollback_review')}
                                    </button>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
