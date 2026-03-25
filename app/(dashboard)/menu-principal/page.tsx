'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  Activity, 
  Users, 
  Shield, 
  Files, 
  FileText, 
  Clock, 
  TrendingUp, 
  ChevronRight,
  HardHat,
  Construction,
  Hammer,
  Zap,
  Camera,
  DollarSign
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { useI18n } from '@/lib/i18n'
import { supabase } from '@/utils/supabase/client'

export default function MenuPrincipalPage() {
  const { t } = useI18n()
  const [isHR, setIsHR] = useState(false)
  const [userName, setUserName] = useState('')

  useEffect(() => {
    checkContext()
  }, [])

  async function checkContext() {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
        if (typeof window !== 'undefined' && localStorage.getItem('adminBypass') === 'true') {
            setUserName('Administrator')
            setIsHR(true)
        }
        return
    }

    const { data: profile } = await supabase
      .from('perfiles')
      .select('nombre_completo, rol')
      .eq('id', user.id)
      .single()

    const email = user.email?.toLowerCase() || ''
    const nameFromMetadata = user.user_metadata?.nombre_completo || user.user_metadata?.full_name || email.split('@')[0] || 'User'
    const roleFromMetadata = user.user_metadata?.rol || ''
    const adminRoles = ['admin', 'administrador', 'superadmin', 'hr', 'administrativo', 'recursos humanos', 'gerente', 'jefe']

    if (profile) {
      setUserName(profile.nombre_completo?.split(' ')[0] || nameFromMetadata.split(' ')[0])
      const r = (profile.rol || roleFromMetadata).toLowerCase()
      setIsHR(adminRoles.includes(r) || email === 'kitus1000@gmail.com' || email === 'jesus12398@gmail.com' || email.includes('admin'))
    } else {
      setUserName(nameFromMetadata.split(' ')[0])
      const r = roleFromMetadata.toLowerCase()
      setIsHR(adminRoles.includes(r) || email === 'kitus1000@gmail.com' || email === 'jesus12398@gmail.com' || email.includes('admin'))
    }
  }

  const actions = [
    { 
      name: t('menu_my_work_today'), 
      href: '/mi-trabajo', 
      icon: Activity, 
      desc: 'Clock-in, activities & weekly status.',
      color: 'from-emerald-500 to-teal-600',
      shadow: 'shadow-emerald-500/20',
      show: true
    },
    { 
      name: 'Mis Actividades', 
      href: '/mi-trabajo?tab=actividades', 
      icon: FileText, 
      desc: 'Ver, editar o borrar registros del día.',
      color: 'from-violet-500 to-purple-600',
      shadow: 'shadow-violet-500/20',
      show: true
    },
    ...(isHR ? [
      { 
        name: t('menu_employees'), 
        href: '/empleados', 
        icon: Users, 
        desc: 'Manage global workforce & profiles.',
        color: 'from-blue-500 to-indigo-600',
        shadow: 'shadow-blue-500/20',
        show: true
      },
      { 
        name: t('menu_authorizations'), 
        href: '/autorizaciones/jornadas', 
        icon: Shield, 
        desc: 'Review and approve session assets.',
        color: 'from-orange-500 to-red-600',
        shadow: 'shadow-orange-500/20',
        show: true
      },
      { 
        name: t('menu_payroll'), 
        href: '/prenomina/resumen', 
        icon: Files, 
        desc: 'Intelligence summary and earnings flow.',
        color: 'from-indigo-500 to-purple-600',
        shadow: 'shadow-indigo-500/20',
        show: true
      },
      { 
        name: t('menu_receipts'), 
        href: '/prenomina/recibos', 
        icon: FileText, 
        desc: 'Access payment receipts and tax docs.',
        color: 'from-cyan-500 to-blue-600',
        shadow: 'shadow-cyan-500/20',
        show: true
      },
      { 
        name: t('menu_attendance'), 
        href: '/asistencia/dashboard', 
        icon: Clock, 
        desc: 'Real-time monitoring of all sites.',
        color: 'from-amber-500 to-orange-600',
        shadow: 'shadow-amber-500/20',
        show: true
      },
      { 
        name: t('menu_payment_rules') || 'Reglas de Pago', 
        href: '/configuracion/reglas-pago', 
        icon: DollarSign, 
        desc: 'Manage salaries, hourly rates and tabulators.',
        color: 'from-emerald-500 to-teal-600',
        shadow: 'shadow-emerald-500/20',
        show: isHR
      },
      { 
        name: `${t('gallery')} ${t('evidences')}`, 
        href: '/evidencias', 
        icon: Camera, 
        desc: t('visual_monitoring') || 'Revisión visual de capturas de trabajo.',
        color: 'from-pink-500 to-rose-600',
        shadow: 'shadow-pink-500/20',
        show: true
      }
    ] : [])
  ]

  return (
    <div className="relative min-h-[calc(100vh-4rem)] p-8 overflow-hidden page-transition">
      {/* Background Grid */}
      <div className="absolute inset-0 construction-grid opacity-30 pointer-events-none"></div>
      
      {/* Decorative Assets */}
      <div className="absolute top-20 right-20 w-96 h-96 bg-indigo-600/10 blur-[100px] rounded-full"></div>
      <div className="absolute bottom-20 left-20 w-96 h-96 bg-emerald-600/10 blur-[100px] rounded-full"></div>

      <div className="relative z-10 max-w-7xl mx-auto space-y-12">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/5 pb-12">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
               <span className="px-3 py-1 bg-indigo-500/10 text-indigo-400 text-[10px] font-black uppercase tracking-[0.3em] rounded-full border border-indigo-500/20">System Online</span>
               <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            </div>
            <h1 className="text-6xl font-black text-white tracking-tighter italic uppercase leading-tight">
              Welcome, <span className="text-indigo-400">{userName}</span>
            </h1>
            <p className="text-slate-500 text-sm font-bold uppercase tracking-[0.4em] max-w-lg leading-relaxed">
              Main Access Point <br />
              <span className="text-slate-600">Select an intelligence module</span>
            </p>
          </div>
        </header>

        {/* Floating Icons Actions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {actions.map((action, idx) => (
            <Link 
              key={action.href} 
              href={action.href}
              className={cn(
                "group relative float-btn glass-dark p-8 rounded-[2.5rem] border border-white/5 flex flex-col justify-between min-h-[280px] overflow-hidden animate-in fade-in slide-in-from-bottom-8",
                action.shadow
              )}
              style={{ animationDelay: `${idx * 100}ms` }}
            >
              {/* Card Decoration */}
              <div className={cn(
                "absolute -top-12 -right-12 w-32 h-32 blur-[40px] opacity-20 group-hover:opacity-40 transition-opacity rounded-full bg-gradient-to-br",
                action.color
              )}></div>
              
              <div className="relative z-10">
                <div className={cn(
                  "w-16 h-16 rounded-2xl flex items-center justify-center mb-8 border border-white/10 shadow-2xl transition-transform group-hover:scale-110 group-hover:-rotate-6 bg-gradient-to-br",
                  action.color
                )}>
                  <action.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-black text-white tracking-tight uppercase italic mb-3">
                  {action.name}
                </h3>
                <p className="text-slate-500 text-xs font-bold leading-relaxed max-w-[200px] uppercase tracking-widest opacity-60 group-hover:opacity-100 transition-opacity">
                  {action.desc}
                </p>
              </div>

              <div className="relative z-10 flex items-center justify-between mt-8 pt-6 border-t border-white/5">
                <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] group-hover:translate-x-2 transition-transform">Access Terminal</span>
                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white group-hover:text-slate-950 transition-all duration-500 -rotate-45 group-hover:rotate-0">
                  <ChevronRight className="w-5 h-5" />
                </div>
              </div>

              {/* Scanline Effect on Hover */}
              <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-10 transition-opacity">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white to-transparent h-[100px] animate-[futuristic-scan_2s_infinite]"></div>
              </div>
            </Link>
          ))}
          
          {/* Decorative Card */}
          <div className="glass-dark p-8 rounded-[2.5rem] border border-white/5 flex flex-col justify-center items-center text-center space-y-6 relative overflow-hidden group">
             <div className="absolute inset-0 bg-indigo-600/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
             <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center border border-slate-700 animate-pulse">
                <HardHat className="w-10 h-10 text-slate-500" />
             </div>
             <div>
                <h3 className="text-lg font-black text-white uppercase italic tracking-tighter">Construction PRO</h3>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mt-2">Next Gen Site Management</p>
             </div>
          </div>
        </div>
      </div>
    </div>
  )
}
