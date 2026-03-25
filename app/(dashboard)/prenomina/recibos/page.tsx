'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/utils/supabase/client'
import { useI18n } from '@/lib/i18n'
import { 
  FileText, 
  Download, 
  Calendar as CalendarIcon, 
  DollarSign, 
  Clock, 
  ChevronRight,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns'
import { es, enUS } from 'date-fns/locale'

interface Receipt {
  id: string
  period_start: string
  period_end: string
  total_hours: number
  total_pay: number
  status: 'pending' | 'paid' | 'processed'
}

export default function ReceiptsPage() {
  const { t, language } = useI18n()
  const [loading, setLoading] = useState(true)
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [employee, setEmployee] = useState<any>(null)
  
  const locale = language === 'es' ? es : enUS

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase.from('perfiles').select('nombre_completo').eq('id', user.id).single()
      const { data: empData } = await supabase
        .from('empleados')
        .select('*')
        .or(`correo_electronico.eq.${user.email},nombre.ilike.%${profile?.nombre_completo}%`)
        .maybeSingle()

      if (!empData) return
      setEmployee(empData)

      // Mocking receipts for now based on workday_approval_status
      // In a real scenario, this would come from a 'payroll' or 'receipts' table
      const { data: workdays } = await supabase
        .from('workday_approval_status')
        .select('*')
        .eq('employee_id', empData.id_empleado)
        .eq('status', 'authorized')
        .order('date', { ascending: false })

      // Group by month to simulate receipts
      const months: Record<string, any> = {}
      workdays?.forEach(wd => {
        const monthKey = format(new Date(wd.date), 'MMMM yyyy', { locale })
        if (!months[monthKey]) {
          months[monthKey] = {
            id: wd.id,
            period_start: format(startOfMonth(new Date(wd.date)), 'yyyy-MM-dd'),
            period_end: format(endOfMonth(new Date(wd.date)), 'yyyy-MM-dd'),
            total_hours: 0,
            total_pay: 0,
            status: 'processed'
          }
        }
        months[monthKey].total_hours += 8 // Mock 8 hours per authorized day
        months[monthKey].total_pay += 8 * (empData.salario_diario || 15) // Mock pay
      })

      setReceipts(Object.values(months))
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto pb-20 space-y-8 page-transition">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-white/5 pb-8">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic">
            Earnings <span className="text-indigo-400">& Receipts</span>
          </h1>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-[0.3em] mt-1">Review your processed pay periods and documents.</p>
        </div>
        
        <div className="flex items-center gap-3">
           <div className="glass px-4 py-2 rounded-2xl flex items-center gap-2 border border-white/5">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              <span className="text-white font-black tabular-nums">$ {receipts.reduce((acc, r) => acc + r.total_pay, 0).toFixed(2)}</span>
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-2">YTD Earnings</span>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
         {/* Filters Sidebar */}
         <div className="space-y-6">
            <div className="glass-dark p-6 rounded-3xl border border-slate-800 space-y-6">
               <h3 className="text-[10px] font-black text-white uppercase tracking-[0.3em] flex items-center">
                  <Filter className="w-3.5 h-3.5 mr-2 text-indigo-400" />
                  Analysis Filter
               </h3>
               
               <div className="space-y-4">
                  <div className="space-y-2">
                     <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Financial Year</label>
                     <select className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-xs font-bold text-white outline-none focus:border-indigo-500">
                        <option>Current Year (2026)</option>
                        <option>Previous Year (2025)</option>
                     </select>
                  </div>
                  <div className="space-y-2">
                     <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Document Type</label>
                     <div className="space-y-2">
                        {['All Receipts', 'W-2 Forms', 'Tax Docs'].map(f => (
                           <div key={f} className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white cursor-pointer transition-colors">
                              <div className="w-1.5 h-1.5 rounded-full bg-indigo-500/50"></div>
                              {f}
                           </div>
                        ))}
                     </div>
                  </div>
               </div>
            </div>

            <div className="bg-indigo-600 rounded-3xl p-6 shadow-2xl relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-125 transition-transform duration-700">
                  <DollarSign className="w-20 h-20" />
               </div>
               <h4 className="text-white font-black text-lg leading-tight mb-2">Need Help with Payroll?</h4>
               <p className="text-indigo-100 text-[10px] font-bold uppercase tracking-widest mb-6">Contact Finance Support</p>
               <button className="bg-white text-indigo-600 w-full py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-slate-50 transition-all">
                  Open Ticket
               </button>
            </div>
         </div>

         {/* Receipts List */}
         <div className="md:col-span-3 space-y-6">
            {loading ? (
               <div className="py-40 text-center animate-pulse">
                  <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.4em]">Deciphering Payroll Data...</p>
               </div>
            ) : receipts.length === 0 ? (
               <div className="glass-dark border border-slate-800 rounded-3xl py-20 text-center space-y-4">
                  <FileText className="w-16 h-16 text-slate-700 mx-auto opacity-20" />
                  <p className="text-slate-500 text-sm font-black uppercase tracking-widest italic">No receipts issued yet.</p>
               </div>
            ) : (
               receipts.map((r, idx) => (
                  <div key={r.id} className="glass-dark rounded-3xl border border-white/5 p-6 hover:border-indigo-500/30 transition-all duration-500 group relative overflow-hidden animate-in slide-in-from-right-4 fade-in" style={{ animationDelay: `${idx * 100}ms` }}>
                     <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500/10 group-hover:bg-indigo-500 transition-all"></div>
                     <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-6">
                           <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center border border-slate-700 group-hover:bg-indigo-600 group-hover:border-indigo-400 transition-all duration-500">
                              <FileText className="w-8 h-8 text-indigo-400 group-hover:text-white transition-colors" />
                           </div>
                           <div>
                              <h3 className="text-xl font-black text-white tracking-tight leading-none mb-2">
                                 {format(new Date(r.period_start), 'MMMM yyyy', { locale }).toUpperCase()}
                              </h3>
                              <div className="flex items-center gap-4">
                                 <div className="flex items-center gap-1.5 text-slate-500">
                                    <CalendarIcon className="w-3.5 h-3.5" />
                                    <span className="text-[10px] font-bold uppercase tracking-widest">{format(new Date(r.period_start), 'MMM dd')} - {format(new Date(r.period_end), 'MMM dd, yyyy')}</span>
                                 </div>
                                 <div className="flex items-center gap-1.5 text-indigo-400">
                                    <Clock className="w-3.5 h-3.5" />
                                    <span className="text-[10px] font-bold uppercase tracking-widest">{r.total_hours} Hours</span>
                                 </div>
                              </div>
                           </div>
                        </div>

                        <div className="flex items-center gap-8 w-full sm:w-auto border-t sm:border-t-0 sm:border-l border-white/5 pt-6 sm:pt-0 sm:pl-8">
                           <div className="text-right flex-1 sm:flex-none">
                              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Pay</p>
                              <p className="text-2xl font-black text-emerald-400 tabular-nums">$ {r.total_pay.toFixed(2)}</p>
                           </div>
                           <button className="p-4 bg-white/5 text-white rounded-2xl hover:bg-white/10 border border-white/5 group-hover:border-indigo-500/30 transition-all active:scale-95 shadow-xl">
                              <Download className="w-6 h-6" />
                           </button>
                        </div>
                     </div>
                  </div>
               ))
            )}
         </div>
      </div>
    </div>
  )
}
