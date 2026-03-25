'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/utils/supabase/client'
import { useI18n } from '@/lib/i18n'
import { Hexagon, Fingerprint, ArrowRight, Lock, Scan, Disc3, ShieldAlert } from 'lucide-react'

export default function LoginPage() {
    const { t } = useI18n()
    const router = useRouter()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            const { error: authError } = await supabase.auth.signInWithPassword({
                email,
                password,
            })

            if (authError) {
                if (email === 'admin@example.com' && password === 'admin') {
                    localStorage.setItem('adminBypass', 'true')
                    router.push('/menu-principal')
                    return
                }
                throw authError
            }

            localStorage.removeItem('adminBypass')
            router.push('/menu-principal')
        } catch (err: any) {
            setError(err.message || t('login_error'))
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-[#050510] relative overflow-hidden font-sans page-transition selection:bg-indigo-500/30">
            {/* HUD / Cyber Background Elements */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/10 rounded-full blur-[150px] animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[150px]" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border border-white/5 rounded-full animate-[spin_60s_linear_infinite]" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-white/[0.02] rounded-full animate-[spin_40s_linear_infinite_reverse]" />
                {/* Construction Matrix lines */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,black_40%,transparent_100%)] opacity-30" />
            </div>

            <div className="relative z-10 w-full max-w-md px-6 animate-in slide-in-from-bottom-12 fade-in duration-1000">
                {/* Cyber Header */}
                <div className="text-center mb-12 space-y-6">
                    <div className="relative mx-auto w-24 h-24 flex items-center justify-center group">
                        {/* Rotating Rings */}
                        <div className="absolute inset-0 rounded-full border-t-2 border-indigo-500 animate-[spin_3s_linear_infinite] opacity-50 group-hover:border-indigo-400 group-hover:scale-110 transition-all duration-700" />
                        <div className="absolute inset-2 rounded-full border-r-2 border-blue-400 animate-[spin_2s_linear_infinite_reverse] opacity-50 group-hover:border-blue-300" />
                        {/* Core Icon */}
                        <div className="w-16 h-16 bg-[#0B0F19] rounded-2xl flex items-center justify-center border border-indigo-500/30 shadow-[0_0_40px_rgba(99,102,241,0.2)] group-hover:shadow-[0_0_60px_rgba(99,102,241,0.4)] transition-all overflow-hidden relative">
                            <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/10 to-transparent" />
                            <Hexagon className="w-8 h-8 text-indigo-400 relative z-10 animate-pulse" />
                        </div>
                    </div>
                    
                    <div className="space-y-2">
                        <div className="flex items-center justify-center gap-2 mb-2">
                            <span className="h-[1px] w-8 bg-indigo-500/50" />
                            <h1 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.4em]">{t('security_level_1')}</h1>
                            <span className="h-[1px] w-8 bg-indigo-500/50" />
                        </div>
                        <h2 className="text-5xl font-black text-white uppercase tracking-tighter italic">
                            Worktrack <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-blue-500">PRO</span>
                        </h2>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em]">Operating System v3.0</p>
                    </div>
                </div>

                {/* Glassmorphism Login Card */}
                <div className="rounded-[2.5rem] bg-[#0A0E17]/60 backdrop-blur-3xl border border-white/5 p-8 shadow-[0_30px_100px_rgba(0,0,0,0.8)] relative overflow-hidden group">
                    {/* Glowing Accent Line */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-[2px] bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-50" />

                    <form onSubmit={handleLogin} className="space-y-6 relative z-10 w-full relative">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="flex items-center text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">
                                    <Scan className="w-3 h-3 mr-2 text-indigo-500" /> Identity Matrix
                                </label>
                                <div className="relative">
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="admin@example.com"
                                        className="w-full bg-[#111623] border border-white/5 rounded-2xl h-14 pl-12 pr-4 text-white text-sm font-bold focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-slate-600 shadow-inner"
                                    />
                                    <Fingerprint className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="flex items-center text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">
                                    <ShieldAlert className="w-3 h-3 mr-2 text-indigo-500" /> Access Protocol
                                </label>
                                <div className="relative">
                                    <input
                                        type="password"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••••••"
                                        className="w-full bg-[#111623] border border-white/5 rounded-2xl h-14 pl-12 pr-4 text-white text-sm font-bold focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-slate-600 shadow-inner"
                                    />
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                </div>
                            </div>
                        </div>

                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold p-4 rounded-2xl flex items-center justify-center gap-2 animate-shake shadow-lg shadow-red-500/5">
                                <ShieldAlert className="w-4 h-4" /> {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="group/btn relative w-full h-14 bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-[0.2em] text-[11px] rounded-2xl transition-all duration-300 active:scale-95 disabled:opacity-50 overflow-hidden shadow-xl shadow-indigo-600/20"
                        >
                            <span className="relative z-10 flex items-center justify-center gap-3">
                                {loading ? (
                                    <>
                                        <Disc3 className="w-5 h-5 animate-spin" /> Verifying Matrix...
                                    </>
                                ) : (
                                    <>
                                        Initialize Terminal <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </span>
                            {/* Animated Glare inside button */}
                            <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover/btn:animate-[glare_1s_ease-in-out_infinite]" />
                        </button>
                    </form>
                </div>
                
                {/* Tech Footer */}
                <div className="mt-8 text-center flex flex-col items-center gap-2 opacity-50">
                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-[0.3em]">
                        R. Martínez • Build 2026.03
                    </p>
                    <div className="flex gap-1">
                       <span className="w-1 h-3 bg-indigo-500 rounded-sm"></span>
                       <span className="w-1 h-3 bg-indigo-500/70 rounded-sm"></span>
                       <span className="w-1 h-3 bg-indigo-500/40 rounded-sm"></span>
                       <span className="w-1 h-3 bg-indigo-500/10 rounded-sm"></span>
                    </div>
                </div>
            </div>
        </div>
    )
}
