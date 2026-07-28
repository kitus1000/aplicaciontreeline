'use client'

import { useState, useEffect } from 'react'
import { 
  User, 
  Lock, 
  KeyRound, 
  CheckCircle2, 
  ShieldAlert, 
  Sun, 
  Moon, 
  Globe, 
  Sparkles, 
  Fingerprint, 
  ShieldCheck, 
  Save, 
  Loader2 
} from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import { useTheme } from '@/context/ThemeContext'
import { supabase } from '@/utils/supabase/client'

export default function ProfilePage() {
  const { t, language, setLanguage } = useI18n()
  const { theme, toggleTheme } = useTheme()

  const [user, setUser] = useState<any>(null)
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [rol, setRol] = useState('')
  
  // Password change state
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUser(user)
        setEmail(user.email || '')
        
        const { data: profile } = await supabase
          .from('perfiles')
          .select('nombre, apellido_paterno, rol')
          .eq('id', user.id)
          .single()

        if (profile) {
          setNombre(`${profile.nombre || ''} ${profile.apellido_paterno || ''}`.trim())
          setRol(profile.rol || 'Colaborador')
        } else {
          setNombre(user.email ? user.email.split('@')[0] : 'Ejecutivo')
          setRol(user.user_metadata?.rol || 'Ejecutivo')
        }
      } else if (typeof window !== 'undefined' && localStorage.getItem('adminBypass') === 'true') {
        setEmail('admin@worktrack.com')
        setNombre('Administrador General')
        setRol('Super Admin')
      }
    }
    loadProfile()
  }, [])

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setSuccessMsg(null)
    setErrorMsg(null)

    if (newPassword.length < 6) {
      setErrorMsg(t('password_min_length'))
      return
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg(t('password_mismatch'))
      return
    }

    setLoading(true)
    try {
      if (typeof window !== 'undefined' && localStorage.getItem('adminBypass') === 'true') {
        // Admin bypass simulation
        setTimeout(() => {
          setSuccessMsg(t('password_updated_success'))
          setNewPassword('')
          setConfirmPassword('')
          setLoading(false)
        }, 800)
        return
      }

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (error) throw error

      setSuccessMsg(t('password_updated_success'))
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: any) {
      setErrorMsg(err.message || t('error'))
    } finally {
      setLoading(false)
    }
  }

  // Password Strength calculation
  const getPasswordStrength = () => {
    if (!newPassword) return 0
    let strength = 0
    if (newPassword.length >= 6) strength += 33
    if (newPassword.length >= 10) strength += 33
    if (/[A-Z]/.test(newPassword) && /[0-9]/.test(newPassword)) strength += 34
    return strength
  }

  const strength = getPasswordStrength()

  return (
    <div className="max-w-4xl mx-auto space-y-8 page-transition">
      
      {/* Header Banner */}
      <div className="rounded-3xl glass-card p-6 sm:p-8 relative overflow-hidden flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex items-center gap-5 z-10">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-600 to-blue-600 flex items-center justify-center text-white text-3xl font-black shadow-xl shadow-indigo-500/20">
            {nombre ? nombre.charAt(0).toUpperCase() : 'E'}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase tracking-wider">
                {rol || 'Ejecutivo'}
              </span>
              <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold">
                <ShieldCheck className="w-3.5 h-3.5" /> {t('session_active')}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[var(--text-main)]">
              {nombre || 'Cargando...'}
            </h1>
            <p className="text-xs font-medium text-[var(--text-muted)]">{email}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 z-10">
          <div className="px-4 py-2 rounded-2xl glass border border-indigo-500/20 text-center">
            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">{t('security_level_1')}</p>
            <p className="text-xs font-bold text-[var(--text-main)]">Encripción AES-256</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Left Column: Password Security Form */}
        <div className="md:col-span-2 space-y-6">
          <div className="rounded-3xl glass-card p-6 sm:p-8 space-y-6">
            <div className="flex items-center gap-3 border-b border-[var(--border-color)] pb-4">
              <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-black text-[var(--text-main)]">{t('change_password')}</h2>
                <p className="text-xs text-[var(--text-muted)]">{t('profile_subtitle')}</p>
              </div>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-5">
              
              {/* New Password */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 text-indigo-400" /> {t('new_password')}
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full h-12 px-4 text-sm font-semibold input-executive"
                />
                
                {/* Strength Meter */}
                {newPassword && (
                  <div className="space-y-1.5 pt-1">
                    <div className="h-1.5 w-full bg-slate-700/30 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-300 ${
                          strength <= 33 ? 'bg-red-500' : strength <= 66 ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${strength}%` }}
                      />
                    </div>
                    <p className="text-[10px] font-bold text-right text-[var(--text-muted)]">
                      {strength <= 33 ? 'Básica' : strength <= 66 ? 'Buena' : 'Fuerte 🔒'}
                    </p>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" /> {t('confirm_password')}
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full h-12 px-4 text-sm font-semibold input-executive"
                />
              </div>

              {/* Success Message */}
              {successMsg && (
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* Error Message */}
              {errorMsg && (
                <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold flex items-center gap-2 animate-in fade-in">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-widest rounded-2xl transition-all float-btn flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{t('password_updating')}</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>{t('save_changes')}</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Preferences & Info */}
        <div className="space-y-6">
          
          {/* Preferences Card */}
          <div className="rounded-3xl glass-card p-6 space-y-6">
            <h3 className="text-sm font-black text-[var(--text-main)] uppercase tracking-wider border-b border-[var(--border-color)] pb-3">
              {t('appearance_and_lang')}
            </h3>

            {/* Theme Selector */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-[var(--text-muted)]">{t('theme_mode')}</label>
              <button
                onClick={toggleTheme}
                className="w-full p-3 rounded-2xl glass hover:border-indigo-500/40 flex items-center justify-between transition-all"
              >
                <div className="flex items-center gap-3">
                  {theme === 'dark' ? (
                    <Moon className="w-5 h-5 text-indigo-400" />
                  ) : (
                    <Sun className="w-5 h-5 text-amber-400" />
                  )}
                  <span className="text-xs font-bold text-[var(--text-main)]">
                    {theme === 'dark' ? t('theme_dark') : t('theme_light')}
                  </span>
                </div>
                <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">
                  Cambiar ⚡
                </span>
              </button>
            </div>

            {/* Language Selector */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-[var(--text-muted)]">Idioma / Language</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setLanguage('es')}
                  className={`p-3 rounded-xl text-xs font-bold transition-all border ${
                    language === 'es' 
                      ? 'bg-indigo-600 text-white border-indigo-500 shadow-md' 
                      : 'glass text-[var(--text-muted)] hover:text-[var(--text-main)] border-transparent'
                  }`}
                >
                  🇪🇸 Español
                </button>
                <button
                  onClick={() => setLanguage('en')}
                  className={`p-3 rounded-xl text-xs font-bold transition-all border ${
                    language === 'en' 
                      ? 'bg-indigo-600 text-white border-indigo-500 shadow-md' 
                      : 'glass text-[var(--text-muted)] hover:text-[var(--text-main)] border-transparent'
                  }`}
                >
                  🇺🇸 English
                </button>
              </div>
            </div>
          </div>

          {/* Account Details Card */}
          <div className="rounded-3xl glass-card p-6 space-y-4">
            <h3 className="text-sm font-black text-[var(--text-main)] uppercase tracking-wider border-b border-[var(--border-color)] pb-3">
              {t('user_details')}
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center py-1">
                <span className="text-[var(--text-muted)] font-medium">Email:</span>
                <span className="font-bold text-[var(--text-main)] truncate max-w-[160px]">{email}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-[var(--text-muted)] font-medium">{t('user_role')}:</span>
                <span className="font-bold text-indigo-400">{rol || 'Ejecutivo'}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-[var(--text-muted)] font-medium">Plataforma:</span>
                <span className="font-bold text-[var(--text-main)]">Worktrack RH v3.0</span>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  )
}
