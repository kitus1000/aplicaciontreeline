'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/utils/supabase/client'
import { 
    Plus, 
    Search, 
    RefreshCw, 
    Upload, 
    Download, 
    FileSpreadsheet, 
    AlertCircle,
    Clock 
} from 'lucide-react'
import Link from 'next/link'
import { useI18n } from '@/lib/i18n'
import { downloadTemplate, parseExcelFile, exportToExcel } from '@/utils/excelUtils'

export default function EmpleadosPage() {
    const { t } = useI18n()
    const [empleados, setEmpleados] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [statusFilter, setStatusFilter] = useState('Activo')
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null)
    const [canManage, setCanManage] = useState(false)
    const [importing, setImporting] = useState(false)
    const [fetchError, setFetchError] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        checkPermissions()
        fetchEmpleados()
    }, [])

    async function checkPermissions() {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                const { data: profile } = await supabase
                    .from('perfiles')
                    .select('rol, cat_departamentos(departamento)')
                    .eq('id', user.id)
                    .single()

                if (profile) {
                    const role = profile.rol || ''
                    const isAdmin = ['Administrativo', 'Administrador', 'Admin', 'admin', 'hr'].includes(role.toLowerCase())
                    setCanManage(isAdmin)
                }
            }
        } catch (e) {
            setCanManage(false)
        }
    }

    async function fetchEmpleados() {
        try {
            const { data, error } = await supabase
                .from('empleados')
                .select(`
                    *,
                    empleado_adscripciones(
                        *,
                        cat_departamentos(departamento),
                        cat_puestos(puesto),
                        cat_unidades_trabajo(unidad_trabajo)
                    ),
                    empleado_ingreso(fecha_ingreso),
                    empleado_roles (
                        fecha_inicio,
                        cat_tipos_rol (tipo_rol, dias_trabajo, dias_descanso)
                    )
                `)
                .order('apellido_paterno', { ascending: true })

            if (error) {
                const { data: simpleData, error: simpleError } = await supabase
                    .from('empleados')
                    .select('*')
                    .order('apellido_paterno', { ascending: true })

                if (simpleError) throw simpleError
                setEmpleados(simpleData || [])
            } else {
                setEmpleados(data || [])
            }
        } catch (error: any) {
            setFetchError(error.message)
        } finally {
            setLoading(false)
        }
    }

    async function handleSync(id: string) {
        alert('Sincronización no implementada.')
    }

    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc'
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc'
        }
        setSortConfig({ key, direction })
    }

    const filteredEmpleados = empleados.filter(emp => {
        const matchesSearch =
            emp.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            emp.apellido_paterno?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            emp.numero_empleado?.toString().includes(searchTerm)

        const matchesStatus = statusFilter === 'Todos' ? true : emp.estado_empleado === statusFilter
        return matchesSearch && matchesStatus
    }).sort((a, b) => {
        if (!sortConfig) return 0
        const { key, direction } = sortConfig
        let valA = a[key] || ''
        let valB = b[key] || ''
        if (typeof valA === 'string') valA = valA.toLowerCase()
        if (typeof valB === 'string') valB = valB.toLowerCase()
        if (valA < valB) return direction === 'asc' ? -1 : 1
        if (valA > valB) return direction === 'asc' ? 1 : -1
        return 0
    })

    async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return
        setImporting(true)
        try {
            const data = await parseExcelFile(file)
            alert(`Parsed ${data.length} rows. Import logic pending full implementation in PRO theme.`)
        } catch (err: any) {
            alert(err.message)
        } finally {
            setImporting(false)
        }
    }

    function handleExport() {
        const cleanData = filteredEmpleados.map(emp => ({
            ID: emp.numero_empleado,
            Nombre: `${emp.nombre} ${emp.apellido_paterno}`,
            Email: emp.correo_electronico,
            Estado: emp.estado_empleado
        }))
        exportToExcel(cleanData, `directorio_${new Date().toISOString().split('T')[0]}`)
    }

    return (
        <div className="space-y-8 page-transition relative z-10 pb-20">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8 border-b border-white/5 pb-8">
                <div>
                    <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic">
                        Human <span className="text-indigo-400">Intelligence</span>
                    </h1>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-[0.3em] mt-1">{t('manage_employees_desc')}</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <button onClick={() => downloadTemplate('empleados')} className="flex-1 sm:flex-none inline-flex items-center px-4 py-2.5 glass border border-white/5 rounded-xl text-[10px] font-black text-slate-300 uppercase tracking-widest hover:bg-white/10 transition-all">
                        <FileSpreadsheet className="mr-2 h-4 w-4 text-emerald-400" />
                        {t('template')}
                    </button>
                    <button onClick={() => fileInputRef.current?.click()} disabled={importing} className="flex-1 sm:flex-none inline-flex items-center px-4 py-2.5 glass border border-white/5 rounded-xl text-[10px] font-black text-slate-300 uppercase tracking-widest hover:bg-white/10 transition-all">
                        <Upload className="mr-2 h-4 w-4 text-blue-400" />
                        {importing ? t('loading') : t('import')}
                    </button>
                    <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .xls" onChange={handleImport} />
                    <button onClick={handleExport} className="flex-1 sm:flex-none inline-flex items-center px-4 py-2.5 glass border border-white/5 rounded-xl text-[10px] font-black text-slate-300 uppercase tracking-widest hover:bg-white/10 transition-all">
                        <Download className="mr-2 h-4 w-4 text-amber-400" />
                        {t('export')}
                    </button>
                    <Link href="/horarios" className="flex-1 sm:flex-none inline-flex items-center px-4 py-2.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-500 hover:text-slate-950 transition-all">
                        <Clock className="mr-2 h-4 w-4" />
                        ⏱️ Horarios de Trabajo
                    </Link>
                    <Link href="/empleados/nuevo" className="flex-1 sm:flex-none inline-flex items-center px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-indigo-600/20 hover:bg-indigo-500 transition-all">
                        <Plus className="mr-2 h-4 w-4" />
                        {t('new_employee')}
                    </Link>
                </div>
            </div>

            <div className="flex flex-col md:flex-row items-center gap-4">
                <div className="relative flex-grow w-full">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-indigo-400" />
                    </div>
                    <input
                        type="text"
                        className="w-full h-14 form-pop rounded-2xl pl-12 pr-4 text-sm font-bold text-white outline-none border-white/5"
                        placeholder={t('search_employees_placeholder')}
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="w-full md:w-64">
                    <select
                        className="w-full h-14 form-pop rounded-2xl px-4 text-sm font-bold text-white outline-none border-white/5 appearance-none cursor-pointer"
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                    >
                        <option value="Activo">{t('filter_active')}</option>
                        <option value="Baja">{t('filter_inactive')}</option>
                        <option value="Todos">{t('filter_all')}</option>
                    </select>
                </div>
            </div>

            <div className="glass-dark rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-white/5">
                        <thead className="bg-white/2">
                            <tr>
                                <th className="px-8 py-5 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 cursor-pointer hover:text-white" onClick={() => handleSort('nombre')}>
                                    {t('table_employee')} {sortConfig?.key === 'nombre' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                </th>
                                <th className="px-8 py-5 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{t('table_current_role')}</th>
                                <th className="px-8 py-5 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{t('table_contact')}</th>
                                <th className="px-8 py-5 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 cursor-pointer hover:text-white" onClick={() => handleSort('estado_empleado')}>
                                    {t('table_status')} {sortConfig?.key === 'estado_empleado' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                </th>
                                <th className="px-8 py-5 text-right text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{t('table_actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading ? (
                                <tr><td colSpan={5} className="px-8 py-40 text-center"><div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div><p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.4em]">{t('loading_employees')}</p></td></tr>
                            ) : filteredEmpleados.length === 0 ? (
                                <tr><td colSpan={5} className="px-8 py-20 text-center text-slate-600 font-bold uppercase tracking-widest">{t('no_employees_found')}</td></tr>
                            ) : (
                                filteredEmpleados.map((empleado, idx) => {
                                    const activeRole = (empleado.empleado_roles || []).sort((a: any, b: any) => new Date(b.fecha_inicio).getTime() - new Date(a.fecha_inicio).getTime())[0]
                                    return (
                                        <tr key={empleado.id_empleado} className="hover:bg-white/2 transition-colors group animate-in slide-in-from-right-4" style={{ animationDelay: `${idx * 50}ms` }}>
                                            <td className="px-8 py-6 whitespace-nowrap">
                                                <div className="flex items-center space-x-4">
                                                    <div className="h-12 w-12 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-indigo-400 font-black text-sm group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-xl">
                                                        {empleado.nombre?.charAt(0)}{empleado.apellido_paterno?.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-black text-white tracking-tight">{empleado.nombre} {empleado.apellido_paterno}</div>
                                                        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">#{empleado.numero_empleado}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 whitespace-nowrap">
                                                {activeRole ? (
                                                    <span className="inline-flex items-center px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">{activeRole.cat_tipos_rol.tipo_rol}</span>
                                                ) : <span className="text-[9px] text-slate-600 font-bold uppercase italic">{t('unassigned')}</span>}
                                            </td>
                                            <td className="px-8 py-6 whitespace-nowrap">
                                                <div className="text-[11px] font-bold text-slate-300">{empleado.correo_electronico}</div>
                                                <div className="text-[10px] text-slate-500 font-bold mt-0.5">{empleado.telefono}</div>
                                            </td>
                                            <td className="px-8 py-6 whitespace-nowrap">
                                                <span className={`inline-flex px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${empleado.estado_empleado === 'Activo' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                                                    {empleado.estado_empleado}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6 whitespace-nowrap text-right">
                                                <div className="flex items-center justify-end space-x-3">
                                                    <Link href={`/empleados/${empleado.id_empleado}`} className="text-[10px] font-black text-indigo-400 hover:text-white hover:bg-indigo-600 px-4 py-2 rounded-xl border border-indigo-500/20 transition-all uppercase tracking-widest">
                                                        {t('view_profile')}
                                                    </Link>
                                                    <button onClick={() => handleSync(empleado.id_empleado)} className="p-2.5 text-slate-500 hover:text-amber-400 hover:bg-amber-500/10 rounded-xl transition-all border border-transparent hover:border-amber-500/20">
                                                        <RefreshCw className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <Link href="/empleados/nuevo" className="fixed bottom-12 right-12 h-20 w-20 bg-indigo-600 text-white rounded-[2rem] flex items-center justify-center shadow-2xl hover:bg-indigo-500 float-btn z-50 group border border-indigo-400/20 shadow-indigo-600/20">
                <Plus className="h-10 w-10 group-hover:rotate-90 transition-transform duration-500" />
            </Link>
        </div>
    )
}
