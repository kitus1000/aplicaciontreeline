'use client'

import { useState, useEffect } from 'react'
import { Clock, Plus, Trash2, CalendarDays, ArrowLeft, Edit, X } from 'lucide-react'
import Link from 'next/link'
import { supabase } from '@/utils/supabase/client'
import { useI18n } from '@/lib/i18n'

export default function TurnosPage() {
    const { t, language } = useI18n()
    const [turnos, setTurnos] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [fetchError, setFetchError] = useState<string | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [editId, setEditId] = useState<string | null>(null)

    // Formulario Nuevo Turno
    const [form, setForm] = useState({
        nombre: '',
        hora_inicio: '08:00',
        hora_fin: '17:00',
        tolerancia_min: 15,
        limite_falta_min: 60,
        ventana_desde: '04:00',
        ventana_hasta: '12:00'
    })

    useEffect(() => {
        fetchTurnos()
    }, [])

    async function fetchTurnos() {
        setLoading(true)
        setFetchError(null)
        try {
            const res = await fetch('/api/turnos')
            const data = await res.json()
            if (Array.isArray(data)) {
                setTurnos(data)
            } else {
                setFetchError(data.error || (language === 'es' ? 'Respuesta inesperada del servidor' : 'Unexpected server response'))
                setTurnos([])
            }
        } catch (error: any) {
            console.error(error)
            setFetchError(language === 'es' ? 'Error de red' : 'Network error')
            setTurnos([])
        } finally {
            setLoading(false)
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setIsSubmitting(true)

        if (editId) {
            try {
                const { error } = await supabase.from('turnos').update(form).eq('id', editId)
                if (error) throw error
                cancelEdit()
                fetchTurnos()
            } catch (error: any) {
                alert(t('save_shift_error') + ': ' + error.message)
            } finally {
                setIsSubmitting(false)
            }
            return
        }

        try {
            const res = await fetch('/api/turnos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            })
            const result = await res.json()
            if (result.ok) {
                cancelEdit()
                fetchTurnos()
            } else {
                alert(t('save_shift_error') + ': ' + result.error)
            }
        } catch (error) {
            alert(language === 'es' ? 'Error de conectividad' : 'Connectivity error')
        } finally {
            setIsSubmitting(false)
        }
    }

    function loadToEdit(t: any) {
        setEditId(t.id)
        setForm({
            nombre: t.nombre,
            hora_inicio: t.hora_inicio.slice(0, 5),
            hora_fin: t.hora_fin.slice(0, 5),
            tolerancia_min: t.tolerancia_min,
            limite_falta_min: t.limite_falta_min || 60,
            ventana_desde: t.ventana_desde.slice(0, 5),
            ventana_hasta: t.ventana_hasta.slice(0, 5)
        })
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    function cancelEdit() {
        setEditId(null)
        setForm({
            nombre: '',
            hora_inicio: '08:00',
            hora_fin: '17:00',
            tolerancia_min: 15,
            limite_falta_min: 60,
            ventana_desde: '04:00',
            ventana_hasta: '12:00'
        })
    }

    async function eliminarTurno(id: string) {
        if (!confirm(t('delete_shift_confirm'))) return
        try {
            const res = await fetch(`/api/turnos?id=${id}`, { method: 'DELETE' })
            const result = await res.json()
            if (result.ok) {
                fetchTurnos()
            } else {
                alert(t('delete_shift_error') + ': ' + result.error)
            }
        } catch (error) {
            console.error(error)
        }
    }

    return (
        <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in">
            <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-zinc-200">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <Link href="/catalogos" className="p-2 hover:bg-zinc-100 rounded-full transition-colors text-zinc-500 hover:text-zinc-900 border border-zinc-200 shadow-sm bg-white">
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <h1 className="text-2xl font-bold text-zinc-900 flex items-center gap-2">
                            <CalendarDays className="w-6 h-6 text-indigo-600" />
                            {t('shifts_title')}
                        </h1>
                    </div>
                    <p className="text-sm text-zinc-500 mt-1 ml-[52px]">{t('shifts_subtitle')}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* Formulario Crear Turno */}
                <div className="col-span-1 bg-white p-6 rounded-lg border border-zinc-200 shadow-sm h-fit">
                    <div className="flex items-center justify-between border-b pb-2 mb-4">
                        <h2 className="text-lg font-bold text-zinc-800 flex items-center gap-2">
                            {editId ? <><Edit className="w-4 h-4 text-amber-600" /> {t('edit_shift')}</> : <><Plus className="w-4 h-4 text-green-600" /> {t('create_shift')}</>}
                        </h2>
                        {editId && (
                            <button onClick={cancelEdit} className="text-xs text-zinc-500 hover:text-red-600 flex items-center">
                                <X className="w-3 h-3 mr-1" /> {t('cancel')}
                            </button>
                        )}
                    </div>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-zinc-600 uppercase mb-1">{t('shift_name')}</label>
                            <input
                                required
                                type="text"
                                className="w-full text-black rounded-md border-zinc-300 text-sm focus:ring-black focus:border-black"
                                value={form.nombre}
                                onChange={e => setForm({ ...form, nombre: e.target.value })}
                                placeholder={t('shift_name_placeholder')}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-zinc-600 uppercase mb-1">{t('check_in_time')}</label>
                                <input
                                    required
                                    type="time"
                                    className="w-full text-black rounded-md border-zinc-300 text-sm focus:ring-black focus:border-black"
                                    value={form.hora_inicio}
                                    onChange={e => setForm({ ...form, hora_inicio: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-zinc-600 uppercase mb-1">{t('check_out_time')}</label>
                                <input
                                    required
                                    type="time"
                                    className="w-full text-black rounded-md border-zinc-300 text-sm focus:ring-black focus:border-black"
                                    value={form.hora_fin}
                                    onChange={e => setForm({ ...form, hora_fin: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-zinc-600 uppercase mb-1">{t('tolerance_label')}</label>
                                <input
                                    required
                                    type="number"
                                    min={0}
                                    className="w-full text-black rounded-md border-zinc-300 text-sm focus:ring-black focus:border-black"
                                    value={form.tolerancia_min}
                                    onChange={e => setForm({ ...form, tolerancia_min: Number(e.target.value) })}
                                />
                                <p className="text-[10px] text-zinc-500 mt-1">{t('tolerance_desc')}</p>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-zinc-600 uppercase mb-1">{t('absence_limit_label')}</label>
                                <input
                                    required
                                    type="number"
                                    min={0}
                                    className="w-full text-black rounded-md border-zinc-300 text-sm focus:ring-black focus:border-black"
                                    value={form.limite_falta_min}
                                    onChange={e => setForm({ ...form, limite_falta_min: Number(e.target.value) })}
                                />
                                <p className="text-[10px] text-red-500 mt-1 font-medium">{t('absence_limit_desc')}</p>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className={`w-full flex justify-center items-center text-white font-bold py-2 px-4 rounded-md transition-colors disabled:opacity-50 mt-2 shadow-sm ${editId ? 'bg-amber-600 hover:bg-amber-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                        >
                            {isSubmitting ? t('saving') : editId ? t('update_shift') : t('save_shift')}
                        </button>
                    </form>
                </div>

                {/* Lista de Turnos */}
                <div className="col-span-1 md:col-span-2">
                    <div className="bg-white rounded-lg border border-zinc-200 shadow-sm overflow-hidden">
                        <table className="min-w-full divide-y divide-zinc-200 text-left">
                            <thead className="bg-zinc-50">
                                <tr>
                                    <th className="px-6 py-3 text-xs font-bold text-zinc-500 uppercase tracking-wider">{t('name')}</th>
                                    <th className="px-6 py-3 text-xs font-bold text-zinc-500 uppercase tracking-wider">{t('time')}</th>
                                    <th className="px-6 py-3 text-xs font-bold text-zinc-500 uppercase tracking-wider">{t('tolerance_label')}</th>
                                    <th className="px-6 py-3 text-xs font-bold text-zinc-500 uppercase tracking-wider">{t('absence_limit_label')}</th>
                                    <th className="px-6 py-3 text-right text-xs font-bold text-zinc-500 uppercase tracking-wider">{t('actions')}</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-zinc-200">
                                {loading ? (
                                    <tr><td colSpan={5} className="px-6 py-4 text-center text-sm text-zinc-500">{t('loading_shifts')}</td></tr>
                                ) : fetchError ? (
                                    <tr><td colSpan={5} className="px-6 py-4 text-center text-sm text-red-500 font-medium">{fetchError}</td></tr>
                                ) : turnos.length === 0 ? (
                                    <tr><td colSpan={5} className="px-6 py-4 text-center text-sm text-zinc-500 font-medium italic">{t('no_shifts')}</td></tr>
                                ) : (
                                    turnos.map(t_item => (
                                        <tr key={t_item.id} className="hover:bg-zinc-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-zinc-900">{t_item.nombre}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center space-x-2 text-sm text-zinc-700 font-medium">
                                                    <Clock className="w-4 h-4 text-indigo-500" />
                                                    <span>{t_item.hora_inicio.slice(0, 5)} a {t_item.hora_fin.slice(0, 5)}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                                                    {t_item.tolerancia_min} min.
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
                                                    {'>'} {t_item.limite_falta_min || 60} min.
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end space-x-2">
                                                    <button onClick={() => loadToEdit(t_item)} className="text-zinc-400 hover:text-amber-600 transition-colors p-2 rounded-md hover:bg-amber-50">
                                                        <Edit className="w-5 h-5" />
                                                    </button>
                                                    <button onClick={() => eliminarTurno(t_item.id)} className="text-zinc-400 hover:text-red-600 transition-colors p-2 rounded-md hover:bg-red-50">
                                                        <Trash2 className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </div>
    )
}
