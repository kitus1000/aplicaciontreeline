'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/utils/supabase/client'
import { UserPlus, Shield, Building, Trash2, Edit2, Check, X, Mail, Lock, User as UserIcon, RefreshCw } from 'lucide-react'

export default function UsuariosConfigPage() {
    const [profiles, setProfiles] = useState<any[]>([])
    const [departments, setDepartments] = useState<any[]>([])
    const [employees, setEmployees] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [isAdding, setIsAdding] = useState(false)
    
    const [editForm, setEditForm] = useState({
        nombre_completo: '',
        rol: 'Jefe',
        id_departamento: ''
    })
    
    const [newForm, setNewForm] = useState({
        email: '',
        password: '',
        nombre_completo: '',
        rol: 'Jefe',
        id_departamento: '',
        id_empleado: ''
    })

    useEffect(() => {
        fetchData()
    }, [])

    async function fetchData() {
        setLoading(true)
        try {
            const { data: profilesData } = await supabase
                .from('perfiles')
                .select('*, cat_departamentos(departamento)')
                .order('nombre_completo')

            const { data: deptsData } = await supabase
                .from('cat_departamentos')
                .select('*')
                .eq('activo', true)
                .order('departamento')

            const { data: empData } = await supabase
                .from('empleados')
                .select('id_empleado, nombre, apellido_paterno, numero_empleado')
                .order('nombre')

            setProfiles(profilesData || [])
            setDepartments(deptsData || [])
            setEmployees(empData || [])
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    const startEdit = (p: any) => {
        setEditingId(p.id)
        setEditForm({
            nombre_completo: p.nombre_completo || '',
            rol: p.rol || 'Jefe',
            id_departamento: p.id_departamento || ''
        })
    }

    const handleEmployeeChange = (empId: string) => {
        const emp = employees.find(e => e.id_empleado === empId)
        if (emp) {
            // Generar usuario: nombre.apellido@empresa.com
            const cleanName = (emp.nombre || '').split(' ')[0].toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            const cleanLastName = (emp.apellido_paterno || '').split(' ')[0].toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            const generatedEmail = `${cleanName}.${cleanLastName}@empresa.com`;

            setNewForm(prev => ({
                ...prev,
                id_empleado: empId,
                nombre_completo: `${emp.nombre} ${emp.apellido_paterno}`.trim(),
                email: generatedEmail
            }))
        } else {
            setNewForm(prev => ({ ...prev, id_empleado: empId }))
        }
    }

    const saveEdit = async () => {
        if (!editingId) return
        setSaving(true)
        try {
            const { error } = await supabase
                .from('perfiles')
                .update({
                    nombre_completo: editForm.nombre_completo,
                    rol: editForm.rol,
                    id_departamento: editForm.id_departamento || null,
                    actualizado_el: new Date().toISOString()
                })
                .eq('id', editingId)

            if (error) throw error
            setEditingId(null)
            fetchData()
        } catch (e: any) {
            alert('Error al guardar: ' + e.message)
        } finally {
            setSaving(false)
        }
    }

    const handleAddUser = async () => {
        if (!newForm.email || !newForm.password || !newForm.nombre_completo) {
            alert('Email, Contraseña y Nombre son obligatorios.')
            return
        }

        setSaving(true)
        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: newForm.email,
                    password: newForm.password,
                    nombreCompleto: newForm.nombre_completo,
                    rol: newForm.rol,
                    idEmpleado: newForm.id_empleado || null
                })
            })

            const result = await res.json()
            if (!res.ok) throw new Error(result.message || 'Error en el servidor')

            alert('Usuario creado y activado exitosamente.')
            setIsAdding(false)
            setNewForm({ email: '', password: '', nombre_completo: '', rol: 'Jefe', id_departamento: '', id_empleado: '' })
            fetchData()
        } catch (e: any) {
            alert('Error al crear perfil: ' + e.message)
        } finally {
            setSaving(false)
        }
    }

    const deleteUser = async (id: string) => {
        if (!confirm('¿Está seguro de eliminar este acceso? El usuario no podrá loguearse más, pero su historial de acciones se mantiene.')) return

        const { error } = await supabase
            .from('perfiles')
            .delete()
            .eq('id', id)

        if (error) {
            alert('Error al eliminar: ' + error.message)
        } else {
            fetchData()
        }
    }

    // Role badge Style
    const getRoleBadge = (rol: string) => {
        if (rol === 'Administrativo' || rol === 'Administrador') return 'bg-amber-100 text-amber-800 border-amber-200'
        if (rol === 'Trabajador') return 'bg-emerald-100 text-emerald-800 border-emerald-200'
        return 'bg-blue-100 text-blue-800 border-blue-200'
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500 max-w-5xl mx-auto">
            <div className="flex border-b border-zinc-200 pb-6 items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-zinc-900 uppercase tracking-wide italic">Gestión de <span className="text-indigo-600">Acceso</span></h2>
                    <p className="text-sm text-zinc-500">Cree cuentas para jefes de departamento y administradores directamente.</p>
                </div>
                <button
                    onClick={() => setIsAdding(true)}
                    className="flex items-center space-x-2 bg-black text-white px-5 py-2.5 rounded-xl font-bold hover:bg-zinc-800 transition-all shadow-xl active:scale-95"
                >
                    <UserPlus className="w-5 h-5" />
                    <span>NUEVO USUARIO</span>
                </button>
            </div>

            {/* Modal para Agregar Usuario */}
            {isAdding && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-[2rem] shadow-2xl max-w-lg w-full p-10 animate-in zoom-in duration-300 border border-zinc-200 overflow-y-auto max-h-[90vh]">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center space-x-4">
                                <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-200">
                                    <UserPlus className="w-6 h-6 text-white" />
                                </div>
                                <h3 className="text-2xl font-black text-zinc-900 uppercase tracking-tight italic">Alta de Usuario</h3>
                            </div>
                            <button onClick={() => setIsAdding(false)} className="p-2 hover:bg-zinc-100 rounded-full transition-colors"><X className="w-6 h-6 text-zinc-400" /></button>
                        </div>

                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Email Acceso</label>
                                    <div className="relative">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                                        <input
                                            type="email"
                                            placeholder="correo@ejemplo.com"
                                            className="w-full border-zinc-200 bg-zinc-50 rounded-xl pl-12 pr-4 py-3 text-sm font-bold focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                                            value={newForm.email}
                                            onChange={e => setNewForm({ ...newForm, email: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Password</label>
                                    <div className="relative">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                                        <input
                                            type="password"
                                            placeholder="Contraseña"
                                            className="w-full border-zinc-200 bg-zinc-50 rounded-xl pl-12 pr-4 py-3 text-sm font-bold focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                                            value={newForm.password}
                                            onChange={e => setNewForm({ ...newForm, password: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Nombre Completo</label>
                                <div className="relative">
                                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                                    <input
                                        type="text"
                                        placeholder="Nombre del usuario administrativo"
                                        className="w-full border-zinc-200 bg-zinc-50 rounded-xl pl-12 pr-4 py-3 text-sm font-bold focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                                        value={newForm.nombre_completo}
                                        onChange={e => setNewForm({ ...newForm, nombre_completo: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Rol de Acceso</label>
                                    <select
                                        className="w-full border-zinc-200 bg-zinc-50 rounded-xl px-4 py-3 text-sm font-bold focus:ring-indigo-500 outline-none"
                                        value={newForm.rol}
                                        onChange={e => setNewForm({ ...newForm, rol: e.target.value })}
                                    >
                                        <option value="Trabajador">Trabajador (Campo / Móvil)</option>
                                        <option value="Jefe">Jefe de Departamento</option>
                                        <option value="Administrativo">Administrador Full</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Vinculación Empleado</label>
                                    <select
                                        className="w-full border-zinc-200 bg-zinc-50 rounded-xl px-4 py-3 text-sm font-bold focus:ring-indigo-500 outline-none border-2 border-indigo-100"
                                        value={newForm.id_empleado}
                                        onChange={e => handleEmployeeChange(e.target.value)}
                                    >
                                        <option value="">Seleccionar Empleado a Vincular</option>
                                        {employees.map(e => (
                                            <option key={e.id_empleado} value={e.id_empleado}>{e.nombre} {e.apellido_paterno} ({e.numero_empleado})</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {newForm.rol === 'Jefe' && (
                                <div className="space-y-2 animate-in slide-in-from-top-2">
                                    <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Restringir a Departamento</label>
                                    <select
                                        className="w-full border-zinc-200 bg-zinc-50 rounded-xl px-4 py-3 text-sm font-bold focus:ring-indigo-500 outline-none"
                                        value={newForm.id_departamento}
                                        onChange={e => setNewForm({ ...newForm, id_departamento: e.target.value })}
                                    >
                                        <option value="">Global / Todos</option>
                                        {departments.map(d => (
                                            <option key={d.id_departamento} value={d.id_departamento}>{d.departamento}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>

                        <div className="mt-10">
                            <button
                                onClick={handleAddUser}
                                disabled={saving}
                                className="w-full bg-black text-white font-black py-4 rounded-2xl hover:bg-zinc-800 transition-all shadow-2xl active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 uppercase text-xs tracking-[0.2em]"
                            >
                                {saving ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Shield className="w-5 h-5" />}
                                Activar Acceso Terminal
                            </button>
                        </div>
                    </div>
                </div>
            )
            }

            <div className="bg-white rounded-[1.5rem] shadow-sm border border-zinc-200 overflow-hidden">
                <table className="min-w-full divide-y divide-zinc-100">
                    <thead className="bg-zinc-50/50 uppercase italic">
                        <tr>
                            <th className="px-6 py-5 text-left text-[10px] font-black text-zinc-400 tracking-[0.2em]">Usuario Identidad</th>
                            <th className="px-6 py-5 text-left text-[10px] font-black text-zinc-400 tracking-[0.2em]">Nivel</th>
                            <th className="px-6 py-5 text-left text-[10px] font-black text-zinc-400 tracking-[0.2em]">Departamento</th>
                            <th className="px-6 py-5 text-right text-[10px] font-black text-zinc-400 tracking-[0.2em]">Gestión</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-zinc-50">
                        {loading ? (
                            <tr><td colSpan={4} className="px-6 py-10 text-center text-zinc-400 font-bold italic">Sincronizando base de datos...</td></tr>
                        ) : profiles.map((p) => {
                            const isEditing = editingId === p.id
                            return (
                                <tr key={p.id} className="hover:bg-zinc-50/50 transition-colors group">
                                    <td className="px-6 py-5 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="h-10 w-10 rounded-xl bg-zinc-100 flex items-center justify-center mr-4 text-xs font-black text-zinc-400 border border-zinc-200 group-hover:bg-white group-hover:border-indigo-200 transition-all">
                                                {p.nombre_completo?.charAt(0) || <Mail className="w-4 h-4" />}
                                            </div>
                                            <div className="space-y-0.5">
                                                {isEditing ? (
                                                    <input
                                                        type="text"
                                                        value={editForm.nombre_completo}
                                                        onChange={e => setEditForm({ ...editForm, nombre_completo: e.target.value })}
                                                        className="border-zinc-300 rounded-md text-sm p-1 font-bold"
                                                    />
                                                ) : (
                                                    <div className="font-black text-zinc-900 uppercase tracking-tight">{p.nombre_completo || 'Sin nombre'}</div>
                                                )}
                                                <div className="text-[10px] text-zinc-400 font-medium tracking-wider flex items-center">
                                                   <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2"></span>
                                                    ID: {p.id.substring(0, 8)}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5 whitespace-nowrap text-sm">
                                        {isEditing ? (
                                            <select
                                                value={editForm.rol}
                                                onChange={e => setEditForm({ ...editForm, rol: e.target.value })}
                                                className="border-zinc-300 rounded-md text-xs p-1 font-bold"
                                            >
                                                <option value="Trabajador">Trabajador</option>
                                                <option value="Jefe">Jefe</option>
                                                <option value="Administrativo">Admin</option>
                                            </select>
                                        ) : (
                                            <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase border tracking-[0.1em] ${getRoleBadge(p.rol)}`}>
                                                {p.rol}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-5 whitespace-nowrap">
                                        {isEditing ? (
                                            <select
                                                value={editForm.id_departamento}
                                                onChange={e => setEditForm({ ...editForm, id_departamento: e.target.value })}
                                                className="border-zinc-300 rounded-md text-xs p-1 w-full"
                                                disabled={editForm.rol !== 'Jefe'}
                                            >
                                                <option value="">Todos</option>
                                                {departments.map(d => (
                                                    <option key={d.id_departamento} value={d.id_departamento}>{d.departamento}</option>
                                                ))}
                                            </select>
                                        ) : (
                                            <div className="flex items-center text-xs font-bold text-zinc-500">
                                                <Building className="w-3.5 h-3.5 mr-2 text-zinc-300" />
                                                {p.cat_departamentos?.departamento || <span className="text-zinc-300 font-normal">Acceso Global</span>}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-5 whitespace-nowrap text-right text-sm">
                                        {isEditing ? (
                                            <div className="flex justify-end space-x-2">
                                                <button onClick={saveEdit} className="p-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 shadow-md"><Check className="w-4 h-4" /></button>
                                                <button onClick={() => setEditingId(null)} className="p-2 bg-zinc-200 text-zinc-600 rounded-lg hover:bg-zinc-300"><X className="w-4 h-4" /></button>
                                            </div>
                                        ) : (
                                            <div className="flex justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => startEdit(p)} className="p-2 bg-white text-zinc-400 border border-zinc-200 rounded-xl hover:text-indigo-600 hover:border-indigo-200 transition-all">
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => deleteUser(p.id)} className="p-2 bg-white text-zinc-400 border border-zinc-200 rounded-xl hover:text-red-600 hover:border-red-200 transition-all">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            <div className="bg-amber-50 rounded-2xl border border-amber-200 p-8 shadow-inner overflow-hidden relative">
                <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12 pointer-events-none">
                    <Shield className="w-32 h-32 text-amber-600" />
                </div>
                <div className="flex space-x-6 relative z-10">
                    <div className="shrink-0 w-12 h-12 bg-amber-200 rounded-full flex items-center justify-center">
                        <Shield className="w-6 h-6 text-amber-700" />
                    </div>
                    <div>
                        <h3 className="font-black text-amber-900 uppercase italic tracking-tighter text-lg">Jerarquía de Seguridad</h3>
                        <p className="text-sm text-amber-800/80 leading-relaxed mt-2 max-w-2xl font-medium">
                            Los <strong>Administradores</strong> poseen omnipotencia sobre la configuración global y personal. 
                            Los <strong>Jefes de Departamento</strong> operan bajo restricción, visualizando únicamente métricas y autorizaciones vinculadas a sus áreas asignadas.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
