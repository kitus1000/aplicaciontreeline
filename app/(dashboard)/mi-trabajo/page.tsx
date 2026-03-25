'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/utils/supabase/client'
import { useI18n } from '@/lib/i18n'
import { 
  Play, 
  Coffee, 
  LogOut, 
  Clock, 
  Calendar as CalendarIcon, 
  CheckCircle2, 
  AlertCircle, 
  Zap, 
  Camera, 
  Upload, 
  ChevronLeft, 
  ChevronRight,
  Plus,
  Trash2,
  FileText,
  User as UserIcon,
  Save,
  RefreshCw,
  X
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { format, startOfWeek, addDays, isSameDay, subWeeks, addWeeks } from 'date-fns'
import { es, enUS } from 'date-fns/locale'
import WebCamera from '@/components/WebCamera'

export default function MyWorkTodayPage() {
  const { t, language } = useI18n()
  const [loading, setLoading] = useState(true)
  const [employee, setEmployee] = useState<any>(null)
  const [userName, setUserName] = useState<string>('')
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [workdays, setWorkdays] = useState<any[]>([])
  const [events, setEvents] = useState<any[]>([])
  const [activities, setActivities] = useState<any[]>([])
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const [activityDesc, setActivityDesc] = useState('')
  const [activityHours, setActivityHours] = useState('')
  const [activityFiles, setActivityFiles] = useState<File[]>([])
  const [uploadingActivity, setUploadingActivity] = useState(false)
  const [uploadingEvidence, setUploadingEvidence] = useState(false)
  const [showCamera, setShowCamera] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  
  const locale = language === 'es' ? es : enUS

  useEffect(() => {
    fetchData()
  }, [currentWeek, selectedDate])

  async function fetchData() {
    setLoading(true)
    try {
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
      const { data: empData } = await empQuery.maybeSingle()

      if (!empData) return
      setEmployee(empData)

      const start = startOfWeek(currentWeek, { weekStartsOn: 1 })
      const end = addDays(start, 6)
      const dateStr = format(selectedDate, 'yyyy-MM-dd')

      // 1. Fetch weekly statuses
      const { data: statusData } = await supabase
        .from('workday_approval_status')
        .select('*')
        .eq('employee_id', empData.id_empleado)
        .gte('date', format(start, 'yyyy-MM-dd'))
        .lte('date', format(end, 'yyyy-MM-dd'))
      setWorkdays(statusData || [])

      // 2. Fetch events for the selected day
      const { data: eventsData } = await supabase
        .from('workday_events')
        .select('*')
        .eq('employee_id', empData.id_empleado)
        .eq('date', dateStr)
        .order('event_time', { ascending: true })
      setEvents(eventsData || [])

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

  const handleCerrarDia = async () => {
    if (!employee) return
    if (!confirm('¿Cerrar el día de hoy y enviar a Autorizaciones? Ya no podrás agregar checadas.')) return
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd')
      const res = await fetch('/api/checadas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_empleado_token: employee.numero_empleado,
          tipo_checada: 'CERRAR_DIA',
          source: 'web_my_work_pro'
        })
      })
      // Even if checadas fails, try to upsert the approval status
      const { error } = await supabase.from('workday_approval_status').upsert({
        employee_id: employee.id_empleado,
        date: dateStr,
        status: 'Enviado'
      }, { onConflict: 'employee_id,date' })

      if (error) throw error
      setMessage({ type: 'success', text: '¡Día cerrado y enviado a Autorizaciones correctamente!' })
      fetchData()
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message || 'Error al cerrar el día.' })
    }
  }

  const handleAttendance = async (type: string) => {
    if (!employee) {
      setMessage({ type: 'error', text: 'Debes estar registrado como Empleado para registrar asistencia.' })
      return
    }
    try {
      const res = await fetch('/api/checadas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_empleado_token: employee.numero_empleado,
          tipo_checada: type,
          source: 'web_my_work_pro'
        })
      })
      const result = await res.json()
      if (result.ok) {
        setMessage({ type: 'success', text: t('success_attendance') })
        fetchData()
      } else {
        setMessage({ type: 'error', text: result.mensaje || t('error') })
      }
    } catch (e) {
      setMessage({ type: 'error', text: t('error') })
    }
  }

  const handleSubmitDescription = async () => {
    if (!employee) {
      setMessage({ type: 'error', text: 'Requiere cuenta de empleado activa para capturar actividades.' })
      return
    }
    if (!activityDesc || !activityHours) {
      setMessage({ type: 'error', text: 'El resumen y las horas dedicadas no pueden estar vacíos.' })
      return
    }
    
    setUploadingActivity(true)
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd')

      const { error: dbError } = await supabase.from('workday_activities').insert([{
        employee_id: employee.id_empleado,
        date: dateStr,
        activity_name: activityDesc.substring(0, 100),
        activity_description: activityDesc,
        hours_dedicated: parseFloat(activityHours),
        storage_url: null
      }])

      if (dbError) throw dbError

      setMessage({ type: 'success', text: '¡Actividades registradas exitosamente!' })
      setActivityDesc('')
      setActivityHours('')
      fetchData()
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message || 'Error al guardar la actividad' })
    } finally {
      setUploadingActivity(false)
    }
  }

  const handleSubmitEvidence = async () => {
    if (!employee) {
      setMessage({ type: 'error', text: 'Requiere cuenta de empleado para subir evidencias.' })
      return
    }
    if (activityFiles.length === 0) {
      setMessage({ type: 'error', text: 'No se han seleccionado fotografías.' })
      return
    }
    
    setUploadingEvidence(true)
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd')
      const folderDate = format(selectedDate, 'dd.MM.yyyy')
      const employeeName = `${employee.nombre} ${employee.apellido_paterno}`.trim()
      
      const uploadPromises = activityFiles.map(async (file) => {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('employeeId', employee.id_empleado)
        formData.append('employeeName', employeeName)
        formData.append('dateStr', dateStr)
        formData.append('folderDate', folderDate)

        const res = await fetch('/api/upload-evidence', {
          method: 'POST',
          body: formData
        })
        const result = await res.json()
        if (!res.ok) throw new Error(result.message || 'Error al subir')
        return result.url
      })

      await Promise.all(uploadPromises)

      setMessage({ type: 'success', text: `¡${activityFiles.length} fotografías subidas exitosamente!` })
      setActivityFiles([])
      fetchData()
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message || 'Error al subir las evidencias' })
    } finally {
      setUploadingEvidence(false)
    }
  }

  const deleteActivity = async (id: string) => {
    if (!confirm('¿Eliminar esta actividad? Esta acción no se puede deshacer.')) return
    const res = await fetch('/api/delete-activity', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    })
    const result = await res.json()
    if (result.ok) {
      setMessage({ type: 'success', text: 'Actividad eliminada.' })
      fetchData()
    } else {
      setMessage({ type: 'error', text: 'Error al eliminar: ' + result.message })
    }
  }

  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(startOfWeek(currentWeek, { weekStartsOn: 1 }), i))
  const selectedDayStatus = workdays.find(w => w.date === format(selectedDate, 'yyyy-MM-dd'))?.status || 'none'

  return (
    <div className="max-w-4xl mx-auto pb-20 space-y-8 page-transition">
      {/* Header & Branding */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic">
            Worktrack <span className="text-indigo-400">PRO</span>
          </h1>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-[0.3em] mt-1">{t('menu_my_work_today')}</p>
        </div>
        <div className="text-right">
           <p className="text-white font-black text-lg uppercase tracking-tight">{employee?.nombre} {employee?.apellido_paterno}</p>
           <p className="text-indigo-400 text-[10px] font-bold uppercase tracking-widest">{employee?.codigo_empleado}</p>
        </div>
      </div>

      {/* Week Vision Calendar */}
      <div className="glass-dark rounded-3xl p-6 border border-slate-800 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
             <button onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))} className="p-2 hover:bg-slate-800 rounded-xl transition-colors text-slate-400"><ChevronLeft className="w-5 h-5" /></button>
             <h2 className="text-sm font-black text-white uppercase tracking-widest flex items-center">
                <CalendarIcon className="w-4 h-4 mr-2 text-indigo-400" />
                {t('week_of')} {format(startOfWeek(currentWeek, { weekStartsOn: 1 }), 'dd/MM/yyyy')}
             </h2>
             <button onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))} className="p-2 hover:bg-slate-800 rounded-xl transition-colors text-slate-400"><ChevronRight className="w-5 h-5" /></button>
          </div>
          <button onClick={() => { setCurrentWeek(new Date()); setSelectedDate(new Date()) }} className="text-[10px] font-black text-indigo-400 uppercase tracking-widest hover:text-white transition-colors">{t('today')}</button>
        </div>

        <div className="grid grid-cols-7 gap-3">
          {weekDays.map((day) => {
            const status = workdays.find(w => w.date === format(day, 'yyyy-MM-dd'))?.status || 'none'
            const isSelected = isSameDay(day, selectedDate)
            const isToday = isSameDay(day, new Date())
            
            return (
              <button 
                key={day.toString()} 
                onClick={() => setSelectedDate(day)}
                className={cn(
                  "flex flex-col items-center p-3 rounded-2xl border transition-all relative overflow-hidden group",
                  isSelected ? "bg-indigo-600 border-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.3)] scale-105 z-10" : "bg-slate-800/30 border-slate-700 hover:border-slate-500",
                  isToday && !isSelected && "ring-1 ring-indigo-500/50"
                )}
              >
                <span className={cn("text-[9px] font-black uppercase tracking-tighter mb-1", isSelected ? "text-indigo-100" : "text-slate-500")}>{format(day, 'EEE', { locale })}</span>
                <span className={cn("text-lg font-black", isSelected ? "text-white" : "text-slate-200")}>{format(day, 'dd')}</span>
                <div className={cn(
                  "mt-2 w-full h-1 rounded-full",
                  status === 'authorized' ? "bg-emerald-400" : 
                  status === 'rejected' ? "bg-red-400" : 
                  status === 'Enviado' ? "bg-indigo-400" : "bg-slate-700"
                )}></div>
              </button>
            )
          })}
        </div>
      </div>

      {message && (
        <div className={cn(
          "p-4 rounded-2xl flex items-center space-x-3 border-2 animate-in slide-in-from-top-4 glass",
          message.type === 'success' ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/5" : "border-red-500/30 text-red-400 bg-red-500/5"
        )}>
           {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
           <p className="font-bold uppercase tracking-tight text-xs flex-1">{message.text}</p>
           <button onClick={() => setMessage(null)} className="p-1 hover:bg-white/10 rounded-full transition-colors"><X className="w-4 h-4" /></button>
        </div>
      )}

      <div className="space-y-8 mt-8">
        
        {/* Indicators row */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className={cn(
            "rounded-3xl p-8 border shadow-2xl relative overflow-hidden flex flex-col justify-between transition-all duration-500 lg:col-span-1 min-h-[250px]",
            selectedDayStatus === 'authorized' ? "bg-emerald-600 border-emerald-400" :
            selectedDayStatus === 'rejected' ? "bg-red-600 border-red-400" :
            selectedDayStatus === 'Enviado' ? "bg-indigo-600 border-indigo-400" : "glass-dark border-slate-800"
          )}>
            <div>
               <div className="h-14 w-14 rounded-2xl bg-white/10 flex items-center justify-center mb-6 backdrop-blur-md border border-white/20">
                  {selectedDayStatus === 'authorized' ? <CheckCircle2 className="w-8 h-8" /> : 
                   selectedDayStatus === 'rejected' ? <AlertCircle className="w-8 h-8" /> : <Clock className="w-8 h-8" />}
               </div>
               <h3 className="text-2xl font-black uppercase tracking-tight mb-2">{t('daily_status')}</h3>
               <p className="text-white/70 text-sm font-bold uppercase tracking-widest">
                  {t(`status_${selectedDayStatus}` as any)}
               </p>
            </div>
            
            {(selectedDayStatus === 'draft' || selectedDayStatus === 'none') && events.length >= 2 && (
              <button 
                onClick={handleCerrarDia}
                className="w-full bg-white text-indigo-600 font-black py-4 rounded-2xl uppercase text-[10px] tracking-[0.3em] shadow-xl hover:bg-slate-50 transition-all active:scale-95 mt-6 flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                {t('send_close_day')}
              </button>
            )}
          </div>

          <div className="glass shadow-2xl rounded-3xl p-8 border border-white/5 relative overflow-hidden lg:col-span-3">
             <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                <Clock className="w-40 h-40" />
             </div>
             <h3 className="text-xs font-black text-white uppercase tracking-[0.4em] mb-8 flex items-center">
                <Zap className="w-4 h-4 mr-2 text-indigo-400" />
                {t('interactive_attendance')}
             </h3>
             <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 h-full">
                {[
                  { type: 'ENTRADA', label: t('entrada'), icon: Play, color: 'indigo' },
                  { type: 'COMIDA_SALIDA', label: t('comida_out'), icon: Coffee, color: 'amber' },
                  { type: 'COMIDA_REGRESO', label: t('comida_in'), icon: Zap, color: 'cyan' },
                  { type: 'SALIDA_FINAL', label: t('salida_final'), icon: LogOut, color: 'red' },
                ].map((btn) => (
                  <button 
                    key={btn.type}
                    onClick={() => handleAttendance(btn.type)}
                    className={cn(
                      "group flex flex-col items-center justify-center py-8 rounded-2xl border-2 transition-all active:scale-95 relative overflow-hidden",
                      btn.color === 'indigo' ? "border-indigo-500/20 bg-indigo-500/5 hover:border-indigo-500 hover:shadow-[0_0_20px_rgba(99,102,241,0.4)]" :
                      btn.color === 'amber' ? "border-amber-500/20 bg-amber-500/5 hover:border-amber-500 hover:shadow-[0_0_20px_rgba(245,158,11,0.4)]" :
                      btn.color === 'cyan' ? "border-cyan-500/20 bg-cyan-500/5 hover:border-cyan-500 hover:shadow-[0_0_20px_rgba(6,182,212,0.4)]" :
                      "border-red-500/20 bg-red-500/5 hover:border-red-500 hover:shadow-[0_0_20px_rgba(239,68,68,0.4)]"
                    )}
                  >
                    <btn.icon className="w-10 h-10 mb-4 transition-transform hover:scale-110" />
                    <span className="text-xs font-black uppercase text-center tracking-tighter text-white brightness-90">
                      {btn.label}
                    </span>
                  </button>
                ))}
             </div>
          </div>
        </div>

        
              {/* Attendance Summary */}
              {events.length > 0 && (
                <div className="mt-6 border-t border-white/5 pt-6">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">{t('day_records')}</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {(['ENTRADA','COMIDA_SALIDA','COMIDA_REGRESO','SALIDA_FINAL'] as const).map((tipo) => {
                      const ev = events.find((e: any) => e.event_type === tipo)
                      const meta: Record<string, {label: string, color: string}> = {
                        'ENTRADA':        { label: t('entrada'),    color: 'indigo' },
                        'COMIDA_SALIDA':  { label: t('comida_out'), color: 'amber'  },
                        'COMIDA_REGRESO': { label: t('comida_in'),  color: 'cyan'   },
                        'SALIDA_FINAL':   { label: t('salida_final'),color: 'rose'   },
                      }
                      const m = meta[tipo]
                      return (
                        <div key={tipo} className={cn("rounded-2xl p-3 border text-center",
                          ev ? (
                            m.color === 'indigo' ? "bg-indigo-500/10 border-indigo-500/30" :
                            m.color === 'amber'  ? "bg-amber-500/10  border-amber-500/30"  :
                            m.color === 'cyan'   ? "bg-cyan-500/10   border-cyan-500/30"   :
                                                   "bg-rose-500/10   border-rose-500/30"
                          ) : "bg-slate-900/30 border-slate-800"
                        )}>
                          <p className="text-[8px] font-black uppercase tracking-widest text-slate-500">{m.label}</p>
                          {ev ? (
                            <p className={cn("text-sm font-black mt-1",
                              m.color === 'indigo' ? "text-indigo-300" :
                              m.color === 'amber'  ? "text-amber-300"  :
                              m.color === 'cyan'   ? "text-cyan-300"   : "text-rose-300"
                            )}>
                              {new Date(ev.event_time).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false })}
                            </p>
                          ) : (
                            <p className="text-xs text-slate-700 font-mono mt-1">--:--</p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                  {(() => {
                    const entrada = events.find((e: any) => e.event_type === 'ENTRADA')
                    const salida  = events.find((e: any) => e.event_type === 'SALIDA_FINAL')
                    if (entrada && salida) {
                      const diffMs = new Date(salida.event_time).getTime() - new Date(entrada.event_time).getTime()
                      const totalHrs = (diffMs / 3600000).toFixed(1)
                      return (
                        <div className="mt-4 flex items-center justify-end gap-3 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                          <Clock className="w-4 h-4 text-emerald-400" />
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Horas trabajadas:</span>
                          <span className="text-sm font-black text-emerald-300">{totalHrs} hrs</span>
                        </div>
                      )
                    }
                    return null
                  })()}
                </div>
              )}
        {/* Capture Container */}
        <div className="glass-dark shadow-2xl rounded-[2rem] p-8 md:p-10 border border-white/5 relative overflow-hidden group">
            <div className="relative z-10 flex flex-col xl:flex-row items-start xl:items-center justify-between gap-6 border-b border-white/10 pb-8 mb-8 mt-2">
               <div>
                  <h3 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight flex items-center">
                    <CheckCircle2 className="w-8 h-8 mr-4 text-indigo-400" />
                    Registro de Actividades
                  </h3>
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-2 flex items-center">
                     <UserIcon className="w-4 h-4 mr-2" />
                     Trabajador: <span className="text-white ml-2">{employee?.nombre || userName}</span>
                  </p>
               </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 relative z-10">
              
              {/* Left Side: Activity */}
              <div className="space-y-8 flex flex-col h-full">
                 <div className="flex-1 space-y-8">
                    <div className="space-y-3">
                       <label className="text-xs font-black uppercase tracking-widest text-indigo-400 flex items-center">
                         <FileText className="w-5 h-5 mr-3" />
                         Descripción del Trabajo
                       </label>
                       <textarea 
                         rows={7}
                         value={activityDesc}
                         onChange={(e) => setActivityDesc(e.target.value)}
                         placeholder="Ej. Colado de losa en área B..."
                         className="w-full text-base form-pop rounded-[1.5rem] p-6 font-bold text-white border-white/5 focus:border-indigo-500 shadow-[inset_0_2px_10px_rgba(0,0,0,0.3)] bg-slate-900/50 transition-all outline-none resize-none" 
                       />
                    </div>
                    
                    <div className="space-y-3">
                       <label className="text-xs font-black uppercase tracking-widest text-indigo-400 flex items-center">
                         <Clock className="w-5 h-5 mr-3" />
                         Total de Horas Dedicadas
                       </label>
                       <input 
                         type="number" 
                         step="0.5"
                         value={activityHours}
                         onChange={(e) => setActivityHours(e.target.value)}
                         placeholder="8.0"
                         className="w-full h-20 form-pop rounded-[1.5rem] px-8 text-3xl font-black text-white border-white/5 focus:border-indigo-500 shadow-[inset_0_2px_10px_rgba(0,0,0,0.3)] bg-slate-900/50 transition-all outline-none" 
                       />
                    </div>
                 </div>

                 <div className="mt-8 pt-6 border-t border-white/5">
                    <button 
                      onClick={handleSubmitDescription}
                      disabled={uploadingActivity}
                      className="w-full h-16 bg-indigo-600 text-white rounded-[1.5rem] font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-indigo-600/20 hover:bg-indigo-500 float-btn active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
                    >
                      {uploadingActivity ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                      Guardar Actividades
                    </button>
                 </div>
              </div>

              {/* Right Side: Evidence */}
              <div className="space-y-6 flex flex-col h-full">
                 <label className="text-xs font-black uppercase tracking-widest text-emerald-400 flex items-center">
                    <Camera className="w-5 h-5 mr-3" />
                    Respaldo Visual (Fotografías)
                 </label>
                 
                 <div className="flex-1 min-h-[300px] relative">
                    <input 
                      type="file" 
                      accept="image/*" 
                      multiple 
                      ref={fileInputRef} 
                      className="hidden" 
                      onChange={(e) => {
                        const files = Array.from(e.target.files || [])
                        setActivityFiles(prev => [...prev, ...files])
                      }} 
                    />
                    
                    {activityFiles.length === 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 h-full">
                        <button 
                          onClick={() => setShowCamera(true)}
                          className="w-full h-full min-h-[160px] flex flex-col items-center justify-center gap-4 rounded-[2rem] border-2 border-dashed border-emerald-500/30 hover:border-emerald-500/60 hover:bg-emerald-500/5 bg-slate-900/30 transition-all group overflow-hidden"
                        >
                           <Camera className="w-8 h-8 text-emerald-400 group-hover:scale-110 transition-transform" />
                           <div className="text-center px-4 relative">
                             <p className="text-sm font-black text-white uppercase tracking-tight">Tomar Foto</p>
                             <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Cámara In-App</p>
                           </div>
                        </button>
                        <button 
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full h-full min-h-[160px] flex flex-col items-center justify-center gap-4 rounded-[2rem] border-2 border-dashed border-slate-700 hover:border-indigo-500/50 hover:bg-indigo-500/5 bg-slate-900/30 transition-all group overflow-hidden"
                        >
                           <Upload className="w-8 h-8 text-slate-400 group-hover:text-indigo-400 group-hover:scale-110 transition-transform" />
                           <div className="text-center px-4">
                             <p className="text-sm font-black text-white uppercase tracking-tight">Galería</p>
                             <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Fotos guardadas</p>
                           </div>
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                         <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {activityFiles.map((file, idx) => (
                              <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden border border-white/10 group">
                                 <img 
                                   src={URL.createObjectURL(file)} 
                                   alt="Preview" 
                                   className="w-full h-full object-cover"
                                 />
                                 <button 
                                   onClick={() => setActivityFiles(prev => prev.filter((_, i) => i !== idx))}
                                   className="absolute top-1 right-1 p-1.5 bg-red-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                 >
                                   <Trash2 className="w-3 h-3" />
                                 </button>
                              </div>
                            ))}
                            <button 
                              onClick={() => setShowCamera(true)}
                              className="aspect-square flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10 transition-all cursor-pointer"
                            >
                               <Plus className="w-6 h-6 text-emerald-400 pointer-events-none" />
                               <span className="text-[8px] font-black text-white uppercase pointer-events-none">Añadir Foto</span>
                            </button>
                         </div>
                         <div className="flex justify-between items-center bg-emerald-500/5 p-4 rounded-2xl border border-emerald-500/20">
                            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">{activityFiles.length} Fotos Seleccionadas</span>
                            <button onClick={() => setActivityFiles([])} className="text-[10px] font-bold text-red-400 uppercase tracking-widest hover:text-red-300">Limpiar Todo</button>
                         </div>
                      </div>
                    )}
                 </div>
                 
                 <div className="mt-8 pt-6 border-t border-white/5">
                   <button 
                     onClick={handleSubmitEvidence}
                     disabled={uploadingEvidence}
                     className="w-full h-16 bg-emerald-600 text-emerald-50 rounded-[1.5rem] font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-emerald-600/20 hover:bg-emerald-500 float-btn active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
                   >
                     {uploadingEvidence ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                     Guardar Registro Evidencia
                   </button>
                 </div>
              </div>

            </div>
        </div>
      </div>

      {/* Activities List */}
      {activities.length > 0 && (
        <div className="glass-dark shadow-2xl rounded-[2rem] p-8 border border-white/5">
          <h3 className="text-xs font-black text-white uppercase tracking-[0.4em] mb-6 flex items-center">
            <FileText className="w-4 h-4 mr-2 text-indigo-400" />
            Actividades Registradas del Día
          </h3>
          <div className="space-y-3">
            {activities.map((act: any) => (
              <div key={act.id} className="flex items-start justify-between gap-4 p-4 rounded-2xl bg-slate-900/50 border border-white/5 hover:border-indigo-500/20 transition-all">
                <div className="flex-1 min-w-0">
                  {act.storage_url ? (
                    <div className="flex items-center gap-3">
                      <img src={act.storage_url} className="w-12 h-12 rounded-xl object-cover border border-white/10" alt="evidencia" />
                      <div>
                        <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Evidencia Fotográfica</p>
                        <p className="text-[9px] text-slate-500">{new Date(act.created_at || act.date).toLocaleString('es-MX')}</p>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm font-bold text-white truncate">{act.activity_description || act.activity_name}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">{act.hours_dedicated || 0} hrs</span>
                        <span className="text-[9px] text-slate-600">{act.date}</span>
                      </div>
                    </div>
                  )}
                </div>
                <button 
                  onClick={() => deleteActivity(act.id)}
                  className="p-2 text-red-400 hover:bg-red-500/10 rounded-xl border border-transparent hover:border-red-500/20 transition-all shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {showCamera && (
        <WebCamera 
          onCapture={(file) => {
            setActivityFiles(prev => [...prev, file])
            setShowCamera(false)
          }}
          onClose={() => setShowCamera(false)}
        />
      )}
    </div>
  )
}
