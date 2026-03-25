'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/utils/supabase/client'
import { CheckCircle2, XCircle, Clock, Camera, KeyRound, AlertCircle, LogIn, LogOut, Coffee } from 'lucide-react'
import { useI18n } from '@/lib/i18n'

// --- Tipos Principales ---
type EstadoChecador =
    | 'IDLE' // Mismo que TIPO_NO_SELECCIONADO
    | 'TIPO_SELECCIONADO'
    | 'LEYENDO_QR'
    | 'CAPTURANDO_ID'
    | 'REQUIERE_CODIGO'
    | 'VALIDANDO_CODIGO'
    | 'PROCESANDO'
    | 'EXITO'
    | 'ERROR'

type TipoChecada = 'ENTRADA' | 'SALIDA' | 'COMIDA_SALIDA' | 'COMIDA_REGRESO' | 'PERMISO_PERSONAL' | 'REGRESO_PERMISO_PERSONAL' | 'SALIDA_OPERACIONES' | 'REGRESO_OPERACIONES' | 'SALIDA_FINAL'

interface ChecadaDef {
    id: TipoChecada
    color: string
    icon: React.ReactNode
    requiereCodigo: boolean
}

const TIPOS_CHECADA: ChecadaDef[] = [
    { id: 'ENTRADA', color: 'bg-green-600 hover:bg-green-500', icon: <LogIn className="w-8 h-8 mb-2 mx-auto" />, requiereCodigo: false },
    { id: 'SALIDA', color: 'bg-red-600 hover:bg-red-500', icon: <LogOut className="w-8 h-8 mb-2 mx-auto" />, requiereCodigo: false },
    { id: 'COMIDA_SALIDA', color: 'bg-amber-500 hover:bg-amber-400', icon: <Coffee className="w-8 h-8 mb-2 mx-auto" />, requiereCodigo: false },
    { id: 'COMIDA_REGRESO', color: 'bg-amber-600 hover:bg-amber-500', icon: <LogIn className="w-8 h-8 mb-2 mx-auto" />, requiereCodigo: false },
    { id: 'PERMISO_PERSONAL', color: 'bg-blue-600 hover:bg-blue-500', icon: <LogOut className="w-8 h-8 mb-2 mx-auto" />, requiereCodigo: true },
    { id: 'REGRESO_PERMISO_PERSONAL', color: 'bg-blue-500 hover:bg-blue-400', icon: <LogIn className="w-8 h-8 mb-2 mx-auto" />, requiereCodigo: false },
    { id: 'SALIDA_OPERACIONES', color: 'bg-indigo-600 hover:bg-indigo-500', icon: <LogOut className="w-8 h-8 mb-2 mx-auto" />, requiereCodigo: true },
    { id: 'REGRESO_OPERACIONES', color: 'bg-indigo-500 hover:bg-indigo-400', icon: <LogIn className="w-8 h-8 mb-2 mx-auto" />, requiereCodigo: false },
    { id: 'SALIDA_FINAL', color: 'bg-red-800 hover:bg-red-700', icon: <LogOut className="w-8 h-8 mb-2 mx-auto" />, requiereCodigo: false },
]


