'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2 } from 'lucide-react'

export function FuturisticLoader() {
    const [isVisible, setIsVisible] = useState(true)

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsVisible(false)
        }, 2500) // 2.5 seconds of futuristic loading
        return () => clearTimeout(timer)
    }, [])

    if (!isVisible) return null

    return (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#0f172a] overflow-hidden">
            {/* Background Grid Effect */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-20"></div>
            
            <div className="relative group scale-150 sm:scale-[2]">
                {/* Neon Ring */}
                <div className="absolute inset-[-10px] rounded-full bg-indigo-500/20 blur-xl animate-pulse"></div>
                <div className="absolute inset-[-1px] rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-500 opacity-50"></div>
                
                {/* Logo Container */}
                <div className="relative h-16 w-16 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center text-white overflow-hidden shadow-2xl">
                    <CheckCircle2 className="w-8 h-8 text-indigo-400 relative z-10" />
                    <div className="absolute inset-x-0 top-0 h-[2px] bg-indigo-400 animate-[futuristic-scan_2s_infinite]"></div>
                </div>
            </div>

            <div className="mt-16 text-center space-y-2 animate-pulse">
                <h2 className="text-xl font-black uppercase tracking-[0.5em] text-white">Worktrack <span className="text-indigo-400">PRO</span></h2>
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500">Initializing Core Systems...</p>
            </div>

            {/* Scanning Line */}
            <div className="absolute left-0 right-0 h-[1px] bg-indigo-500/10 shadow-[0_0_15px_rgba(99,102,241,0.5)] animate-[futuristic-scan_3s_infinite]"></div>
        </div>
    )
}
