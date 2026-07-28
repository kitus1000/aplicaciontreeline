'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/utils/supabase/client'
import { useI18n } from '@/lib/i18n'
import { useImpersonation } from '@/context/ImpersonationContext'
import { 
  Play, 
  Coffee, 
  RotateCcw, 
  Square, 
  CheckCircle2, 
  Camera, 
  Upload, 
  Plus, 
  Calendar as CalendarIcon, 
  Clock, 
  AlertCircle,
  FileText,
  User,
  Trash2,
  Edit2,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Briefcase,
  ExternalLink,
  Sparkles,
  Bot,
  HelpCircle,
  ShieldAlert
} from 'lucide-react'
import { format, startOfWeek, addDays, isSameDay } from 'date-fns'
import { es, enUS } from 'date-fns/locale'
import { cn } from '@/utils/cn'
import WebCamera from '@/components/WebCamera'

export default function MiTrabajoProPage() {
  const { t, language } = useI18n()
  const { impersonatedEmployee } = useImpersonation()

  const [employee, setEmployee] = useState<any>(null)
  const [userName, setUserName] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(new Date())
  
  // Workday Data
  const [events, setEvents] = useState<any[]>([])
  const [activities, setActivities] = useState<any[]>([])
  const [weeklyStatus, setWeeklyStatus] = useState<Record<string, string>>({})
  
  // UI States
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [showCamera, setShowCamera] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [showCloseAuditModal, setShowCloseAuditModal] = useState(false)
  const [projectsList, setProjectsList] = useState<any[]>([])
  const [selectedProject, setSelectedProject] = useState<string>('')
  const [activePermission, setActivePermission] = useState<any>(null)
  
  // New Activity Form
  const [newDesc, setNewDesc] = useState('')
  const [newHours, setNewHours] = useState('1')
  
  // Editing Activity Form
  const [editingActivityId, setEditingActivityId] = useState<string | null>(null)
  const [editActivityDesc, setEditActivityDesc] = useState('')
  const [editActivityHours, setEditActivityHours] = useState('')

  const locale = language === 'es' ? es : enUS

  useEffect(() => {
    fetchData()

    // Realtime subscription for instant live updates on phone
    const channel1 = supabase
      .channel('realtime-worker-approval')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'workday_approval_status' }, () => fetchData())
      .subscribe()

    const channel2 = supabase
      .channel('realtime-worker-events')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'workday_events' }, () => fetchData())
      .subscribe()

    return () => {
      supabase.removeChannel(channel1)
      supabase.removeChannel(channel2)
    }
  }, [currentWeek, selectedDate, impersonatedEmployee])

  async function fetchData() {
    setLoading(true)
    try {
      let empData: any = null

      if (impersonatedEmployee) {
        empData = impersonatedEmployee
        setUserName(`${impersonatedEmployee.nombre} ${impersonatedEmployee.apellido_paterno}`)
      } else {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: profile } = await supabase.from('perfiles').select('nombre_completo').eq('id', user.id).single()
        setUserName(profile?.nombre_completo || user.email || 'Administrador')
        let empQuery = supabase.from('empleados').select('*')
        if (profile?.nombre_completo) {
          empQuery = empQuery.or(`correo_electronico.eq.${user.email},nombre.ilike.%${profile.nombre_completo.split(' ')[0]}%`)
        } else {
          empQuery = empQuery.eq('correo_electronico', user.email)
        }
        const { data: queriedEmp } = await empQuery.maybeSingle()
        empData = queriedEmp
      }

      if (!empData) return
      setEmployee(empData)

      const start = startOfWeek(currentWeek, { weekStartsOn: 1 })
      const end = addDays(start, 6)
      const dateStr = format(selectedDate, 'yyyy-MM-dd')

      // Fetch active projects for selection
      const { data: projsData } = await supabase.from('proyectos').select('*').eq('is_deleted', false)
      if (projsData && projsData.length > 0) {
        setProjectsList(projsData)
        if (!selectedProject) setSelectedProject(projsData[0].nombre)
      }

      // 1. Fetch weekly statuses
      const { data: statusData } = await supabase
        .from('workday_approval_status')
        .select('*')
        .eq('employee_id', empData.id_empleado)
        .gte('date', format(start, 'yyyy-MM-dd'))
        .lte('date', format(end, 'yyyy-MM-dd'))

      const statusMap: Record<string, string> = {}
      statusData?.forEach(s => {
        statusMap[s.date] = s.status
      })
      setWeeklyStatus(statusMap)

      // Fetch active permission for selected date (multi-source check)
      let activePerm: any = null

      // 1. Check workday_approval_status (PRIMARY & ALWAYS PRESENT)
      const { data: statusPerm } = await supabase
        .from('workday_approval_status')
        .select('*')
        .eq('employee_id', empData.id_empleado)
        .eq('date', dateStr)
        .ilike('comments', '%PERMISO%')
        .maybeSingle()

      if (statusPerm) {
        activePerm = {
          tipo_permiso: statusPerm.comments?.includes('Con Sueldo') ? 'PERMISO_CON_SUELDO' : 'PERMISO_SIN_SUELDO',
          motivo: statusPerm.comments || 'Permiso Autorizado por Administración'
        }
      } else {
        // 2. Check workday_events
        const { data: permEv } = await supabase
          .from('workday_events')
          .select('*')
          .eq('employee_id', empData.id_empleado)
          .eq('date', dateStr)
          .ilike('event_type', 'PERMISO_%')
          .maybeSingle()

        if (permEv) {
          activePerm = {
            tipo_permiso: permEv.event_type,
            motivo: 'Permiso Autorizado por Administración'
          }
        } else {
          // 3. Check permisos_autorizados
          try {
            const { data: pData } = await supabase
              .from('permisos_autorizados')
              .select('*')
              .eq('id_empleado', empData.id_empleado)
              .lte('fecha_inicio', dateStr)
              .gte('fecha_fin', dateStr)
              .maybeSingle()
            if (pData) activePerm = pData
          } catch (e) {
            // Optional table
          }
        }
      }

      setActivePermission(activePerm)

      // 2. Fetch events for selected day
      const { data: evsData } = await supabase
        .from('workday_events')
        .select('*')
        .eq('employee_id', empData.id_empleado)
        .eq('date', dateStr)
        .order('event_time', { ascending: true })

      setEvents(evsData || [])

      // 3. Fetch activities
      const { data: actsData } = await supabase
        .from('workday_activities')
        .select('*')
        .eq('employee_id', empData.id_empleado)
        .eq('date', dateStr)
      setActivities(actsData || [])

    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  // Handle Clocking Event via API
  const handleClockingEvent = async (tipo: string) => {
    if (!employee) return
    setLoading(true)
    setMessage(null)
    try {
      const res = await fetch('/api/checadas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_empleado_token: employee.numero_empleado,
          tipo_checada: tipo,
          source: 'web_my_work_pro'
        })
      })
      const data = await res.json()
      if (!data.ok && data.error_code !== 'ACCESO_DENEGADO_FALTA') {
        throw new Error(data.mensaje || 'Error al registrar evento')
      }

      setMessage({ 
        type: 'success', 
        text: language === 'es' ? '¡Hora registrada correctamente!' : 'Time logged successfully!' 
      })
      fetchData()
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error en checada' })
    } finally {
      setLoading(false)
    }
  }

  // Execute Final Day Closure
  const executeCerrarDia = async () => {
    if (!employee) return
    setShowCloseAuditModal(false)
    setLoading(true)
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd')
      await fetch('/api/checadas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_empleado_token: employee.numero_empleado,
          tipo_checada: 'CERRAR_DIA',
          source: 'web_my_work_pro'
        })
      })
      
      const { error } = await supabase.from('workday_approval_status').upsert({
        employee_id: employee.id_empleado,
        date: dateStr,
        status: 'Enviado'
      }, { onConflict: 'employee_id,date' })

      if (error) throw error
      setMessage({ 
        type: 'success', 
        text: language === 'es' 
          ? '¡Día cerrado y enviado a Autorizaciones correctamente!' 
          : 'Workday closed and submitted for authorization successfully!' 
      })
      fetchData()
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message || 'Error al cerrar el día.' })
    } finally {
      setLoading(false)
    }
  }

  // File & Camera Upload Handlers
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) await uploadPhotoFile(file)
  }

  const uploadPhotoFile = async (file: File) => {
    if (!employee) return
    setUploadingPhoto(true)
    setMessage(null)
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd')
      const fileName = `${employee.id_empleado}/${dateStr}_${Date.now()}.jpg`
      let publicUrl = ''

      // 1. Intento 1: Bucket principal 'worktrack-evidences'
      let { data: uploadData, error: uploadErr } = await supabase
        .storage
        .from('worktrack-evidences')
        .upload(fileName, file, { contentType: 'image/jpeg', upsert: true })

      if (!uploadErr && uploadData) {
        publicUrl = supabase.storage.from('worktrack-evidences').getPublicUrl(fileName).data.publicUrl
      } else {
        // 2. Intento 2: Bucket alternativo 'evidencias'
        const { data: fallbackData, error: fallbackErr } = await supabase
          .storage
          .from('evidencias')
          .upload(fileName, file, { contentType: 'image/jpeg', upsert: true })

        if (!fallbackErr && fallbackData) {
          publicUrl = supabase.storage.from('evidencias').getPublicUrl(fileName).data.publicUrl
        } else {
          // 3. Intento 3: Respaldo Base64 DataURL (Asegura que NUNCA falle la foto si no existe el bucket en Supabase)
          const reader = new FileReader()
          publicUrl = await new Promise<string>((resolve) => {
            reader.onloadend = () => resolve(reader.result as string)
            reader.readAsDataURL(file)
          })
        }
      }

      // Guardar registro de actividad con evidencia fotográfica
      const { error: dbErr } = await supabase.from('workday_activities').insert({
        employee_id: employee.id_empleado,
        date: dateStr,
        activity_name: 'Evidencia Fotográfica de Jornada',
        activity_description: `Foto de avance cargada el ${format(new Date(), 'HH:mm')}`,
        hours_dedicated: 0,
        storage_url: publicUrl
      })

      if (dbErr) throw dbErr

      setMessage({ 
        type: 'success', 
        text: language === 'es' ? '¡Fotografía adjuntada con éxito!' : 'Photo attached successfully!' 
      })
      fetchData()
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error al subir foto' })
    } finally {
      setUploadingPhoto(false)
      setShowCamera(false)
    }
  }

  // Add Manual Activity
  const addActivity = async () => {
    if (!employee || !newDesc.trim()) return
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd')
      const { error } = await supabase.from('workday_activities').insert({
        employee_id: employee.id_empleado,
        date: dateStr,
        activity_name: newDesc.trim(),
        activity_description: newDesc.trim(),
        hours_dedicated: parseFloat(newHours) || 1
      })
      if (error) throw error
      setNewDesc('')
      setNewHours('1')
      fetchData()
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message })
    }
  }

  const saveEditedActivity = async (id: string) => {
    try {
      const { error } = await supabase
        .from('workday_activities')
        .update({
          activity_name: editActivityDesc.trim(),
          activity_description: editActivityDesc.trim(),
          hours_dedicated: parseFloat(editActivityHours) || 0
        })
        .eq('id', id)

      if (error) throw error
      setEditingActivityId(null)
      fetchData()
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message })
    }
  }

  const deleteActivity = async (id: string) => {
    if (!confirm('¿Eliminar esta actividad o fotografía?')) return
    try {
      await supabase.from('workday_activities').delete().eq('id', id)
      fetchData()
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message })
    }
  }

  // Helpers for 4-Step Stepper State
  const entradaEv = events.find(e => e.event_type === 'ENTRADA' || e.event_type === 'CHECK_IN')
  const salidaComerEv = events.find(e => e.event_type === 'SALIDA_COMER' || e.event_type === 'COMIDA_SALIDA')
  const entradaComerEv = events.find(e => e.event_type === 'ENTRADA_COMER' || e.event_type === 'COMIDA_REGRESO')
  const salidaFinalEv = events.find(e => e.event_type === 'SALIDA_FINAL' || e.event_type === 'SALIDA')
  
  const selectedDayStr = format(selectedDate, 'yyyy-MM-dd')
  const selectedDayStatus = weeklyStatus[selectedDayStr] || 'none'
  const photosList = activities.filter(a => Boolean(a.storage_url))

  // Calculated Workday Hours
  let calculatedHours = 0
  if (entradaEv) {
    const startTime = new Date(entradaEv.event_time).getTime()
    const endTime = salidaFinalEv ? new Date(salidaFinalEv.event_time).getTime() : new Date().getTime()
    const diffMs = endTime - startTime
    calculatedHours = Math.max(0, Math.round((diffMs / (1000 * 60 * 60)) * 10) / 10)
  }

  // Week Days Array
  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 })
  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i))

  return (
    <div className="space-y-8 max-w-5xl mx-auto page-transition px-2 sm:px-0 pb-16">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--border-color)] pb-6">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black text-[var(--text-main)] tracking-tight">
            {t('my_work_title')} <span className="text-indigo-400">PRO</span>
          </h1>
          <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mt-1">
            Gestión de Jornada Laboral y Checadas en Tiempo Real
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {projectsList.length > 0 && (
            <div className="flex items-center gap-2 p-2.5 rounded-2xl glass-card border border-indigo-500/30 shadow-md">
              <Briefcase className="w-4 h-4 text-indigo-400 shrink-0" />
              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className="bg-transparent text-xs font-black text-[var(--text-main)] outline-none cursor-pointer pr-2"
              >
                {projectsList.map((p) => (
                  <option key={p.id_proyecto} value={p.nombre} className="bg-slate-900 text-white font-bold">
                    🏗️ Obra: {p.nombre}
                  </option>
                ))}
              </select>
            </div>
          )}

          {employee && (
            <div className="flex items-center gap-3 p-2.5 rounded-2xl glass-card border border-[var(--border-color)] shadow-md">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-sm">
                {employee.nombre?.charAt(0)}
              </div>
              <div>
                <p className="text-xs font-bold text-[var(--text-main)] leading-tight">{userName}</p>
                <p className="text-[10px] font-semibold text-indigo-400">#{employee.numero_empleado}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Feedback Toast */}
      {message && (
        <div className={cn(
          "p-4 rounded-2xl flex items-center justify-between border text-xs font-bold animate-in fade-in",
          message.type === 'success' ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-red-500/10 border-red-500/30 text-red-400"
        )}>
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>{message.text}</span>
          </div>
          <button onClick={() => setMessage(null)} className="hover:opacity-75">✖</button>
        </div>
      )}

      {/* Active Authorized Leave Alert */}
      {activePermission && (
        <div className="p-5 rounded-3xl bg-indigo-500/10 border border-indigo-500/30 flex items-center gap-4 shadow-xl animate-in fade-in">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
            <CalendarIcon className="w-6 h-6 animate-pulse text-indigo-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-black text-indigo-400 uppercase tracking-wider flex items-center gap-2">
              <span>🏖️ Permiso Autorizado por Administración</span>
              <span className={cn(
                "px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border",
                activePermission.tipo_permiso === 'PERMISO_CON_SUELDO' 
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" 
                  : "bg-indigo-500/10 text-indigo-400 border-indigo-500/30"
              )}>
                {activePermission.tipo_permiso === 'PERMISO_CON_SUELDO' ? '🟢 Con Goce de Sueldo' : '🔵 Sin Goce de Sueldo'}
              </span>
            </h3>
            <p className="text-xs text-[var(--text-main)] font-semibold mt-1">
              Tienes un permiso registrado para la jornada de hoy ({activePermission.motivo || 'Permiso aprobado'}). No es necesario realizar marcaje de entrada ni salida.
            </p>
          </div>
        </div>
      )}

      {/* Week Day Selector Carousel */}
      <div className="glass-card rounded-3xl p-4 border border-[var(--border-color)] shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <button 
            onClick={() => setCurrentWeek(addDays(currentWeek, -7))}
            className="p-2 rounded-xl glass hover:border-indigo-500/40 text-[var(--text-main)] transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-black uppercase tracking-wider text-indigo-400">
            Semana del {format(weekStart, 'dd MMMM yyyy', { locale })}
          </span>
          <button 
            onClick={() => setCurrentWeek(addDays(currentWeek, 7))}
            className="p-2 rounded-xl glass hover:border-indigo-500/40 text-[var(--text-main)] transition-all"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1.5 sm:gap-3">
          {weekDays.map((day) => {
            const dayStr = format(day, 'yyyy-MM-dd')
            const isSelected = isSameDay(day, selectedDate)
            const st = weeklyStatus[dayStr]

            return (
              <button
                key={dayStr}
                onClick={() => setSelectedDate(day)}
                className={cn(
                  "p-2.5 sm:p-3 rounded-2xl flex flex-col items-center justify-center transition-all duration-300 border text-center relative",
                  isSelected 
                    ? "bg-indigo-600 text-white border-indigo-400 shadow-lg shadow-indigo-600/40 scale-105" 
                    : "glass border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)]"
                )}
              >
                <span className="text-[9px] font-black uppercase tracking-wider opacity-80">
                  {format(day, 'EEE', { locale })}
                </span>
                <span className="text-sm sm:text-base font-black mt-0.5">
                  {format(day, 'dd')}
                </span>

                {/* Status Dot */}
                {st === 'Enviado' && <span className="w-2 h-2 rounded-full bg-amber-400 mt-1 shadow-sm" title="Enviado a Autorización" />}
                {st === 'Autorizado' && <span className="w-2 h-2 rounded-full bg-emerald-400 mt-1 shadow-sm" title="Autorizado" />}
              </button>
            )
          })}
        </div>
      </div>

      {/* Active Authorized Leave Card (Full-width blocking) */}
      {activePermission ? (
        <div className="glass-card rounded-3xl p-8 sm:p-12 border-2 border-indigo-500/50 shadow-2xl text-center space-y-6 animate-in zoom-in-95 duration-300 relative overflow-hidden my-6">
          <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/10 via-purple-500/5 to-transparent pointer-events-none" />
          
          <div className="relative z-10 space-y-5 max-w-lg mx-auto">
            <div className="w-24 h-24 rounded-3xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/40 flex items-center justify-center mx-auto shadow-2xl animate-bounce">
              <CalendarIcon className="w-12 h-12" />
            </div>

            <div>
              <span className={cn(
                "px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest border inline-block mb-3 shadow-md",
                activePermission.tipo_permiso === 'PERMISO_CON_SUELDO' || activePermission.tipo_permiso?.includes('CON_SUELDO')
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" 
                  : "bg-indigo-500/20 text-indigo-300 border-indigo-500/40"
              )}>
                {activePermission.tipo_permiso === 'PERMISO_CON_SUELDO' || activePermission.tipo_permiso?.includes('CON_SUELDO') 
                  ? '🟢 PERMISO AUTORIZADO CON GOCE DE SUELDO' 
                  : '🔵 PERMISO AUTORIZADO SIN GOCE DE SUELDO'}
              </span>
              
              <h2 className="text-3xl sm:text-4xl font-black text-[var(--text-main)] tracking-tight leading-tight">
                ¡Hoy Estás de Permiso Autorizado! 🏖️
              </h2>
            </div>

            <p className="text-sm font-semibold text-[var(--text-muted)] leading-relaxed">
              La administración ha registrado un permiso oficial para tu jornada de hoy. 
              <strong className="text-[var(--text-main)] block mt-2 p-3.5 rounded-2xl glass border border-[var(--border-color)] text-xs">
                "{activePermission.motivo || 'Permiso Autorizado por Administración'}"
              </strong>
            </p>

            <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-xs font-bold text-indigo-300 flex items-center justify-center gap-2">
              <span>🔒 La aplicación está en pausa. No requieres realizar marcaje de entrada, salida ni enviar evidencias fotográficas hoy.</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* ⚡ STEPPER GUIADO PASO A PASO EN 4 FASES DE LA JORNADA */}
          <div className="cyber-card rounded-3xl p-6 border border-[var(--border-color)] shadow-2xl space-y-6">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border-color)] pb-4">
              <div>
                <h3 className="text-lg font-black text-[var(--text-main)] uppercase tracking-wide flex items-center gap-2">
                  <span>Proceso Guiado de Jornada</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 font-bold text-[10px] border border-indigo-500/20">
                    Paso a Paso
                  </span>
                </h3>
            <p className="text-xs font-semibold text-[var(--text-muted)] mt-0.5">
              Registra cada etapa cronológica de tu turno de hoy
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className={cn(
              "px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border",
              selectedDayStatus === 'Enviado' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' :
              selectedDayStatus === 'Autorizado' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
              'bg-slate-500/10 text-[var(--text-muted)] border-[var(--border-color)]'
            )}>
              {selectedDayStatus === 'Enviado' ? '⏳ Día Enviado' :
               selectedDayStatus === 'Autorizado' ? '✅ Autorizado' :
               'En Curso'}
            </span>
          </div>
        </div>

        {/* 4 Steps Timeline Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Paso 1: Entrada General */}
          <div className={cn(
            "p-4 rounded-2xl border transition-all duration-300 flex flex-col justify-between space-y-3",
            entradaEv ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "glass border-[var(--border-color)] text-[var(--text-main)]"
          )}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Paso 1</span>
              {entradaEv ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <Play className="w-5 h-5 text-indigo-400" />}
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-wider">Entrada General</p>
              {entradaEv ? (
                <p className="text-base font-black mt-1 text-emerald-400">
                  {format(new Date(entradaEv.event_time), 'hh:mm a')}
                </p>
              ) : (
                <p className="text-[11px] text-[var(--text-muted)] font-semibold mt-1">Inicio de turno</p>
              )}
            </div>
            <button
              onClick={() => handleClockingEvent('ENTRADA')}
              disabled={loading || selectedDayStatus === 'Enviado' || selectedDayStatus === 'Autorizado'}
              className={cn(
                "w-full py-2 rounded-xl font-black text-[11px] uppercase tracking-wider transition-all shadow-md active:scale-95",
                entradaEv 
                  ? "bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-white" 
                  : "bg-indigo-600 hover:bg-indigo-500 text-white"
              )}
            >
              {entradaEv ? 'Actualizar ⚡' : 'Marcar Entrada'}
            </button>
          </div>

          {/* Paso 2: Salida a Comer */}
          <div className={cn(
            "p-4 rounded-2xl border transition-all duration-300 flex flex-col justify-between space-y-3",
            salidaComerEv ? "bg-amber-500/10 border-amber-500/30 text-amber-400" : "glass border-[var(--border-color)] text-[var(--text-main)]"
          )}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Paso 2</span>
              {salidaComerEv ? <CheckCircle2 className="w-5 h-5 text-amber-400" /> : <Coffee className="w-5 h-5 text-amber-400" />}
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-wider">Salida a Comer</p>
              {salidaComerEv ? (
                <p className="text-base font-black mt-1 text-amber-400">
                  {format(new Date(salidaComerEv.event_time), 'hh:mm a')}
                </p>
              ) : (
                <p className="text-[11px] text-[var(--text-muted)] font-semibold mt-1">Pausa Alimento</p>
              )}
            </div>
            <button
              onClick={() => handleClockingEvent('SALIDA_COMER')}
              disabled={loading || selectedDayStatus === 'Enviado' || selectedDayStatus === 'Autorizado'}
              className={cn(
                "w-full py-2 rounded-xl font-black text-[11px] uppercase tracking-wider transition-all shadow-md active:scale-95",
                salidaComerEv 
                  ? "bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-white" 
                  : "bg-amber-600 hover:bg-amber-500 text-white"
              )}
            >
              {salidaComerEv ? 'Actualizar ⚡' : 'Salida a Comer'}
            </button>
          </div>

          {/* Paso 3: Regreso de Comer */}
          <div className={cn(
            "p-4 rounded-2xl border transition-all duration-300 flex flex-col justify-between space-y-3",
            entradaComerEv ? "bg-blue-500/10 border-blue-500/30 text-blue-400" : "glass border-[var(--border-color)] text-[var(--text-main)]"
          )}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Paso 3</span>
              {entradaComerEv ? <CheckCircle2 className="w-5 h-5 text-blue-400" /> : <RotateCcw className="w-5 h-5 text-blue-400" />}
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-wider">Regreso de Comer</p>
              {entradaComerEv ? (
                <p className="text-base font-black mt-1 text-blue-400">
                  {format(new Date(entradaComerEv.event_time), 'hh:mm a')}
                </p>
              ) : (
                <p className="text-[11px] text-[var(--text-muted)] font-semibold mt-1">Retorno a Labores</p>
              )}
            </div>
            <button
              onClick={() => handleClockingEvent('ENTRADA_COMER')}
              disabled={loading || selectedDayStatus === 'Enviado' || selectedDayStatus === 'Autorizado'}
              className={cn(
                "w-full py-2 rounded-xl font-black text-[11px] uppercase tracking-wider transition-all shadow-md active:scale-95",
                entradaComerEv 
                  ? "bg-blue-500/20 hover:bg-blue-500 text-blue-300 hover:text-white" 
                  : "bg-blue-600 hover:bg-blue-500 text-white"
              )}
            >
              {entradaComerEv ? 'Actualizar ⚡' : 'Regreso de Comer'}
            </button>
          </div>

          {/* Paso 4: Salida Final */}
          <div className={cn(
            "p-4 rounded-2xl border transition-all duration-300 flex flex-col justify-between space-y-3",
            salidaFinalEv ? "bg-purple-500/10 border-purple-500/30 text-purple-400" : "glass border-[var(--border-color)] text-[var(--text-main)]"
          )}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Paso 4</span>
              {salidaFinalEv ? <CheckCircle2 className="w-5 h-5 text-purple-400" /> : <Square className="w-5 h-5 text-purple-400" />}
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-wider">Salida Final</p>
              {salidaFinalEv ? (
                <p className="text-base font-black mt-1 text-purple-400">
                  {format(new Date(salidaFinalEv.event_time), 'hh:mm a')}
                </p>
              ) : (
                <p className="text-[11px] text-[var(--text-muted)] font-semibold mt-1">Cierre de Jornada</p>
              )}
            </div>
            <button
              onClick={() => handleClockingEvent('SALIDA_FINAL')}
              disabled={loading || selectedDayStatus === 'Enviado' || selectedDayStatus === 'Autorizado'}
              className={cn(
                "w-full py-2 rounded-xl font-black text-[11px] uppercase tracking-wider transition-all shadow-md active:scale-95",
                salidaFinalEv 
                  ? "bg-purple-500/20 hover:bg-purple-500 text-purple-300 hover:text-white" 
                  : "bg-purple-600 hover:bg-purple-500 text-white"
              )}
            >
              {salidaFinalEv ? 'Actualizar ⚡' : 'Salida Final'}
            </button>
          </div>

        </div>

        {/* Submit Day Button */}
        {selectedDayStatus !== 'Enviado' && selectedDayStatus !== 'Autorizado' && (
          <button
            onClick={() => setShowCloseAuditModal(true)}
            className="w-full bg-gradient-to-r from-indigo-600 via-purple-600 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 text-white font-black py-4 rounded-2xl text-xs uppercase tracking-[0.2em] shadow-xl float-btn transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span>Enviar y Cerrar Día</span>
          </button>
        )}
      </div>

      {/* Evidencias & Actividades Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Camara / Evidencias Fotográficas */}
        <div className="glass-card rounded-3xl p-6 border border-[var(--border-color)] shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
            <h4 className="text-sm font-black text-[var(--text-main)] uppercase tracking-wider flex items-center gap-2">
              <Camera className="w-4 h-4 text-indigo-400" />
              <span>Evidencias Fotográficas ({photosList.length})</span>
            </h4>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setShowCamera(true)}
              className="flex-1 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-md active:scale-95"
            >
              <Camera className="w-4 h-4" />
              <span>Tomar Foto Web</span>
            </button>

            <label className="flex-1 py-3 px-4 rounded-xl glass hover:border-indigo-500/40 text-[var(--text-main)] text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-95 border border-[var(--border-color)]">
              <Upload className="w-4 h-4 text-indigo-400" />
              <span>Subir Archivo</span>
              <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>

          {photosList.length > 0 && (
            <div className="grid grid-cols-2 gap-3 pt-2">
              {photosList.map((photo) => (
                <div key={photo.id} className="relative group rounded-2xl overflow-hidden border border-[var(--border-color)] aspect-video bg-slate-950">
                  <img src={photo.storage_url} alt="Evidencia" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  <button
                    onClick={() => deleteActivity(photo.id)}
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-red-600 text-white opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Registro de Actividades Manuales */}
        <div className="glass-card rounded-3xl p-6 border border-[var(--border-color)] shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
            <h4 className="text-sm font-black text-[var(--text-main)] uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-400" />
              <span>Actividades Realizadas</span>
            </h4>
          </div>

          <div className="space-y-3">
            <input
              type="text"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Descripción del trabajo realizado..."
              className="w-full h-10 px-3 text-xs font-semibold rounded-xl input-executive"
            />

            <div className="flex gap-2">
              <input
                type="number"
                value={newHours}
                onChange={(e) => setNewHours(e.target.value)}
                placeholder="Horas"
                className="w-24 h-10 px-3 text-xs font-semibold rounded-xl input-executive"
              />
              <button
                onClick={addActivity}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95"
              >
                Agregar Actividad
              </button>
            </div>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto">
            {activities.filter(a => !a.storage_url).map((act) => (
              <div key={act.id} className="p-3 rounded-xl glass border border-[var(--border-color)] flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-[var(--text-main)]">{act.activity_description || act.activity_name}</p>
                  <p className="text-[10px] text-indigo-400 font-bold">{act.hours_dedicated} horas</p>
                </div>
                <button onClick={() => deleteActivity(act.id)} className="text-red-400 hover:text-red-300 p-1">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
        </div>
      </div>
      </div>
      </div>
      )}

      {/* 🤖 AUDITORÍA INTELIGENTE PRE-CIERRE DE DÍA CON IA (MODAL CYBER) */}
      {showCloseAuditModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-3xl glass-card p-6 border border-indigo-500/40 shadow-2xl space-y-6 relative overflow-hidden">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg">
                  <Bot className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-base font-black text-[var(--text-main)] uppercase tracking-wider">
                    Auditoría Inteligente de Cierre
                  </h3>
                  <p className="text-[10px] text-indigo-400 font-bold">Verificación Co-pilot antes de enviar</p>
                </div>
              </div>

              <button 
                onClick={() => setShowCloseAuditModal(false)}
                className="p-1.5 rounded-xl glass text-[var(--text-muted)] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Audit Summary Grid */}
            <div className="space-y-3">
              
              {/* ⏱️ Horas Totales */}
              <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-indigo-400" />
                  <div>
                    <p className="text-[10px] font-black uppercase text-[var(--text-muted)]">Horas Totales Trabajadas</p>
                    <p className="text-base font-black text-indigo-400">{calculatedHours} Horas Acumuladas</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-300 font-bold text-xs">
                  {calculatedHours >= 4 ? 'Jornada Completa' : 'Jornada Parcial'}
                </span>
              </div>

              {/* 🥪 Pausa de Comida */}
              <div className={cn(
                "p-4 rounded-2xl border flex items-center justify-between",
                salidaComerEv && entradaComerEv 
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" 
                  : "bg-amber-500/10 border-amber-500/30 text-amber-400"
              )}>
                <div className="flex items-center gap-3">
                  <Coffee className="w-5 h-5" />
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-wider opacity-80">Pausa de Alimento</p>
                    <p className="text-xs font-bold">
                      {salidaComerEv && entradaComerEv 
                        ? '✅ Registraste tu descanso de comida correctamente' 
                        : '⚠️ No registraste tu pausa de comida (Salida/Regreso a Comer)'}
                    </p>
                  </div>
                </div>
              </div>

              {/* 📸 Fotos de Evidencia */}
              <div className={cn(
                "p-4 rounded-2xl border flex items-center justify-between",
                photosList.length > 0 
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" 
                  : "bg-amber-500/10 border-amber-500/30 text-amber-400"
              )}>
                <div className="flex items-center gap-3">
                  <Camera className="w-5 h-5" />
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-wider opacity-80">Fotografías de Trabajo</p>
                    <p className="text-xs font-bold">
                      {photosList.length > 0 
                        ? `📷 ${photosList.length} Foto(s) de evidencia adjunta(s)` 
                        : '⚠️ No has adjuntado fotos de evidencia de tu trabajo'}
                    </p>
                  </div>
                </div>
              </div>

            </div>

            {/* Interrogation Question */}
            <div className="p-4 rounded-2xl glass border border-[var(--border-color)] text-center space-y-1">
              <p className="text-xs font-black text-[var(--text-main)] uppercase tracking-wider">
                ¿Confirmas finalizar tu jornada con <span className="text-indigo-400 font-black">{calculatedHours} Horas</span>?
              </p>
              <p className="text-[11px] text-[var(--text-muted)] font-semibold">
                Una vez enviado, tu supervisor recibirá la notificación para su revisión ejecutiva.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-[var(--border-color)]">
              <button
                onClick={() => setShowCloseAuditModal(false)}
                className="flex-1 py-3 rounded-xl glass hover:border-indigo-500/40 text-[var(--text-main)] font-bold text-xs uppercase tracking-wider transition-all border border-[var(--border-color)]"
              >
                📷 Agregar Fotos / Ajustar
              </button>
              <button
                onClick={executeCerrarDia}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white font-black text-xs uppercase tracking-wider transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirmar y Enviar Día</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Web Camera Modal */}
      {showCamera && (
        <WebCamera 
          onCapture={(file: File) => {
            uploadPhotoFile(file)
            setShowCamera(false)
          }}
          onClose={() => setShowCamera(false)}
        />
      )}

    </div>
  )
}
