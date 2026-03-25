'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/utils/supabase/client'
import Link from 'next/link'
import { Save, Building, Upload, CheckCircle, Shield, Settings, Calendar as CalendarIcon, Database, Trash2, AlertCircle, Download, UserPlus, DollarSign } from 'lucide-react'
import { exportMultiSheetExcel, parseMultiSheetExcel } from '@/utils/excelUtils'
import { useI18n } from '@/lib/i18n'

export default function ConfiguracionPage() {
    const { t } = useI18n()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [configId, setConfigId] = useState<string | null>(null)
    const backupInputRef = useRef<HTMLInputElement>(null)

    const [formData, setFormData] = useState({
        nombre_empresa: '',
        rfc: '',
        direccion: '',
        registro_patronal: '',
        logo_base64: ''
    })

    useEffect(() => {
        fetchConfig()
    }, [])

    async function fetchConfig() {
        setLoading(true)
        const { data, error } = await supabase
            .from('configuracion_empresa')
            .select('*')
            .limit(1)
            .single()

        if (data) {
            setConfigId(data.id)
            setFormData({
                nombre_empresa: data.nombre_empresa || '',
                rfc: data.rfc || '',
                direccion: data.direccion || '',
                registro_patronal: data.registro_patronal || '',
                logo_base64: data.logo_base64 || ''
            })
        }
        setLoading(false)
    }

    async function handleSave() {
        setSaving(true)
        try {
            const updates = {
                ...formData,
                actualizado_el: new Date().toISOString()
            }

            let error
            if (configId) {
                const { error: updateError } = await supabase
                    .from('configuracion_empresa')
                    .update(updates)
                    .eq('id', configId)
                error = updateError
            } else {
                // Fallback if table was empty
                const { error: insertError } = await supabase
                    .from('configuracion_empresa')
                    .insert(updates)
                error = insertError
            }

            if (error) throw error

            // Also update localStorage for immediate availability in other tabs/components
            localStorage.setItem('rh_config_empresa', JSON.stringify(updates))

            alert('Configuración guardada correctamente.')
        } catch (e: any) {
            alert('Error al guardar: ' + e.message)
        } finally {
            setSaving(false)
        }
    }

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            const reader = new FileReader()
            reader.onloadend = () => {
                setFormData({ ...formData, logo_base64: reader.result as string })
            }
            reader.readAsDataURL(file)
        }
    }

    async function handleFullBackup() {
        try {
            setSaving(true)
            const tables = [
                { name: 'Empleados', table: 'empleados' },
                { name: 'Departamentos', table: 'cat_departamentos' },
                { name: 'Puestos', table: 'cat_puestos' },
                { name: 'Tipos Checada', table: 'cat_tipos_checada' },
                { name: 'Turnos', table: 'turnos' },
                { name: 'Dispositivos', table: 'dispositivos_checadores' },
                { name: 'Asistencias', table: 'asistencias' },
                { name: 'Incidencias', table: 'empleado_incidencias' },
                { name: 'Checadas', table: 'checadas' },
                { name: 'Permisos', table: 'permisos_autorizados' },
                { name: 'Festivos', table: 'cat_festivos' }
            ]

            const sheets = await Promise.all(tables.map(async (t) => {
                const { data } = await supabase.from(t.table).select('*')
                return { name: t.name, data: data || [] }
            }))

            exportMultiSheetExcel(sheets, `respaldo_total_${new Date().toISOString().split('T')[0]}`)
            alert('Respaldo generado con éxito.')
        } catch (e: any) {
            alert('Error en el respaldo: ' + e.message)
        } finally {
            setSaving(false)
        }
    }

    async function handleFullImport(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return

        if (!confirm('⚠️ ADVERTENCIA: Esta acción intentará restaurar los datos del archivo. Se recomienda vaciar el sistema antes de importar para evitar duplicados. ¿Desea continuar?')) {
            if (backupInputRef.current) backupInputRef.current.value = ''
            return
        }

        try {
            setSaving(true)
            const sheets = await parseMultiSheetExcel(file)

            // Define restoration order to respect foreign keys and prevent duplicates
            const restoreOrder = [
                { name: 'Departamentos', table: 'cat_departamentos', conflict: 'id_departamento' },
                { name: 'Puestos', table: 'cat_puestos', conflict: 'id_puesto' },
                { name: 'Tipos Checada', table: 'cat_tipos_checada', conflict: 'id' },
                { name: 'Turnos', table: 'turnos', conflict: 'id' },
                { name: 'Dispositivos', table: 'dispositivos_checadores', conflict: 'id' },
                { name: 'Festivos', table: 'cat_festivos', conflict: 'id' },
                { name: 'Empleados', table: 'empleados', conflict: 'id_empleado' },
                { name: 'Asistencias', table: 'asistencias', conflict: 'id' },
                { name: 'Checadas', table: 'checadas', conflict: 'id' },
                { name: 'Permisos', table: 'permisos_autorizados', conflict: 'id' },
                { name: 'Incidencias', table: 'empleado_incidencias', conflict: 'id' }
            ]

            let importedCount = 0
            for (const item of restoreOrder) {
                const data = sheets[item.name]
                if (data && data.length > 0) {
                    const { error } = await supabase.from(item.table).upsert(data, { onConflict: (item as any).conflict })
                    if (error) {
                        console.error(`Error importando ${item.name}:`, error.message)
                    } else {
                        importedCount++
                    }
                }
            }

            alert(`Restauración finalizada. Se procesaron ${importedCount} tablas.`)
            window.location.reload()
        } catch (err: any) {
            alert('Error en la restauración: ' + err.message)
        } finally {
            setSaving(false)
            if (backupInputRef.current) backupInputRef.current.value = ''
        }
    }

    async function handleNuclearReset() {
        const confirmPhrase = "BORRAR TODO"
        const userInput = prompt(`⚠️ ADVERTENCIA: Esta acción borrará a todos los empleados y sus datos (historiales, asistencias, solicitudes).\n\nLos catálogos base (Departamentos, Festivos, Calendario) NO se borrarán para mantener la estructura.\n\nPara continuar, escriba exactamente: ${confirmPhrase}`)

        if (userInput !== confirmPhrase) {
            alert('Acción cancelada.')
            return
        }

        try {
            setSaving(true)
            const tablesToClear = [
                'empleado_incidencias',
                'empleado_adscripciones',
                'empleado_ingreso',
                'empleado_roles',
                'empleado_salarios',
                'empleado_banco',
                'empleado_domicilio',
                'asistencias',
                'solicitudes',
                'checadas',
                'permisos_autorizados',
                'vacaciones_saldos',
                'bajas',
                'empleados'
            ]

            // Todos estos usan id_empleado como llave principal o foránea para el borrado
            for (const table of tablesToClear) {
                const { error } = await supabase.from(table).delete().neq('id_empleado', '00000000-0000-0000-0000-000000000000')
                if (error && error.code !== 'PGRST116') {
                    console.warn(`Error clearing ${table}:`, error.message)
                }
            }

            alert('El sistema ha sido limpiado de personal y transacciones. La estructura base se mantiene intacta.')
            window.location.reload()
        } catch (e: any) {
            alert('Error en el reinicio: ' + e.message)
        } finally {
            setSaving(false)
        }
    }

    if (loading) return <div className="p-8 text-center text-zinc-500">Cargando configuración...</div>

    return (
        <div className="space-y-6 animate-in fade-in duration-500 max-w-4xl mx-auto">
            <div className="flex items-center justify-between border-b border-zinc-200 pb-6">
                <div>
                    <h2 className="text-2xl font-bold text-zinc-900 uppercase tracking-wide">{t('config_title')}</h2>
                    <p className="text-sm text-zinc-500">{t('config_desc')}</p>
                </div>
                <div className="flex items-center space-x-3">
                    <Link
                        href="/configuracion/sistema"
                        className="flex items-center space-x-2 bg-amber-50 text-amber-700 border border-amber-200 px-4 py-2 rounded-md font-bold hover:bg-amber-100 transition-colors"
                    >
                        <Settings className="w-4 h-4" />
                        <span>{t('sys_settings')}</span>
                    </Link>
                    <Link
                        href="/configuracion/festivos"
                        className="flex items-center space-x-2 bg-indigo-50 text-indigo-700 border border-indigo-200 px-4 py-2 rounded-md font-bold hover:bg-indigo-100 transition-colors"
                    >
                        <CalendarIcon className="w-4 h-4" />
                        <span>{t('holidays')}</span>
                    </Link>
                    <Link
                        href="/configuracion/reglas-pago"
                        className="flex items-center space-x-2 bg-emerald-50 text-emerald-700 border border-emerald-200 px-4 py-2 rounded-md font-bold hover:bg-emerald-100 transition-colors"
                    >
                        <DollarSign className="w-4 h-4" />
                        <span>TABULADOR</span>
                    </Link>
                    <Link
                        href="/configuracion/usuarios"
                        className="flex items-center space-x-2 bg-indigo-600 text-white px-4 py-2 rounded-md font-bold hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-600/20"
                    >
                        <UserPlus className="w-4 h-4" />
                        <span>GESTIÓN USUARIOS</span>
                    </Link>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center space-x-2 bg-black text-white px-6 py-2 rounded-md font-bold hover:bg-zinc-800 transition-colors disabled:opacity-50"
                    >
                        {saving ? <span className="animate-spin">⏳</span> : <Save className="w-5 h-5" />}
                        <span>{t('save_changes')}</span>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Logo Section */}
                <div className="md:col-span-1 space-y-4">
                    <label className="block text-sm font-bold text-zinc-700">{t('company_logo')}</label>
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-zinc-200 flex flex-col items-center justify-center text-center space-y-4 h-64">
                        {formData.logo_base64 ? (
                            <div className="relative w-full h-full flex items-center justify-center bg-zinc-50 rounded-lg p-4 overflow-hidden group">
                                <img src={formData.logo_base64} alt="Company Logo" className="max-w-full max-h-full object-contain" />
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <p className="text-white text-xs font-bold">{t('change_image')}</p>
                                </div>
                            </div>
                        ) : (
                            <div className="text-zinc-300 flex flex-col items-center">
                                <Building className="w-16 h-16 mb-2" />
                                <span className="text-xs">{t('no_logo')}</span>
                            </div>
                        )}
                        <label className="cursor-pointer bg-zinc-100 hover:bg-zinc-200 text-zinc-700 px-4 py-2 rounded-md text-sm font-medium transition-colors w-full flex items-center justify-center">
                            <Upload className="w-4 h-4 mr-2" />
                            {formData.logo_base64 ? t('replace') : t('upload_logo')}
                            <input type="file" onChange={handleLogoUpload} accept="image/*" className="hidden" />
                        </label>
                    </div>
                    <p className="text-xs text-zinc-400 text-center">{t('logo_recommendation')}</p>
                </div>

                {/* Form Fields */}
                <div className="md:col-span-2 space-y-6">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-zinc-200 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="col-span-2">
                                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">{t('company_name_label')}</label>
                                <input
                                    type="text"
                                    value={formData.nombre_empresa}
                                    onChange={e => setFormData({ ...formData, nombre_empresa: e.target.value })}
                                    className="w-full border-zinc-300 rounded-md focus:ring-black focus:border-black font-bold text-lg"
                                    placeholder="Ej. Mi Empresa S.A. de C.V."
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">{t('rfc')}</label>
                                <input
                                    type="text"
                                    value={formData.rfc}
                                    onChange={e => setFormData({ ...formData, rfc: e.target.value })}
                                    className="w-full border-zinc-300 rounded-md focus:ring-black focus:border-black uppercase bg-zinc-50"
                                    placeholder="XAXX010101000"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">{t('employer_registry')}</label>
                                <input
                                    type="text"
                                    value={formData.registro_patronal}
                                    onChange={e => setFormData({ ...formData, registro_patronal: e.target.value })}
                                    className="w-full border-zinc-300 rounded-md focus:ring-black focus:border-black uppercase bg-zinc-50"
                                    placeholder="A000000000"
                                />
                            </div>

                            <div className="col-span-2">
                                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">{t('fiscal_address')}</label>
                                <textarea
                                    rows={3}
                                    value={formData.direccion}
                                    onChange={e => setFormData({ ...formData, direccion: e.target.value })}
                                    className="w-full border-zinc-300 rounded-md focus:ring-black focus:border-black bg-zinc-50"
                                    placeholder="Calle, Número, Colonia, Ciudad, Estado, CP"
                                />
                            </div>
                        </div>

                        <div className="bg-amber-50 p-4 rounded-lg flex items-start">
                            <CheckCircle className="w-5 h-5 text-amber-600 mt-0.5 mr-2" />
                            <div>
                                <h4 className="text-sm font-bold text-amber-800">{t('data_usage')}</h4>
                                <p className="text-xs text-amber-700 mt-1">{t('data_usage_desc')}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Maintenance Section */}
            <div className="mt-12 border-t border-zinc-200 pt-12">
                <div className="flex items-center space-x-2 mb-6">
                    <Database className="w-6 h-6 text-zinc-400" />
                    <h3 className="text-xl font-bold text-zinc-900 uppercase tracking-wide">{t('data_maintenance')}</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-xl border border-zinc-200 flex items-center justify-between group hover:border-zinc-300 transition-all">
                        <div className="flex items-center space-x-4">
                            <div className="p-3 bg-zinc-50 rounded-lg group-hover:bg-zinc-100 transition-colors">
                                <Download className="w-6 h-6 text-zinc-600" />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-zinc-900">{t('full_backup')}</h4>
                                <p className="text-xs text-zinc-500">{t('full_backup_desc')}</p>
                            </div>
                        </div>
                        <button
                            onClick={handleFullBackup}
                            className="bg-zinc-900 text-white px-4 py-2 rounded-md text-xs font-bold hover:bg-zinc-800 transition-colors"
                        >
                            {t('export_all')}
                        </button>
                    </div>

                    <div className="bg-red-50 p-6 rounded-xl border border-red-100 flex items-center justify-between group hover:border-red-200 transition-all">
                        <div className="flex items-center space-x-4">
                            <div className="p-3 bg-red-100 rounded-lg group-hover:bg-red-200 transition-colors">
                                <Trash2 className="w-6 h-6 text-red-600" />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-red-900">{t('nuclear_reset')}</h4>
                                <p className="text-xs text-red-600/70">{t('nuclear_reset_desc')}</p>
                            </div>
                        </div>
                        <button
                            onClick={handleNuclearReset}
                            className="bg-red-600 text-white px-4 py-2 rounded-md text-xs font-bold hover:bg-red-700 transition-colors shadow-sm"
                        >
                            {t('delete_all')}
                        </button>
                    </div>

                    <div className="bg-white p-6 rounded-xl border border-zinc-200 flex items-center justify-between group hover:border-zinc-300 transition-all">
                        <div className="flex items-center space-x-4">
                            <div className="p-3 bg-zinc-50 rounded-lg group-hover:bg-zinc-100 transition-colors">
                                <Upload className="w-6 h-6 text-emerald-600" />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-zinc-900">{t('import_backup')}</h4>
                                <p className="text-xs text-zinc-500">{t('import_backup_desc')}</p>
                            </div>
                        </div>
                        <input
                            type="file"
                            ref={backupInputRef}
                            className="hidden"
                            accept=".xlsx, .xls"
                            onChange={handleFullImport}
                        />
                        <button
                            onClick={() => backupInputRef.current?.click()}
                            className="bg-emerald-600 text-white px-4 py-2 rounded-md text-xs font-bold hover:bg-emerald-700 transition-colors shadow-sm"
                        >
                            {t('import_all')}
                        </button>
                    </div>

                    <div className="bg-gradient-to-br from-indigo-50 to-white p-6 rounded-xl border-2 border-indigo-100 flex items-center justify-between group hover:border-indigo-300 transition-all shadow-md">
                        <div className="flex items-center space-x-4">
                            <div className="p-3 bg-white rounded-lg group-hover:bg-indigo-50 transition-colors shadow-sm">
                                <UserPlus className="w-6 h-6 text-indigo-600" />
                            </div>
                            <div>
                                <h4 className="text-sm font-black text-zinc-900 uppercase tracking-tight italic">Gestión de Accesos</h4>
                                <p className="text-xs text-zinc-500">Crear usuarios para Trabajadores y Jefes.</p>
                            </div>
                        </div>
                        <Link
                            href="/configuracion/usuarios"
                            className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl text-xs font-black hover:bg-indigo-500 transition-all shadow-lg uppercase tracking-widest"
                        >
                            GESTIONAR
                        </Link>
                    </div>
                </div>

                <div className="mt-4 p-4 bg-zinc-50 rounded-lg flex items-start border border-zinc-100">
                    <AlertCircle className="w-5 h-5 text-zinc-400 mt-0.5 mr-2" />
                    <p className="text-[10px] text-zinc-500 italic">
                        Nota: {t('reset_note')}
                    </p>
                </div>
            </div>
        </div>
    )
}
