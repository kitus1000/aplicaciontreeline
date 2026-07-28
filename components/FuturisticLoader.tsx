'use client'

import { useEffect, useState } from 'react'
import { BuilderAvatarAnimation } from '@/components/BuilderAvatarAnimation'

export function FuturisticLoader() {
    const [isVisible, setIsVisible] = useState(true)

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsVisible(false)
        }, 2200)
        return () => clearTimeout(timer)
    }, [])

    if (!isVisible) return null

    return (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#090d16] overflow-hidden">
            {/* Background Grid Effect */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:40px_40px] opacity-25"></div>
            
            {/* Construction Builder Avatar Animation */}
            <div className="relative z-10 space-y-6 text-center flex flex-col items-center">
                <BuilderAvatarAnimation size="lg" className="shadow-2xl scale-125 sm:scale-150" />
                
                <div className="space-y-1 animate-pulse">
                    <h2 className="text-xl sm:text-2xl font-black uppercase tracking-[0.4em] text-white">
                      Worktrack <span className="text-amber-400">PRO</span>
                    </h2>
                    <p className="text-[10px] sm:text-xs font-black uppercase tracking-[0.3em] text-amber-400">
                      🔨 CONSTRUYENDO Y CARGANDO SISTEMA...
                    </p>
                </div>
            </div>

            {/* Scanning Line */}
            <div className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_15px_rgba(245,158,11,0.8)] animate-[futuristic-scan_2.5s_infinite]" />
        </div>
    )
}
