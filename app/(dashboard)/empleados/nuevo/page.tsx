'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, User, MapPin, Briefcase } from 'lucide-react'
import Link from 'next/link'
import { useI18n } from '@/lib/i18n'

export default function NuevoEmpleadoPage() {
    const { t, language } = useI18n()
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [activeTab, setActiveTab] = useState('personal')
    const [turnosDisponibles, setTurnosDisponibles] = useState<any[]>([])
    const [tiposRol, setTiposRol] = useState<any[]>([])

    useEffect(() => {
        async function fetchCatalogs() {
            const { data: turnos } = await supabase.from('turnos').select('id, nombre, hora_inicio, hora_fin').eq('activo', true)
            setTurnosDisponibles(turnos || [])

            const { data: roles } = await supabase.from('cat_tipos_rol').select('id_tipo_rol, tipo_rol, dias_trabajo, dias_descanso').eq('activo', true)
            setTiposRol(roles || [])
        }
        fetchCatalogs()
    }, [])

    const [tipoAsignacion, setTipoAsignacion] = useState<'horario' | 'rol'>('horario')

    const [formData, setFormData] = useState({
        numero_empleado: '',
        nombre: '',
        apellido_paterno: '',
        apellido_materno: '',
        sexo: 'Masculino',
        fecha_nacimiento: '',
        curp: '',
        rfc: '',
        nss: '',
        telefono: '',
        correo_electronico: '',
        estado_civil: '',
        calle: '',
        numero_exterior: '',
        colonia: '',
        codigo_postal: '',
        municipio: '', 
        ciudad: '',
        estado: '',
        fecha_ingreso: '',
        banco: '',
        numero_cuenta: '',
        clabe: '',
        id_turno: '',
        id_tipo_rol: '',
        tipo_sueldo: 'dia'
    })

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value })
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.numero_empleado || !formData.nombre || !formData.apellido_paterno) {
            alert(language === 'es' ? 'Por favor complete los campos obligatorios (*)' : 'Please complete mandatory fields (*)')
            return
        }
        setLoading(true)

        try {
            // 1. Insertar Empleado
            const { data: empData, error: empError } = await supabase
                .from('empleados')
                .insert([{
                    numero_empleado: parseInt(formData.numero_empleado),
                    nombre: formData.nombre,
                    apellido_paterno: formData.apellido_paterno,
                    apellido_materno: formData.apellido_materno,
                    sexo: formData.sexo,
                    fecha_nacimiento: formData.fecha_nacimiento || null,
                    curp: formData.curp || null,
                    rfc: formData.rfc || null,
                    nss: formData.nss || null,
                    telefono: formData.telefono || null,
                    correo_electronico: formData.correo_electronico || null,
                    estado_civil: formData.estado_civil || null,
                    id_turno: tipoAsignacion === 'horario' ? (formData.id_turno || null) : null
                }])
                .select()
                .single()

            if (empError) throw empError
            const empId = empData.id_empleado

            // 1.5 Insertar Rol si aplica
            if (tipoAsignacion === 'rol' && formData.id_tipo_rol && formData.fecha_ingreso) {
                const { error: rolError } = await supabase.from('empleado_roles').insert([{
                    id_empleado: empId,
                    id_tipo_rol: formData.id_tipo_rol,
                    fecha_inicio: formData.fecha_ingreso
                }])
                if (rolError) throw rolError
            }

            // 2. Insertar Domicilio
            const { error: domError } = await supabase.from('empleado_domicilio').insert([{
                id_empleado: empId,
                calle: formData.calle,
                numero_exterior: formData.numero_exterior,
                colonia: formData.colonia,
                codigo_postal: formData.codigo_postal,
                ciudad: formData.ciudad,
                municipio: formData.municipio,
                estado: formData.estado
            }])
            if (domError) throw domError

            // 3. Insertar Ingreso
            if (formData.fecha_ingreso) {
                const { error: ingError } = await supabase.from('empleado_ingreso').insert([{
                    id_empleado: empId,
                    fecha_ingreso: formData.fecha_ingreso
                }])
                if (ingError) throw ingError
            }

            // 4. Insertar Regla de Pago Motor Worktrack
            const { error: rulesError } = await supabase.from('employee_pay_rules').insert([{
                employee_id: empId,
                scope_type: 'individual',
                payment_type: formData.tipo_sueldo,
                hourly_rate: 0, 
                daily_rate: 0,
                standard_hours: 8.0,
                active: true
            }])
            if (rulesError) throw rulesError

            // 5. Insertar Datos Bancarios
            if (formData.banco || formData.numero_cuenta || formData.clabe) {
                const { error: bankError } = await supabase.from('empleado_banco').insert([{
                    id_empleado: empId,
                    banco: formData.banco,
                    numero_cuenta: formData.numero_cuenta,
                    clabe: formData.clabe
                }])
                if (bankError) throw bankError
            }

            router.push('/empleados')
        } catch (error: any) {
            alert((language === 'es' ? 'Error al guardar: ' : 'Error saving: ') + error.message)
            setLoading(false) 
        }
    }

    return (
        <div className="max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-4">
                    <Link href="/empleados" className="p-2 rounded-full hover:bg-zinc-200 transition-colors">
                        <ArrowLeft className="h-6 w-6 text-zinc-600" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-zinc-900">{t('new_employee_title')}</h1>
                        <p className="text-sm text-zinc-500">{t('new_employee_subtitle')}</p>
                    </div>
                </div>
                <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="flex items-center px-6 py-2 bg-black text-white rounded-md shadow-lg hover:bg-zinc-800 transition-all disabled:opacity-50"
                >
                    <Save className="mr-2 h-4 w-4 text-amber-500" />
                    {loading ? t('saving') : t('save_employee')}
                </button>
            </div>

            {/* Tabs */}
            <div className="mb-6 border-b border-zinc-200">
                <nav className="-mb-px flex space-x-8">
                    {[
                        { id: 'personal', label: t('personal_info'), icon: User },
                        { id: 'domicilio', label: t('address'), icon: MapPin },
                        { id: 'bancario', label: t('bank_info'), icon: Briefcase },
                        { id: 'laboral', label: t('labor_info'), icon: Briefcase },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === tab.id
                                ? 'border-amber-500 text-amber-600'
                                : 'border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300'
                                }`}
                        >
                            <div className="flex items-center">
                                <tab.icon className="mr-2 h-4 w-4" />
                                {tab.label}
                            </div>
                        </button>
                    ))}
                </nav>
            </div>

            {/* Content Container */}
            <div className="bg-white rounded-lg shadow-sm border border-zinc-200 p-8">
                
                {/* Personal Tab */}
                {activeTab === 'personal' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-300">
                        <div className="col-span-1 md:col-span-3">
                            <h3 className="text-lg font-medium text-zinc-900 mb-4 border-b pb-2">{t('identity')}</h3>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-zinc-700">{t('employee_number')} *</label>
                            <input type="number" name="numero_empleado" value={formData.numero_empleado} onChange={handleChange} className="mt-1 block w-full rounded-md border-zinc-300 shadow-sm focus:border-amber-500 focus:ring-amber-500 sm:text-sm border p-2 text-zinc-900" />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-zinc-700">{t('first_name')} *</label>
                            <input type="text" name="nombre" value={formData.nombre} onChange={handleChange} className="mt-1 block w-full rounded-md border-zinc-300 shadow-sm focus:border-amber-500 focus:ring-amber-500 sm:text-sm border p-2 text-zinc-900" />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-zinc-700">{t('paternal_surname')} *</label>
                            <input type="text" name="apellido_paterno" value={formData.apellido_paterno} onChange={handleChange} className="mt-1 block w-full rounded-md border-zinc-300 shadow-sm focus:border-amber-500 focus:ring-amber-500 sm:text-sm border p-2 text-zinc-900" />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-zinc-700">{t('maternal_surname')}</label>
                            <input type="text" name="apellido_materno" value={formData.apellido_materno} onChange={handleChange} className="mt-1 block w-full rounded-md border-zinc-300 shadow-sm focus:border-amber-500 focus:ring-amber-500 sm:text-sm border p-2 text-zinc-900" />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-zinc-700">{t('gender')}</label>
                            <select name="sexo" value={formData.sexo} onChange={handleChange} className="mt-1 block w-full rounded-md border-zinc-300 shadow-sm focus:border-amber-500 focus:ring-amber-500 sm:text-sm border p-2 text-zinc-900">
                                <option value="Masculino">{t('male')}</option>
                                <option value="Femenino">{t('female')}</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-zinc-700">{t('marital_status')}</label>
                            <select name="estado_civil" value={formData.estado_civil} onChange={handleChange} className="mt-1 block w-full rounded-md border-zinc-300 shadow-sm focus:border-amber-500 focus:ring-amber-500 sm:text-sm border p-2 text-zinc-900">
                                <option value="">{language === 'es' ? 'Seleccionar...' : 'Select...'}</option>
                                <option value="Soltero">{t('single')}</option>
                                <option value="Casado">{t('married')}</option>
                                <option value="Divorciado">{t('divorced')}</option>
                                <option value="Viudo">{t('widowed')}</option>
                                <option value="Union Libre">{t('free_union')}</option>
                            </select>
                        </div>

                        <div className="col-span-1 md:col-span-3 mt-4 border-t pt-4">
                            <h3 className="text-sm font-bold text-zinc-900 mb-4">{t('attendance_params')}</h3>
                            <div className="bg-zinc-50 p-4 rounded-lg border border-zinc-200">
                                <label className="block text-sm font-semibold text-zinc-900 mb-2">{t('assignment_type')}</label>
                                <div className="flex space-x-6">
                                    <label className="flex items-center space-x-2 cursor-pointer">
                                        <input type="radio" name="tipo_asignacion" value="horario" checked={tipoAsignacion === 'horario'} onChange={() => setTipoAsignacion('horario')} className="text-amber-600 focus:ring-amber-500" />
                                        <span className="text-sm font-medium text-zinc-700">{t('fixed_schedule')}</span>
                                    </label>
                                    <label className="flex items-center space-x-2 cursor-pointer">
                                        <input type="radio" name="tipo_asignacion" value="rol" checked={tipoAsignacion === 'rol'} onChange={() => setTipoAsignacion('rol')} className="text-blue-600 focus:ring-blue-500" />
                                        <span className="text-sm font-medium text-zinc-700">{t('guard_role')}</span>
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div className="col-span-1 md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Schedule Selector */}
                            {tipoAsignacion === 'horario' && (
                                <div className="bg-amber-50 p-4 rounded-md border border-amber-200">
                                    <label className="block text-sm font-medium text-amber-900 mb-1">{t('scheduled_shift')}</label>
                                    <select name="id_turno" value={formData.id_turno} onChange={handleChange} className="mt-1 block w-full rounded-md border-zinc-300 shadow-sm focus:border-amber-500 focus:ring-amber-500 sm:text-sm border p-2 text-zinc-900">
                                        <option value="">{t('free_schedule')}</option>
                                        {turnosDisponibles.map(t => (
                                            <option key={t.id} value={t.id}>
                                                {t.nombre} ({t.hora_inicio?.slice(0, 5)} a {t.hora_fin?.slice(0, 5) || t('free')})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Guard Role Selector */}
                            {tipoAsignacion === 'rol' && (
                                <div className="bg-blue-50 p-4 rounded-md border border-blue-200">
                                    <label className="block text-sm font-medium text-blue-900 mb-1">{t('assigned_role')}</label>
                                    <select name="id_tipo_rol" value={formData.id_tipo_rol} onChange={handleChange} className="mt-1 block w-full rounded-md border-zinc-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2 text-zinc-900">
                                        <option value="">{language === 'es' ? 'Seleccionar Rol...' : 'Select Role...'}</option>
                                        {tiposRol.map(r => (
                                            <option key={r.id_tipo_rol} value={r.id_tipo_rol}>
                                                {r.tipo_rol} — {r.dias_trabajo} {language === 'es' ? 'días' : 'days'}, {r.dias_descanso} {language === 'es' ? 'descanso' : 'rest'}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>

                        <div className="col-span-1 md:col-span-3 mt-4 border-t pt-4">
                            <h3 className="text-lg font-medium text-zinc-900 mb-4 border-b pb-2">{t('legal_contact')}</h3>
                        </div>

                        <div><label className="text-sm font-medium text-zinc-700">CURP</label><input type="text" name="curp" value={formData.curp} onChange={handleChange} className="mt-1 block w-full rounded-md border-zinc-300 border p-2 uppercase sm:text-sm" /></div>
                        <div><label className="text-sm font-medium text-zinc-700">RFC</label><input type="text" name="rfc" value={formData.rfc} onChange={handleChange} className="mt-1 block w-full rounded-md border-zinc-300 border p-2 uppercase sm:text-sm" /></div>
                        <div><label className="text-sm font-medium text-zinc-700">NSS</label><input type="text" name="nss" value={formData.nss} onChange={handleChange} className="mt-1 block w-full rounded-md border-zinc-300 border p-2 sm:text-sm" /></div>
                        <div><label className="text-sm font-medium text-zinc-700">Télefono</label><input type="tel" name="telefono" value={formData.telefono} onChange={handleChange} className="mt-1 block w-full rounded-md border-zinc-300 border p-2 sm:text-sm" /></div>
                        <div className="col-span-2"><label className="text-sm font-medium text-zinc-700">Correo Electrónico</label><input type="email" name="correo_electronico" value={formData.correo_electronico} onChange={handleChange} className="mt-1 block w-full rounded-md border-zinc-300 border p-2 sm:text-sm" /></div>
                    </div>
                )}

                {/* Domicilio Tab */}
                {activeTab === 'domicilio' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-300">
                        <div className="col-span-2"><label className="text-sm font-medium text-zinc-700">{t('street')}</label><input type="text" name="calle" value={formData.calle} onChange={handleChange} className="mt-1 block w-full rounded-md border-zinc-300 border p-2 sm:text-sm" /></div>
                        <div><label className="text-sm font-medium text-zinc-700">{t('ext_number')}</label><input type="text" name="numero_exterior" value={formData.numero_exterior} onChange={handleChange} className="mt-1 block w-full rounded-md border-zinc-300 border p-2 sm:text-sm" /></div>
                        <div><label className="text-sm font-medium text-zinc-700">{t('zip_code')}</label><input type="text" name="codigo_postal" value={formData.codigo_postal} onChange={handleChange} className="mt-1 block w-full rounded-md border-zinc-300 border p-2 sm:text-sm" /></div>
                        <div><label className="text-sm font-medium text-zinc-700">{t('neighborhood')}</label><input type="text" name="colonia" value={formData.colonia} onChange={handleChange} className="mt-1 block w-full rounded-md border-zinc-300 border p-2 sm:text-sm" /></div>
                        <div><label className="text-sm font-medium text-zinc-700">{t('city')}</label><input type="text" name="ciudad" value={formData.ciudad} onChange={handleChange} className="mt-1 block w-full rounded-md border-zinc-300 border p-2 sm:text-sm" /></div>
                        <div><label className="text-sm font-medium text-zinc-700">{t('municipality')}</label><input type="text" name="municipio" value={formData.municipio} onChange={handleChange} className="mt-1 block w-full rounded-md border-zinc-300 border p-2 sm:text-sm" /></div>
                        <div><label className="text-sm font-medium text-zinc-700">{t('state')}</label><input type="text" name="estado" value={formData.estado} onChange={handleChange} className="mt-1 block w-full rounded-md border-zinc-300 border p-2 sm:text-sm" /></div>
                    </div>
                )}

                {/* Bancario Tab */}
                {activeTab === 'bancario' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-300">
                        <div><label className="text-sm font-medium text-zinc-700">{t('bank')}</label><input type="text" name="banco" value={formData.banco} onChange={handleChange} className="mt-1 block w-full rounded-md border-zinc-300 border p-2 sm:text-sm" /></div>
                        <div><label className="text-sm font-medium text-zinc-700">{t('account_number')}</label><input type="text" name="numero_cuenta" value={formData.numero_cuenta} onChange={handleChange} className="mt-1 block w-full rounded-md border-zinc-300 border p-2 sm:text-sm" /></div>
                        <div className="col-span-2"><label className="text-sm font-medium text-zinc-700">{t('clabe')}</label><input type="text" name="clabe" value={formData.clabe} onChange={handleChange} className="mt-1 block w-full rounded-md border-zinc-300 border p-2 sm:text-sm" /></div>
                    </div>
                )}

                {/* Laboral Tab */}
                {activeTab === 'laboral' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-300">
                        <div>
                            <label className="block text-sm font-medium text-zinc-700">{t('hire_date')} *</label>
                            <input type="date" name="fecha_ingreso" value={formData.fecha_ingreso} onChange={handleChange} className="mt-1 block w-full rounded-md border-zinc-300 border p-2 block w-full sm:text-sm" />
                        </div>
                        
                        <div className="col-span-2 mt-4 border-t pt-4">
                            <h3 className="text-sm font-bold text-zinc-900 mb-4">{t('pay_scheme')}</h3>
                            <div className="bg-zinc-50 p-4 rounded-lg border border-zinc-200">
                                <div className="flex space-x-6">
                                    <label className="flex items-center space-x-2 cursor-pointer">
                                        <input type="radio" name="tipo_sueldo" value="dia" checked={formData.tipo_sueldo === 'dia'} onChange={() => setFormData({ ...formData, tipo_sueldo: 'dia' })} className="text-amber-600 focus:ring-amber-500" />
                                        <span className="text-sm font-medium text-zinc-700">{t('daily_pay')}</span>
                                    </label>
                                    <label className="flex items-center space-x-2 cursor-pointer">
                                        <input type="radio" name="tipo_sueldo" value="hora" checked={formData.tipo_sueldo === 'hora'} onChange={() => setFormData({ ...formData, tipo_sueldo: 'hora' })} className="text-blue-600 focus:ring-blue-500" />
                                        <span className="text-sm font-medium text-zinc-700">{t('hourly_pay')}</span>
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div className="col-span-1 md:col-span-2 p-4 bg-zinc-50 border border-zinc-200 rounded-md">
                            <p className="text-xs text-zinc-600 italic">
                                <strong>{language === 'es' ? 'Nota' : 'Note'}:</strong> {t('pay_rules_note')}
                            </p>
                        </div>

                        <div className="col-span-1 md:col-span-2 p-4 bg-amber-50 border border-amber-200 rounded-md">
                            <p className="text-xs text-amber-800 italic">
                                <strong>{language === 'es' ? 'Nota' : 'Note'}:</strong> {t('admissions_note')}
                            </p>
                        </div>
                    </div>
                )}

            </div>
        </div>
    )
}
