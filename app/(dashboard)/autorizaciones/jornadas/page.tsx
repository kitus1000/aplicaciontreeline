'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/utils/supabase/client'
import { 
  Calendar, 
  CheckCircle2, 
  XCircle, 
  ExternalLink, 
  Filter, 
  Search, 
  ChevronRight, 
  Bell, 
  Eye, 
  Sparkles,
  ShieldAlert,
  Check,
  X,
  Camera,
  Image as ImageIcon
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { useI18n } from '@/lib/i18n'
import { useImpersonation } from '@/context/ImpersonationContext'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function AutorizacionesJornadasPage() {
    const { t } = useI18n()
    const { setImpersonatedEmployee } = useImpersonation()
    const router = useRouter()

    const [jornadas, setJornadas] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [filterStatus, setFilterStatus] = useState<string>('Enviado')
    const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

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
        const { data, error } = await supabase
            .from('workday_approval_status')
            .select(`
                *,
                empleados (id_empleado, numero_empleado, nombre, apellido_paterno, apellido_materno, correo_electronico)
            `)
            .eq('status', filterStatus)
            .order('date', { ascending: false })

        if (!error && data) {
            const empIds = Array.from(new Set(data.map(j => j.employee_id).filter(Boolean)))
            const dates = Array.from(new Set(data.map(j => j.date).filter(Boolean)))

            const photosMap: Record<string, string[]> = {}

            if (empIds.length > 0 && dates.length > 0) {
                // 1. Fetch photo evidences from workday_activities
                const { data: activitiesData } = await supabase
                    .from('workday_activities')
                    .select('employee_id, date, storage_url')
                    .in('employee_id', empIds)
                    .in('date', dates)
                    .not('storage_url', 'is', null)

                activitiesData?.forEach(act => {
                    if (act.storage_url) {
                        const key = `${act.employee_id}_${act.date}`
                        if (!photosMap[key]) photosMap[key] = []
                        if (!photosMap[key].includes(act.storage_url)) {
                            photosMap[key].push(act.storage_url)
                        }
                    }
                })

                // 2. Fetch photo evidences from workday_events
                const { data: eventsData } = await supabase
                    .from('workday_events')
                    .select('employee_id, date, storage_url')
                    .in('employee_id', empIds)
                    .in('date', dates)
                    .not('storage_url', 'is', null)

                eventsData?.forEach(ev => {
                    if (ev.storage_url) {
                        const key = `${ev.employee_id}_${ev.date}`
                        if (!photosMap[key]) photosMap[key] = []
                        if (!photosMap[key].includes(ev.storage_url)) {
                            photosMap[key].push(ev.storage_url)
                        }
                    }
                })
            }

            // Enriquecer cada jornada con sus fotografías reales
            const enrichedJornadas = data.map(j => {
                const key = `${j.employee_id}_${j.date}`
                const fotosList = photosMap[key] || (j.storage_url ? [j.storage_url] : [])
                return {
                    ...j,
                    fotos: fotosList
                }
            })

            setJornadas(enrichedJornadas)
        }
        setLoading(false)
    }

    async function updateStatus(rowId: string, newStatus: string, workerName: string) {
        let reason = ''
        if (newStatus === 'Rechazado') {
          reason = prompt('Por favor especifique la nota o motivo de rechazo:') || ''
          if (!reason) return
        }

        const { error } = await supabase
            .from('workday_approval_status')
            .update({ 
              status: newStatus, 
              comments: reason || null,
              reviewed_at: new Date().toISOString() 
            })
            .eq('id', rowId)

        if (error) {
          setFeedbackMessage({ type: 'error', text: 'Error: ' + error.message })
        } else {
          setFeedbackMessage({ 
            type: 'success', 
            text: newStatus === 'Autorizado' 
              ? `¡Jornada de ${workerName} autorizada exitosamente!` 
              : `Jornada de ${workerName} enviada a corrección.` 
          })
          fetchJornadas()
        }
    }

    const handleInspectWorkerScreen = (emp: any) => {
      if (!emp) return
      setImpersonatedEmployee(emp)
      router.push('/mi-trabajo')
    }

    return (
        <div className="space-y-8 max-w-7xl mx-auto page-transition px-4 md:px-0">
            
            {/* Header & Tabs */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-[var(--border-color)] pb-6">
                <div>
                    <h1 className="text-3xl md:text-5xl font-black text-[var(--text-main)] tracking-tight">
                        {t('auth_title').split(' ')[0]} <span className="text-indigo-400">{t('auth_title').split(' ').slice(1).join(' ')}</span>
                    </h1>
                    <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mt-1">
                      {t('auth_subtitle')}
                    </p>
                </div>

                <div className="flex glass p-1.5 rounded-2xl shadow-xl overflow-x-auto whitespace-nowrap border border-[var(--border-color)]">
                    {statusOptions.map(st => (
                        <button
                            key={st}
                            onClick={() => setFilterStatus(st)}
                            className={cn(
                                "px-5 py-2.5 text-xs font-black uppercase tracking-wider rounded-xl transition-all duration-300",
                                filterStatus === st 
                                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 scale-105" 
                                    : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
                            )}
                        >
                            {t(statusMap[st] || st)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Closed Workday Executive Alert Banner */}
            {filterStatus === 'Enviado' && jornadas.length > 0 && (
              <div className="p-5 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl animate-in fade-in">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                    <Bell className="w-6 h-6 animate-bounce" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-amber-400 uppercase tracking-wider flex items-center gap-2">
                      <span>Alerta Ejecutiva: Días Cerrados Pendientes</span>
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black text-[10px]">
                        {jornadas.length} Trabajador(es)
                      </span>
                    </h3>
                    <p className="text-xs text-[var(--text-main)] font-semibold mt-0.5">
                      Los siguientes colaboradores han cerrado su jornada diaria y solicitaron tu aprobación ejecutiva.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Notification Feedback Toast */}
            {feedbackMessage && (
              <div className={cn(
                "p-4 rounded-2xl flex items-center justify-between border text-xs font-bold animate-in fade-in",
                feedbackMessage.type === 'success' 
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" 
                  : "bg-red-500/10 border-red-500/30 text-red-400"
              )}>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>{feedbackMessage.text}</span>
                </div>
                <button onClick={() => setFeedbackMessage(null)} className="hover:opacity-75">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Grid of Workday Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {loading ? (
                    <div className="col-span-full py-28 text-center space-y-4">
                        <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mx-auto"></div>
                        <p className="text-[var(--text-muted)] text-xs font-black uppercase tracking-widest animate-pulse">{t('syncing_network')}</p>
                    </div>
                ) : jornadas.length === 0 ? (
                    <div className="col-span-full py-16 glass-card rounded-3xl border border-[var(--border-color)] text-center space-y-4">
                        <div className="w-16 h-16 bg-indigo-500/10 rounded-2xl flex items-center justify-center mx-auto text-indigo-400">
                           <Calendar className="w-8 h-8" />
                        </div>
                        <div>
                           <h3 className="text-lg font-black text-[var(--text-main)] tracking-tight">{t('no_pending_movements')}</h3>
                           <p className="text-[var(--text-muted)] text-xs font-semibold max-w-md mx-auto mt-1">{t('no_workdays_status')}</p>
                        </div>
                    </div>
                ) : (
                    jornadas.map(j => (
                        <div 
                          key={j.id} 
                          className="cyber-card rounded-3xl p-6 border border-[var(--border-color)] shadow-xl flex flex-col justify-between space-y-6 float-btn"
                        >
                            {/* Card Header */}
                            <div className="flex justify-between items-start border-b border-[var(--border-color)] pb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-lg shadow-md">
                                        {j.empleados?.nombre ? j.empleados.nombre.charAt(0) : 'E'}
                                    </div>
                                    <div>
                                        <h4 className="font-black text-[var(--text-main)] text-base tracking-tight leading-tight">
                                          {j.empleados?.nombre} {j.empleados?.apellido_paterno}
                                        </h4>
                                        <div className="flex items-center gap-2 mt-1">
                                           <span className="text-[10px] font-bold text-[var(--text-muted)] bg-slate-500/10 px-2 py-0.5 rounded-lg border border-[var(--border-color)]">
                                             📅 {j.date}
                                           </span>
                                           <span className="text-[10px] text-indigo-400 font-bold">#{j.empleados?.numero_empleado}</span>
                                        </div>
                                    </div>
                                </div>

                                <span className={cn(
                                    "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border",
                                    j.status === 'Enviado' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' :
                                    j.status === 'Autorizado' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                                    'bg-slate-500/10 text-[var(--text-muted)] border-[var(--border-color)]'
                                )}>
                                    {t(statusMap[j.status] || j.status)}
                                </span>
                            </div>

                            {/* Card Content & Real Photo Evidence Gallery */}
                            <div className="space-y-4">
                                <div className="p-4 rounded-2xl glass border border-[var(--border-color)] space-y-3">
                                    <div className="flex items-center justify-between">
                                        <p className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Evidencias Fotográficas</p>
                                        <span className={cn(
                                            "text-[10px] font-black px-2 py-0.5 rounded-full border",
                                            j.fotos && j.fotos.length > 0 
                                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" 
                                                : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                                        )}>
                                            {j.fotos && j.fotos.length > 0 ? `📷 ${j.fotos.length} Foto(s)` : '⚠️ Sin Fotos'}
                                        </span>
                                    </div>

                                    {j.fotos && j.fotos.length > 0 ? (
                                        <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-hide">
                                            {j.fotos.map((url: string, idx: number) => (
                                                <a 
                                                    key={idx} 
                                                    href={url} 
                                                    target="_blank" 
                                                    rel="noreferrer"
                                                    className="relative w-16 h-16 rounded-xl overflow-hidden border border-[var(--border-color)] group shrink-0 shadow-sm hover:border-indigo-500 transition-all"
                                                    title="Ver imagen en tamaño completo"
                                                >
                                                    <img src={url} alt={`Evidencia ${idx + 1}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                                        <ExternalLink className="w-4 h-4 text-white" />
                                                    </div>
                                                </a>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-xs text-[var(--text-muted)] italic">El trabajador no adjuntó fotos de evidencia para esta jornada</p>
                                    )}

                                    {/* Inspect Screen Button */}
                                    {j.empleados && (
                                      <div className="pt-2 border-t border-[var(--border-color)] flex justify-end">
                                        <button
                                          onClick={() => handleInspectWorkerScreen(j.empleados)}
                                          className="px-3 py-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-600 hover:text-white border border-indigo-500/20 text-indigo-400 text-xs font-bold transition-all flex items-center gap-1.5"
                                          title="Ver la pantalla exacta de este trabajador"
                                        >
                                          <Eye className="w-3.5 h-3.5" />
                                          <span>👁️ Inspeccionar Pantalla</span>
                                        </button>
                                      </div>
                                    )}
                                </div>

                                {j.comments && (
                                    <div className="text-xs p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 italic">
                                        <strong>Notas:</strong> "{j.comments}"
                                    </div>
                                )}
                            </div>

                            {/* Executive Action Buttons */}
                            <div className="pt-4 border-t border-[var(--border-color)] flex gap-2">
                                {filterStatus === 'Enviado' || filterStatus === 'En revisión' ? (
                                    <>
                                        <button 
                                            onClick={() => updateStatus(j.id, 'Autorizado', j.empleados?.nombre || 'Trabajador')}
                                            className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-1.5 float-btn"
                                        >
                                            <Check className="w-4 h-4" />
                                            <span>Aceptar Día</span>
                                        </button>
                                        <button 
                                            onClick={() => updateStatus(j.id, 'Rechazado', j.empleados?.nombre || 'Trabajador')}
                                            className="px-4 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/20 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1"
                                        >
                                            <X className="w-4 h-4" />
                                            <span>Rechazar</span>
                                        </button>
                                    </>
                                ) : (
                                  <div className="w-full text-center text-xs font-bold text-[var(--text-muted)] py-1">
                                    Estatus: {j.status}
                                  </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
