'use client'

import { cn } from '@/utils/cn'

interface BuilderAvatarProps {
  size?: 'sm' | 'md' | 'lg'
  animated?: boolean
  className?: string
}

export function BuilderAvatarAnimation({ size = 'md', animated = true, className }: BuilderAvatarProps) {
  const sizeMap = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-20 h-20'
  }

  return (
    <div className={cn("relative flex items-center justify-center select-none", sizeMap[size], className)}>
      
      {/* Outer Construction Glow Aura */}
      <div className={cn(
        "absolute inset-0 rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-indigo-600 opacity-80 blur-md",
        animated && "animate-pulse"
      )} />

      {/* SVG Animated Construction Builder */}
      <div className="relative w-full h-full rounded-2xl bg-slate-950 border border-amber-400/40 shadow-xl overflow-hidden flex items-center justify-center p-1">
        
        {/* Background Brick Grid Effect */}
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#f59e0b_1px,transparent_1px)] [background-size:8px_8px]" />

        <svg 
          viewBox="0 0 100 100" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full relative z-10"
        >
          {/* Construction Bricks Stacking Motion */}
          <g className={animated ? "animate-bounce" : ""}>
            {/* Brick 1 */}
            <rect x="25" y="70" width="22" height="10" rx="2" fill="#F59E0B" opacity="0.9" />
            <rect x="25" y="70" width="22" height="10" rx="2" stroke="#FEF3C7" strokeWidth="1" />
            
            {/* Brick 2 */}
            <rect x="50" y="70" width="22" height="10" rx="2" fill="#D97706" opacity="0.9" />
            <rect x="50" y="70" width="22" height="10" rx="2" stroke="#FEF3C7" strokeWidth="1" />

            {/* Top Center Brick being Placed */}
            <rect x="37" y="58" width="24" height="10" rx="2" fill="#F59E0B" className={animated ? "animate-pulse" : ""} />
            <rect x="37" y="58" width="24" height="10" rx="2" stroke="#FFFFFF" strokeWidth="1.5" />
          </g>

          {/* Builder Head & Helmet (Casco de Construcción) */}
          <g>
            {/* Worker Head */}
            <circle cx="50" cy="38" r="14" fill="#FED7AA" />
            
            {/* Safety Helmet (Casco de Construcción Neón) */}
            <path d="M30 36 C30 22, 70 22, 70 36 L74 38 L26 38 Z" fill="#F59E0B" />
            <rect x="26" y="36" width="48" height="4" rx="2" fill="#FBBF24" />
            {/* Reflective Helmet Stripe */}
            <rect x="36" y="28" width="28" height="3" rx="1.5" fill="#FFFFFF" opacity="0.9" />
            <circle cx="50" cy="25" r="2.5" fill="#EF4444" className={animated ? "animate-ping" : ""} />

            {/* Worker Eyes / Goggles */}
            <rect x="42" y="38" width="6" height="3" rx="1" fill="#1E293B" />
            <rect x="52" y="38" width="6" height="3" rx="1" fill="#1E293B" />
            {/* Happy Smile */}
            <path d="M45 45 Q50 49 55 45" stroke="#7C2D12" strokeWidth="2" strokeLinecap="round" />
          </g>

          {/* Builder Vest (Chaleco de Seguridad) */}
          <path d="M32 52 L68 52 L72 75 L28 75 Z" fill="#EA580C" />
          {/* Reflective Vest Stripes */}
          <rect x="36" y="54" width="6" height="21" fill="#FEF08A" />
          <rect x="58" y="54" width="6" height="21" fill="#FEF08A" />
          <rect x="32" y="64" width="36" height="4" fill="#FFFFFF" />

          {/* Animated Arm with Hammer (Martillo Construyendo) */}
          <g className={animated ? "origin-[72px_55px] animate-[spin_2s_ease-in-out_infinite]" : ""}>
            {/* Arm */}
            <rect x="68" y="52" width="14" height="6" rx="3" fill="#FED7AA" transform="rotate(-30 68 52)" />
            {/* Hammer Handle */}
            <rect x="76" y="42" width="4" height="20" rx="1" fill="#78350F" transform="rotate(25 76 42)" />
            {/* Hammer Head */}
            <rect x="70" y="40" width="16" height="8" rx="2" fill="#94A3B8" transform="rotate(25 70 40)" />
            <rect x="68" y="42" width="6" height="4" rx="1" fill="#CBD5E1" transform="rotate(25 68 42)" />
          </g>
        </svg>

        {/* Sparkle FX */}
        {animated && (
          <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-300 animate-ping opacity-75" />
        )}
      </div>
    </div>
  )
}
