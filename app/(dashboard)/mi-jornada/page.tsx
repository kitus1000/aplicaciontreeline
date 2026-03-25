'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/utils/supabase/client'
import { useI18n } from '@/lib/i18n'
import { 
  Calendar as CalendarIcon, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  ChevronLeft, 
  ChevronRight,
  MoreVertical,
  Play,
  Coffee,
  UserCheck,
  Zap,
  LogOut,
  History
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { format, startOfWeek, addDays, isSameDay, subWeeks, addWeeks } from 'date-fns'
import { es, enUS } from 'date-fns/locale'

export default function MyWorkdayPage() {
  const { t, language } = useI18n()
  const [loading, setLoading] = useState(true)
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [workdays, setWorkdays] = useState<any[]>([])
  const [events, setEvents] = useState<any[]>([])
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [employee, setEmployee] = useState<any>(null)

  const locale = language === 'es' ? es : enUS

  useEffect(() => {
    fetchData()
  }, [currentWeek])

  async function fetchData() {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Find employee associated with this user
      // Assuming 'perfiles' has a way to link to 'empleados' or they share ID/Email
      // For this MVP, let's assume we can find it via curative logic if needed, 
      // but let's just use the first employee found for demo if no direct link yet
      const { data: profile } = await supabase.from('perfiles').select('nombre_completo').eq('id', user.id).single()
      
      const { data: empData } = await supabase
        .from('empleados')
        .select('*')
        .or(`correo_electronico.eq.${user.email},nombre.ilike.%${profile?.nombre_completo}%`)
        .limit(1)
        .single()

      if (!empData) return
      setEmployee(empData)

      const start = startOfWeek(currentWeek, { weekStartsOn: 1 })
      const end = addDays(start, 6)

      // 1. Fetch workday statuses for the week
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
        .eq('date', format(selectedDate, 'yyyy-MM-dd'))
        .order('event_time', { ascending: true })

      setEvents(eventsData || [])

    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-slate-100 text-slate-500 border-slate-200'
      case 'sent': return 'bg-blue-50 text-blue-600 border-blue-200'
      case 'under_review': return 'bg-amber-50 text-amber-600 border-amber-200'
      case 'authorized': return 'bg-green-50 text-green-600 border-green-200'
      case 'rejected': return 'bg-red-50 text-red-600 border-red-200'
      case 'closed': return 'bg-indigo-50 text-indigo-600 border-indigo-200'
      default: return 'bg-slate-50 text-slate-400 border-slate-100'
    }
  }

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'ENTRADA': return <Play className="w-4 h-4 text-green-500" />
      case 'COMIDA_SALIDA': return <Coffee className="w-4 h-4 text-amber-500" />
      case 'COMIDA_REGRESO': return <Zap className="w-4 h-4 text-amber-600" />
      case 'SALIDA_FINAL': return <LogOut className="w-4 h-4 text-red-500" />
      default: return <Clock className="w-4 h-4 text-slate-400" />
    }
  }

  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(startOfWeek(currentWeek, { weekStartsOn: 1 }), i))

  return (
    <div className="max-w-5xl mx-auto pb-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">{t('menu_my_workday')}</h1>
        <p className="text-slate-500 mt-1">{t('weekly_history')}</p>
      </div>

      {/* Week Selector & Status Map */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <button onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><ChevronLeft className="w-5 h-5" /></button>
            <h2 className="text-lg font-bold text-slate-800 flex items-center">
              <CalendarIcon className="w-5 h-5 mr-2 text-indigo-600" />
              {t('week_of')} {format(startOfWeek(currentWeek, { weekStartsOn: 1 }), 'dd/MM/yyyy')}
            </h2>
            <button onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><ChevronRight className="w-5 h-5" /></button>
          </div>
          <button onClick={() => setCurrentWeek(new Date())} className="text-xs font-bold text-indigo-600 uppercase tracking-widest hover:underline">{t('today')}</button>
        </div>

        <div className="grid grid-cols-7 gap-4">
          {weekDays.map((day) => {
            const status = workdays.find(w => w.date === format(day, 'yyyy-MM-dd'))?.status || 'none'
            const isSelected = isSameDay(day, selectedDate)
            
            return (
              <button 
                key={day.toString()} 
                onClick={() => setSelectedDate(day)}
                className={cn(
                  "flex flex-col items-center p-4 rounded-xl border-2 transition-all group",
                  isSelected ? "border-indigo-600 shadow-lg shadow-indigo-100 ring-2 ring-indigo-50" : "border-transparent bg-slate-50 hover:border-slate-200"
                )}
              >
                <span className="text-xs font-bold text-slate-400 uppercase mb-1">{format(day, 'EEE', { locale })}</span>
                <span className={cn("text-xl font-black mb-3", isSelected ? "text-indigo-600" : "text-slate-700")}>{format(day, 'dd')}</span>
                <div className={cn(
                  "w-full py-1 text-[10px] font-black uppercase text-center rounded-md border",
                  getStatusColor(status)
                )}>
                  {status === 'none' ? '-' : t(`status_${status}` as any)}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Timeline Section */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 h-full">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-800 flex items-center uppercase tracking-wider">
                <History className="w-5 h-5 mr-2 text-indigo-600" />
                {t('events_of')} {format(selectedDate, 'dd MMMM', { locale })}
              </h3>
            </div>

            {loading ? (
              <div className="py-20 text-center text-slate-400">{t('loading')}</div>
            ) : events.length === 0 ? (
              <div className="py-20 text-center text-slate-400 italic">{t('no_events')}</div>
            ) : (
              <div className="relative pl-8 space-y-8 before:content-[''] before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
                {events.map((event, idx) => (
                  <div key={event.id} className="relative animate-in slide-in-from-left-4 fade-in duration-300" style={{ animationDelay: `${idx * 100}ms` }}>
                    <div className="absolute -left-8 top-1.5 w-6 h-6 rounded-full bg-white border-2 border-slate-100 flex items-center justify-center z-10 shadow-sm">
                      {getEventIcon(event.event_type)}
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 text-lg uppercase tracking-tight">{t(event.event_type.toLowerCase() as any)}</span>
                        <span className="text-xl font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg tabular-nums">
                          {format(new Date(event.event_time), 'HH:mm')}
                        </span>
                      </div>
                      {event.notes && <p className="text-slate-500 text-sm mt-1">{event.notes}</p>}
                      <div className="flex items-center space-x-4 mt-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        <span className="bg-slate-50 px-2 py-0.5 rounded border border-slate-100">{event.source}</span>
                        {event.location && <span className="flex items-center"><Play className="w-3 h-3 mr-1" /> GPS</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Status Info / Next Day Section */}
        <div className="space-y-6">
          <div className="bg-indigo-600 rounded-xl shadow-lg p-6 text-white min-h-[300px] flex flex-col justify-between">
            <div>
              <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center mb-6">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-2xl font-bold mb-2">{t('daily_summary')}</h3>
              <p className="text-indigo-100 text-sm leading-relaxed">
                {t('daily_summary_desc')}
              </p>
            </div>
            
            <div className="mt-8 pt-8 border-t border-indigo-500/50">
              <p className="text-xs font-bold uppercase tracking-widest text-indigo-200 mb-2">{t('next_step')}</p>
              <button className="w-full bg-white text-indigo-600 font-bold py-3 rounded-lg hover:bg-slate-50 transition-colors">
                {t('menu_my_work_today')}
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">{t('legend')}</h4>
            <div className="space-y-3">
              {['draft', 'sent', 'under_review', 'authorized', 'rejected', 'closed'].map(s => (
                <div key={s} className="flex items-center space-x-3 text-sm">
                  <div className={cn("w-3 h-3 rounded-full border", getStatusColor(s).split(' ')[0])}></div>
                  <span className="font-medium text-slate-600 uppercase tracking-tighter">{t(`status_${s}` as any)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
