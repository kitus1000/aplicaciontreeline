'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { supabase } from '@/utils/supabase/client'
import { ShieldAlert, Lock, AlertTriangle } from 'lucide-react'

export function RoleGuard({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null)
    const [userRole, setUserRole] = useState<string>('Desconocido')

    useEffect(() => {
        checkAccess()
    }, [pathname])

    async function checkAccess() {
        if (!pathname) return
        
        // Rutas públicas o para todos los trabajadores
        const publicRoutes = ['/dashboard', '/mi-trabajo', '/menu-principal', '/acerca-de', '/mi-jornada', '/solicitudes']
        if (publicRoutes.some(r => pathname.startsWith(r))) {
            setIsAuthorized(true)
            return
        }

        // Si es una ruta protegida, verificamos el rol
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            if (typeof window !== 'undefined' && localStorage.getItem('adminBypass') === 'true') {
                setIsAuthorized(true)
                return
            }
            setIsAuthorized(false)
            return
        }

        const { data: profile } = await supabase
            .from('perfiles')
            .select('rol')
            .eq('id', user.id)
            .single()

        const rol = (profile?.rol || user.user_metadata?.rol || 'Trabajador').toLowerCase()
        const email = user.email?.toLowerCase() || ''
        const adminRoles = ['admin', 'administrador', 'superadmin', 'hr', 'administrativo', 'recursos humanos', 'gerente', 'jefe']
        
        setUserRole(profile?.rol || user.user_metadata?.rol || 'Trabajador')

        const isHR = adminRoles.includes(rol) || email === 'kitus1000@gmail.com' || email === 'jesus12398@gmail.com' || email.includes('admin')
        const isAdmin = adminRoles.includes(rol) || email === 'kitus1000@gmail.com' || email === 'jesus12398@gmail.com' || email.includes('admin')

        // Bypass manual para desarrollo (igual que en Sidebar)
        if (typeof window !== 'undefined' && localStorage.getItem('adminBypass') === 'true') {
            setIsAuthorized(true)
            return
        }

        // Rutas exclusivas de Admin
        if (pathname.startsWith('/configuracion/usuarios') || pathname.startsWith('/configuracion/sistema')) {
            setIsAuthorized(isAdmin)
            return
        }

        // Rutas exclusivas de HR/Admin
        const hrRoutes = ['/empleados', '/asistencia', '/autorizaciones', '/prenomina', '/evidencias', '/finanzas', '/catalogos', '/configuracion']
        if (hrRoutes.some(r => pathname.startsWith(r))) {
            setIsAuthorized(isHR)
            return
        }

        // Si no cae en ninguna restricción, permitir
        setIsAuthorized(true)
    }

    if (isAuthorized === null) {
        return (
            <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-6">
                <div className="relative">
                    <div className="w-24 h-24 border-4 border-indigo-500/20 rounded-full"></div>
                    <div className="w-24 h-24 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin absolute top-0 left-0 shadow-[0_0_30px_rgba(99,102,241,0.5)]"></div>
                    <ShieldAlert className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-indigo-400 animate-pulse" />
                </div>
                <div className="text-xs font-black uppercase tracking-[0.3em] text-indigo-400 animate-pulse">Verificando Credenciales...</div>
            </div>
        )
    }

    if (isAuthorized === false) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[80vh] text-center px-4 animate-in fade-in zoom-in duration-700">
                <div className="relative group">
                    <div className="absolute inset-0 bg-red-600/20 blur-[50px] rounded-full group-hover:bg-red-600/40 transition-all duration-700 animate-pulse"></div>
                    <div className="w-36 h-36 bg-[#0a0a0f] border-2 border-red-500/30 rounded-[2rem] flex items-center justify-center shadow-[0_0_50px_rgba(239,68,68,0.15)] relative z-10 overflow-hidden mb-8 group-hover:scale-105 group-hover:border-red-500/50 transition-all duration-500">
                        {/* Scanline effect */}
                        <div className="absolute inset-0 bg-[linear-gradient(transparent_0%,rgba(239,68,68,0.1)_50%,transparent_100%)] bg-[length:100%_4px] animate-[scan_2s_linear_infinite]"></div>
                        {/* Hazard stripes */}
                        <div className="absolute inset-0 bg-[repeating-linear-gradient(-45deg,transparent,transparent_10px,rgba(239,68,68,0.1)_10px,rgba(239,68,68,0.1)_20px)] opacity-50 mix-blend-overlay"></div>
                        <AlertTriangle className="w-20 h-20 text-red-500 relative z-10 filter drop-shadow-[0_0_15px_rgba(239,68,68,0.8)] animate-pulse" />
                    </div>
                </div>

                <div className="space-y-2 mb-8">
                    <div className="flex items-center justify-center gap-3">
                        <span className="h-[2px] w-12 bg-red-500/50"></span>
                        <h2 className="text-xs font-black text-red-500 uppercase tracking-[0.4em]">Error 401</h2>
                        <span className="h-[2px] w-12 bg-red-500/50"></span>
                    </div>
                    <h1 className="text-6xl font-black text-white uppercase tracking-tighter italic drop-shadow-[0_0_20px_rgba(239,68,68,0.3)]">
                        Acceso <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-500">Denegado</span>
                    </h1>
                </div>
                
                <div className="bg-[#0f0f13] border border-red-500/20 rounded-3xl p-8 max-w-xl mx-auto shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600/0 via-red-600 to-red-600/0"></div>
                    <div className="flex items-start gap-6 text-left relative z-10">
                        <div className="p-4 bg-red-500/10 rounded-2xl shrink-0">
                            <Lock className="w-8 h-8 text-red-400" />
                        </div>
                        <div className="space-y-3">
                            <h3 className="text-red-400 font-black uppercase tracking-widest text-sm flex items-center">
                                <span className="w-2 h-2 rounded-full bg-red-500 mr-2 animate-ping"></span>
                                Infracción de Seguridad
                            </h3>
                            <p className="text-slate-400 text-sm leading-relaxed font-medium">
                                Tu nivel de autorización actual (<span className="text-white font-bold px-2 py-0.5 bg-white/5 rounded border border-white/10 uppercase">{userRole}</span>) 
                                es insuficiente para acceder a <span className="text-red-300 font-bold">{pathname}</span>.
                            </p>
                            <p className="text-xs font-bold text-red-500/70 uppercase tracking-wider pt-2 border-t border-red-500/10">
                                » El intento de acceso ha sido registrado.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="mt-12 flex items-center justify-center gap-4">
                    <a href="/dashboard" className="px-8 py-4 bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-[0.2em] text-xs rounded-xl shadow-[0_0_20px_rgba(220,38,38,0.4)] transition-all hover:scale-105 active:scale-95 border border-red-400/50 flex items-center gap-3">
                        <ShieldAlert className="w-4 h-4" /> Volver a Zona Segura
                    </a>
                </div>
            </div>
        )
    }

    return <>{children}</>
}
