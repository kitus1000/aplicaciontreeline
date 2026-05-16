'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { 
    LayoutDashboard, 
    Users, 
    Calendar, 
    Settings, 
    LogOut, 
    ChevronLeft, 
    ChevronRight,
    Activity,
    Clock,
    FileText,
    Files,
    Briefcase,
    Shield,
    Info,
    Menu,
    ChevronDown,
    TrendingUp,
    Camera,
    DollarSign,
    Wallet,
    PieChart
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { useI18n } from '@/lib/i18n'
import { supabase } from '@/utils/supabase/client'

export function Sidebar() {
    const pathname = usePathname()
    const router = useRouter()
    const { t } = useI18n()
    const [isCollapsed, setIsCollapsed] = useState(false)
    const [isHR, setIsHR] = useState(false)
    const [isAdmin, setIsAdmin] = useState(false)
    const [isMounted, setIsMounted] = useState(false)

    useEffect(() => {
        setIsMounted(true)
        const saved = localStorage.getItem('sidebar-collapsed')
        if (saved === 'true') setIsCollapsed(true)
        checkRole()
    }, [])

    const toggleCollapse = () => {
        const newState = !isCollapsed
        setIsCollapsed(newState)
        localStorage.setItem('sidebar-collapsed', newState.toString())
    }

    async function checkRole() {
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
            if (typeof window !== 'undefined' && localStorage.getItem('adminBypass') === 'true') {
                setIsHR(true)
                setIsAdmin(true)
            }
            return
        }

        const { data: profile } = await supabase
            .from('perfiles')
            .select('rol')
            .eq('id', user.id)
            .single()

        const r = (profile?.rol || user.user_metadata?.rol || '').toLowerCase()
        const email = user.email?.toLowerCase() || ''
        const adminRoles = ['admin', 'administrador', 'superadmin', 'hr', 'administrativo', 'recursos humanos', 'gerente', 'jefe']
        
        // Super admin bypass by email if needed, or by role
        const isAdminRole = adminRoles.includes(r) || email === 'kitus1000@gmail.com' || email === 'jesus12398@gmail.com' || email.includes('admin')
        
        setIsHR(isAdminRole)
        setIsAdmin(isAdminRole)
    }

    const handleSignOut = async () => {
        try {
            await supabase.auth.signOut()
            router.push('/')
            router.refresh()
        } catch (error) {
            console.error('Logout error:', error)
            // Force redirect anyway
            window.location.href = '/'
        }
    }

    const menuGroups = [
        {
            title: t('menu_group_main'),
            items: [
                { name: t('menu_main'), href: '/menu-principal', icon: LayoutDashboard, color: 'text-indigo-400' },
                { name: t('menu_dashboard'), href: '/dashboard', icon: TrendingUp, color: 'text-emerald-400' },
            ]
        },
        {
            title: t('menu_group_operations'),
            items: [
                { name: t('menu_my_work_today'), href: '/mi-trabajo', icon: Activity, color: 'text-teal-400' },
            ]
        },
        ...(isHR ? [{
            title: t('menu_group_admin'),
            items: [
                { name: t('menu_employees'), href: '/empleados', icon: Users, color: 'text-purple-400' },
                { name: t('menu_attendance'), href: '/asistencia/dashboard', icon: Clock, color: 'text-amber-400' },
                { name: t('menu_authorizations'), href: '/autorizaciones/jornadas', icon: Shield, color: 'text-orange-400' },
                { name: t('menu_payment_rules'), href: '/configuracion/reglas-pago', icon: DollarSign, color: 'text-emerald-400' },
                { name: t('menu_prepayroll'), href: '/prenomina/resumen', icon: Files, color: 'text-indigo-400' },
                { name: t('menu_receipts'), href: '/prenomina/recibos', icon: FileText, color: 'text-cyan-400' },
                { name: `${t('gallery')} ${t('evidences')}`, href: '/evidencias', icon: Camera, color: 'text-pink-400' },
            ]
        }] : []),
        ...(isHR ? [{
            title: t('menu_group_finances'),
            items: [
                { name: t('menu_registradora'), href: '/finanzas/registradora', icon: Wallet, color: 'text-green-400' },
                { name: t('menu_business_center'), href: '/finanzas/centro-negocios', icon: PieChart, color: 'text-blue-400' },
            ]
        }] : []),
        {
            title: t('menu_group_system'),
            items: [
                { name: t('menu_about'), href: '/acerca-de', icon: Info, color: 'text-slate-400' },
                ...(isAdmin ? [{ name: t('menu_settings'), href: '/configuracion', icon: Settings, color: 'text-slate-400' }] : []),
            ]
        }
    ]

    if (!isMounted) return null
    if (pathname === '/menu-principal') return null

    return (
        <aside 
            className={cn(
                "relative flex flex-col h-screen glass-dark border-r border-white/5 transition-all duration-500 ease-in-out z-50",
                isCollapsed ? "w-20" : "w-72"
            )}
        >
            {/* Toggle Button */}
            <button 
                onClick={toggleCollapse}
                className="absolute -right-3 top-10 w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center text-white border border-white/10 hover:bg-indigo-500 transition-all z-[60] shadow-lg shadow-indigo-600/20 active:scale-90"
            >
                {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>

            {/* Logo Section */}
            <div className={cn(
                "p-8 flex items-center gap-4 transition-all duration-500",
                isCollapsed ? "justify-center p-6" : "justify-start"
            )}>
                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/20 group relative overflow-hidden">
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
                    <Activity className="text-white w-6 h-6 relative z-10" />
                </div>
                {!isCollapsed && (
                    <div className="animate-in fade-in slide-in-from-left-4 duration-500">
                        <h1 className="text-xl font-black text-white leading-none uppercase tracking-tighter italic">
                            Worktrack <span className="text-indigo-400">PRO</span>
                        </h1>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">RH Solutions</p>
                    </div>
                )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-8 scrollbar-hide">
                {menuGroups.map((group, idx) => (
                    <div key={idx} className="space-y-3">
                        {!isCollapsed && (
                            <h2 className="px-4 text-[10px] font-black uppercase tracking-[0.3em] text-slate-600 animate-in fade-in duration-700 delay-100">
                                {group.title}
                            </h2>
                        )}
                        <div className="space-y-1">
                            {group.items.map((item) => {
                                const isActive = pathname === item.href
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={cn(
                                            "flex items-center gap-4 px-4 py-3 rounded-2xl transition-all duration-300 group relative",
                                            isActive 
                                                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20" 
                                                : "text-slate-400 hover:bg-white/5 hover:text-white",
                                            isCollapsed && "justify-center px-0"
                                        )}
                                        title={isCollapsed ? item.name : ""}
                                    >
                                        <item.icon className={cn(
                                            "w-5 h-5 shrink-0 transition-all group-hover:scale-110 group-hover:drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]",
                                            isActive ? "text-white" : cn("text-slate-400", item.color)
                                        )} />
                                        {!isCollapsed && (
                                            <span className="text-sm font-bold tracking-tight animate-in fade-in slide-in-from-left-2 duration-300">
                                                {item.name}
                                            </span>
                                        )}
                                        {isActive && !isCollapsed && (
                                            <div className="absolute right-4 w-1.5 h-1.5 rounded-full bg-white animate-pulse"></div>
                                        )}
                                    </Link>
                                )
                            })}
                        </div>
                    </div>
                ))}
            </nav>

            {/* Footer / Logout */}
            <div className="p-4 border-t border-white/5 bg-white/2">
                <button 
                    onClick={handleSignOut}
                    className={cn(
                        "flex items-center gap-4 w-full px-4 py-3 rounded-2xl text-slate-500 hover:bg-red-500/10 hover:text-red-400 transition-all duration-300 group shadow-lg shadow-transparent hover:shadow-red-500/5",
                        isCollapsed && "justify-center px-0"
                    )}
                >
                    <LogOut className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                    {!isCollapsed && <span className="text-sm font-bold tracking-tight uppercase tracking-wider">{t('logout')}</span>}
                </button>
            </div>
        </aside>
    )
}
