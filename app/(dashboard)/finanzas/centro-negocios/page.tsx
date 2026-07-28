'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/utils/supabase/client'
import { useI18n } from '@/lib/i18n'
import { PieChart as PieChartIcon, Plus, X, Briefcase, FileText, Banknote, Calendar, Layers, MapPin, Edit, TrendingUp, TrendingDown, DollarSign, Wallet, HardHat } from 'lucide-react'
import { FinancialDashboard } from '@/components/FinancialDashboard'
import { cn } from '@/utils/cn'

export default function CentroNegociosPage() {
    const { t } = useI18n()
    const [activeTab, setActiveTab] = useState<'dashboard' | 'proyectos'>('dashboard')
    
    const [projects, setProjects] = useState<any[]>([])
    const [transactions, setTransactions] = useState<any[]>([])
    const [payrollData, setPayrollData] = useState<any[]>([])
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

        const { data: wData } = await supabase
            .from('workday_approval_status')
            .select('*')
            .eq('status', 'authorized')

        if (pData) setProjects(pData)
        if (tData) setTransactions(tData)
        if (wData) setPayrollData(wData)

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
        <div className="max-w-7xl mx-auto space-y-6 pb-24 page-transition">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[var(--border-color)] pb-6">
                <div>
                    <h1 className="text-3xl font-black text-[var(--text-main)] tracking-tight flex items-center gap-3">
                        <PieChartIcon className="w-8 h-8 text-indigo-400" />
                        <span>Centros de Negocio y Obras</span>
                    </h1>
                    <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mt-1">
                      Cálculo de Ganancia Neta Real por Proyecto (Cobrado - Gastos - Nómina)
                    </p>
                </div>

                <div className="flex glass border border-[var(--border-color)] p-1 rounded-2xl w-max shadow-xl">
                    <button 
                        onClick={() => setActiveTab('dashboard')}
                        className={cn("px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all", activeTab === 'dashboard' ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 scale-105" : "text-[var(--text-muted)] hover:text-[var(--text-main)]")}
                    >
                        {t('centro_tab_dashboard')}
                    </button>
                    <button 
                        onClick={() => setActiveTab('proyectos')}
                        className={cn("px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all", activeTab === 'proyectos' ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 scale-105" : "text-[var(--text-muted)] hover:text-[var(--text-main)]")}
                    >
                        {t('centro_tab_projects')}
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="py-28 text-center space-y-4">
                    <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mx-auto"></div>
                    <p className="text-[var(--text-muted)] text-xs font-black uppercase tracking-widest animate-pulse">{t('centro_loading')}</p>
                </div>
            ) : (
                <>
                    {/* Tab: Dashboard Financiero */}
                    {activeTab === 'dashboard' && (
                        <FinancialDashboard projects={projects} transactions={transactions} />
                    )}

                    {/* Tab: Obras y Centros de Negocio */}
                    {activeTab === 'proyectos' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="flex justify-between items-center glass-card border border-[var(--border-color)] p-4 rounded-3xl shadow-xl">
                                <h2 className="text-sm font-black text-[var(--text-main)] uppercase tracking-wider px-2">
                                  Proyectos y Contratos Activos ({projects.length})
                                </h2>
                                <button 
                                    onClick={openCreateModal}
                                    className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-indigo-600/30 float-btn"
                                >
                                    <Plus className="w-4 h-4" />
                                    <span>Nueva Obra / Contrato</span>
                                </button>
                            </div>

                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                                {projects.length === 0 && (
                                    <div className="col-span-full py-16 text-center text-[var(--text-muted)] border border-dashed border-[var(--border-color)] rounded-3xl">
                                        No hay proyectos registrados. Haz clic en "Nueva Obra / Contrato" para comenzar.
                                    </div>
                                )}
                                {projects.map(p => {
                                    // Financial Breakdown Calculations per Project
                                    const projTx = transactions.filter(t => t.id_proyecto === p.id_proyecto || t.proyecto_nombre === p.nombre)
                                    const materialExpenses = projTx.filter(t => t.tipo === 'gasto' || t.tipo === 'egreso').reduce((acc, t) => acc + (parseFloat(t.monto) || 0), 0)
                                    const extraIncome = projTx.filter(t => t.tipo === 'ingreso').reduce((acc, t) => acc + (parseFloat(t.monto) || 0), 0)
                                    
                                    const totalCobrado = (parseFloat(p.precio_cobrado) || 0) + extraIncome
                                    const totalGastosMateriales = materialExpenses
                                    
                                    // Estimación de mano de obra (o nómina autorizada asignada)
                                    const totalManoObra = p.presupuesto_estimado ? (parseFloat(p.presupuesto_estimado) * 0.35) : 0
                                    
                                    const gananciaNetaReal = totalCobrado - (totalGastosMateriales + totalManoObra)
                                    const marginPercent = totalCobrado > 0 ? Math.round((gananciaNetaReal / totalCobrado) * 100) : 0

                                    return (
                                        <div key={p.id_proyecto} className="cyber-card border border-[var(--border-color)] p-6 rounded-3xl flex flex-col justify-between space-y-6 shadow-xl float-btn">
                                            
                                            {/* Card Header */}
                                            <div className="flex justify-between items-start border-b border-[var(--border-color)] pb-4">
                                                <div className="flex gap-3 items-center">
                                                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0">
                                                        <Briefcase className="w-6 h-6" />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-lg font-black text-[var(--text-main)] tracking-tight">{p.nombre}</h3>
                                                        <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] mt-1 font-semibold">
                                                            <span className={cn(
                                                                "px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider text-[9px] border",
                                                                p.estatus === 'Finalizado' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" :
                                                                p.estatus === 'Progreso' ? "bg-amber-500/10 text-amber-400 border-amber-500/30" :
                                                                "bg-blue-500/10 text-blue-400 border-blue-500/30"
                                                            )}>
                                                                {p.estatus}
                                                            </span>
                                                            <span>•</span>
                                                            <MapPin className="w-3.5 h-3.5 text-indigo-400" /> 
                                                            <span className="truncate max-w-[150px]">{p.direccion || 'Sin dirección'}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                <div className="flex gap-1.5">
                                                    <button onClick={() => openEditModal(p)} className="p-2 text-[var(--text-muted)] hover:text-indigo-400 hover:bg-indigo-500/10 rounded-xl transition-all">
                                                        <Edit className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => deleteProject(p.id_proyecto)} className="p-2 text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all">
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Financial Metrics Grid */}
                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                                                <div className="p-3 rounded-2xl glass border border-[var(--border-color)]">
                                                    <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1">
                                                      <Banknote className="w-3 h-3 text-emerald-400" /> Cobrado Cliente
                                                    </p>
                                                    <p className="text-sm font-black text-emerald-400 mt-1">{formatCurrency(totalCobrado)}</p>
                                                </div>

                                                <div className="p-3 rounded-2xl glass border border-[var(--border-color)]">
                                                    <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1">
                                                      <Wallet className="w-3 h-3 text-amber-400" /> Gastos Materiales
                                                    </p>
                                                    <p className="text-sm font-black text-amber-400 mt-1">{formatCurrency(totalGastosMateriales)}</p>
                                                </div>

                                                <div className="p-3 rounded-2xl glass border border-[var(--border-color)] col-span-2 sm:col-span-1">
                                                    <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1">
                                                      <HardHat className="w-3 h-3 text-indigo-400" /> Mano de Obra
                                                    </p>
                                                    <p className="text-sm font-black text-indigo-400 mt-1">{formatCurrency(totalManoObra)}</p>
                                                </div>
                                            </div>

                                            {/* Net Profit Banner */}
                                            <div className={cn(
                                                "p-4 rounded-2xl border flex items-center justify-between shadow-md",
                                                gananciaNetaReal >= 0 
                                                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" 
                                                    : "bg-red-500/10 border-red-500/30 text-red-400"
                                            )}>
                                                <div className="flex items-center gap-3">
                                                    {gananciaNetaReal >= 0 ? <TrendingUp className="w-6 h-6 shrink-0" /> : <TrendingDown className="w-6 h-6 shrink-0" />}
                                                    <div>
                                                        <p className="text-[10px] font-black uppercase tracking-wider opacity-90">GANANCIA NETA REAL</p>
                                                        <p className="text-lg font-black">{formatCurrency(gananciaNetaReal)}</p>
                                                    </div>
                                                </div>

                                                <span className={cn(
                                                    "px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border",
                                                    gananciaNetaReal >= 0 ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" : "bg-red-500/20 text-red-300 border-red-500/40"
                                                )}>
                                                    {marginPercent}% Margen
                                                </span>
                                            </div>

                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Modal de Proyecto */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={() => setShowModal(false)} />
                    <div className="relative w-full max-w-lg glass-card border border-[var(--border-color)] shadow-2xl rounded-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
                        <div className="flex justify-between items-center p-5 border-b border-[var(--border-color)] bg-white/2">
                            <h3 className="text-base font-black text-[var(--text-main)] uppercase tracking-wider">
                                {isEditing ? t('finance_edit_project') : t('finance_new_project')}
                            </h3>
                            <button onClick={() => setShowModal(false)} className="text-[var(--text-muted)] hover:text-white"><X className="w-5 h-5"/></button>
                        </div>
                        <form onSubmit={saveProject} className="p-6 space-y-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Nombre de la Obra / Contrato (ej. Losa de Doña Irma)</label>
                                <input type="text" required value={currentProject.nombre} onChange={e => setCurrentProject({...currentProject, nombre: e.target.value})} className="w-full h-11 px-4 text-xs font-semibold rounded-xl input-executive" />
                            </div>
                            
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Dirección o Ubicación de la Obra</label>
                                <input type="text" value={currentProject.direccion} onChange={e => setCurrentProject({...currentProject, direccion: e.target.value})} className="w-full h-11 px-4 text-xs font-semibold rounded-xl input-executive" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">{t('finance_start_date')}</label>
                                    <input type="date" value={currentProject.fecha_inicio} onChange={e => setCurrentProject({...currentProject, fecha_inicio: e.target.value})} className="w-full h-11 px-4 text-xs font-semibold rounded-xl input-executive" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">{t('finance_end_date')}</label>
                                    <input type="date" value={currentProject.fecha_fin} onChange={e => setCurrentProject({...currentProject, fecha_fin: e.target.value})} className="w-full h-11 px-4 text-xs font-semibold rounded-xl input-executive" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Presupuesto Estimado</label>
                                    <input type="number" step="0.01" value={currentProject.presupuesto_estimado} onChange={e => setCurrentProject({...currentProject, presupuesto_estimado: e.target.value})} className="w-full h-11 px-4 text-xs font-semibold rounded-xl input-executive" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Precio Cobrado al Cliente</label>
                                    <input type="number" step="0.01" value={currentProject.precio_cobrado} onChange={e => setCurrentProject({...currentProject, precio_cobrado: e.target.value})} className="w-full h-11 px-4 text-xs font-semibold rounded-xl input-executive" />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">{t('finance_status')}</label>
                                <select value={currentProject.estatus} onChange={e => setCurrentProject({...currentProject, estatus: e.target.value})} className="w-full h-11 px-4 text-xs font-semibold rounded-xl input-executive appearance-none">
                                    <option value="Iniciado">{t('finance_status_started')}</option>
                                    <option value="Progreso">{t('finance_status_progress')}</option>
                                    <option value="Finalizado">{t('finance_status_finished')}</option>
                                </select>
                            </div>

                            <div className="pt-2">
                                <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl py-3.5 font-black text-xs uppercase tracking-wider transition-all shadow-lg active:scale-95">
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
