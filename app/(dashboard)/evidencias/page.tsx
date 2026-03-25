'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/utils/supabase/client'
import { useI18n } from '@/lib/i18n'
import { 
  Camera, 
  Search, 
  Calendar, 
  User, 
  FileText, 
  ExternalLink,
  ChevronLeft,
  RefreshCw,
  Image as ImageIcon,
  Clock,
  FolderOpen
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { format } from 'date-fns'

export default function EvidenceGalleryPage() {
  const { t } = useI18n()
  const [loading, setLoading] = useState(true)
  const [evidencias, setEvidencias] = useState<any[]>([])
  
  // By default filter by today
  const [filterDate, setFilterDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null)

  useEffect(() => {
    fetchEvidencias()
  }, [])

  async function fetchEvidencias() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('workday_activities')
        .select(`
          *,
          empleado:empleados!inner (
            id_empleado,
            nombre,
            apellido_paterno
          )
        `)
        .neq('storage_url', null)
        .order('created_at', { ascending: false })

      if (error) throw error
      setEvidencias(data || [])
    } catch (e) {
      console.error('Error fetching evidences:', e)
    } finally {
      setLoading(false)
    }
  }

  const dateFiltered = evidencias.filter(ev => ev.date === filterDate)

  // Group by Employee
  const groupedByEmployee = dateFiltered.reduce((acc, ev) => {
    const empId = ev.empleado.id_empleado
    if (!acc[empId]) {
      acc[empId] = {
        empleado: ev.empleado,
        fotos: []
      }
    }
    acc[empId].fotos.push(ev)
    return acc
  }, {} as Record<string, { empleado: any, fotos: any[] }>)

  const employeesList = Object.values(groupedByEmployee)
  const activeEmployeeData = selectedEmployeeId ? groupedByEmployee[selectedEmployeeId] : null

  return (
    <div className="relative min-h-[calc(100vh-4rem)] p-8 overflow-hidden page-transition">
      <div className="absolute inset-0 construction-grid opacity-20 pointer-events-none"></div>
      
      <div className="relative z-10 max-w-7xl mx-auto space-y-10">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-indigo-500/20 pb-8">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
               <span className="px-3 py-1 bg-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase tracking-[0.3em] rounded-full border border-indigo-500/30">Visual Intelligence</span>
               <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            </div>
            
            {activeEmployeeData ? (
               <div className="flex items-center gap-4">
                 <button 
                   onClick={() => setSelectedEmployeeId(null)}
                   className="p-3 bg-white/5 hover:bg-white/10 rounded-full border border-white/10 transition-colors"
                 >
                   <ChevronLeft className="w-6 h-6 text-white" />
                 </button>
                 <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter italic uppercase leading-tight">
                   Archivos de <span className="text-indigo-400">{activeEmployeeData.empleado.nombre}</span>
                 </h1>
               </div>
            ) : (
               <h1 className="text-5xl font-black text-white tracking-tighter italic uppercase leading-tight">
                 {t('gallery')} <span className="text-indigo-400">{t('evidences')}</span>
               </h1>
            )}
            
            <p className="text-slate-500 text-xs font-bold uppercase tracking-[0.4em] max-w-lg leading-relaxed">
              {t('visual_monitoring')} <br />
              <span className="text-slate-600">{t('photo_records')}</span>
            </p>
          </div>

          <div className="flex gap-4">
            <button 
              onClick={fetchEvidencias}
              className="p-4 glass-dark border border-white/5 rounded-2xl text-indigo-400 hover:text-white hover:bg-indigo-600 transition-all active:scale-95"
            >
              <RefreshCw className={cn("w-5 h-5", loading && "animate-spin")} />
            </button>
          </div>
        </header>

        {/* Level 0: Filters (Only visible when no employee is selected) */}
        {!activeEmployeeData && (
          <div className="flex flex-col md:flex-row gap-6">
            <div className="relative group w-full md:w-96">
              <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5 group-focus-within:text-indigo-400 transition-colors" />
              <input 
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="w-full h-16 glass-dark border border-white/5 rounded-[1.25rem] pl-14 pr-6 text-sm font-bold text-white outline-none focus:border-indigo-500/50 transition-all appearance-none"
              />
            </div>
          </div>
        )}

        {loading ? (
          <div className="h-96 flex flex-col items-center justify-center space-y-4">
            <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
            <p className="text-xs font-black text-indigo-400 uppercase tracking-[0.3em]">Sincronizando Archivos...</p>
          </div>
        ) : !activeEmployeeData ? (
          // ========================
          // LEVEL 1: EMPLOYEE FOLDERS
          // ========================
          employeesList.length === 0 ? (
            <div className="h-96 flex flex-col items-center justify-center text-center space-y-6 glass-dark rounded-[3rem] border border-white/5">
               <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center border border-slate-700">
                  <FolderOpen className="w-10 h-10 text-slate-600" />
               </div>
               <div>
                  <h3 className="text-xl font-black text-white uppercase italic">Sin Subidas Registradas</h3>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-2">Nadie ha subido evidencias en esta fecha</p>
               </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {employeesList.map(item => (
                <button
                  key={item.empleado.id_empleado}
                  onClick={() => setSelectedEmployeeId(item.empleado.id_empleado)}
                  className="group flex flex-col items-center text-center p-8 glass-dark border border-white/5 rounded-[2rem] hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all text-left"
                >
                   <div className="w-20 h-20 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:border-indigo-500 transition-all">
                     <User className="w-8 h-8 text-slate-400 group-hover:text-indigo-400" />
                   </div>
                   <h3 className="text-xl font-black text-white uppercase tracking-tight mb-2">
                     {item.empleado.nombre} {item.empleado.apellido_paterno}
                   </h3>
                   <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/10">
                     <ImageIcon className="w-3 h-3 text-emerald-400" />
                     <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">
                       {item.fotos.length} Archivos
                     </span>
                   </div>
                </button>
              ))}
            </div>
          )
        ) : (
          // ========================
          // LEVEL 2: PHOTOS GRID
          // ========================
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {activeEmployeeData.fotos.map((ev: any, idx: number) => (
              <div 
                key={ev.id}
                className="group relative glass-dark rounded-[2rem] border border-white/5 overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-8 transition-transform hover:-translate-y-2 duration-500"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                {/* Photo Container */}
                <div className="relative aspect-square overflow-hidden bg-slate-900 border-b border-white/5">
                  <img 
                    src={ev.storage_url} 
                    alt={ev.activity_description}
                    className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-100 transition-opacity"></div>
                  
                  {/* Time Badge */}
                  <div className="absolute top-4 left-4 px-3 py-1.5 bg-black/70 backdrop-blur-md rounded-full border border-white/10 flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-[10px] font-black text-white uppercase tracking-widest leading-none pt-0.5">
                      {ev.created_at ? format(new Date(ev.created_at), 'HH:mm:ss') : 'N/A'}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4 flex-1 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Contexto / Actividad:</p>
                      <p className="text-sm font-bold text-slate-200 line-clamp-3 leading-relaxed">
                        {ev.activity_description || ev.description || 'Sin descripción'}
                      </p>
                    </div>
                  </div>

                  <a 
                    href={ev.storage_url} 
                    target="_blank" 
                    rel="noreferrer"
                    className="w-full py-4 rounded-xl border border-white/5 bg-white/5 flex items-center justify-center gap-2 text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-xl mt-4"
                  >
                    Ver Resolución Completa <ExternalLink className="w-4 h-4 ml-1" />
                  </a>
                </div>

                {/* Cyberpunk Accents */}
                <div className="absolute top-0 right-0 w-8 h-8 pointer-events-none">
                  <div className="absolute top-0 right-0 w-[2px] h-4 bg-indigo-500/30"></div>
                  <div className="absolute top-0 right-0 w-4 h-[2px] bg-indigo-500/30"></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