export default function ChecadorKiosko() {
    const { t, language } = useI18n()
    
    // --- State ---
    const [estado, setEstado] = useState<EstadoChecador>('IDLE')
    const [tipoSeleccionado, setTipoSeleccionado] = useState<TipoChecada | null>(null)
    const [idManual, setIdManual] = useState('')
    const [codigoAutorizacion, setCodigoAutorizacion] = useState('')
    const [errorMsg, setErrorMsg] = useState('')
    const [empleadoValidado, setEmpleadoValidado] = useState<any>(null)

    // System Time
    const [hora, setHora] = useState<Date | null>(null)
    const [isOnline, setIsOnline] = useState(true)

    // Resultados Mock (Solo para UI)
    const [mockResult, setMockResult] = useState<{
        nombre: string
        estatus: 'PUNTUAL' | 'RETARDO' | 'FUERA_VENTANA' | 'FALTA'
        horario?: string
    } | null>(null)

    // --- Efectos de Sistema ---
    useEffect(() => {
        setHora(new Date())
        const timer = setInterval(() => setHora(new Date()), 1000)

        const handleOnline = () => setIsOnline(true)
        const handleOffline = () => setIsOnline(false)

        window.addEventListener('online', handleOnline)
        window.addEventListener('offline', handleOffline)
        setIsOnline(navigator.onLine)

        return () => {
            clearInterval(timer)
            window.removeEventListener('online', handleOnline)
            window.removeEventListener('offline', handleOffline)
        }
    }, [])

    // Reseteo por inactividad (60 segundos sin tocar)
    useEffect(() => {
        let timeoutId: NodeJS.Timeout
        if (estado !== 'IDLE' && estado !== 'EXITO' && estado !== 'ERROR') {
            timeoutId = setTimeout(() => {
                resetFlujo()
            }, 60000)
        }
        return () => clearTimeout(timeoutId)
    }, [estado, tipoSeleccionado, idManual, codigoAutorizacion])


    // --- Handlers de Flujo ---

    const resetFlujo = () => {
        setEstado('IDLE')
        setTipoSeleccionado(null)
        setIdManual('')
        setCodigoAutorizacion('')
        setErrorMsg('')
        setMockResult(null)
        setEmpleadoValidado(null)
    }

    const handleSeleccionarTipo = (tipoId: TipoChecada) => {
        setTipoSeleccionado(tipoId)
        setEstado('TIPO_SELECCIONADO')
        setIdManual('')
        setCodigoAutorizacion('')
        setErrorMsg('')
    }

    const procesarExito = async (emp: any, codigoExtra = '') => {
        setEstado('PROCESANDO')

        try {
            const response = await fetch('/api/checadas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id_empleado_token: idManual,
                    tipo_checada: tipoSeleccionado,
                    codigo_autorizacion: codigoExtra || null,
                    metodo: 'ID_MANUAL',
                    timestamp_local: new Date().toISOString()
                })
            })

            const result = await response.json()

            if (!response.ok) {
                setErrorMsg(result.mensaje || t('login_error'))
                if (result.empleado) {
                    setMockResult({
                        nombre: result.empleado.nombre,
                        estatus: 'FALTA',
                        horario: result.empleado.horario
                    })
                }
                setEstado('ERROR')
                setTimeout(resetFlujo, 6000)
                return
            }

            setMockResult({
                nombre: result.empleado.nombre,
                estatus: result.estatus_puntualidad,
                horario: result.empleado.horario
            })
            setEstado('EXITO')
            setTimeout(resetFlujo, 5000)

        } catch (error) {
            setErrorMsg('Connection error.')
            setEstado('ERROR')
            setTimeout(resetFlujo, 4000)
        }
    }

    const handleChecar = async () => {
        if (!tipoSeleccionado) return
        if (!idManual) return

        setEstado('PROCESANDO')

        try {
            const { data: emp, error } = await supabase
                .from('empleados')
                .select('id_empleado, nombre, apellido_paterno, apellido_materno, estado_empleado')
                .eq('numero_empleado', idManual)
                .single()

            if (error || !emp) {
                setErrorMsg(t('invalid_id'))
                setEstado('ERROR')
                setTimeout(resetFlujo, 4000)
                return
            }

            if (emp.estado_empleado !== 'Activo') {
                setErrorMsg('Employee is inactive.')
                setEstado('ERROR')
                setTimeout(resetFlujo, 4000)
                return
            }

            setEmpleadoValidado(emp)
            const configTipo = TIPOS_CHECADA.find(t => t.id === tipoSeleccionado)

            if (configTipo?.requiereCodigo) {
                setEstado('REQUIERE_CODIGO')
            } else {
                procesarExito(emp)
            }

        } catch (e: any) {
            setErrorMsg('Connection error logic.')
            setEstado('ERROR')
            setTimeout(resetFlujo, 4000)
        }
    }

    const handleValidarCodigo = async () => {
        if (codigoAutorizacion.length !== 6) {
            setErrorMsg('Code must be 6 digits.')
            return
        }

        setErrorMsg('')
        procesarExito(empleadoValidado, codigoAutorizacion)
    }

    // --- Renders ---
    const renderHeader = () => (
        <header className="flex items-center justify-between p-6 bg-zinc-900 border-b border-zinc-800">
            <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-indigo-600 rounded-lg flex items-center justify-center">
                    <CheckCircle2 className="w-7 h-7 text-white" />
                </div>
                <div>
                    <h1 className="text-xl font-black tracking-widest text-white uppercase italic">Worktrack RH</h1>
                    <p className="text-sm text-zinc-400 font-medium uppercase tracking-tighter">{t('terminal_title')}</p>
                </div>
            </div>

            <div className="flex flex-col items-end">
                <div className="text-4xl font-black tracking-tight font-mono text-white">
                    {hora ? hora.toLocaleTimeString(language === 'es' ? 'es-MX' : 'en-US', { hour12: false }) : '00:00:00'}
                </div>
                <div className="flex items-center space-x-3 text-sm font-medium mt-1">
                    <span className="text-zinc-400 uppercase">
                        {hora ? hora.toLocaleDateString(language === 'es' ? 'es-MX' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long' }) : t('loading')}
                    </span>
                    <div className="flex items-center bg-zinc-800 px-3 py-1 rounded-full border border-zinc-700">
                        <span className={`w-2 h-2 rounded-full mr-2 ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}></span>
                        <span className={isOnline ? 'text-green-400 font-black' : 'text-red-400 font-black'}>{isOnline ? 'ONLINE' : 'OFFLINE'}</span>
                    </div>
                </div>
            </div>
        </header>
    )

    const isIdentidadDisabled = estado === 'IDLE' || estado === 'REQUIERE_CODIGO' || estado === 'VALIDANDO_CODIGO' || estado === 'PROCESANDO'

    return (
        <div className="flex flex-col h-screen bg-black overflow-hidden relative selection:bg-transparent">
            {renderHeader()}

            <div className="flex-1 flex p-6 gap-8 h-full">

                {/* Columna Izquierda: Botonera  */}
                <div className="w-1/2 flex flex-col justify-center gap-4">
                    <h2 className="text-2xl font-bold text-zinc-300 uppercase tracking-wide text-center mb-2">
                        1. {t('actions')}
                    </h2>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 flex-1">
                        {TIPOS_CHECADA.map(tipo => {
                            const isSelected = tipoSeleccionado === tipo.id;
                            const baseClasses = "flex flex-col items-center justify-center text-center p-3 rounded-xl transition-all duration-200 border-2 select-none active:scale-95 shadow-md"
                            const colorClasses = isSelected
                                ? `${tipo.color} border-white shadow-[0_0_30px_rgba(255,255,255,0.3)] scale-[1.02]`
                                : `bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-500`

                            return (
                                <button
                                    key={tipo.id}
                                    onClick={() => handleSeleccionarTipo(tipo.id)}
                                    className={`${baseClasses} ${colorClasses}`}
                                    disabled={estado === 'PROCESANDO' || estado === 'VALIDANDO_CODIGO' || estado === 'REQUIERE_CODIGO'}
                                >
                                    {tipo.icon}
                                    <span className={`font-black uppercase tracking-wide leading-tight ${isSelected ? 'text-white text-md' : 'text-zinc-300 text-xs'}`}>
                                        {t(tipo.id.toLowerCase() as any)}
                                    </span>
                                </button>
                            )
                        })}
                    </div>
                </div>

                {/* Vertical Divider */}
                <div className="w-px bg-zinc-800 my-8"></div>

                {/* Columna Derecha: Identificación y Flujos  */}
                <div className="w-1/2 flex flex-col justify-center items-center px-10">

                    {estado === 'IDLE' && (
                        <div className="text-center opacity-40 flex flex-col items-center animate-in fade-in zoom-in duration-500">
                            <AlertCircle className="w-24 h-24 text-zinc-500 mb-6" />
                            <h2 className="text-3xl font-black text-white text-center uppercase">{t('terminal_waiting')}</h2>
                            <p className="text-xl text-zinc-400 mt-2 text-center">{t('terminal_waiting_desc')}</p>
                        </div>
                    )}

                    {estado !== 'IDLE' && (
                        <div className="w-full max-w-md animate-in slide-in-from-right-8 duration-300">

                            {/* Info de Selección */}
                            <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 mb-8 text-center flex flex-col items-center shadow-xl">
                                <p className="text-zinc-400 font-black uppercase tracking-widest text-[10px] mb-2">{t('terminal_step_2')}</p>
                                <div className="text-2xl font-black text-white flex items-center justify-center space-x-3 uppercase italic tracking-tighter">
                                    {TIPOS_CHECADA.find(t => t.id === tipoSeleccionado)?.icon}
                                    <span>{t(tipoSeleccionado?.toLowerCase() as any)}</span>
                                </div>
                            </div>

                            {/* Modos de ID - Solo visible si no se requiere código (o como paso previo) */}
                            {estado !== 'REQUIERE_CODIGO' && estado !== 'VALIDANDO_CODIGO' && (
                                <div className={`space-y-6 transition-opacity duration-300 ${isIdentidadDisabled ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>

                                    <button className="w-full bg-blue-600 hover:bg-blue-500 text-white p-6 rounded-2xl flex flex-col items-center justify-center space-y-3 font-black border border-blue-400 transition-colors active:scale-95 shadow-lg">
                                        <Camera className="w-12 h-12" />
                                        <span className="text-xl tracking-widest uppercase">{t('terminal_scan_qr')}</span>
                                    </button>

                                    <div className="flex items-center space-x-4 my-8">
                                        <div className="flex-1 h-px bg-zinc-800"></div>
                                        <span className="text-zinc-500 font-black tracking-[.2em] uppercase text-[10px]">{t('terminal_manual_entry')}</span>
                                        <div className="flex-1 h-px bg-zinc-800"></div>
                                    </div>

                                    <div className="space-y-4">
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            placeholder="N° Empleado"
                                            className="w-full bg-zinc-900 border-2 border-zinc-700 text-white text-4xl font-black font-mono text-center p-5 rounded-2xl focus:border-amber-500 focus:outline-none focus:ring-4 focus:ring-amber-500/20 transition-all shadow-inner"
                                            value={idManual}
                                            onChange={e => setIdManual(e.target.value.replace(/\D/g, ''))} // Solo núms
                                            disabled={isIdentidadDisabled}
                                        />
                                        <button
                                            onClick={handleChecar}
                                            disabled={!idManual || isIdentidadDisabled}
                                            className="w-full bg-white text-black font-black uppercase tracking-widest text-2xl p-5 rounded-2xl hover:bg-zinc-200 active:scale-95 disabled:opacity-50 disabled:active:scale-100 transition-all border-b-4 border-zinc-400 active:border-b-0 mt-2 shadow-xl"
                                        >
                                            {t('confirm')}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Bloque Autorización */}
                            {(estado === 'REQUIERE_CODIGO' || estado === 'VALIDANDO_CODIGO') && (
                                <div className="space-y-6 animate-in slide-in-from-bottom-8 duration-300">
                                    <div className="bg-indigo-900/30 border border-indigo-500/50 p-8 rounded-[32px] text-center shadow-2xl backdrop-blur-md">
                                        <KeyRound className="w-16 h-16 text-indigo-400 mx-auto mb-4" />
                                        <h3 className="text-2xl font-black text-indigo-200 mb-2 uppercase tracking-tighter">{t('terminal_req_auth')}</h3>
                                        <p className="text-indigo-200/70 text-sm font-medium">{t('terminal_auth_desc')}</p>

                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            maxLength={6}
                                            placeholder="000000"
                                            className="w-full mt-8 bg-black/50 border-2 border-indigo-500 text-white text-5xl font-black font-mono text-center p-5 rounded-2xl focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 tracking-[0.4em] shadow-inner"
                                            value={codigoAutorizacion}
                                            onChange={e => setCodigoAutorizacion(e.target.value.replace(/\D/g, ''))}
                                            disabled={estado === 'VALIDANDO_CODIGO'}
                                        />
                                        
                                        <button
                                            onClick={handleValidarCodigo}
                                            disabled={codigoAutorizacion.length !== 6 || estado === 'VALIDANDO_CODIGO'}
                                            className="w-full mt-8 bg-indigo-600 text-white font-black uppercase tracking-widest text-xl p-5 rounded-2xl hover:bg-indigo-500 active:scale-95 disabled:opacity-50 transition-all border-b-4 border-indigo-800 active:border-b-0 shadow-xl"
                                        >
                                            {estado === 'VALIDANDO_CODIGO' ? t('login_verifying') : t('terminal_validate')}
                                        </button>

                                        <button
                                            onClick={() => setEstado('TIPO_SELECCIONADO')}
                                            disabled={estado === 'VALIDANDO_CODIGO'}
                                            className="w-full mt-4 bg-transparent text-indigo-300 font-black uppercase text-xs p-4 hover:bg-indigo-900/50 rounded-2xl transition-colors"
                                        >
                                            {t('cancel')}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Error Inline Helper */}
                            {errorMsg && estado !== 'ERROR' && (
                                <div className="mt-8 p-4 bg-red-900/30 border border-red-500/50 rounded-2xl flex items-center space-x-4 text-red-200 animate-in fade-in duration-300 shadow-lg">
                                    <AlertCircle className="w-8 h-8 flex-shrink-0 text-red-500" />
                                    <p className="text-sm font-bold uppercase tracking-tight">{errorMsg}</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* OVERLAYS FULLSCREEN */}

            {/* Spinner Overlay */}
            {(estado === 'PROCESANDO' || estado === 'VALIDANDO_CODIGO') && (
                <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in duration-200">
                    <div className="w-24 h-24 border-[12px] border-zinc-800 border-t-indigo-500 rounded-full animate-spin mb-10 shadow-2xl"></div>
                    <h2 className="text-4xl font-black text-white tracking-[.3em] uppercase animate-pulse italic">
                        {estado === 'VALIDANDO_CODIGO' ? t('login_verifying') : t('terminal_processing')}
                    </h2>
                </div>
            )}

            {/* Overlays de Resultado */}
            {estado === 'EXITO' && mockResult && (
                <div className="absolute inset-0 z-[60] bg-green-600 flex flex-col items-center justify-center animate-in zoom-in-95 duration-300">
                    <div className="relative">
                        <CheckCircle2 className="w-56 h-56 text-white mb-10 drop-shadow-[0_20px_50px_rgba(0,0,0,0.3)] animate-bounce" />
                    </div>
                    <h1 className="text-7xl font-black text-white uppercase tracking-tighter mb-6 drop-shadow-2xl text-center italic">
                        {t(tipoSeleccionado?.toLowerCase() as any)} SUCCESS!
                    </h1>

                    <div className="bg-black/20 p-10 rounded-[40px] backdrop-blur-xl mb-12 min-w-[700px] text-center border border-white/20 shadow-2xl">
                        <p className="text-green-50 text-2xl font-black mb-2 uppercase tracking-widest opacity-60">{t('worker')}</p>
                        <p className="text-white text-6xl font-black mb-10 tracking-tighter">{mockResult.nombre}</p>

                        <div className="grid grid-cols-2 gap-12 text-left bg-black/20 p-8 rounded-3xl border border-white/5">
                            <div>
                                <p className="text-green-100 text-lg font-black mb-2 uppercase tracking-widest opacity-60">{t('actions')}</p>
                                <p className="text-white text-4xl font-black italic">{t(tipoSeleccionado?.toLowerCase() as any)}</p>
                            </div>
                            <div>
                                <p className="text-green-100 text-lg font-black mb-2 uppercase tracking-widest opacity-60">TIME</p>
                                <p className="text-white text-4xl font-mono font-black">{hora?.toLocaleTimeString('es-MX', { hour12: false })}</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col items-center space-y-6">
                        <div className={`px-12 py-5 rounded-2xl border-4 text-5xl font-black tracking-widest uppercase shadow-2xl transform -rotate-1 ${mockResult.estatus === 'PUNTUAL' ? 'bg-green-700 border-green-300 text-green-50' : 'bg-amber-500 border-amber-200 text-black'}`}>
                            {mockResult.estatus === 'PUNTUAL' ? '🟢 PUNTUAL' : '🟡 RETARDO'}
                        </div>
                        {mockResult.horario && (
                            <p className="text-white text-xl font-bold bg-black/40 px-8 py-3 rounded-full border border-white/10 uppercase tracking-[.2em] shadow-inner">
                                {t('terminal_assigned_schedule')} <span className="text-green-400 ml-2">{mockResult.horario}</span>
                            </p>
                        )}
                    </div>

                    <div className="absolute bottom-0 left-0 h-4 bg-white/40 animate-[shrink_4.5s_linear_forwards] w-full origin-left shadow-[0_-10px_30px_rgba(255,255,255,0.2)]"></div>
                </div>
            )}

            {estado === 'ERROR' && (
                <div className="absolute inset-0 z-[60] bg-red-600 flex flex-col items-center justify-center animate-in zoom-in-95 duration-300 px-10 text-center">
                    <XCircle className="w-56 h-56 text-white mb-10 drop-shadow-[0_20px_50px_rgba(0,0,0,0.3)] animate-shake" />
                    <h1 className="text-7xl font-black text-white uppercase tracking-tighter mb-6 drop-shadow-2xl italic">{t('terminal_error_title')}</h1>
                    <p className="text-3xl text-red-50 font-bold max-w-5xl leading-snug bg-black/30 p-10 rounded-[40px] border border-white/20 shadow-2xl backdrop-blur-md uppercase tracking-tight">
                        {errorMsg || 'Ha ocurrido un error inesperado. Por favor, intenta de nuevo.'}
                    </p>
                    {mockResult?.horario && (
                        <div className="mt-10 bg-black/80 p-8 rounded-[32px] border-2 border-white/20 shadow-2xl transform rotate-1">
                            <p className="text-red-300 text-xl font-black uppercase mb-3 tracking-widest opacity-60">{t('terminal_assigned_schedule')}</p>
                            <p className="text-white text-6xl font-black font-mono tracking-tighter shadow-red-500 text-glow">{mockResult.horario}</p>
                            <p className="text-red-200/50 text-sm mt-5 font-bold uppercase tracking-widest italic">{t('terminal_tolerance_msg')}</p>
                        </div>
                    )}
                    <div className="absolute bottom-0 left-0 h-4 bg-white/40 animate-[shrink_5.5s_linear_forwards] w-full origin-left shadow-[0_-10px_30px_rgba(255,255,255,0.2)]"></div>
                </div>
            )}

            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes shrink {
                    from { width: 100%; }
                    to { width: 0%; }
                }
                .text-glow {
                    text-shadow: 0 0 20px rgba(255,255,255,0.3);
                }
                @keyframes animate-shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-10px); }
                    75% { transform: translateX(10px); }
                }
                .animate-shake {
                    animation: animate-shake 0.2s ease-in-out infinite;
                }
            `}} />
        </div>
    )
}
