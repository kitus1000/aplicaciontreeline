'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { 
  Bot, 
  Sparkles, 
  X, 
  ChevronRight, 
  HelpCircle, 
  Camera, 
  Clock, 
  CheckCircle2, 
  Zap, 
  MessageSquare,
  Lightbulb
} from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import { useImpersonation } from '@/context/ImpersonationContext'
import { supabase } from '@/utils/supabase/client'
import { cn } from '@/utils/cn'

export function AIAssistantWidget() {
  const pathname = usePathname()
  const { t, language } = useI18n()
  const { impersonatedEmployee } = useImpersonation()
  
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [hasPrompted, setHasPrompted] = useState(false)
  const [employeeEvents, setEmployeeEvents] = useState<any[]>([])
  const [employeeActivities, setEmployeeActivities] = useState<any[]>([])
  const [activeAdvice, setActiveAdvice] = useState<string>('')

  // Automatically show initial smart notification speech bubble after 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setHasPrompted(true)
    }, 3000)
    return () => clearTimeout(timer)
  }, [])

  // Fetch current worker events for smart advice
  useEffect(() => {
    async function loadWorkerContext() {
      try {
        let empId: string | null = null

        if (impersonatedEmployee) {
          empId = impersonatedEmployee.id_empleado
        } else {
          const { data: { user } } = await supabase.auth.getUser()
          if (!user) return
          const { data: profile } = await supabase.from('perfiles').select('nombre_completo').eq('id', user.id).single()
          let empQuery = supabase.from('empleados').select('id_empleado')
          if (profile?.nombre_completo) {
            empQuery = empQuery.or(`correo_electronico.eq.${user.email},nombre.ilike.%${profile.nombre_completo.split(' ')[0]}%`)
          } else {
            empQuery = empQuery.eq('correo_electronico', user.email)
          }
          const { data: empData } = await empQuery.maybeSingle()
          if (empData) empId = empData.id_empleado
        }

        if (!empId) return

        const today = new Date().toISOString().split('T')[0]
        const { data: evs } = await supabase
          .from('workday_events')
          .select('*')
          .eq('employee_id', empId)
          .eq('date', today)

        const { data: acts } = await supabase
          .from('workday_activities')
          .select('*')
          .eq('employee_id', empId)
          .eq('date', today)

        setEmployeeEvents(evs || [])
        setEmployeeActivities(acts || [])
      } catch (err) {
        console.error('Error fetching AI context:', err)
      }
    }

    loadWorkerContext()
  }, [pathname, impersonatedEmployee])

  // Determine current workday step & elapsed hours
  const entradaEv = employeeEvents.find(e => e.event_type === 'ENTRADA' || e.event_type === 'CHECK_IN')
  const hasEntrada = Boolean(entradaEv)
  const hasSalidaComida = employeeEvents.some(e => e.event_type === 'SALIDA_COMER' || e.event_type === 'COMIDA_SALIDA')
  const hasEntradaComida = employeeEvents.some(e => e.event_type === 'ENTRADA_COMER' || e.event_type === 'COMIDA_REGRESO')
  const hasSalidaFinal = employeeEvents.some(e => e.event_type === 'SALIDA_FINAL' || e.event_type === 'SALIDA')
  const hasPhotos = employeeActivities.some(a => Boolean(a.storage_url))

  let elapsedHours = 0
  if (entradaEv) {
    const diff = Date.now() - new Date(entradaEv.event_time).getTime()
    elapsedHours = Math.max(0, Math.round((diff / (1000 * 60 * 60)) * 10) / 10)
  }

  // Smart Step Context Generator
  const getSmartStepText = () => {
    if (language === 'en') {
      if (!hasEntrada) return '📍 Step 1 Pending: Remember to record your Entrance (Check-in) when starting your shift.'
      if (!hasSalidaComida && elapsedHours >= 4) return `⚠️ You have worked ${elapsedHours} hours and haven't logged lunch yet. Remember to press "Salida a Comer".`
      if (!hasSalidaComida) return '🥪 Step 2 Pending: Heading to lunch? Press "Salida a Comer" to pause.'
      if (!hasEntradaComida) return '⚡ Step 3 Pending: Returned from lunch? Press "Regreso de Comer".'
      if (!hasSalidaFinal) return `🔴 Step 4 Pending: You have accumulated ${elapsedHours} hours today. Record "Salida Final" before closing.`
      if (!hasPhotos) return `📸 You have ${elapsedHours} hours today. Don't forget to upload a work photo before clicking "Send & Close Day"!`
      return `🎉 Great job! You completed ${elapsedHours} hours today with photo evidence. You can now close your day!`
    } else {
      if (!hasEntrada) return '📍 Paso 1 Pendiente: Recuerda marcar tu Entrada General al llegar a la obra.'
      if (!hasSalidaComida && elapsedHours >= 4) return `⚠️ Llevas ${elapsedHours} horas trabajando y no has registrado tu pausa de comida. Recuerda presionar "Salida a Comer".`
      if (!hasSalidaComida) return '🥪 Paso 2 Pendiente: ¿Vas a comer? Presiona "Salida a Comer" en el proceso guiado.'
      if (!hasEntradaComida) return '⚡ Paso 3 Pendiente: ¿Volviste de comer? Presiona "Regreso de Comer" para reiniciar labores.'
      if (!hasSalidaFinal) return `🔴 Paso 4 Pendiente: Llevas ${elapsedHours} horas acumuladas hoy. Registra tu "Salida Final" antes de cerrar.`
      if (!hasPhotos) return `📸 Llevas ${elapsedHours} horas hoy. ¡Recuerda adjuntar una foto de tu trabajo antes de presionar "Enviar y Cerrar Día"!`
      return `🎉 ¡Excelente trabajo! Completaste ${elapsedHours} horas hoy con tus evidencias fotográficas listas.`
    }
  }

  const currentStepMessage = getSmartStepText()

  return (
    <div className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-50 flex flex-col items-end pointer-events-none">
      
      {/* Speech Bubble Notification (Appears smoothly without blocking) */}
      {hasPrompted && !isOpen && (
        <div className="pointer-events-auto mb-3 max-w-xs p-3.5 rounded-2xl glass-card border border-indigo-500/30 shadow-2xl animate-in fade-in slide-in-from-bottom-3 duration-300 flex items-start gap-3 relative group">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md">
            <Sparkles className="w-4 h-4 animate-pulse" />
          </div>
          <div className="flex-1 pr-4">
            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-wider flex items-center gap-1">
              <span>Asistente Worktrack AI</span>
            </p>
            <p className="text-xs font-semibold text-[var(--text-main)] mt-0.5 leading-snug">
              {currentStepMessage}
            </p>
          </div>
          <button 
            onClick={() => setHasPrompted(false)}
            className="absolute top-2 right-2 text-[var(--text-muted)] hover:text-white p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Expanded AI Panel */}
      {isOpen && (
        <div className="pointer-events-auto w-80 sm:w-96 rounded-3xl glass-card p-5 border border-indigo-500/40 shadow-2xl animate-in fade-in zoom-in-95 duration-200 mb-3 space-y-4 relative overflow-hidden">
          
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-600 to-blue-600 text-white flex items-center justify-center shadow-lg">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-black text-[var(--text-main)] uppercase tracking-wider flex items-center gap-1.5">
                  Worktrack AI Co-pilot
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                </h4>
                <p className="text-[10px] text-indigo-400 font-bold">Guía Inteligente y Consejos</p>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-xl glass hover:bg-red-500/10 text-[var(--text-muted)] hover:text-red-400 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Current Status Box */}
          <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 space-y-2">
            <div className="flex items-center justify-between text-[10px] font-black uppercase text-indigo-400 tracking-wider">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> Estatus Actual de tu Día
              </span>
            </div>
            <p className="text-xs font-bold text-[var(--text-main)] leading-relaxed">
              {currentStepMessage}
            </p>
          </div>

          {/* Quick Action Prompt Buttons */}
          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
              Preguntas Rápidas / Consejos
            </p>
            
            <div className="grid grid-cols-1 gap-2">
              <button
                onClick={() => setActiveAdvice(
                  language === 'es'
                    ? '💡 CONSEJO DE ENTRADA: Registra tu Entrada tan pronto llegues a la obra o proyecto. El sistema guarda la hora oficial para la prenómina.'
                    : '💡 CLOCK-IN TIP: Record your Entrance as soon as you arrive at the work site. The system logs official times for payroll.'
                )}
                className="w-full text-left p-2.5 rounded-xl glass hover:border-indigo-500/40 text-xs font-bold text-[var(--text-main)] transition-all flex items-center justify-between group"
              >
                <span className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-indigo-400" />
                  ¿Cómo funciona el marcaje en 4 pasos?
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-[var(--text-muted)] group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                onClick={() => setActiveAdvice(
                  language === 'es'
                    ? '📸 CONSEJO FOTOGRÁFICO: En "Mi Trabajo", usa la cámara o adjunta un archivo en la sección de Evidencias. No te olvides de subirla antes de cerrar el día.'
                    : '📸 PHOTO TIP: In "My Work", use the camera or attach a file under Evidence. Don\'t forget to upload before closing the day.'
                )}
                className="w-full text-left p-2.5 rounded-xl glass hover:border-indigo-500/40 text-xs font-bold text-[var(--text-main)] transition-all flex items-center justify-between group"
              >
                <span className="flex items-center gap-2">
                  <Camera className="w-4 h-4 text-amber-400" />
                  ¿Cómo y cuándo subo mis fotos?
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-[var(--text-muted)] group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                onClick={() => setActiveAdvice(
                  language === 'es'
                    ? '🔒 CONSEJO DE CIERRE: Al finalizar tu jornada y tus 4 pasos, presiona "Enviar y Cerrar Día". Tu supervisor recibirá una alerta inmediata para autorizarlo.'
                    : '🔒 DAY CLOSE TIP: When finished with your 4 steps, press "Send & Close Day". Your supervisor will receive an instant authorization alert.'
                )}
                className="w-full text-left p-2.5 rounded-xl glass hover:border-indigo-500/40 text-xs font-bold text-[var(--text-main)] transition-all flex items-center justify-between group"
              >
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ¿Qué pasa al Cerrar el Día?
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-[var(--text-muted)] group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

          {/* Answer Box */}
          {activeAdvice && (
            <div className="p-3.5 rounded-2xl bg-indigo-600/10 border border-indigo-500/30 text-xs font-semibold text-[var(--text-main)] animate-in fade-in space-y-2">
              <p className="leading-relaxed">{activeAdvice}</p>
              <button
                onClick={() => setActiveAdvice('')}
                className="text-[10px] font-black text-indigo-400 uppercase tracking-wider hover:underline"
              >
                Cerrar consejo ✖
              </button>
            </div>
          )}

          {/* Footer note */}
          <div className="pt-2 border-t border-[var(--border-color)] flex items-center justify-between text-[9px] text-[var(--text-muted)] font-bold">
            <span>Worktrack AI • Siempre disponible</span>
            <button onClick={() => setIsOpen(false)} className="hover:text-[var(--text-main)]">
              Minimizar 🔽
            </button>
          </div>

        </div>
      )}

      {/* Floating Trigger Orb Button */}
      <button
        onClick={() => {
          setIsOpen(!isOpen)
          setHasPrompted(false)
        }}
        className="pointer-events-auto relative p-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-2xl float-btn border border-indigo-400/40 group flex items-center gap-2"
        title="Asistente con IA Worktrack"
      >
        <div className="relative">
          <Bot className="w-6 h-6 text-white group-hover:rotate-12 transition-transform" />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping" />
        </div>
        <span className="hidden sm:inline text-xs font-black uppercase tracking-wider pr-1">
          Asistente AI
        </span>
      </button>

    </div>
  )
}
