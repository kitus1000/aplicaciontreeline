'use client'

import { useState } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { useI18n } from '@/lib/i18n'
import { cn } from '@/utils/cn'
import { Wallet, Briefcase, TrendingUp, AlertCircle, Banknote, LayoutDashboard } from 'lucide-react'

type Project = {
    id_proyecto: string
    nombre: string
    presupuesto_estimado: number
    precio_cobrado: number
    estatus: string
}

type Transaction = {
    id_proyecto: string | null
    tipo_transaccion: 'Costo_Directo' | 'Gasto_Indirecto' | 'Nomina'
    monto: number
}

interface FinancialDashboardProps {
    projects: Project[]
    transactions: Transaction[]
}

export function FinancialDashboard({ projects, transactions }: FinancialDashboardProps) {
    const { t } = useI18n()
    const [calcBase, setCalcBase] = useState<'budget' | 'charged'>('budget')
    const [statusFilter, setStatusFilter] = useState<string>('Iniciado,Progreso')

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val)
    }

    const filteredProjects = projects.filter(p => statusFilter.includes(p.estatus))

    const projectData = filteredProjects.map(p => {
        const pTrans = transactions.filter(t => t.id_proyecto === p.id_proyecto)
        
        const totalCostos = pTrans.filter(t => t.tipo_transaccion === 'Costo_Directo' || t.tipo_transaccion === 'Nomina').reduce((acc, curr) => acc + curr.monto, 0)
        const totalGastos = pTrans.filter(t => t.tipo_transaccion === 'Gasto_Indirecto').reduce((acc, curr) => acc + curr.monto, 0)
        
        const baseIncome = calcBase === 'budget' ? p.presupuesto_estimado : p.precio_cobrado
        const utilNet = baseIncome - totalCostos - totalGastos
        const utilPercent = baseIncome > 0 ? (utilNet / baseIncome) * 100 : 0
        
        const presupuestoConsumido = totalCostos + totalGastos
        const percentConsumido = baseIncome > 0 ? (presupuestoConsumido / baseIncome) * 100 : 0

        return {
            ...p,
            totalCostos,
            totalGastos,
            baseIncome,
            utilNet,
            utilPercent,
            presupuestoConsumido,
            percentConsumido
        }
    })

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/5 border border-white/10 p-4 rounded-3xl backdrop-blur-md">
                <div className="flex bg-black/40 p-1 rounded-2xl w-max">
                    <button 
                        onClick={() => setStatusFilter('Iniciado,Progreso')}
                        className={cn("px-4 py-2 rounded-xl text-sm font-bold transition-all", statusFilter.includes('Progreso') ? "bg-white/10 text-white shadow" : "text-slate-400 hover:text-white")}
                    >
                        {t('fin_active_projects')}
                    </button>
                    <button 
                        onClick={() => setStatusFilter('Finalizado')}
                        className={cn("px-4 py-2 rounded-xl text-sm font-bold transition-all", statusFilter === 'Finalizado' ? "bg-white/10 text-white shadow" : "text-slate-400 hover:text-white")}
                    >
                        {t('fin_finished_projects')}
                    </button>
                </div>

                <div className="flex items-center gap-2 text-sm font-medium">
                    <span className="text-slate-400">{t('finance_calc_based_on')}</span>
                    <select 
                        value={calcBase}
                        onChange={(e) => setCalcBase(e.target.value as any)}
                        className="bg-[#111623] border border-white/10 text-white rounded-xl px-3 py-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="budget" className="bg-[#111623] text-white">{t('finance_calc_budget')}</option>
                        <option value="charged" className="bg-[#111623] text-white">{t('finance_calc_charged')}</option>
                    </select>
                </div>
            </div>

            {projectData.length === 0 && (
                <div className="text-center py-20 bg-white/5 border border-white/10 rounded-3xl">
                    <LayoutDashboard className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                    <p className="text-slate-400">{t('fin_no_projects_status')}</p>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {projectData.map((project) => {
                    const isAlert = project.percentConsumido >= 90
                    
                    const chartData = [
                        { name: t('fin_chart_consumed'), value: project.presupuestoConsumido, color: isAlert ? '#ef4444' : '#6366f1' },
                        { name: t('fin_chart_remaining'), value: Math.max(0, project.baseIncome - project.presupuestoConsumido), color: '#334155' }
                    ]

                    return (
                        <div key={project.id_proyecto} className="glass-dark border border-white/10 rounded-3xl overflow-hidden hover:border-indigo-500/50 transition-all duration-300 group">
                            {/* Header */}
                            <div className="p-5 border-b border-white/5 bg-white/[0.02]">
                                <div className="flex justify-between items-start gap-4">
                                    <div>
                                        <h3 className="text-lg font-black text-white tracking-tight leading-tight line-clamp-1" title={project.nombre}>
                                            {project.nombre}
                                        </h3>
                                        <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest">{project.estatus}</p>
                                    </div>
                                    {isAlert && (
                                        <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
                                            <AlertCircle className="w-4 h-4 text-red-500" />
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="p-5 flex gap-6">
                                {/* Chart */}
                                <div className="w-24 h-24 shrink-0 relative">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={chartData}
                                                innerRadius={30}
                                                outerRadius={45}
                                                paddingAngle={2}
                                                dataKey="value"
                                                stroke="none"
                                            >
                                                {chartData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} itemStyle={{ color: '#fff' }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                        <span className={cn("text-[10px] font-black", isAlert ? "text-red-400" : "text-white")}>
                                            {project.percentConsumido.toFixed(0)}%
                                        </span>
                                    </div>
                                </div>

                                {/* Summary Stats */}
                                <div className="flex-1 space-y-4">
                                    <div>
                                        <p className="text-xs text-slate-400 font-medium mb-1">{t('fin_base_label')} {calcBase === 'budget' ? t('fin_base_budget') : t('fin_base_charged')}</p>
                                        <p className="text-sm font-bold text-white">{formatCurrency(project.baseIncome)}</p>
                                    </div>
                                    <div className="flex gap-4">
                                        <div>
                                            <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">{t('finance_total_costs')}</p>
                                            <p className="text-xs font-semibold text-rose-400">{formatCurrency(project.totalCostos)}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">{t('finance_total_expenses')}</p>
                                            <p className="text-xs font-semibold text-orange-400">{formatCurrency(project.totalGastos)}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Footer / Net Profit */}
                            <div className={cn(
                                "p-4 border-t border-white/5",
                                project.utilNet > 0 ? "bg-emerald-500/5" : "bg-red-500/5"
                            )}>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">{t('finance_net_profit')}</span>
                                    <div className="text-right">
                                        <p className={cn("text-lg font-black tracking-tight", project.utilNet >= 0 ? "text-emerald-400" : "text-red-400")}>
                                            {formatCurrency(project.utilNet)}
                                        </p>
                                        <p className={cn("text-[10px] font-bold uppercase tracking-wider", project.utilPercent >= 0 ? "text-emerald-500/70" : "text-red-500/70")}>
                                            {t('fin_margin_label')} {project.utilPercent.toFixed(1)}%
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
