'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/utils/supabase/client'
import { useI18n } from '@/lib/i18n'
import { ListPlus, ArrowLeft, Search, Trash2, FileText, Image as ImageIcon, Briefcase, Banknote, Edit } from 'lucide-react'
import { cn } from '@/utils/cn'

type Transaction = {
    id_transaccion: string
    tipo_transaccion: string
    monto: number
    descripcion_texto: string
    folio_ticket: string | null
    nombre_negocio: string | null
    fecha: string
    url_foto_evidencia: string
    is_deleted: boolean
    proyectos: {
        nombre: string
    } | null
}

export default function HistorialRegistradoraPage() {
    const { t } = useI18n()
    const router = useRouter()
    const [transactions, setTransactions] = useState<Transaction[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadHistory()
    }, [])

    async function loadHistory() {
        setLoading(true)
        console.log("Loading history...")
        
        // Tentative fix: If 'proyectos' relation doesn't work, maybe use FK name or verify schema
        const { data, error } = await supabase
            .from('transacciones_financieras')
            .select(`
                id_transaccion,
                tipo_transaccion,
                monto,
                descripcion_texto,
                folio_ticket,
                nombre_negocio,
                fecha,
                url_foto_evidencia,
                is_deleted,
                proyectos ( nombre )
            `)
            .eq('is_deleted', false)
            .order('creado_el', { ascending: false })

        if (error) {
            console.error("Error loading history:", error)
            alert(t('error') + ': ' + error.message)
        } else if (data) {
            console.log("History data loaded:", data)
            setTransactions(data as any)
        }
        setLoading(false)
    }

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar este registro? (Se ocultará del sistema)')) return

        const { error } = await supabase
            .from('transacciones_financieras')
            .update({ is_deleted: true })
            .eq('id_transaccion', id)

        if (!error) {
            setTransactions(transactions.filter(t => t.id_transaccion !== id))
        } else {
            alert('Error: ' + error.message)
        }
    }

    const getIcon = (type: string) => {
        if (type === 'Costo_Directo') return <Briefcase className="w-5 h-5 text-indigo-400" />
        if (type === 'Nomina') return <ListPlus className="w-5 h-5 text-teal-400" />
        return <Banknote className="w-5 h-5 text-rose-400" />
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount)
    }

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-24">
            <div className="flex items-center gap-4">
                <button 
                    onClick={() => router.push('/finanzas/registradora')}
                    className="w-10 h-10 bg-white/5 hover:bg-white/10 rounded-xl flex items-center justify-center text-white transition-all backdrop-blur-md"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                    <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                        {t('finance_history')}
                    </h1>
                    <p className="text-slate-400 mt-1 text-sm">{t('hist_subtitle')}</p>
                </div>
            </div>

            <div className="glass-dark border border-white/5 rounded-3xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-white/5 bg-white/5">
                                <th className="p-4 text-xs font-black uppercase tracking-wider text-slate-400">{t('hist_col_date')}</th>
                                <th className="p-4 text-xs font-black uppercase tracking-wider text-slate-400">{t('hist_col_concept')}</th>
                                <th className="p-4 text-xs font-black uppercase tracking-wider text-slate-400">{t('hist_col_folio')}</th>
                                <th className="p-4 text-xs font-black uppercase tracking-wider text-slate-400">{t('hist_col_project')}</th>
                                <th className="p-4 text-xs font-black uppercase tracking-wider text-slate-400">{t('hist_col_amount')}</th>
                                <th className="p-4 text-xs font-black uppercase tracking-wider text-slate-400">{t('hist_col_ticket')}</th>
                                <th className="p-4 text-xs font-black uppercase tracking-wider text-slate-400 text-right">{t('hist_col_actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="p-8 text-center text-slate-400">{t('hist_loading')}</td>
                                </tr>
                            ) : transactions.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="p-8 text-center text-slate-400">{t('hist_no_records')}</td>
                                </tr>
                            ) : transactions.map(tx => (
                                <tr key={tx.id_transaccion} className="hover:bg-white/[0.02] transition-colors group">
                                    <td className="p-4">
                                        <div className="text-sm font-medium text-slate-300">
                                            {tx.fecha}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                                                {getIcon(tx.tipo_transaccion)}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-white max-w-[200px] truncate" title={tx.descripcion_texto}>
                                                    {tx.descripcion_texto}
                                                </p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <p className="text-[10px] text-slate-500 uppercase tracking-wider">
                                                        {tx.tipo_transaccion.replace('_', ' ')}
                                                    </p>
                                                    {tx.nombre_negocio && (
                                                        <>
                                                            <span className="text-[10px] text-slate-600">•</span>
                                                            <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">
                                                                {tx.nombre_negocio}
                                                            </p>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="text-xs font-mono text-slate-400">
                                            {tx.folio_ticket || '---'}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <span className={cn(
                                            "px-3 py-1 rounded-full text-xs font-semibold",
                                            tx.proyectos ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20" : "bg-slate-500/10 text-slate-400 border border-slate-500/20"
                                        )}>
                                            {tx.proyectos?.nombre || t('hist_general')}
                                        </span>
                                    </td>
                                    <td className="p-4 font-black tracking-tight text-white">
                                        {formatCurrency(tx.monto)}
                                    </td>
                                    <td className="p-4">
                                        {tx.url_foto_evidencia ? (
                                            <a 
                                                href={tx.url_foto_evidencia} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="block w-12 h-12 rounded-xl overflow-hidden border border-white/10 hover:border-indigo-500/50 transition-all shadow-lg hover:scale-125 hover:rotate-2 relative group-hover:z-50"
                                                title={t('hist_view_receipt')}
                                            >
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img 
                                                    src={tx.url_foto_evidencia} 
                                                    alt="Ticket" 
                                                    className="w-full h-full object-cover"
                                                />
                                                <div className="absolute inset-0 bg-indigo-600/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                    <ImageIcon className="w-4 h-4 text-white" />
                                                </div>
                                            </a>
                                        ) : (
                                            <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center text-slate-700 border border-dashed border-white/10" title={t('hist_no_receipt')}>
                                                <FileText className="w-5 h-5" />
                                            </div>
                                        )}
                                    </td>
                                    <td className="p-4 text-right">
                                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button 
                                                onClick={() => handleDelete(tx.id_transaccion)}
                                                className="w-8 h-8 flex items-center justify-center bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white rounded-lg transition-all"
                                                title={t('delete')}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
