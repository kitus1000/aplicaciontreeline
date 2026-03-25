'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/utils/supabase/client'
import { useI18n } from '@/lib/i18n'
import { 
  Save, 
  Trash2, 
  UserPlus, 
  Globe, 
  User, 
  Clock, 
  DollarSign, 
  ArrowLeft,
  Search,
  CheckCircle2,
  AlertCircle
} from 'lucide-react'
import { cn } from '@/utils/cn'

export default function PaymentRulesPage() {
  const { t } = useI18n()
  const [loading, setLoading] = useState(true)
  const [globalRule, setGlobalRule] = useState<any>(null)
  const [overrides, setOverrides] = useState<any[]>([])
  const [employees, setEmployees] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddOverride, setShowAddOverride] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState('')
  const [newOverrideData, setNewOverrideData] = useState<any>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  
  // Inline Editing State
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<any>(null)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    try {
      // 1. Fetch Global Rule
      const { data: globalData, error: globalErr } = await supabase
        .from('employee_pay_rules')
        .select('*')
        .eq('scope_type', 'global')
        .maybeSingle()

      if (globalData) {
        setGlobalRule(globalData)
      } else {
        // Create default global rule if not exists
        const defaultGlobal = {
          scope_type: 'global',
          payment_type: 'hora',
          hourly_rate: 0,
          daily_rate: 0,
          standard_hours: 8,
          overtime_threshold: 8,
          allow_overtime: true,
          rounding_rule: 'none',
          day_count_rule: 'minimum_hours',
          min_hours_for_day: 4,
          meal_discount_enabled: false,
          meal_discount_minutes: 0,
          approval_mode: 'daily',
          active: true
        }
        setGlobalRule(defaultGlobal)
      }

      // 2. Fetch Overrides
      const { data: overridesData } = await supabase
        .from('employee_pay_rules')
        .select('*, empleados(id_empleado, nombre, apellido_paterno, apellido_materno)')
        .eq('scope_type', 'individual')

      setOverrides(overridesData || [])

      // 3. Fetch Employees for dropdown
      const { data: empsData } = await supabase
        .from('empleados')
        .select('id_empleado, nombre, apellido_paterno, apellido_materno')
        .eq('estado_empleado', 'Activo')
      
      setEmployees(empsData || [])

    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveGlobal = async () => {
    try {
      // Clean payload: ignore ID and metadata to avoid conflicts if they are null or auto
      const { id, created_at, updated_at, ...payload } = globalRule
      
      const { error } = await supabase
        .from('employee_pay_rules')
        .upsert({
          ...payload,
          scope_type: 'global',
          employee_id: null
        }, { onConflict: 'scope_type,employee_id' })

      if (error) throw error
      setMessage({ type: 'success', text: t('success_attendance') })
      fetchData()
    } catch (e: any) {
      console.error(e)
      setMessage({ type: 'error', text: e.message || 'Error (RLS/Permissions)' })
    }
  }

  const handleAddOverride = async () => {
    try {
      const { error } = await supabase
        .from('employee_pay_rules')
        .insert(newOverrideData)

      if (error) throw error
      setShowAddOverride(false)
      fetchData()
      setMessage({ type: 'success', text: t('success_attendance') })
    } catch (e) {
      console.error(e)
      setMessage({ type: 'error', text: 'Error' })
    }
  }

  const handleUpdateOverride = async () => {
    if (!editForm || !editingId) return
    
    // Clean payload
    const { id: _id, created_at: _ca, updated_at: _ua, empleados: _emp, ...payload } = editForm

    try {
      const { error } = await supabase
        .from('employee_pay_rules')
        .update(payload)
        .eq('id', editingId)

      if (error) throw error
      setEditingId(null)
      fetchData()
      setMessage({ type: 'success', text: t('success_attendance') })
    } catch (e) {
      console.error(e)
      setMessage({ type: 'error', text: 'Error' })
    }
  }

  const handleDeleteOverride = async (id: string) => {
    if (!confirm('¿Seguro que deseas eliminar esta excepción?')) return
    try {
      const { error } = await supabase
        .from('employee_pay_rules')
        .delete()
        .eq('id', id)

      if (error) throw error
      fetchData()
    } catch (e) {
      console.error(e)
    }
  }

  if (loading) return <div className="p-8 text-center">{t('loading')}</div>

  return (
    <div className="max-w-6xl mx-auto pb-20">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{t('menu_payment_rules')}</h1>
          <p className="text-slate-500 mt-1">{t('daily_summary_desc')}</p>
        </div>
      </div>

      {message && (
        <div className={cn(
          "mb-6 p-4 rounded-lg flex items-center space-x-3 shadow-sm border animate-in fade-in slide-in-from-top-4",
          message.type === 'success' ? "bg-green-50 border-green-200 text-green-700" : "bg-red-50 border-red-200 text-red-700"
        )}>
          {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <p className="font-medium">{message.text}</p>
          <button onClick={() => setMessage(null)} className="ml-auto text-slate-400 hover:text-slate-600">×</button>
        </div>
      )}

      {/* Global Rules Section */}
      <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-10">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Globe className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-slate-800 uppercase tracking-wider">{t('global_rules')}</h2>
          </div>
          <button 
            onClick={handleSaveGlobal}
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all font-medium shadow-sm hover:shadow-indigo-500/20"
          >
            <Save className="w-4 h-4 mr-2" />
            {t('save')}
          </button>
        </div>
        
        <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-4">
            <label className="block text-sm font-semibold text-slate-700 uppercase tracking-tight">{t('payment_type')}</label>
            <select 
              value={globalRule.payment_type}
              onChange={(e) => setGlobalRule({...globalRule, payment_type: e.target.value})}
              className="w-full h-11 px-4 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all outline-none font-bold text-indigo-600"
            >
              <option value="hora">🕒 {t('pay_hour')}</option>
              <option value="dia">📅 {t('pay_day')}</option>
              <option value="mixto">🔄 {t('pay_mixed')}</option>
            </select>
            <p className="text-[10px] text-slate-400 italic">Determina si el cálculo base es por horas autorizadas o por días asistidos.</p>
          </div>

          <div className="space-y-4">
            <label className="block text-sm font-semibold text-slate-700 uppercase tracking-tight">{t('hourly_rate')}</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">$</span>
              <input 
                type="number"
                value={globalRule.hourly_rate}
                onChange={(e) => setGlobalRule({...globalRule, hourly_rate: parseFloat(e.target.value)})}
                className="w-full h-11 pl-8 pr-4 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
              />
            </div>
          </div>

          <div className="space-y-4">
            <label className="block text-sm font-semibold text-slate-700 uppercase tracking-tight">{t('daily_rate')}</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">$</span>
              <input 
                type="number"
                value={globalRule.daily_rate}
                onChange={(e) => setGlobalRule({...globalRule, daily_rate: parseFloat(e.target.value)})}
                className="w-full h-11 pl-8 pr-4 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
              />
            </div>
          </div>

          <div className="space-y-4">
            <label className="block text-sm font-semibold text-slate-700 uppercase tracking-tight">{t('standard_hours')}</label>
            <input 
              type="number"
              value={globalRule.standard_hours}
              onChange={(e) => setGlobalRule({...globalRule, standard_hours: parseFloat(e.target.value)})}
              className="w-full h-11 px-4 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
            />
          </div>

          <div className="space-y-4">
            <label className="block text-sm font-semibold text-slate-700 uppercase tracking-tight">{t('rounding')}</label>
            <select 
              value={globalRule.rounding_rule}
              onChange={(e) => setGlobalRule({...globalRule, rounding_rule: e.target.value})}
              className="w-full h-11 px-4 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
            >
              <option value="none">{t('none')}</option>
              <option value="15min">{t('r_15')}</option>
              <option value="30min">{t('r_30')}</option>
              <option value="1hour">{t('r_60')}</option>
            </select>
          </div>

          <div className="space-y-4">
            <label className="block text-sm font-semibold text-slate-700 uppercase tracking-tight">{t('approval_mode')}</label>
            <select 
              value={globalRule.approval_mode}
              onChange={(e) => setGlobalRule({...globalRule, approval_mode: e.target.value})}
              className="w-full h-11 px-4 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
            >
              <option value="daily">{t('daily')}</option>
              <option value="weekly">{t('weekly')}</option>
            </select>
          </div>
        </div>
      </section>

      {/* Overrides Section */}
      <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <User className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-slate-800 uppercase tracking-wider">{t('individual_rules')}</h2>
          </div>
          <button 
            onClick={() => setShowAddOverride(true)}
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all font-medium shadow-sm"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            {t('add')}
          </button>
        </div>

        {showAddOverride && (
          <div className="p-6 bg-indigo-50 border-b border-indigo-100 animate-in slide-in-from-top-2 duration-200">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div className="space-y-2">
                <label className="text-xs font-bold text-indigo-900 uppercase tracking-widest">{t('menu_employees')}</label>
                <select 
                  value={selectedEmployee}
                  onChange={(e) => {
                    const empId = e.target.value
                    setSelectedEmployee(empId)
                    if (empId) {
                      const { id: _, created_at: __, updated_at: ___, empleados: ____, ...rest } = globalRule
                      setNewOverrideData({ ...rest, scope_type: 'individual', employee_id: empId })
                    }
                  }}
                  className="w-full h-10 px-3 rounded-lg border-indigo-200 bg-white text-sm outline-none"
                >
                  <option value="">{t('add')}...</option>
                  {employees
                    .filter(emp => !overrides.some(o => o.employee_id === emp.id_empleado))
                    .map(emp => (
                      <option key={emp.id_empleado} value={emp.id_empleado}>
                        {emp.nombre} {emp.apellido_paterno}
                      </option>
                    ))}
                </select>
              </div>

              {selectedEmployee && newOverrideData && (
                <>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-indigo-900 uppercase tracking-widest">{t('payment_type')}</label>
                    <select 
                      value={newOverrideData.payment_type}
                      onChange={e => setNewOverrideData({ ...newOverrideData, payment_type: e.target.value })}
                      className="w-full h-10 px-3 rounded-lg border-indigo-200 bg-white text-sm outline-none"
                    >
                      <option value="hora">{t('pay_hour')}</option>
                      <option value="dia">{t('pay_day')}</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-indigo-900 uppercase tracking-widest">{t('hourly_rate')}</label>
                    <input 
                      type="number"
                      value={newOverrideData.hourly_rate}
                      onChange={e => setNewOverrideData({ ...newOverrideData, hourly_rate: parseFloat(e.target.value) })}
                      className="w-full h-10 px-3 rounded-lg border-indigo-200 bg-white text-sm outline-none"
                    />
                  </div>
                  <div className="flex space-x-2">
                    <button 
                      onClick={handleAddOverride}
                      className="flex-1 h-10 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold uppercase text-[10px] tracking-widest"
                    >
                      {t('confirm')}
                    </button>
                    <button 
                      onClick={() => { setShowAddOverride(false); setSelectedEmployee(''); }}
                      className="h-10 px-4 bg-white text-indigo-600 border border-indigo-200 rounded-lg font-bold uppercase text-[10px] tracking-widest"
                    >
                      {t('cancel')}
                    </button>
                  </div>
                </>
              )}
            </div>
            {!selectedEmployee && (
              <button 
                onClick={() => setShowAddOverride(false)}
                className="mt-4 text-[10px] font-black uppercase text-indigo-600 tracking-tighter hover:underline"
              >
                ← {t('cancel')}
              </button>
            )}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{t('menu_employees')}</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{t('payment_type')}</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{t('hourly_rate')}</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{t('daily_rate')}</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {overrides.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">{t('no_payroll_data')}</td>
                </tr>
              ) : (
                overrides.map((override) => {
                  const isEditing = editingId === override.id
                  const data = isEditing ? editForm : override

                  return (
                    <tr key={override.id} className={cn("transition-colors", isEditing ? "bg-indigo-50/50" : "hover:bg-slate-50/50")}>
                      <td className="px-6 py-4 border-none">
                        <div className="flex items-center space-x-3">
                          <div className={cn("h-8 w-8 rounded-full flex items-center justify-center transition-colors", isEditing ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500")}>
                            <User className="w-4 h-4" />
                          </div>
                          <span className="font-semibold text-slate-700">
                            {override.empleados.nombre} {override.empleados.apellido_paterno}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 border-none">
                        {isEditing ? (
                          <select 
                            value={data.payment_type}
                            onChange={e => setEditForm({...data, payment_type: e.target.value})}
                            className="h-8 px-2 rounded border border-indigo-200 bg-white text-xs font-bold outline-none"
                          >
                            <option value="hora">{t('pay_hour')}</option>
                            <option value="dia">{t('pay_day')}</option>
                          </select>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                            {override.payment_type === 'hora' ? t('pay_hour') : override.payment_type === 'dia' ? t('pay_day') : t('pay_mixed')}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 border-none">
                        {isEditing ? (
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                            <input 
                              type="number"
                              value={data.hourly_rate}
                              onChange={e => setEditForm({...data, hourly_rate: parseFloat(e.target.value)})}
                              className="w-24 h-8 pl-5 pr-2 rounded border border-indigo-200 bg-white text-xs font-bold outline-none"
                            />
                          </div>
                        ) : (
                          <span className="font-medium text-slate-600">${override.hourly_rate}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 border-none">
                        {isEditing ? (
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                            <input 
                              type="number"
                              value={data.daily_rate}
                              onChange={e => setEditForm({...data, daily_rate: parseFloat(e.target.value)})}
                              className="w-24 h-8 pl-5 pr-2 rounded border border-indigo-200 bg-white text-xs font-bold outline-none"
                            />
                          </div>
                        ) : (
                          <span className="font-medium text-slate-600">${override.daily_rate}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 border-none">
                        <div className="flex items-center space-x-2">
                          {isEditing ? (
                            <>
                              <button 
                                onClick={handleUpdateOverride}
                                className="px-3 py-1 bg-indigo-600 text-white rounded text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all"
                              >
                                {t('save')}
                              </button>
                              <button 
                                onClick={() => setEditingId(null)}
                                className="px-3 py-1 bg-slate-200 text-slate-600 rounded text-[10px] font-black uppercase tracking-widest hover:bg-slate-300 transition-all"
                              >
                                {t('cancel')}
                              </button>
                            </>
                          ) : (
                            <>
                              <button 
                                onClick={() => { setEditingId(override.id); setEditForm({...override}); }}
                                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                title={t('edit')}
                              >
                                <Save className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => handleDeleteOverride(override.id)}
                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                title={t('delete')}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
