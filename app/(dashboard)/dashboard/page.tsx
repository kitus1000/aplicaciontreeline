'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/utils/supabase/client'
import { Users, TrendingUp, Clock, ShieldAlert, Zap, HardHat, CheckCircle2, LineChart, Activity, AlertCircle, Camera } from 'lucide-react'
import { cn } from '@/utils/cn'

export default function KPIDashboardPage() {
  const router = useRouter()
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
      setUserName(profile?.nombre_completo?.split(' ')[0] || user.user_metadata?.nombre_completo?.split(' ')[0] || email.split('@')[0] || 'Administrator')
    } else {
      setUserName('Administrator')
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
      proyectos: photoCount || 0, // Usamos proyectos para mostrar fotos hoy interinamente
      active: activeData?.length || 0
    })
  }

  const kpis = [
    {
      title: "Personal Registrado",
      value: stats.empleados.toString(),
      subtext: "Colaboradores en sistema",
      icon: Users,
      trend: "Total",
      trendColor: "text-blue-400",
      color: "from-blue-500 to-indigo-600",
      glow: "bg-blue-500/20"
    },
    {
      title: "Personal Activo Hoy",
      value: (stats as any).active?.toString() || "0",
      subtext: "Entradas registradas hoy",
      icon: Activity,
      trend: "En sitio",
      trendColor: "text-emerald-400",
      color: "from-emerald-500 to-teal-600",
      glow: "bg-emerald-500/20"
    },
    {
      title: "Evidencias Enviadas",
      value: stats.proyectos.toString(),
      subtext: "Fotos capturadas hoy",
      icon: Camera,
      trend: "Visual",
      trendColor: "text-pink-400",
      color: "from-pink-500 to-rose-600",
      glow: "bg-pink-500/20"
    },
    {
      title: "Solicitudes",
      value: stats.pendientes.toString(),
      subtext: "Pendientes de revisión",
      icon: ShieldAlert,
      trend: "Acción Requerida",
      trendColor: "text-red-400",
      color: "from-orange-500 to-red-600",
      glow: "bg-red-500/20"
    }
  ]

  return (
    <div className="relative min-h-[calc(100vh-4rem)] p-8 overflow-hidden page-transition">
      {/* Background Graphic */}
      <div className="absolute inset-0 construction-grid opacity-20 pointer-events-none"></div>
      
      {/* HUD Radar Rings */}
      <div className="absolute top-0 right-0 w-[800px] h-[800px] border border-white/5 rounded-full translate-x-1/3 -translate-y-1/3 animate-[spin_60s_linear_infinite] pointer-events-none"></div>
      <div className="absolute top-0 right-0 w-[600px] h-[600px] border border-white/[0.02] rounded-full translate-x-1/4 -translate-y-1/4 animate-[spin_40s_linear_infinite_reverse] pointer-events-none"></div>

      <div className="relative z-10 max-w-7xl mx-auto space-y-10">
        
        {/* Header Section */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-indigo-500/20 pb-8">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
               <span className="px-3 py-1 bg-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase tracking-[0.3em] rounded-full border border-indigo-500/30">Analytics Core</span>
               <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            </div>
            <h1 className="text-5xl font-black text-white tracking-tighter italic uppercase leading-tight">
              Dashboard <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-blue-500">KPIs</span>
            </h1>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-[0.3em] max-w-lg leading-relaxed">
              Métricas Operativas y de Rendimiento <br />
              <span className="text-indigo-400/50">Datos en Tiempo Real</span>
            </p>
          </div>
          
          <div className="hidden lg:flex items-center gap-8 glass-dark px-8 py-4 rounded-3xl border border-white/5">
            <Activity className="w-8 h-8 text-indigo-400 animate-pulse" />
            <div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Status General</p>
              <p className="text-xl font-black text-emerald-400 uppercase tracking-widest">Óptimo</p>
            </div>
          </div>
        </header>

        {/* Top KPIs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {kpis.map((kpi, idx) => (
            <div 
              key={idx}
              className="relative glass-dark p-6 rounded-[2rem] border border-white/5 overflow-hidden group hover:border-indigo-500/30 transition-all duration-500 animate-in fade-in slide-in-from-bottom-8"
              style={{ animationDelay: `${idx * 100}ms` }}
            >
              {/* Backglow */}
              <div className={cn("absolute -top-10 -right-10 w-32 h-32 rounded-full blur-[40px] opacity-30 group-hover:opacity-60 transition-opacity", kpi.glow)}></div>
              
              <div className="relative z-10 flex justify-between items-start mb-8">
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br shadow-lg",
                  kpi.color
                )}>
                  <kpi.icon className="w-6 h-6 text-white" />
                </div>
                <div className={cn("text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-white/5", kpi.trendColor)}>
                  {kpi.trend}
                </div>
              </div>

              <div className="relative z-10">
                <h3 className="text-4xl font-black text-white tracking-tighter mb-1">{kpi.value}</h3>
                <p className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-1">{kpi.title}</p>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{kpi.subtext}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Charts & Activity Area (Mock Visuals) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Chart Card */}
          <div className="lg:col-span-2 glass-dark rounded-[2.5rem] p-8 border border-white/5 relative overflow-hidden group">
             <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>
             
             <div className="flex justify-between items-center mb-8 relative z-10">
               <div>
                 <h3 className="text-xl font-black text-white uppercase italic tracking-tighter">Productividad Semanal</h3>
                 <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Horas registradas vs Estimado</p>
               </div>
               <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                 <LineChart className="w-5 h-5 text-indigo-400" />
               </div>
             </div>

             {/* Mock Chart Visualization */}
             <div className="h-64 flex items-end justify-between gap-2 relative z-10 px-4">
                {[40, 65, 45, 80, 55, 90, 75].map((height, i) => (
                  <div key={i} className="relative w-full group/bar">
                    <div className="absolute bottom-full mb-2 w-full text-center opacity-0 group-hover/bar:opacity-100 transition-opacity">
                      <span className="text-[10px] font-black text-indigo-400">{height}%</span>
                    </div>
                    <div 
                      className="w-full bg-gradient-to-t from-indigo-600/20 to-indigo-500/40 rounded-t-lg border-t border-indigo-400/50 hover:from-indigo-500 hover:to-blue-400 transition-all duration-300"
                      style={{ height: `${height}%` }}
                    ></div>
                  </div>
                ))}
             </div>
             
             <div className="flex justify-between text-[10px] font-black text-slate-600 uppercase tracking-widest mt-4 px-4 relative z-10">
               <span>Lunes</span>
               <span>Martes</span>
               <span>Miércoles</span>
               <span>Jueves</span>
               <span>Viernes</span>
               <span>Sábado</span>
               <span>Domingo</span>
             </div>
          </div>

          {/* Activity Feed */}
          <div className="glass-dark rounded-[2.5rem] p-8 border border-white/5 relative flex flex-col">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-xl font-black text-white uppercase italic tracking-tighter">Eventos Recientes</h3>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Últimas 24 Horas</p>
              </div>
            </div>

            <div className="flex-1 space-y-6">
              {[
                { icon: CheckCircle2, text: "Nómina semanal autorizada", time: "Hace 2 min", color: "text-emerald-400" },
                { icon: Users, text: "2 nuevos empleados registrados", time: "Hace 1 hora", color: "text-blue-400" },
                { icon: AlertCircle, text: "Falta de asistencia reportada", time: "Hace 3 horas", color: "text-red-400" },
                { icon: Clock, text: "Ajuste de horarios en Proyecto B", time: "Ayer", color: "text-amber-400" },
              ].map((ev, i) => (
                <div key={i} className="flex gap-4 items-start group">
                  <div className="mt-1">
                    <ev.icon className={cn("w-4 h-4", ev.color)} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-300 group-hover:text-white transition-colors">{ev.text}</p>
                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{ev.time}</p>
                  </div>
                </div>
              ))}
            </div>

            <button className="w-full mt-6 py-3 rounded-xl border border-white/10 text-xs font-black text-slate-400 uppercase tracking-widest hover:bg-white hover:text-black transition-colors">
              Ver Historial Completo
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
