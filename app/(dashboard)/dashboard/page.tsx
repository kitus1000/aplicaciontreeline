'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/utils/supabase/client'
import { useI18n } from '@/lib/i18n'
import { 
  Users, 
  TrendingUp, 
  Clock, 
  ShieldAlert, 
  CheckCircle2, 
  LineChart, 
  Activity, 
  AlertCircle, 
  Camera,
  Sparkles
} from 'lucide-react'
import { cn } from '@/utils/cn'

export default function KPIDashboardPage() {
  const router = useRouter()
  const { t } = useI18n()
  const [userName, setUserName] = useState('')
  const [stats, setStats] = useState({
    empleados: 0,
    pendientes: 0,
    proyectos: 0,
    active: 0
  })

  useEffect(() => {
    fetchDashboardData()
  }, [])

  async function fetchDashboardData() {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
      const { data: profile } = await supabase
        .from('perfiles')
        .select('nombre_completo')
        .eq('id', user.id)
        .single()
      
      const email = user.email || ''
      setUserName(profile?.nombre_completo?.split(' ')[0] || user.user_metadata?.nombre_completo?.split(' ')[0] || email.split('@')[0] || 'Administrador')
    } else {
      setUserName('Administrador')
    }

    const today = new Date().toISOString().split('T')[0]

    // 1. Empleados totales
    const { count: empCount } = await supabase
        .from('empleados')
        .select('*', { count: 'exact', head: true })

    // 2. Fotos de evidencia hoy
    const { count: photoCount } = await supabase
        .from('workday_activities')
        .select('*', { count: 'exact', head: true })
        .eq('date', today)
        .not('storage_url', 'is', null)

    // 3. Checadas hoy (Personal activo)
    const { data: activeData } = await supabase
        .from('checadas')
        .select('id_empleado_token', { count: 'exact' })
        .eq('fecha', today)
        .eq('tipo_checada', 'ENTRADA')

    // 4. Solicitudes pendientes
    const { count: pendingCount } = await supabase
        .from('solicitudes')
        .select('*', { count: 'exact', head: true })
        .eq('estado', 'PENDIENTE')
        
    setStats({
      empleados: empCount || 0,
      pendientes: pendingCount || 0,
      proyectos: photoCount || 0,
      active: activeData?.length || 0
    })
  }

  const kpis = [
    {
      title: t('kpi_registered_staff'),
      value: stats.empleados.toString(),
      subtext: t('kpi_registered_staff_sub'),
      icon: Users,
      trend: t('kpi_trend_total'),
      trendColor: "text-blue-400 bg-blue-500/10 border-blue-500/20",
      color: "from-blue-500 to-indigo-600",
    },
    {
      title: t('kpi_active_today'),
      value: stats.active.toString(),
      subtext: t('kpi_active_today_sub'),
      icon: Activity,
      trend: t('kpi_trend_onsite'),
      trendColor: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
      color: "from-emerald-500 to-teal-600",
    },
    {
      title: t('kpi_evidence_sent'),
      value: stats.proyectos.toString(),
      subtext: t('kpi_evidence_sent_sub'),
      icon: Camera,
      trend: t('kpi_trend_visual'),
      trendColor: "text-pink-400 bg-pink-500/10 border-pink-500/20",
      color: "from-pink-500 to-rose-600",
    },
    {
      title: t('kpi_requests'),
      value: stats.pendientes.toString(),
      subtext: t('kpi_requests_sub'),
      icon: ShieldAlert,
      trend: t('kpi_trend_action'),
      trendColor: "text-red-400 bg-red-500/10 border-red-500/20",
      color: "from-orange-500 to-red-600",
    }
  ]

  const daysOfWeek = [
    t('kpi_monday'),
    t('kpi_tuesday'),
    t('kpi_wednesday'),
    t('kpi_thursday'),
    t('kpi_friday'),
    t('kpi_saturday'),
    t('kpi_sunday')
  ]

  return (
    <div className="relative min-h-[calc(100vh-4rem)] p-4 md:p-8 space-y-8 page-transition">
      
      {/* Header Section */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[var(--border-color)] pb-6">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
             <span className="px-3 py-1 bg-indigo-500/10 text-indigo-400 text-[10px] font-black uppercase tracking-[0.2em] rounded-full border border-indigo-500/20 flex items-center gap-1.5">
               <Sparkles className="w-3 h-3 animate-pulse" /> Analytics Core
             </span>
             <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-[var(--text-main)] tracking-tight">
            Dashboard <span className="text-indigo-500">KPIs</span>
          </h1>
          <p className="text-xs font-semibold text-[var(--text-muted)] max-w-lg">
            {t('kpi_operational_metrics')} • <span className="text-indigo-400">{t('kpi_realtime')}</span>
          </p>
        </div>
        
        <div className="hidden lg:flex items-center gap-6 glass-card px-6 py-3.5 rounded-2xl border border-[var(--border-color)]">
          <Activity className="w-6 h-6 text-indigo-500 animate-pulse" />
          <div>
            <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest leading-none mb-1">{t('kpi_status_general')}</p>
            <p className="text-base font-black text-emerald-400 uppercase tracking-wider">{t('kpi_status_optimal')}</p>
          </div>
        </div>
      </header>

      {/* Top KPIs Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi, idx) => (
          <div 
            key={idx}
            className="relative glass-card p-6 rounded-3xl border border-[var(--border-color)] flex flex-col justify-between hover:border-indigo-500/40 transition-all float-btn"
            style={{ animationDelay: `${idx * 80}ms` }}
          >
            <div className="flex justify-between items-start mb-6">
              <div className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center bg-gradient-to-br shadow-lg",
                kpi.color
              )}>
                <kpi.icon className="w-6 h-6 text-white" />
              </div>
              <span className={cn("text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border", kpi.trendColor)}>
                {kpi.trend}
              </span>
            </div>

            <div>
              <h3 className="text-3xl font-black text-[var(--text-main)] tracking-tight mb-1">{kpi.value}</h3>
              <p className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1">{kpi.title}</p>
              <p className="text-[10px] font-medium text-[var(--text-muted)]">{kpi.subtext}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts & Activity Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Chart Card */}
        <div className="lg:col-span-2 glass-card rounded-3xl p-6 md:p-8 border border-[var(--border-color)] flex flex-col justify-between">
           <div className="flex justify-between items-center mb-6 border-b border-[var(--border-color)] pb-4">
             <div>
               <h3 className="text-lg font-black text-[var(--text-main)] tracking-tight">{t('kpi_weekly_productivity')}</h3>
               <p className="text-xs text-[var(--text-muted)]">{t('kpi_hours_vs_estimate')}</p>
             </div>
             <div className="p-2.5 glass rounded-xl text-indigo-400">
               <LineChart className="w-5 h-5" />
             </div>
           </div>

           {/* Chart Bars */}
           <div className="h-56 flex items-end justify-between gap-3 px-2 pt-6">
              {[40, 65, 45, 80, 55, 90, 75].map((height, i) => (
                <div key={i} className="relative w-full group/bar flex flex-col items-center h-full justify-end">
                  <div className="mb-2 opacity-0 group-hover/bar:opacity-100 transition-opacity">
                    <span className="text-[10px] font-black text-indigo-500 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">{height}%</span>
                  </div>
                  <div 
                    className="w-full bg-gradient-to-t from-indigo-600/40 via-indigo-500 to-blue-500 rounded-t-xl hover:brightness-125 transition-all duration-300 shadow-md"
                    style={{ height: `${height}%` }}
                  />
                </div>
              ))}
           </div>
           
           <div className="flex justify-between text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mt-4 px-2 border-t border-[var(--border-color)] pt-3">
             {daysOfWeek.map((day, i) => (
               <span key={i}>{day}</span>
             ))}
           </div>
        </div>

        {/* Activity Feed */}
        <div className="glass-card rounded-3xl p-6 md:p-8 border border-[var(--border-color)] flex flex-col justify-between">
          <div className="flex justify-between items-center mb-6 border-b border-[var(--border-color)] pb-4">
            <div>
              <h3 className="text-lg font-black text-[var(--text-main)] tracking-tight">{t('kpi_recent_events')}</h3>
              <p className="text-xs text-[var(--text-muted)]">{t('kpi_last_24h')}</p>
            </div>
          </div>

          <div className="space-y-4 flex-1">
            {[
              { icon: CheckCircle2, text: t('kpi_event_payroll'), time: t('kpi_event_time_2min'), color: "text-emerald-400" },
              { icon: Users, text: t('kpi_event_employees'), time: t('kpi_event_time_1h'), color: "text-blue-400" },
              { icon: AlertCircle, text: t('kpi_event_absence'), time: t('kpi_event_time_3h'), color: "text-red-400" },
              { icon: Clock, text: t('kpi_event_schedule'), time: t('kpi_event_yesterday'), color: "text-amber-400" },
            ].map((ev, i) => (
              <div key={i} className="flex gap-3 items-start p-2.5 rounded-2xl glass hover:border-indigo-500/30 transition-all">
                <div className="mt-0.5">
                  <ev.icon className={cn("w-4 h-4", ev.color)} />
                </div>
                <div>
                  <p className="text-xs font-bold text-[var(--text-main)] leading-tight">{ev.text}</p>
                  <p className="text-[10px] font-semibold text-[var(--text-muted)] mt-0.5">{ev.time}</p>
                </div>
              </div>
            ))}
          </div>

          <button className="w-full mt-6 py-3 rounded-2xl glass hover:bg-indigo-600 hover:text-white text-xs font-black text-[var(--text-muted)] uppercase tracking-wider transition-all">
            {t('kpi_view_full_history')}
          </button>
        </div>

      </div>

    </div>
  )
}
