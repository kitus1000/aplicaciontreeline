'use client'

import React, { useState, useEffect } from 'react'
import { useI18n } from '@/lib/i18n'
import { Languages, Globe } from 'lucide-react'
import { cn } from '@/utils/cn'

export function LanguageToggle() {
    const { language, setLanguage } = useI18n()
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) return null

    return (
        <div className="fixed bottom-8 right-8 z-[9999] group">
            <div className="relative flex items-center bg-[#0A0E17]/80 backdrop-blur-2xl rounded-2xl border border-white/10 p-1 shadow-[0_0_30px_rgba(0,0,0,0.5)] group-hover:border-indigo-500/50 transition-all duration-500">
                {/* Visual Accent */}
                <div className="absolute -top-1 left-4 w-2 h-0.5 bg-indigo-500 rounded-full group-hover:w-8 transition-all" />
                
                <button
                    onClick={() => setLanguage('es')}
                    className={cn(
                        "px-4 py-2 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all flex items-center gap-2",
                        language === 'es' 
                            ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20" 
                            : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
                    )}
                >
                    <span className={cn("w-1.5 h-1.5 rounded-full transition-all", language === 'es' ? "bg-white animate-pulse" : "bg-transparent")} />
                    ES
                </button>
                
                <div className="w-[1px] h-4 bg-white/10 mx-1" />

                <button
                    onClick={() => setLanguage('en')}
                    className={cn(
                        "px-4 py-2 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all flex items-center gap-2",
                        language === 'en' 
                            ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20" 
                            : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
                    )}
                >
                    <span className={cn("w-1.5 h-1.5 rounded-full transition-all", language === 'en' ? "bg-white animate-pulse" : "bg-transparent")} />
                    EN
                </button>

                {/* Floating Icon Decor */}
                <div className="absolute -right-12 bottom-0 opacity-0 group-hover:opacity-100 group-hover:-translate-x-2 transition-all duration-700 pointer-events-none">
                    <div className="p-3 bg-indigo-600/20 rounded-full border border-indigo-500/30 backdrop-blur-sm">
                        <Globe className="w-4 h-4 text-indigo-400" />
                    </div>
                </div>
            </div>
        </div>
    )
}
