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
  ChevronRight,
  HardHat,
  Camera,
  DollarSign,
  Sparkles,
  LayoutDashboard,
  Wallet,
  PieChart,
  Settings
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
            setUserName('Administrador')
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
      desc: t('desc_my_work'),
      color: 'from-emerald-500 to-teal-600',
      badge: 'Operativo',
      show: true
    },
    { 
      name: t('menu_my_activities'), 
      href: '/mi-trabajo?tab=actividades', 
      icon: FileText, 
      desc: t('desc_my_activities'),
      color: 'from-violet-500 to-purple-600',
      badge: 'Bitácora',
      show: true
    },
    {
      name: t('menu_dashboard'),
      href: '/dashboard',
      icon: LayoutDashboard,
      desc: t('desc_dashboard'),
      color: 'from-indigo-500 to-blue-600',
      badge: 'Analítica',
      show: true
    },
    ...(isHR ? [
      { 
        name: t('menu_employees'), 
        href: '/empleados', 
        icon: Users, 
        desc: t('desc_employees'),
        color: 'from-blue-500 to-indigo-600',
        badge: 'Talento',
        show: true
      },
      { 
        name: t('menu_authorizations'), 
        href: '/autorizaciones/jornadas', 
        icon: Shield, 
        desc: t('desc_authorizations'),
        color: 'from-amber-500 to-orange-600',
        badge: 'Aprobaciones',
        show: true
      },
      { 
        name: t('menu_prepayroll'), 
        href: '/prenomina/resumen', 
        icon: Files, 
        desc: t('desc_prepayroll'),
        color: 'from-indigo-500 to-purple-600',
        badge: 'Nómina',
        show: true
      },
      { 
        name: t('menu_receipts'), 
        href: '/prenomina/recibos', 
        icon: FileText, 
        desc: t('desc_receipts'),
        color: 'from-cyan-500 to-blue-600',
        badge: 'Documentos',
        show: true
      },
      { 
        name: t('menu_attendance'), 
        href: '/asistencia/dashboard', 
        icon: Clock, 
        desc: t('attendance_monitor_subtitle'),
        color: 'from-amber-500 to-orange-600',
        badge: 'Monitoreo',
        show: true
      },
      { 
        name: t('menu_payment_rules'), 
        href: '/configuracion/reglas-pago', 
        icon: DollarSign, 
        desc: t('pay_rules_note'),
        color: 'from-emerald-500 to-teal-600',
        badge: 'Tarifas',
        show: true
      },
      { 
        name: `${t('gallery')} ${t('evidences')}`, 
        href: '/evidencias', 
        icon: Camera, 
        desc: t('photo_records'),
        color: 'from-pink-500 to-rose-600',
        badge: 'Evidencias',
        show: true
      },
      { 
        name: t('menu_registradora'), 
        href: '/finanzas/registradora', 
        icon: Wallet, 
        desc: t('desc_registradora'),
        color: 'from-emerald-600 to-green-700',
        badge: 'Finanzas',
        show: true
      },
      { 
        name: t('menu_business_center'), 
        href: '/finanzas/centro-negocios', 
        icon: PieChart, 
        desc: t('desc_business_center'),
        color: 'from-blue-600 to-indigo-700',
        badge: 'Proyectos',
        show: true
      }
    ] : [])
  ]

  return (
    <div className="relative min-h-[calc(100vh-4rem)] p-4 md:p-8 space-y-8 page-transition">
      
      {/* Executive Welcome Banner */}
      <div className="rounded-3xl glass-card p-6 md:p-10 relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border border-[var(--border-color)]">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="space-y-3 z-10">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 bg-indigo-500/10 text-indigo-400 text-[10px] font-black uppercase tracking-[0.25em] rounded-full border border-indigo-500/20 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 animate-pulse" /> {t('executive_suite')}
            </span>
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span>System Online</span>
            </div>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-[var(--text-main)] tracking-tight">
            {t('executive_welcome')}, <span className="text-indigo-500">{userName || 'Ejecutivo'}</span>
          </h1>

          <p className="text-xs sm:text-sm font-semibold text-[var(--text-muted)] max-w-xl">
            {t('executive_subtitle')}
          </p>
        </div>

        <div className="z-10 flex items-center gap-3">
          <Link
            href="/perfil"
            className="px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-wider transition-all float-btn shadow-lg shadow-indigo-600/20"
          >
            {t('menu_profile')} 👤
          </Link>
        </div>
      </div>

      {/* Grid of Executive Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {actions.map((action, idx) => (
          <Link 
            key={action.href} 
            href={action.href}
            className="group relative float-btn glass-card p-6 md:p-8 rounded-3xl border border-[var(--border-color)] flex flex-col justify-between min-h-[240px] overflow-hidden transition-all hover:border-indigo-500/40"
            style={{ animationDelay: `${idx * 60}ms` }}
          >
            <div className="flex items-start justify-between mb-6">
              <div className={cn(
                "w-14 h-14 rounded-2xl flex items-center justify-center border border-white/20 shadow-xl bg-gradient-to-br transition-transform group-hover:scale-110",
                action.color
              )}>
                <action.icon className="w-7 h-7 text-white" />
              </div>
              <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-500/10 text-[var(--text-muted)] border border-[var(--border-color)]">
                {action.badge}
              </span>
            </div>

            <div className="space-y-2 relative z-10">
              <h3 className="text-xl font-black text-[var(--text-main)] tracking-tight group-hover:text-indigo-400 transition-colors">
                {action.name}
              </h3>
              <p className="text-xs font-semibold text-[var(--text-muted)] line-clamp-2 leading-relaxed">
                {action.desc}
              </p>
            </div>

            <div className="flex items-center justify-between mt-6 pt-4 border-t border-[var(--border-color)] relative z-10">
              <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest group-hover:translate-x-1 transition-transform">
                Acceder →
              </span>
              <div className="w-8 h-8 rounded-full glass flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all">
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          </Link>
        ))}

        {/* Decorative Construction Badge Card */}
        <div className="glass-card p-6 md:p-8 rounded-3xl border border-[var(--border-color)] flex flex-col justify-center items-center text-center space-y-4 relative overflow-hidden">
          <div className="w-16 h-16 bg-indigo-500/10 rounded-2xl flex items-center justify-center border border-indigo-500/20 animate-pulse">
            <HardHat className="w-8 h-8 text-indigo-500" />
          </div>
          <div>
            <h3 className="text-base font-black text-[var(--text-main)] uppercase tracking-tight">Worktrack Suite PRO</h3>
            <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mt-1">
              Optimizado para PC y Celulares v3.0
            </p>
          </div>
        </div>
      </div>

    </div>
  )
}
