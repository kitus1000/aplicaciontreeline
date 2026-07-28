'use client'

import { cn } from '@/utils/cn'

interface BuilderAvatarProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  animated?: boolean
  className?: string
}

export function BuilderAvatarAnimation({ size = 'md', animated = true, className }: BuilderAvatarProps) {
  const sizeMap = {
    sm: 'w-12 h-12',
    md: 'w-20 h-20',
    lg: 'w-32 h-32',
    xl: 'w-44 h-44'
  }

  return (
    <div className={cn("relative flex items-center justify-center select-none shrink-0 bg-transparent", sizeMap[size], className)}>
      
      {/* Soft Glow Aura (Transparent) */}
      <div className={cn(
        "absolute inset-0 rounded-full bg-amber-500/20 blur-lg pointer-events-none",
        animated && "animate-pulse"
      )} />

      {/* SVG Animated Construction Builder - 100% Transparent Background */}
      <svg 
        viewBox="0 0 100 100" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full relative z-10 drop-shadow-[0_4px_12px_rgba(245,158,11,0.4)]"
      >
        {/* Construction Bricks Stacking Motion */}
        <g className={animated ? "animate-bounce" : ""}>
          {/* Brick 1 */}
          <rect x="22" y="72" width="25" height="12" rx="3" fill="#F59E0B" opacity="0.95" />
          <rect x="22" y="72" width="25" height="12" rx="3" stroke="#FEF3C7" strokeWidth="1.5" />
          
          {/* Brick 2 */}
          <rect x="52" y="72" width="25" height="12" rx="3" fill="#D97706" opacity="0.95" />
          <rect x="52" y="72" width="25" height="12" rx="3" stroke="#FEF3C7" strokeWidth="1.5" />

          {/* Top Center Brick being Placed */}
          <rect x="36" y="58" width="28" height="12" rx="3" fill="#FBBF24" className={animated ? "animate-pulse" : ""} />
          <rect x="36" y="58" width="28" height="12" rx="3" stroke="#FFFFFF" strokeWidth="2" />
        </g>

        {/* Builder Head & Helmet (Casco de Construcción Neón) */}
        <g>
          {/* Worker Head */}
          <circle cx="50" cy="38" r="15" fill="#FED7AA" />
          
          {/* Safety Helmet (Casco de Construcción) */}
          <path d="M28 36 C28 20, 72 20, 72 36 L76 39 L24 39 Z" fill="#F59E0B" />
          <rect x="24" y="36" width="52" height="5" rx="2.5" fill="#FBBF24" />
          {/* Reflective Helmet Stripe */}
          <rect x="34" y="27" width="32" height="3.5" rx="1.75" fill="#FFFFFF" opacity="0.95" />
          <circle cx="50" cy="23" r="3" fill="#EF4444" className={animated ? "animate-ping" : ""} />

          {/* Worker Eyes / Goggles */}
          <rect x="40" y="38" width="7" height="3.5" rx="1.5" fill="#0F172A" />
          <rect x="53" y="38" width="7" height="3.5" rx="1.5" fill="#0F172A" />
          {/* Happy Smile */}
          <path d="M44 46 Q50 50 56 46" stroke="#7C2D12" strokeWidth="2.5" strokeLinecap="round" />
        </g>

        {/* Builder Vest (Chaleco de Seguridad Naranja) */}
        <path d="M30 52 L70 52 L75 78 L25 78 Z" fill="#EA580C" />
        {/* Reflective Vest Stripes */}
        <rect x="35" y="54" width="7" height="24" fill="#FEF08A" />
        <rect x="58" y="54" width="7" height="24" fill="#FEF08A" />
        <rect x="30" y="66" width="40" height="4.5" fill="#FFFFFF" />

        {/* Animated Arm with Hammer (Martillo Construyendo en Tiempo Real) */}
        <g className={animated ? "origin-[72px_55px] animate-[spin_2.5s_ease-in-out_infinite]" : ""}>
          {/* Arm */}
          <rect x="68" y="50" width="16" height="7" rx="3.5" fill="#FED7AA" transform="rotate(-30 68 50)" />
          {/* Hammer Handle */}
          <rect x="78" y="38" width="4.5" height="22" rx="1.5" fill="#78350F" transform="rotate(25 78 38)" />
          {/* Hammer Head */}
          <rect x="72" y="36" width="18" height="9" rx="2" fill="#94A3B8" transform="rotate(25 72 36)" />
          <rect x="70" y="38" width="7" height="4.5" rx="1" fill="#E2E8F0" transform="rotate(25 70 38)" />
        </g>

        {/* Sparkle FX */}
        {animated && (
          <circle cx="85" cy="30" r="2.5" fill="#FBBF24" className="animate-ping opacity-90" />
        )}
      </svg>
    </div>
  )
}
