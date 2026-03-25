'use client'

import React, { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, Move } from 'lucide-react'
import { Rnd } from 'react-rnd'

export function GlobalBackButton() {
    const pathname = usePathname()
    const router = useRouter()
    const [isMounted, setIsMounted] = useState(false)
    const [isDragging, setIsDragging] = useState(false)

    useEffect(() => {
        setIsMounted(true)
    }, [])

    if (!isMounted) return null
    // Ocultar en el menú principal y en mi-trabajo
    if (pathname === '/menu-principal' || pathname === '/mi-trabajo') {
        return null
    }

    return (
        <Rnd
            default={{
                x: window.innerWidth - 200,
                y: 80, // Moved lower from top so it doesn't block top elements
                width: 180,
                height: 48,
            }}
            bounds="window"
            enableResizing={false}
            onDragStart={() => setIsDragging(true)}
            onDragStop={() => {
                setTimeout(() => setIsDragging(false), 150)
            }}
            className="z-[9999]"
        >
            <div 
                onClick={(e) => {
                    if (isDragging) {
                        e.preventDefault()
                        return
                    }
                    router.push('/menu-principal')
                }}
                className="flex items-center gap-3 px-5 py-3 glass-dark bg-indigo-600/20 text-indigo-400 hover:text-white rounded-full border border-indigo-500/30 shadow-[0_0_20px_rgba(79,70,229,0.2)] cursor-move backdrop-blur-xl group hover:bg-indigo-600 hover:border-indigo-400 transition-colors"
                title="Arrastra para mover"
            >
                <Move className="w-4 h-4 text-white/40 group-hover:text-white group-hover:animate-pulse" />
                <LayoutDashboard className="w-5 h-5 group-hover:scale-110 transition-transform" />
                <span className="text-[11px] font-black uppercase tracking-widest pt-0.5 pointer-events-none select-none">Menú Principal</span>
            </div>
        </Rnd>
    )
}
