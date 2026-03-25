'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/utils/supabase/client'
import { useI18n } from '@/lib/i18n'
import { Shield, UserPlus, Mail, Lock, User, Briefcase, CheckCircle2, AlertCircle } from 'lucide-react'
import { cn } from '@/utils/cn'

export default function NewUserPage() {
    const { t } = useI18n()
    const [empleados, setEmpleados] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
    
    const [form, setForm] = useState({
        email: '',
        password: '',
        nombreCompleto: '',
        rol: 'Trabajador',
        idEmpleado: ''
    })

    useEffect(() => {
        fetchEmpleados()
    }, [])

    async function fetchEmpleados() {
        // Obtenemos los empleados activos para poder vincular la cuenta
        const { data } = await supabase.from('empleados').select('id_empleado, nombre, apellido_paterno').eq('estado_empleado', 'Activo').order('nombre')
        if (data) setEmpleados(data)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setMessage(null)

        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            })

            const result = await res.json()

            if (result.ok) {
                setMessage({ type: 'success', text: result.message || 'Usuario creado exitosamente.' })
                setForm({ email: '', password: '', nombreCompleto: '', rol: 'Trabajador', idEmpleado: '' })
            } else {
                setMessage({ type: 'error', text: result.message || 'Error al crear el usuario.' })
            }

        } catch (error: any) {
            setMessage({ type: 'error', text: error.message || 'Ocurrió un error inesperado al conectar con el servidor.' })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="max-w-4xl mx-auto pb-20 space-y-8 page-transition">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-white/5 pb-8">
                <div>
                    <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic">
                        User <span className="text-indigo-400">Creation</span>
                    </h1>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-[0.3em] mt-1">Plataforma de Alta Global de Credenciales</p>
                </div>
            </div>

            {message && (
                <div className={cn(
                    "p-4 rounded-2xl flex items-center space-x-3 border-2 animate-in slide-in-from-top-4",
                    message.type === 'success' ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/5" : "border-red-500/30 text-red-400 bg-red-500/5"
                )}>
                    {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                    <p className="font-bold uppercase tracking-tight text-xs flex-1">{message.text}</p>
                </div>
            )}

            <div className="glass-dark rounded-[2rem] p-8 border border-white/5 shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-700">
                    <Shield className="w-40 h-40 text-indigo-400" />
                </div>
                
                <h3 className="text-sm font-black text-white uppercase tracking-[0.4em] mb-8 flex items-center relative z-10">
                    <UserPlus className="w-5 h-5 mr-3 text-indigo-400" />
                    Registrar Nuevo Acceso
                </h3>

                <form onSubmit={handleSubmit} className="space-y-6 relative z-10 w-full max-w-2xl">
                    <div className="space-y-2">
                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 ml-2">Nombre Completo del Titular</label>
                        <div className="relative group/input">
                            <input 
                                type="text" 
                                required
                                value={form.nombreCompleto}
                                onChange={e => setForm({...form, nombreCompleto: e.target.value})}
                                placeholder="Ej: Juan Pérez"
                                className="w-full h-14 form-pop rounded-2xl px-12 text-sm font-bold text-white border-white/5 focus:border-indigo-500 transition-all outline-none" 
                            />
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within/input:text-indigo-400 transition-colors" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 ml-2">Correo Electrónico de Acceso</label>
                            <div className="relative group/input">
                                <input 
                                    type="email" 
                                    required
                                    value={form.email}
                                    onChange={e => setForm({...form, email: e.target.value})}
                                    placeholder="correo@ejemplo.com"
                                    className="w-full h-14 form-pop rounded-2xl px-12 text-sm font-bold text-white border-white/5 focus:border-indigo-500 transition-all outline-none" 
                                />
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within/input:text-indigo-400 transition-colors" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 ml-2">Contraseña Segura</label>
                            <div className="relative group/input">
                                <input 
                                    type="password" 
                                    required
                                    minLength={6}
                                    value={form.password}
                                    onChange={e => setForm({...form, password: e.target.value})}
                                    placeholder="••••••••"
                                    className="w-full h-14 form-pop rounded-2xl px-12 text-sm font-bold text-white border-white/5 focus:border-indigo-500 transition-all outline-none" 
                                />
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within/input:text-indigo-400 transition-colors" />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 ml-2">Rol del Sistema</label>
                            <div className="relative group/input">
                                <select 
                                    value={form.rol}
                                    onChange={e => setForm({...form, rol: e.target.value})}
                                    className="w-full h-14 form-pop rounded-2xl pl-12 pr-4 text-sm font-bold text-white border-white/5 focus:border-indigo-500 transition-all outline-none appearance-none cursor-pointer" 
                                >
                                    <option value="Trabajador">Trabajador Normal</option>
                                    <option value="Supervisor">Supervisor de Obra</option>
                                    <option value="HR">Recursos Humanos (HR)</option>
                                    <option value="Admin">Administrador Global</option>
                                </select>
                                <Shield className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within/input:text-indigo-400 transition-colors" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 ml-2">Vincular a Empleado Existente (Opcional)</label>
                            <div className="relative group/input">
                                <select 
                                    value={form.idEmpleado}
                                    onChange={e => setForm({...form, idEmpleado: e.target.value})}
                                    className="w-full h-14 form-pop rounded-2xl pl-12 pr-4 text-sm font-bold text-white border-white/5 focus:border-indigo-500 transition-all outline-none appearance-none cursor-pointer" 
                                >
                                    <option value="">No Vincular / Empleado Nuevo</option>
                                    {empleados.map(emp => (
                                        <option key={emp.id_empleado} value={emp.id_empleado}>
                                            {emp.nombre} {emp.apellido_paterno}
                                        </option>
                                    ))}
                                </select>
                                <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within/input:text-indigo-400 transition-colors" />
                            </div>
                        </div>
                    </div>

                    <div className="pt-6">
                        <button 
                            type="submit"
                            disabled={loading}
                            className="w-full h-14 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-xl shadow-indigo-600/20 hover:bg-indigo-500 float-btn active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
                        >
                            {loading ? 'Generando Credenciales...' : 'Registrar Nuevo Acceso de Red'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
