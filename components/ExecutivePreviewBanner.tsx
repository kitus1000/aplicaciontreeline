'use client'

import { Eye, X, UserCheck, ShieldAlert } from 'lucide-react'
import { useImpersonation } from '@/context/ImpersonationContext'

export function ExecutivePreviewBanner() {
  const { impersonatedEmployee, clearImpersonation } = useImpersonation()

  if (!impersonatedEmployee) return null

  return (
    <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 text-white px-4 py-2.5 shadow-xl border-b border-indigo-400/30 flex items-center justify-between z-50 animate-in slide-in-from-top duration-300">
      <div className="flex items-center gap-3">
        <span className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center font-bold text-xs shadow-inner">
          <Eye className="w-4 h-4 text-white animate-pulse" />
        </span>
        <div>
          <p className="text-xs font-black uppercase tracking-wider flex items-center gap-2">
            <span>Modo Vista Previa de Trabajador Activo</span>
            <span className="px-2 py-0.5 rounded-full bg-white/20 text-[9px] font-bold">Sin cerrar sesión</span>
          </p>
          <p className="text-[11px] opacity-90 font-medium">
            Viendo la interfaz exactamente como la ve: <strong className="underline decoration-indigo-300 font-bold">{impersonatedEmployee.nombre} {impersonatedEmployee.apellido_paterno}</strong> (#{impersonatedEmployee.numero_empleado})
          </p>
        </div>
      </div>

      <button
        onClick={clearImpersonation}
        className="flex items-center gap-2 px-4 py-1.5 rounded-xl bg-white/20 hover:bg-white text-white hover:text-indigo-900 font-black text-xs uppercase tracking-wider transition-all shadow-md active:scale-95"
      >
        <X className="w-4 h-4" />
        <span>Salir de Vista Previa</span>
      </button>
    </div>
  )
}
