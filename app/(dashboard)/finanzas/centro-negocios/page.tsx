'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/utils/supabase/client'
import { useI18n } from '@/lib/i18n'
import { PieChart as PieChartIcon, Plus, X, Briefcase, FileText, Banknote, Calendar, Layers, MapPin, Edit } from 'lucide-react'
import { FinancialDashboard } from '@/components/FinancialDashboard'
import { cn } from '@/utils/cn'

export default function CentroNegociosPage() {
    const { t } = useI18n()
    const [activeTab, setActiveTab] = useState<'dashboard' | 'proyectos'>('dashboard')
    
    const [projects, setProjects] = useState<any[]>([])
    const [transactions, setTransactions] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    // Modal state
    const [showModal, setShowModal] = useState(false)
    const [isEditing, setIsEditing] = useState(false)
    const [currentProject, setCurrentProject] = useState<any>({
        nombre: '', direccion: '', fecha_inicio: '', fecha_fin: '', presupuesto_estimado: '', precio_cobrado: '', estatus: 'Iniciado'
    })

    useEffect(() => {
        loadData()
    }, [])

    async function loadData() {
        setLoading(true)
        
        const { data: pData } = await supabase
            .from('proyectos')
            .select('*')
            .eq('is_deleted', false)
            .order('creado_el', { ascending: false })

        const { data: tData } = await supabase
            .from('transacciones_financieras')
            .select('*')
            .eq('is_deleted', false)

        if (pData) setProjects(pData)
        if (tData) setTransactions(tData)

        setLoading(false)
    }

    const openCreateModal = () => {
        setIsEditing(false)
        setCurrentProject({ nombre: '', direccion: '', fecha_inicio: '', fecha_fin: '', presupuesto_estimado: '', precio_cobrado: '', estatus: 'Iniciado' })
        setShowModal(true)
    }

    const openEditModal = (p: any) => {
        setIsEditing(true)
        setCurrentProject(p)
        setShowModal(true)
    }

    const saveProject = async (e: React.FormEvent) => {
        e.preventDefault()

        if (currentProject.estatus === 'Finalizado') {
            const confirmClose = confirm(t('finance_confirm_close'))
            if (!confirmClose) return
        }
        
        const payload = {
            nombre: currentProject.nombre,
            direccion: currentProject.direccion,
            fecha_inicio: currentProject.fecha_inicio || null,
            fecha_fin: currentProject.fecha_fin || null,
            presupuesto_estimado: currentProject.presupuesto_estimado || 0,
            precio_cobrado: currentProject.precio_cobrado || 0,
            estatus: currentProject.estatus
        }

        if (isEditing) {
            await supabase.from('proyectos').update(payload).eq('id_proyecto', currentProject.id_proyecto)
        } else {
            await supabase.from('proyectos').insert(payload)
        }
        
        setShowModal(false)
        loadData()
    }

    const deleteProject = async (id: string) => {
        if (!confirm('¿Seguro de borrar este proyecto? Se aplicará borrado lógico.')) return
        await supabase.from('proyectos').update({ is_deleted: true }).eq('id_proyecto', id)
        loadData()
    }

    const formatCurrency = (val: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val)

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-24">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                        <PieChartIcon className="w-8 h-8 text-blue-400" />
                        {t('menu_business_center')}
                    </h1>
                    <p className="text-slate-400 mt-1 text-sm">{t('centro_subtitle')}</p>
                </div>

                <div className="flex bg-black/40 border border-white/10 p-1 rounded-2xl w-max">
                    <button 
                        onClick={() => setActiveTab('dashboard')}
                        className={cn("px-6 py-2.5 rounded-xl text-sm font-bold transition-all", activeTab === 'dashboard' ? "bg-white/10 text-white shadow-lg" : "text-slate-400 hover:text-white")}
                    >
                        {t('centro_tab_dashboard')}
                    </button>
                    <button 
                        onClick={() => setActiveTab('proyectos')}
                        className={cn("px-6 py-2.5 rounded-xl text-sm font-bold transition-all", activeTab === 'proyectos' ? "bg-white/10 text-white shadow-lg" : "text-slate-400 hover:text-white")}
                    >
                        {t('centro_tab_projects')}
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="py-20 text-center text-slate-400 font-medium animate-pulse">{t('centro_loading')}</div>
            ) : (
                <>
                    {/* Tab: Dashboard */}
                    {activeTab === 'dashboard' && (
                        <FinancialDashboard projects={projects} transactions={transactions} />
                    )}

                    {/* Tab: Proyectos */}
                    {activeTab === 'proyectos' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="flex justify-between items-center bg-white/5 border border-white/10 p-4 rounded-3xl backdrop-blur-md">
                                <h2 className="text-lg font-bold text-white tracking-tight px-2">{t('centro_projects_count')} ({projects.length})</h2>
                                <button 
                                    onClick={openCreateModal}
                                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-indigo-500/20"
                                >
                                    <Plus className="w-4 h-4" />
                                    {t('finance_new_project')}
                                </button>
                            </div>

                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                                {projects.length === 0 && (
                                    <div className="col-span-full py-12 text-center text-slate-400 border border-dashed border-white/10 rounded-3xl">
                                        {t('centro_no_projects')}
                                    </div>
                                )}
                                {projects.map(p => (
                                    <div key={p.id_proyecto} className="glass-dark border border-white/10 p-5 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-6 hover:border-white/20 transition-all group">
                                        <div className="flex gap-4 items-start">
                                            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center shrink-0">
                                                <Layers className="w-6 h-6 text-indigo-400" />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-bold text-white tracking-tight">{p.nombre}</h3>
                                                <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                                                    <span className={cn(
                                                        "px-2 py-0.5 rounded-full font-bold uppercase tracking-wider text-[9px]",
                                                        p.estatus === 'Finalizado' ? "bg-emerald-500/10 text-emerald-400" :
                                                        p.estatus === 'Progreso' ? "bg-amber-500/10 text-amber-400" :
                                                        "bg-blue-500/10 text-blue-400"
                                                    )}>
                                                        {p.estatus}
                                                    </span>
                                                    <span>•</span>
                                                    <MapPin className="w-3 h-3" /> <span className="truncate max-w-[150px]">{p.direccion || t('centro_no_address')}</span>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center justify-between sm:justify-end gap-6 sm:w-auto w-full border-t sm:border-t-0 border-white/5 pt-4 sm:pt-0">
                                            <div className="text-left sm:text-right">
                                                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">{t('finance_budget')}</p>
                                                <p className="text-sm font-black text-slate-200">{formatCurrency(p.presupuesto_estimado)}</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => openEditModal(p)} className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-all">
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => deleteProject(p.id_proyecto)} className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all">
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Modal de Proyecto */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />
                    <div className="relative w-full max-w-lg bg-slate-900 border border-white/10 shadow-2xl rounded-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
                        <div className="flex justify-between items-center p-5 border-b border-white/5 bg-white/[0.02]">
                            <h3 className="text-lg font-bold text-white tracking-tight">
                                {isEditing ? t('finance_edit_project') : t('finance_new_project')}
                            </h3>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5"/></button>
                        </div>
                        <form onSubmit={saveProject} className="p-6 space-y-5">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('finance_project_name')}</label>
                                <input type="text" required value={currentProject.nombre} onChange={e => setCurrentProject({...currentProject, nombre: e.target.value})} className="w-full bg-[#111623] border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none" />
                            </div>
                            
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('finance_project_address')}</label>
                                <input type="text" value={currentProject.direccion} onChange={e => setCurrentProject({...currentProject, direccion: e.target.value})} className="w-full bg-[#111623] border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('finance_start_date')}</label>
                                    <input type="date" value={currentProject.fecha_inicio} onChange={e => setCurrentProject({...currentProject, fecha_inicio: e.target.value})} className="w-full bg-[#111623] border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('finance_end_date')}</label>
                                    <input type="date" value={currentProject.fecha_fin} onChange={e => setCurrentProject({...currentProject, fecha_fin: e.target.value})} className="w-full bg-[#111623] border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('finance_budget')}</label>
                                    <input type="number" step="0.01" value={currentProject.presupuesto_estimado} onChange={e => setCurrentProject({...currentProject, presupuesto_estimado: e.target.value})} className="w-full bg-[#111623] border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('finance_charged')}</label>
                                    <input type="number" step="0.01" value={currentProject.precio_cobrado} onChange={e => setCurrentProject({...currentProject, precio_cobrado: e.target.value})} className="w-full bg-[#111623] border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none" />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('finance_status')}</label>
                                <select value={currentProject.estatus} onChange={e => setCurrentProject({...currentProject, estatus: e.target.value})} className="w-full bg-[#111623] border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none appearance-none">
                                    <option value="Iniciado" className="bg-[#111623] text-white">{t('finance_status_started')}</option>
                                    <option value="Progreso" className="bg-[#111623] text-white">{t('finance_status_progress')}</option>
                                    <option value="Finalizado" className="bg-[#111623] text-white">{t('finance_status_finished')}</option>
                                </select>
                            </div>

                            <div className="pt-4">
                                <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-4 py-3.5 font-bold transition-all shadow-lg shadow-indigo-600/20">
                                    {t('save')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
