'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, 
  Activity, 
  Clock, 
  User, 
  Menu, 
  X, 
  Users, 
  Shield, 
  DollarSign, 
  Files, 
  FileText, 
  Camera, 
  Wallet, 
  PieChart, 
  Info, 
  Settings 
} from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import { cn } from '@/utils/cn'

export function MobileNavigation() {
  const pathname = usePathname()
  const { t } = useI18n()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const navItems = [
    { label: t('menu_dashboard'), href: '/dashboard', icon: LayoutDashboard },
    { label: t('menu_my_work_today'), href: '/mi-trabajo', icon: Activity },
    { label: t('menu_attendance'), href: '/asistencia/dashboard', icon: Clock },
    { label: t('menu_profile'), href: '/perfil', icon: User },
  ]

  const extendedMenu = [
    { label: t('menu_main'), href: '/menu-principal', icon: LayoutDashboard },
    { label: t('menu_employees'), href: '/empleados', icon: Users },
    { label: t('menu_authorizations'), href: '/autorizaciones/jornadas', icon: Shield },
    { label: t('menu_payment_rules'), href: '/configuracion/reglas-pago', icon: DollarSign },
    { label: t('menu_prepayroll'), href: '/prenomina/resumen', icon: Files },
    { label: t('menu_receipts'), href: '/prenomina/recibos', icon: FileText },
    { label: `${t('gallery')} ${t('evidences')}`, href: '/evidencias', icon: Camera },
    { label: t('menu_registradora'), href: '/finanzas/registradora', icon: Wallet },
    { label: t('menu_business_center'), href: '/finanzas/centro-negocios', icon: PieChart },
    { label: t('menu_settings'), href: '/configuracion', icon: Settings },
    { label: t('menu_about'), href: '/acerca-de', icon: Info },
  ]

  if (pathname === '/menu-principal') return null

  return (
    <>
      {/* Bottom Bar for Mobile Devices */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 h-16 glass border-t border-[var(--border-color)] px-4 flex items-center justify-around">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 w-16 h-12 rounded-xl transition-all",
                isActive ? "text-indigo-400 font-bold" : "text-[var(--text-muted)]"
              )}
            >
              <item.icon className={cn("w-5 h-5", isActive && "scale-110 drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]")} />
              <span className="text-[10px] truncate max-w-[60px]">{item.label}</span>
            </Link>
          )
        })}

        {/* Drawer Toggle */}
        <button
          onClick={() => setDrawerOpen(true)}
          className="flex flex-col items-center justify-center gap-1 w-16 h-12 rounded-xl text-[var(--text-muted)] hover:text-indigo-400"
        >
          <Menu className="w-5 h-5" />
          <span className="text-[10px]">{t('actions')}</span>
        </button>
      </div>

      {/* Drawer Overlay & Panel */}
      {drawerOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end animate-in fade-in duration-200">
          <div className="w-4/5 max-w-sm h-full glass-dark p-6 overflow-y-auto flex flex-col justify-between animate-in slide-in-from-right duration-300">
            <div>
              <div className="flex items-center justify-between pb-6 border-b border-[var(--border-color)] mb-6">
                <h3 className="text-lg font-black text-[var(--text-main)] uppercase tracking-tight italic">
                  Worktrack <span className="text-indigo-400">PRO</span>
                </h3>
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="p-2 rounded-xl glass hover:bg-red-500/10 text-[var(--text-main)]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-2">
                {extendedMenu.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setDrawerOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all",
                      pathname === item.href 
                        ? "bg-indigo-600 text-white shadow-lg" 
                        : "text-[var(--text-muted)] hover:bg-white/5 hover:text-[var(--text-main)]"
                    )}
                  >
                    <item.icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </Link>
                ))}
              </div>
            </div>

            <div className="pt-6 border-t border-[var(--border-color)] mt-6 text-center text-xs text-[var(--text-muted)]">
              Worktrack PRO • Executive Suite
            </div>
          </div>
        </div>
      )}
    </>
  )
}
