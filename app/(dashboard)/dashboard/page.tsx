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
  Activity, 
  AlertCircle, 
  Camera, 
  Award,
  Sparkles,
  Play,
  Coffee,
  LogOut,
  Calendar,
  UserX,
  Flame,
  ShieldCheck,
  RefreshCw,
  Search
} from 'lucide-react'
import { cn } from '@/utils/cn'

export default function KPIDashboardPage() {
  const router = useRouter()
  const { t } = useI18n()
  const [userName, setUserName] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [searchQuery, setSearchQuery] = useState('')

  // Metrics State
  const [stats, setStats] = useState({
    totalEmpleados: 0,
    enJornada: 0,
    enComida: 0,
    conSalida: 0,
    permisos: 0,
    inactivos: 0
  })

  // Detailed Datasets
  const [workerSteppers, setWorkerSteppers] = useState<any[]>([])
  const [photoRanking, setPhotoRanking] = useState<any[]>([])
  const [punctualityRanking, setPunctualityRanking] = useState<any[]>([])
  const [inactiveWorkers, setInactiveWorkers] = useState<any[]>([])

  useEffect(() => {
    fetchDashboardData()

    // Realtime subscriptions for live operational updates
    const ch1 = supabase.channel('dashboard-events').on('postgres_changes', { event: '*', schema: 'public', table: 'workday_events' }, () => fetchDashboardData()).subscribe()
    const ch2 = supabase.channel('dashboard-activities').on('postgres_changes', { event: '*', schema: 'public', table: 'workday_activities' }, () => fetchDashboardData()).subscribe()
    const ch3 = supabase.channel('dashboard-approvals').on('postgres_changes', { event: '*', schema: 'public', table: 'workday_approval_status' }, () => fetchDashboardData()).subscribe()

    return () => {
      supabase.removeChannel(ch1)
      supabase.removeChannel(ch2)
      supabase.removeChannel(ch3)
    }
  }, [selectedDate])

  async function fetchDashboardData() {
    setLoading(true)

    try {
      // 1. Fetch User Profile
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase.from('perfiles').select('nombre_completo').eq('id', user.id).maybeSingle()
        setUserName(profile?.nombre_completo?.split(' ')[0] || user.email?.split('@')[0] || 'Administrador')
      }

      // 2. Fetch Active Employees
      const { data: employees } = await supabase
        .from('empleados')
        .select('id_empleado, numero_empleado, nombre, apellido_paterno, apellido_materno, estado_empleado, creado_en')
        .eq('estado_empleado', 'Activo')
        .order('nombre', { ascending: true })

      const empList = employees || []

      // 3. Fetch Today's Workday Events
      const { data: eventsToday } = await supabase
        .from('workday_events')
        .select('*')
        .eq('date', selectedDate)

      // 4. Fetch Today's Permissions / Approvals
      const { data: approvalsToday } = await supabase
        .from('workday_approval_status')
        .select('*')
        .eq('date', selectedDate)

      // 5. Fetch Photo Evidence Activities (All time & today)
      const { data: photoActs } = await supabase
        .from('workday_activities')
        .select('employee_id, date, storage_url')
        .not('storage_url', 'is', null)

      // 6. Fetch All Historic Events to detect Last Activity / Inactivity
      const { data: historicEvents } = await supabase
        .from('workday_events')
        .select('employee_id, date, event_time')
        .order('event_time', { ascending: false })

      // Map Last Activity per Employee
      const lastActivityMap: Record<string, { lastDate: string; lastIso: string }> = {}
      historicEvents?.forEach(ev => {
        if (!lastActivityMap[ev.employee_id]) {
          lastActivityMap[ev.employee_id] = {
            lastDate: ev.date,
            lastIso: ev.event_time
          }
        }
      })

      // BUILD WORKER STEPPERS (Entrada, Comida, Salida, Permiso per worker)
      let countEnJornada = 0
      let countEnComida = 0
      let countConSalida = 0
      let countPermisos = 0

      const steppers = empList.map(emp => {
        const empEvs = eventsToday?.filter(e => e.employee_id === emp.id_empleado) || []
        const empApproval = approvalsToday?.find(a => a.employee_id === emp.id_empleado)
        
        const entradaEv = empEvs.find(e => e.event_type === 'ENTRADA')
        const salidaComerEv = empEvs.find(e => e.event_type === 'SALIDA_COMER')
        const regresoComerEv = empEvs.find(e => e.event_type === 'REGRESO_COMER')
        const salidaEv = empEvs.find(e => e.event_type === 'SALIDA')
        
        const isPermiso = empApproval?.comments?.includes('PERMISO') || empEvs.some(e => e.event_type?.startsWith('PERMISO_'))

        if (isPermiso) countPermisos++
        else if (salidaEv) countConSalida++
        else if (salidaComerEv && !regresoComerEv) countEnComida++
        else if (entradaEv) countEnJornada++

        return {
          employee: emp,
          entradaEv,
          salidaComerEv,
          regresoComerEv,
          salidaEv,
          isPermiso,
          permisoTipo: empApproval?.comments?.includes('Con Sueldo') ? 'CON_SUELDO' : 'SIN_SUELDO',
          motivoPermiso: empApproval?.comments || 'Permiso Autorizado'
        }
      })

      setWorkerSteppers(steppers)

      // BUILD PHOTO RANKING ("¿Quién ha mandado más fotos?")
      const photoCountMap: Record<string, number> = {}
      photoActs?.forEach(pa => {
        photoCountMap[pa.employee_id] = (photoCountMap[pa.employee_id] || 0) + 1
      })

      const pRank = empList
        .map(emp => ({
          employee: emp,
          totalPhotos: photoCountMap[emp.id_empleado] || 0
        }))
        .sort((a, b) => b.totalPhotos - a.totalPhotos)

      setPhotoRanking(pRank)

      // BUILD PUNCTUALITY RANKING ("¿Quién cumple más?")
      const punctualityMap: Record<string, { totalOnTime: number; totalEvents: number }> = {}
      historicEvents?.forEach(ev => {
        if (!punctualityMap[ev.employee_id]) punctualityMap[ev.employee_id] = { totalOnTime: 0, totalEvents: 0 }
        punctualityMap[ev.employee_id].totalEvents++
        if (ev.estatus_puntualidad === 'PUNTUAL' || !ev.estatus_puntualidad) {
          punctualityMap[ev.employee_id].totalOnTime++
        }
      })

      const punctRank = empList
        .map(emp => {
          const stats = punctualityMap[emp.id_empleado] || { totalOnTime: 0, totalEvents: 0 }
          const score = stats.totalEvents > 0 ? Math.round((stats.totalOnTime / stats.totalEvents) * 100) : 100
          return {
            employee: emp,
            totalOnTime: stats.totalOnTime,
            totalEvents: stats.totalEvents,
            score
          }
        })
        .sort((a, b) => b.score !== a.score ? b.score - a.score : b.totalOnTime - a.totalOnTime)

      setPunctualityRanking(punctRank)

      // BUILD INACTIVE WORKERS MONITOR ("¿Quién no está entrando y desde cuándo?")
      const now = new Date()
      const inactives = empList
        .map(emp => {
          const lastAct = lastActivityMap[emp.id_empleado]
          let daysInactive = 999
          let lastDateLabel = 'Sin registros'

          if (lastAct?.lastDate) {
            const lastD = new Date(lastAct.lastDate + 'T00:00:00')
            const diffTime = Math.abs(now.getTime() - lastD.getTime())
            daysInactive = Math.floor(diffTime / (1000 * 60 * 60 * 24))
            
            if (daysInactive === 0) lastDateLabel = 'Hoy'
            else if (daysInactive === 1) lastDateLabel = 'Ayer'
            else lastDateLabel = `Hace ${daysInactive} días (${lastAct.lastDate})`
          }

          return {
            employee: emp,
            daysInactive,
            lastDateLabel,
            lastIso: lastAct?.lastIso || null
          }
        })
        .filter(item => item.daysInactive >= 2 || item.lastDateLabel === 'Sin registros') // 2+ days inactive
        .sort((a, b) => b.daysInactive - a.daysInactive)

      setInactiveWorkers(inactives)

      // Overall stats
      setStats({
        totalEmpleados: empList.length,
        enJornada: countEnJornada,
        enComida: countEnComida,
        conSalida: countConSalida,
        permisos: countPermisos,
        inactivos: inactives.length
      })

    } catch (err) {
      console.error('Error fetching dashboard data:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatHora = (isoStr?: string) => {
    if (!isoStr) return null
    try {
      return new Date(isoStr).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true })
    } catch (e) {
      return null
    }
  }

  const filteredSteppers = workerSteppers.filter(ws => {
    const fullName = `${ws.employee.nombre} ${ws.employee.apellido_paterno} ${ws.employee.numero_empleado}`.toLowerCase()
    return fullName.includes(searchQuery.toLowerCase())
  })

  return (
    <div className="max-w-7xl mx-auto space-y-8 page-transition pb-20 p-4 md:p-8">
      
      {/* Header Panel */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-[var(--border-color)] pb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="px-3 py-1 bg-indigo-500/10 text-indigo-400 text-[10px] font-black uppercase tracking-[0.2em] rounded-full border border-indigo-500/20 flex items-center gap-1.5 shadow-md">
              <Sparkles className="w-3.5 h-3.5 animate-pulse text-amber-300" /> Control Ejecutivo En Vivo
            </span>
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-[var(--text-main)] tracking-tight">
            Tablero de <span className="text-indigo-400">Asistencia & Operaciones</span>
          </h1>
          <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mt-1">
            Monitoreo en Tiempo Real de Entradas, Comidas, Salidas, Evidencias y Cumplimiento
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 glass px-3 py-2 rounded-2xl border border-[var(--border-color)] shadow-md">
            <Calendar className="w-4 h-4 text-indigo-400" />
            <input
              type="date"
              className="bg-transparent border-none p-0 text-xs font-bold text-[var(--text-main)] focus:ring-0 outline-none"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>

          <button
            onClick={fetchDashboardData}
            className="p-2.5 glass hover:border-indigo-500/40 rounded-2xl text-[var(--text-main)] transition-all active:scale-95 shadow-md"
            title="Actualizar Datos"
          >
            <RefreshCw className={loading ? "animate-spin w-4.5 h-4.5 text-indigo-400" : "w-4.5 h-4.5 text-indigo-400"} />
          </button>
        </div>
      </header>

      {/* Top Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        
        <div className="glass-card p-4 rounded-3xl border border-[var(--border-color)] shadow-xl relative overflow-hidden">
          <p className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-wider">Total Personal</p>
          <p className="text-3xl font-black text-[var(--text-main)] mt-1">{stats.totalEmpleados}</p>
          <div className="absolute top-4 right-4 w-9 h-9 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-card p-4 rounded-3xl border border-emerald-500/30 bg-emerald-500/10 shadow-xl relative overflow-hidden">
          <p className="text-[10px] font-black uppercase text-emerald-400 tracking-wider">En Jornada (Entraron)</p>
          <p className="text-3xl font-black text-emerald-400 mt-1">{stats.enJornada}</p>
          <div className="absolute top-4 right-4 w-9 h-9 rounded-2xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center">
            <Play className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-card p-4 rounded-3xl border border-amber-500/30 bg-amber-500/10 shadow-xl relative overflow-hidden">
          <p className="text-[10px] font-black uppercase text-amber-400 tracking-wider">En Comida / Pausa</p>
          <p className="text-3xl font-black text-amber-400 mt-1">{stats.enComida}</p>
          <div className="absolute top-4 right-4 w-9 h-9 rounded-2xl bg-amber-500/20 text-amber-300 flex items-center justify-center">
            <Coffee className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-card p-4 rounded-3xl border border-blue-500/30 bg-blue-500/10 shadow-xl relative overflow-hidden">
          <p className="text-[10px] font-black uppercase text-blue-400 tracking-wider">Jornada Finalizada</p>
          <p className="text-3xl font-black text-blue-400 mt-1">{stats.conSalida}</p>
          <div className="absolute top-4 right-4 w-9 h-9 rounded-2xl bg-blue-500/20 text-blue-300 flex items-center justify-center">
            <LogOut className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-card p-4 rounded-3xl border border-purple-500/30 bg-purple-500/10 shadow-xl relative overflow-hidden">
          <p className="text-[10px] font-black uppercase text-purple-400 tracking-wider">Permisos Autorizados</p>
          <p className="text-3xl font-black text-purple-400 mt-1">{stats.permisos}</p>
          <div className="absolute top-4 right-4 w-9 h-9 rounded-2xl bg-purple-500/20 text-purple-300 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-card p-4 rounded-3xl border border-red-500/30 bg-red-500/10 shadow-xl relative overflow-hidden">
          <p className="text-[10px] font-black uppercase text-red-400 tracking-wider">Sin Entrar (Alerta)</p>
          <p className="text-3xl font-black text-red-400 mt-1">{stats.inactivos}</p>
          <div className="absolute top-4 right-4 w-9 h-9 rounded-2xl bg-red-500/20 text-red-300 flex items-center justify-center">
            <UserX className="w-5 h-5" />
          </div>
        </div>

      </div>

      {/* SECCIÓN 1: MONITOR VIVO DE JORNADA PASO A PASO POR TRABAJADOR */}
      <div className="glass-card rounded-3xl border border-[var(--border-color)] overflow-hidden shadow-2xl space-y-4">
        
        <div className="p-5 border-b border-[var(--border-color)] flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/2">
          <div>
            <h3 className="text-base font-black text-[var(--text-main)] uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-5 h-5 text-indigo-400" />
              <span>Estado en Vivo de Jornada por Trabajador (Paso a Paso)</span>
            </h3>
            <p className="text-xs font-semibold text-[var(--text-muted)] mt-0.5">
              Quién puso Entrada, quién salió a comida y quién registró su Salida Final hoy
            </p>
          </div>

          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Buscar por nombre o #..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs font-bold rounded-2xl input-executive"
            />
          </div>
        </div>

        <div className="overflow-x-auto p-2">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[var(--border-color)] text-[10px] font-black text-[var(--text-muted)] uppercase tracking-wider">
                <th className="p-4">Trabajador</th>
                <th className="p-4">🚀 Entrada</th>
                <th className="p-4">🥪 Comida</th>
                <th className="p-4">🏁 Salida Final</th>
                <th className="p-4 text-right">Estatus Actual</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)] text-xs font-semibold">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-[var(--text-muted)] font-black uppercase tracking-widest animate-pulse">
                    Cargando estatus de jornada en tiempo real...
                  </td>
                </tr>
              ) : filteredSteppers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-[var(--text-muted)] font-bold">
                    No se encontraron trabajadores.
                  </td>
                </tr>
              ) : (
                filteredSteppers.map(ws => {
                  const entradaHora = formatHora(ws.entradaEv?.event_time)
                  const salidaComerHora = formatHora(ws.salidaComerEv?.event_time)
                  const regresoComerHora = formatHora(ws.regresoComerEv?.event_time)
                  const salidaHora = formatHora(ws.salidaEv?.event_time)

                  return (
                    <tr key={ws.employee.id_empleado} className="hover:bg-indigo-500/5 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-black text-xs flex items-center justify-center shadow-md">
                            {ws.employee.nombre?.charAt(0)}
                          </div>
                          <div>
                            <p className="font-black text-[var(--text-main)]">
                              {ws.employee.nombre} {ws.employee.apellido_paterno}
                            </p>
                            <p className="text-[10px] font-bold text-indigo-400">#{ws.employee.numero_empleado}</p>
                          </div>
                        </div>
                      </td>

                      {/* Paso 1: Entrada */}
                      <td className="p-4">
                        {ws.isPermiso ? (
                          <span className="text-[11px] font-bold text-indigo-400">🏖️ Permiso</span>
                        ) : entradaHora ? (
                          <span className="px-3 py-1 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-black text-xs">
                            ✅ {entradaHora}
                          </span>
                        ) : (
                          <span className="text-[11px] font-semibold text-[var(--text-muted)]">⏳ Pendiente</span>
                        )}
                      </td>

                      {/* Paso 2: Comida */}
                      <td className="p-4">
                        {ws.isPermiso ? (
                          <span className="text-[11px] font-bold text-indigo-400">🏖️ Permiso</span>
                        ) : salidaComerHora && regresoComerHora ? (
                          <span className="px-3 py-1 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-black text-xs">
                            🥗 Completada ({regresoComerHora})
                          </span>
                        ) : salidaComerHora ? (
                          <span className="px-3 py-1 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30 font-black text-xs animate-pulse">
                            🥪 En Comida ({salidaComerHora})
                          </span>
                        ) : (
                          <span className="text-[11px] font-semibold text-[var(--text-muted)]">⏳ Pendiente</span>
                        )}
                      </td>

                      {/* Paso 3: Salida Final */}
                      <td className="p-4">
                        {ws.isPermiso ? (
                          <span className="text-[11px] font-bold text-indigo-400">🏖️ Permiso</span>
                        ) : salidaHora ? (
                          <span className="px-3 py-1 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/30 font-black text-xs">
                            🏁 {salidaHora}
                          </span>
                        ) : (
                          <span className="text-[11px] font-semibold text-[var(--text-muted)]">⏳ En Curso</span>
                        )}
                      </td>

                      {/* Estatus Global */}
                      <td className="p-4 text-right">
                        {ws.isPermiso ? (
                          <span className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 font-black text-[10px] uppercase border border-purple-500/40">
                            {ws.permisoTipo === 'CON_SUELDO' ? '🟢 Permiso Con Sueldo' : '🔵 Permiso Sin Sueldo'}
                          </span>
                        ) : ws.salidaEv ? (
                          <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 font-black text-[10px] uppercase border border-blue-500/40">
                            🏁 Jornada Concluida
                          </span>
                        ) : ws.salidaComerEv && !ws.regresoComerEv ? (
                          <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 font-black text-[10px] uppercase border border-amber-500/40">
                            🥪 Comiendo
                          </span>
                        ) : ws.entradaEv ? (
                          <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-black text-[10px] uppercase border border-emerald-500/40">
                            🟢 Trabajando
                          </span>
                        ) : (
                          <span className="px-3 py-1 rounded-full bg-slate-500/20 text-[var(--text-muted)] font-black text-[10px] uppercase border border-[var(--border-color)]">
                            ⏳ Sin Marcaje Hoy
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECCIÓN 2 & 3: RANKINGS DE FOTOS Y CUMPLIMIENTO / PUNTUALIDAD */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* ¿Quién ha mandado más fotos? */}
        <div className="glass-card rounded-3xl p-6 border border-[var(--border-color)] shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
            <div>
              <h3 className="text-sm font-black text-[var(--text-main)] uppercase tracking-wider flex items-center gap-2">
                <Camera className="w-4.5 h-4.5 text-pink-400" />
                <span>Leaderboard de Fotos & Evidencias</span>
              </h3>
              <p className="text-[11px] font-semibold text-[var(--text-muted)] mt-0.5">
                Top trabajadores que han subido más evidencias fotográficas de obra
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-pink-500/10 text-pink-400 font-black text-[10px] uppercase border border-pink-500/20">
              📸 Evidencias
            </span>
          </div>

          <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
            {photoRanking.slice(0, 7).map((item, index) => (
              <div key={item.employee.id_empleado} className="p-3 rounded-2xl glass hover:border-pink-500/30 transition-all flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-8 h-8 rounded-xl font-black text-xs flex items-center justify-center shadow-md",
                    index === 0 ? "bg-amber-500 text-slate-950 font-black" :
                    index === 1 ? "bg-slate-300 text-slate-900 font-black" :
                    index === 2 ? "bg-amber-700 text-white font-black" :
                    "bg-indigo-600/20 text-indigo-400"
                  )}>
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                  </div>
                  <div>
                    <p className="text-xs font-black text-[var(--text-main)]">
                      {item.employee.nombre} {item.employee.apellido_paterno}
                    </p>
                    <p className="text-[10px] text-[var(--text-muted)] font-bold">#{item.employee.numero_empleado}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-pink-400 bg-pink-500/10 px-3 py-1 rounded-full border border-pink-500/20">
                    📸 {item.totalPhotos} Fotos
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ¿Quién cumple más? (Cumplimiento & Puntualidad) */}
        <div className="glass-card rounded-3xl p-6 border border-[var(--border-color)] shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
            <div>
              <h3 className="text-sm font-black text-[var(--text-main)] uppercase tracking-wider flex items-center gap-2">
                <Award className="w-4.5 h-4.5 text-amber-400" />
                <span>Cuadro de Honor (Cumplimiento & Puntualidad)</span>
              </h3>
              <p className="text-[11px] font-semibold text-[var(--text-muted)] mt-0.5">
                Trabajadores con mayor tasa de puntualidad y asistencia constante
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 font-black text-[10px] uppercase border border-amber-500/20">
              🏆 Top Cumplimiento
            </span>
          </div>

          <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
            {punctualityRanking.slice(0, 7).map((item, index) => (
              <div key={item.employee.id_empleado} className="p-3 rounded-2xl glass hover:border-amber-500/30 transition-all flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-300 font-black text-xs flex items-center justify-center border border-amber-500/30">
                    {index === 0 ? '👑' : `#${index + 1}`}
                  </div>
                  <div>
                    <p className="text-xs font-black text-[var(--text-main)]">
                      {item.employee.nombre} {item.employee.apellido_paterno}
                    </p>
                    <p className="text-[10px] text-[var(--text-muted)] font-bold">#{item.employee.numero_empleado}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                    ⭐ {item.score}% Puntual
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* SECCIÓN 4: MONITOR DE TRABAJADORES INACTIVOS ("¿Quién no entra a la app y desde cuándo?") */}
      <div className="glass-card rounded-3xl p-6 border border-red-500/30 bg-red-500/5 shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-red-500/20 pb-4">
          <div>
            <h3 className="text-base font-black text-red-400 uppercase tracking-wider flex items-center gap-2">
              <UserX className="w-5 h-5 text-red-400" />
              <span>Alerta de Inactividad (Trabajadores que No están entrando a la App)</span>
            </h3>
            <p className="text-xs font-semibold text-[var(--text-muted)] mt-0.5">
              Personal sin marcajes de checada o eventos registrados en los últimos días
            </p>
          </div>
          <span className="px-3 py-1 rounded-full bg-red-500/20 text-red-300 font-black text-xs uppercase border border-red-500/40">
            ⚠️ {inactiveWorkers.length} Inactivos Detectados
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {inactiveWorkers.length === 0 ? (
            <div className="col-span-full py-8 text-center text-emerald-400 font-black uppercase text-xs">
              🎉 ¡Excelente! Todo el personal activo ha registrado actividad recientemente en la aplicación.
            </div>
          ) : (
            inactiveWorkers.map(item => (
              <div key={item.employee.id_empleado} className="p-4 rounded-2xl glass border border-red-500/30 flex items-center justify-between hover:bg-red-500/10 transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-red-500/20 text-red-400 font-black text-xs flex items-center justify-center border border-red-500/30">
                    <UserX className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-[var(--text-main)]">
                      {item.employee.nombre} {item.employee.apellido_paterno}
                    </p>
                    <p className="text-[10px] text-red-400 font-bold">#{item.employee.numero_empleado}</p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-black text-red-400 bg-red-500/20 px-2.5 py-1 rounded-full border border-red-500/40 block">
                    {item.lastDateLabel}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  )
}
