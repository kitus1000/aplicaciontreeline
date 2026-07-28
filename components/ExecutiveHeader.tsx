'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { 
  Sun, 
  Moon, 
  Globe, 
  User, 
  LogOut, 
  Search, 
  Bell, 
  Eye, 
  ChevronDown,
  Sparkles,
  CheckCircle2,
  Users
} from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import { useI18n } from '@/lib/i18n'
import { useImpersonation } from '@/context/ImpersonationContext'
import { supabase } from '@/utils/supabase/client'

export function ExecutiveHeader() {
  const { theme, toggleTheme } = useTheme()
  const { language, setLanguage, t } = useI18n()
  const { setImpersonatedEmployee, employeesList, impersonatedEmployee } = useImpersonation()
  const router = useRouter()

  const [userEmail, setUserEmail] = useState<string>('')
  const [userName, setUserName] = useState<string>('')
  const [userRole, setUserRole] = useState<string>('')
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [showEmployeePicker, setShowEmployeePicker] = useState(false)
  const [pendingWorkdaysCount, setPendingWorkdaysCount] = useState<number>(0)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    async function loadUserData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserEmail(user.email || '')
        const emailName = user.email ? user.email.split('@')[0] : 'Usuario'
        
        const { data: profile } = await supabase
          .from('perfiles')
          .select('nombre, apellido_paterno, rol')
          .eq('id', user.id)
          .single()

        if (profile && (profile.nombre || profile.apellido_paterno)) {
          setUserName(`${profile.nombre || ''} ${profile.apellido_paterno || ''}`.trim())
          setUserRole(profile.rol || 'Colaborador')
        } else {
          setUserName(emailName.charAt(0).toUpperCase() + emailName.slice(1))
          setUserRole(user.user_metadata?.rol || 'Ejecutivo')
        }
      } else if (typeof window !== 'undefined' && localStorage.getItem('adminBypass') === 'true') {
        setUserEmail('admin@worktrack.com')
        setUserName('Administrador General')
        setUserRole('Super Admin')
      }

      // Check closed workdays pending authorization
      const { count } = await supabase
        .from('workday_approval_status')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Enviado')

      setPendingWorkdaysCount(count || 0)
    }
    loadUserData()
  }, [])

  const handleSignOut = async () => {
    localStorage.removeItem('adminBypass')
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <header className="sticky top-0 z-40 w-full glass transition-colors duration-300 border-b border-[var(--border-color)]">
      <div className="mx-auto flex h-16 items-center justify-between px-4 md:px-8">
        
        {/* Left: Search Bar */}
        <div className="flex items-center gap-4 flex-1 max-w-md">
          <div className="relative w-full hidden sm:block">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('quick_search')}
              className="w-full h-10 pl-10 pr-4 text-xs font-semibold rounded-xl input-executive"
            />
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          
          {/* Closed Workdays Alert Notification Badge */}
          <Link
            href="/autorizaciones/jornadas"
            title="Ver Trabajadores con Día Cerrado Pendientes de Aprobación"
            className="relative p-2.5 rounded-xl glass hover:border-indigo-500/40 text-[var(--text-main)] transition-all flex items-center gap-2"
          >
            <Bell className="w-4 h-4 text-amber-400 animate-bounce" />
            {pendingWorkdaysCount > 0 && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black text-[10px] animate-pulse">
                {pendingWorkdaysCount} <span className="hidden sm:inline">Días Cerrados</span>
              </span>
            )}
          </Link>

          {/* Employee Screen Simulator Picker Button */}
          <div className="relative">
            <button
              onClick={() => setShowEmployeePicker(!showEmployeePicker)}
              title="Simular vista de trabajador"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl glass hover:border-indigo-500/40 text-xs font-bold text-indigo-400 transition-all active:scale-95 border border-indigo-500/20"
            >
              <Eye className="w-4 h-4 text-indigo-400" />
              <span className="hidden md:inline">👁️ Vista Trabajador</span>
              <ChevronDown className="w-3 h-3" />
            </button>

            {/* Employee Picker Dropdown */}
            {showEmployeePicker && (
              <div 
                className="absolute right-0 mt-2 w-72 rounded-2xl glass-card p-3 shadow-2xl z-50 border border-[var(--border-color)] animate-in fade-in slide-in-from-top-2 duration-200 space-y-2 max-h-80 overflow-y-auto"
              >
                <div className="px-2 py-1.5 border-b border-[var(--border-color)]">
                  <p className="text-xs font-black text-[var(--text-main)] uppercase tracking-wider">
                    Simular Pantalla de Trabajador
                  </p>
                  <p className="text-[10px] text-[var(--text-muted)]">
                    Inspecciona lo que ve cualquier empleado sin cerrar tu perfil
                  </p>
                </div>

                <div className="space-y-1">
                  {employeesList.map((emp) => (
                    <button
                      key={emp.id_empleado}
                      onClick={() => {
                        setImpersonatedEmployee(emp)
                        setShowEmployeePicker(false)
                        router.push('/mi-trabajo')
                      }}
                      className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-indigo-500/10 text-left transition-colors group"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 font-bold text-xs flex items-center justify-center">
                          {emp.nombre.charAt(0)}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-[var(--text-main)] group-hover:text-indigo-400 transition-colors">
                            {emp.nombre} {emp.apellido_paterno}
                          </p>
                          <p className="text-[10px] text-[var(--text-muted)]">#{emp.numero_empleado}</p>
                        </div>
                      </div>
                      <Eye className="w-3.5 h-3.5 text-[var(--text-muted)] group-hover:text-indigo-400" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Theme Switcher Button */}
          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? t('theme_light') : t('theme_dark')}
            className="p-2.5 rounded-xl glass hover:border-indigo-500/40 text-[var(--text-main)] transition-all active:scale-95"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400 hover:rotate-45 transition-transform" />
            ) : (
              <Moon className="w-4 h-4 text-indigo-600 hover:-rotate-12 transition-transform" />
            )}
          </button>

          {/* Language Switcher */}
          <button
            onClick={() => setLanguage(language === 'es' ? 'en' : 'es')}
            title="Cambiar Idioma / Switch Language"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl glass hover:border-indigo-500/40 text-xs font-bold uppercase tracking-wider text-[var(--text-main)] transition-all active:scale-95"
          >
            <Globe className="w-4 h-4 text-indigo-400" />
            <span>{language === 'es' ? 'ES' : 'EN'}</span>
          </button>

          {/* User Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-2.5 p-1.5 sm:px-3 sm:py-1.5 rounded-xl glass hover:border-indigo-500/40 transition-all text-left"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-xs shadow-md">
                {userName ? userName.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-bold text-[var(--text-main)] leading-tight truncate max-w-[120px]">
                  {userName || 'Usuario'}
                </p>
                <p className="text-[10px] font-semibold text-indigo-400 leading-tight uppercase tracking-wider truncate max-w-[120px]">
                  {userRole}
                </p>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)] hidden sm:block" />
            </button>

            {/* Profile Dropdown Menu */}
            {showProfileMenu && (
              <div 
                className="absolute right-0 mt-2 w-56 rounded-2xl glass-card p-2 shadow-2xl z-50 border border-[var(--border-color)] animate-in fade-in slide-in-from-top-2 duration-200"
                onClick={() => setShowProfileMenu(false)}
              >
                <div className="px-3 py-2 border-b border-[var(--border-color)] mb-1">
                  <p className="text-xs font-black text-[var(--text-main)]">{userName}</p>
                  <p className="text-[10px] text-[var(--text-muted)] truncate">{userEmail}</p>
                </div>
                <Link
                  href="/perfil"
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-indigo-500/10 text-xs font-semibold text-[var(--text-main)] transition-colors"
                >
                  <User className="w-4 h-4 text-indigo-400" />
                  <span>{t('menu_profile')}</span>
                </Link>
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl hover:bg-red-500/10 text-xs font-semibold text-red-400 transition-colors mt-1"
                >
                  <LogOut className="w-4 h-4" />
                  <span>{t('menu_logout')}</span>
                </button>
              </div>
            )}
          </div>

        </div>

      </div>
    </header>
  )
}
