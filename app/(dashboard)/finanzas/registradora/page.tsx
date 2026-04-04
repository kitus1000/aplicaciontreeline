'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/utils/supabase/client'
import { useI18n } from '@/lib/i18n'
import { Wallet, UploadCloud, CheckCircle, Camera, FileText, Briefcase, Plus, Save, Banknote, ListPlus, Loader2 } from 'lucide-react'
import { cn } from '@/utils/cn'
import { compressImage } from '@/utils/imageCompression'

type Project = {
    id_proyecto: string
    nombre: string
}

export default function RegistradoraPage() {
    const { t } = useI18n()
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [projects, setProjects] = useState<Project[]>([])
    const [success, setSuccess] = useState(false)
    
    // Form State
    const [tipoTransaccion, setTipoTransaccion] = useState('Costo_Directo')
    const [idProyecto, setIdProyecto] = useState('')
    const [monto, setMonto] = useState('')
    const [descripcion, setDescripcion] = useState('')
    const [folioTicket, setFolioTicket] = useState('')
    const [nombreNegocio, setNombreNegocio] = useState('')
    const [file, setFile] = useState<File | null>(null)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)

    const fileInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        loadProjects()
    }, [])

    async function loadProjects() {
        const { data, error } = await supabase
            .from('proyectos')
            .select('id_proyecto, nombre')
            .eq('is_deleted', false)
            .in('estatus', ['Iniciado', 'Progreso'])
            .order('creado_el', { ascending: false })

        if (!error && data) {
            setProjects(data)
        }
    }

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const rawFile = e.target.files[0]
            if (rawFile.type.startsWith('image/')) {
                const objectUrl = URL.createObjectURL(rawFile)
                setPreviewUrl(objectUrl)
                setFile(rawFile)
            }
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const tempAuth = await supabase.auth.getUser()
            const userId = tempAuth.data.user?.id

            // Pre-validation: Check if project is still active
            if (idProyecto) {
                const { data: projectStatus } = await supabase
                    .from('proyectos')
                    .select('estatus')
                    .eq('id_proyecto', idProyecto)
                    .single()
                
                if (projectStatus?.estatus === 'Finalizado') {
                    alert(t('finance_error_project_closed'))
                    setLoading(false)
                    return
                }
            }

            let publicUrl = null

            if (file) {
                // Compress image
                const compressedFile = await compressImage(file)
                const fileExt = compressedFile.name.split('.').pop()
                const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
                const filePath = `gastos/${fileName}`

                // Try to upload. Using "gastos_tickets" bucket.
                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('gastos_tickets') 
                    .upload(filePath, compressedFile)
                
                if (uploadError) {
                    console.error("Upload error in 'gastos_tickets', trying fallback...", uploadError)
                    // fallback bucket
                    const fallback = await supabase.storage.from('evidencias').upload(filePath, compressedFile)
                    if (!fallback.error) {
                        publicUrl = supabase.storage.from('evidencias').getPublicUrl(filePath).data.publicUrl
                    } else {
                        throw uploadError // If both fail, throw original
                    }
                } else {
                    publicUrl = supabase.storage.from('gastos_tickets').getPublicUrl(filePath).data.publicUrl
                }
            }

            const transaccion = {
                id_proyecto: idProyecto || null,
                tipo_transaccion: tipoTransaccion,
                monto: parseFloat(monto),
                descripcion_texto: descripcion,
                folio_ticket: folioTicket || null,
                nombre_negocio: nombreNegocio || null,
                url_foto_evidencia: publicUrl,
                creado_por: userId
            }

            const { error: insertError } = await supabase
                .from('transacciones_financieras')
                .insert(transaccion)

            if (insertError) throw insertError

            setSuccess(true)
            setTimeout(() => {
                setSuccess(false)
                // Reset form
                setMonto('')
                setDescripcion('')
                setFolioTicket('')
                setNombreNegocio('')
                setFile(null)
                setPreviewUrl(null)
                if (fileInputRef.current) fileInputRef.current.value = ''
            }, 3000)

        } catch (error: any) {
            console.error('Error saving transaction:', error)
            alert(t('error') + ': ' + error.message)
        } finally {
            setLoading(false)
        }
    }

    const transTypes = [
        { id: 'Costo_Directo', label: t('finance_cost_direct'), icon: Briefcase, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
        { id: 'Gasto_Indirecto', label: t('finance_expense_indirect'), icon: Banknote, color: 'text-rose-500', bg: 'bg-rose-500/10' },
        { id: 'Nomina', label: t('finance_payroll'), icon: ListPlus, color: 'text-teal-500', bg: 'bg-teal-500/10' },
    ]

    return (
        <div className="max-w-3xl mx-auto space-y-6 pb-24">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                        <Wallet className="w-8 h-8 text-green-400" />
                        {t('menu_registradora')}
                    </h1>
                    <p className="text-slate-400 mt-1 text-sm">{t('finance_dashboard_title')} - Captura Operativa</p>
                </div>
                <button 
                    onClick={() => router.push('/finanzas/registradora/historial')}
                    className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-all font-medium text-sm border border-white/10"
                >
                    <ListPlus className="w-4 h-4" />
                    {t('finance_history')}
                </button>
            </div>

            <div className="glass-dark border border-white/5 rounded-3xl p-6 sm:p-8 relative overflow-hidden">
                {/* Decorative background elements */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                
                {success ? (
                    <div className="py-20 flex flex-col items-center justify-center text-center animate-in zoom-in duration-500">
                        <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
                            <CheckCircle className="w-10 h-10 text-green-400" />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">{t('finance_transaction_saved')}</h2>
                        <button 
                            onClick={() => setSuccess(false)}
                            className="mt-6 px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition-all"
                        >
                            {t('fin_capture_another')}
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-8 relative z-10">
                        {/* Transaction Type */}
                        <div className="space-y-3">
                            <label className="text-sm font-bold text-slate-300 uppercase tracking-wider">{t('finance_transaction_type')}</label>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                {transTypes.map(type => {
                                    const isSelected = tipoTransaccion === type.id
                                    return (
                                        <button
                                            key={type.id}
                                            type="button"
                                            onClick={() => setTipoTransaccion(type.id)}
                                            className={cn(
                                                "flex flex-col items-center justify-center p-4 rounded-2xl border transition-all duration-300",
                                                isSelected 
                                                    ? `bg-white/10 border-${type.color.split('-')[1]}-500 shadow-lg shadow-white/5` 
                                                    : "border-white/5 hover:bg-white/5"
                                            )}
                                        >
                                            <div className={cn("mb-2 p-2 rounded-xl", type.bg)}>
                                                <type.icon className={cn("w-6 h-6", type.color)} />
                                            </div>
                                            <span className={cn("text-sm font-semibold text-center", isSelected ? "text-white" : "text-slate-400")}>
                                                {type.label}
                                            </span>
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Project Selection */}
                        <div className="space-y-3">
                            <label className="text-sm font-bold text-slate-300 uppercase tracking-wider">{t('finance_select_project')}</label>
                            <select
                                value={idProyecto}
                                onChange={(e) => setIdProyecto(e.target.value)}
                                required={tipoTransaccion !== 'Gasto_Indirecto'}
                                className="w-full bg-[#111623] border border-white/10 rounded-2xl px-4 py-4 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all appearance-none"
                            >
                                <option value="" className="bg-[#111623] text-white">{tipoTransaccion === 'Gasto_Indirecto' ? t('finance_no_project') : t('fin_select_project_placeholder')}</option>
                                {projects.map(p => (
                                    <option key={p.id_proyecto} value={p.id_proyecto} className="bg-[#111623] text-white">
                                        {p.nombre}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Folio and Business */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="space-y-3">
                                <label className="text-sm font-bold text-slate-300 uppercase tracking-wider">{t('finance_folio')}</label>
                                <input
                                    type="text"
                                    value={folioTicket}
                                    onChange={(e) => setFolioTicket(e.target.value)}
                                    placeholder="Ej. ABC-12345"
                                    className="w-full bg-[#111623] border border-white/10 rounded-2xl px-4 py-4 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                                />
                            </div>
                            <div className="space-y-3">
                                <label className="text-sm font-bold text-slate-300 uppercase tracking-wider">{t('finance_business_name')}</label>
                                <input
                                    type="text"
                                    value={nombreNegocio}
                                    onChange={(e) => setNombreNegocio(e.target.value)}
                                    placeholder="Ej. Home Depot, OXXO..."
                                    className="w-full bg-[#111623] border border-white/10 rounded-2xl px-4 py-4 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                                />
                            </div>
                        </div>

                        {/* Amount & Description */}
                        <div className="grid grid-cols-1 gap-6">
                            <div className="space-y-3">
                                <label className="text-sm font-bold text-slate-300 uppercase tracking-wider">{t('finance_amount')}</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <span className="text-2xl font-bold text-slate-400">$</span>
                                    </div>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={monto}
                                        onChange={(e) => setMonto(e.target.value)}
                                        required
                                        placeholder="0.00"
                                        className="w-full bg-[#111623] border border-white/10 rounded-2xl pl-10 pr-4 py-4 text-3xl font-black text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                                    />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-sm font-bold text-slate-300 uppercase tracking-wider">{t('finance_description')}</label>
                                <textarea
                                    value={descripcion}
                                    onChange={(e) => setDescripcion(e.target.value)}
                                    required
                                    rows={2}
                                    placeholder="Ej. Compra de cemento, Viáticos de alimentos..."
                                    className="w-full bg-[#111623] border border-white/10 rounded-2xl px-4 py-4 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                                />
                            </div>
                        </div>

                        {/* File Upload */}
                        <div className="space-y-3">
                            <label className="text-sm font-bold text-slate-300 uppercase tracking-wider">{t('finance_attach_ticket')}</label>
                            
                            <input 
                                type="file" 
                                accept="image/*"
                                capture="environment"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                className="hidden" 
                            />

                            {!previewUrl ? (
                                <div 
                                    onClick={() => fileInputRef.current?.click()}
                                    className="border-2 border-dashed border-white/10 rounded-3xl p-8 flex flex-col items-center justify-center text-slate-400 hover:bg-white/5 hover:border-indigo-500/50 transition-all cursor-pointer group"
                                >
                                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                        <Camera className="w-8 h-8 group-hover:text-indigo-400" />
                                    </div>
                                    <p className="font-medium group-hover:text-white transition-colors">{t('take_photo')} / {t('upload_evidence')}</p>
                                    <p className="text-xs text-slate-500 mt-2">{t('fin_compressing_note')}</p>
                                </div>
                            ) : (
                                <div className="relative rounded-3xl overflow-hidden border border-white/10 group">
                                    <img src={previewUrl} alt="Preview" className="w-full h-48 object-cover object-top" />
                                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button 
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            className="px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-md text-white rounded-xl font-medium transition-all"
                                        >
                                            {t('replace')}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Submit */}
                        <div className="pt-4">
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full h-14 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-2xl font-bold text-lg shadow-lg shadow-indigo-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Guardando...
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-5 h-5" />
                                        {t('finance_save_transaction')}
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    )
}
