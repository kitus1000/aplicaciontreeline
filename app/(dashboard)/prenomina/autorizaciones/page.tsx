'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/utils/supabase/client'
import { useI18n } from '@/lib/i18n'
import { 
  CheckCircle2, 
  XCircle, 
  Eye, 
  Search, 
  MessageSquare, 
  ExternalLink,
  ChevronDown,
  Calendar,
  User,
  Clock,
  Briefcase,
  HardDrive,
  FileText
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { format, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns'

export default function AuthorizationsPage() {
  const { t } = useI18n()
  const [loading, setLoading] = useState(true)
  const [employees, setEmployees] = useState<any[]>([])
  const [pendingWorkdays, setPendingWorkdays] = useState<any[]>([])
  const [selectedWorkday, setSelectedWorkday] = useState<any>(null)
  const [rejectionComment, setRejectionComment] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('sent')

  useEffect(() => {
    fetchData()
  }, [filterStatus])

  async function fetchData() {
    setLoading(true)
    try {
      // 1. Fetch workdays in 'sent' or 'under_review' status
      const { data: workdays, error } = await supabase
        .from('workday_approval_status')
        .select('*, empleados(id_empleado, nombre, apellido_paterno, apellido_materno)')
        .eq('status', filterStatus)
        .order('date', { ascending: false })

      setPendingWorkdays(workdays || [])

    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleAuthorize = async (workdayId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { error } = await supabase
        .from('workday_approval_status')
        .update({ 
          status: 'authorized', 
          reviewed_by: user?.id, 
          reviewed_at: new Date().toISOString() 
        })
        .eq('id', workdayId)

      if (error) throw error
      fetchData()
      setSelectedWorkday(null)
    } catch (e) {
      console.error(e)
    }
  }

  const handleReject = async (workdayId: string) => {
    if (!rejectionComment) {
      alert(t('rejection_comment_alert'))
      return
    }
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { error } = await supabase
        .from('workday_approval_status')
        .update({ 
          status: 'rejected', 
          comments: rejectionComment,
          reviewed_by: user?.id, 
          reviewed_at: new Date().toISOString() 
        })
        .eq('id', workdayId)

      if (error) throw error
      fetchData()
      setSelectedWorkday(null)
      setRejectionComment('')
    } catch (e) {
      console.error(e)
    }
  }

  const fetchWorkdayDetails = async (workday: any) => {
    const dateStr = workday.date
    const empId = workday.employee_id
    
    // Fetch events and activities for this specific day
    const { data: events } = await supabase.from('workday_events').select('*').eq('employee_id', empId).eq('date', dateStr).order('event_time', { ascending: true })
    const { data: activities } = await supabase.from('workday_activities').select('*').eq('employee_id', empId).eq('date', dateStr)
    const { data: attachments } = await supabase.from('workday_attachments').select('*').eq('employee_id', empId).eq('workday_id', dateStr)

    setSelectedWorkday({ ...workday, events, activities, attachments })
  }

  return (
    <div className="max-w-7xl mx-auto pb-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{t('menu_authorizations')}</h1>
          <p className="text-slate-500 mt-1">{t('auth_subtitle')}</p>
        </div>
        <div className="flex items-center space-x-3 bg-white p-1 rounded-xl shadow-sm border border-slate-200">
          {['sent', 'under_review', 'authorized', 'rejected'].map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={cn(
                "px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all",
                filterStatus === s ? "bg-indigo-600 text-white shadow-md shadow-indigo-100" : "text-slate-400 hover:text-slate-600"
              )}
            >
              {t(`status_${s}`)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-50 flex items-center justify-between">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  placeholder={t('search_worker')}
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                />
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {loading ? (
                <div className="p-20 text-center text-slate-400">{t('loading')}</div>
              ) : pendingWorkdays.length === 0 ? (
                <div className="p-20 text-center text-slate-400 italic">{t('no_workdays_status')}</div>
              ) : (
                pendingWorkdays
                  .filter(w => `${w.empleados.nombre} ${w.empleados.apellido_paterno}`.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map(workday => (
                    <div 
                      key={workday.id} 
                      className={cn(
                        "p-6 hover:bg-slate-50/50 transition-colors cursor-pointer group",
                        selectedWorkday?.id === workday.id ? "bg-indigo-50/30 border-l-4 border-indigo-600" : ""
                      )}
                      onClick={() => fetchWorkdayDetails(workday)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                            <User className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-800">
                              {workday.empleados.nombre} {workday.empleados.apellido_paterno}
                            </h3>
                            <div className="flex items-center space-x-3 mt-1">
                              <span className="text-xs font-bold text-indigo-500 flex items-center">
                                <Calendar className="w-3 h-3 mr-1" />
                                {format(new Date(workday.date + 'T12:00:00'), 'dd MMM yyyy')}
                              </span>
                              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                                {workday.approval_mode || 'diario'}
                              </span>
                            </div>
                          </div>
                        </div>
                        <button className="p-2 text-slate-400 hover:text-indigo-600 rounded-lg">
                          <Eye className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>

        {/* Details Panel */}
        <div className="space-y-6">
          {selectedWorkday ? (
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden sticky top-8 animate-in slide-in-from-right-8 duration-300">
              <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                <h2 className="text-lg font-bold text-slate-800 uppercase tracking-widest">{t('workday_detail')}</h2>
                <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-tighter">
                  {selectedWorkday.empleados.nombre} - {format(new Date(selectedWorkday.date + 'T12:00:00'), 'dd/MM/yyyy')}
                </p>
              </div>

              <div className="p-6 space-y-8 overflow-y-auto max-h-[60vh] custom-scrollbar">
                {/* Events Timeline */}
                <div>
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-4 flex items-center">
                    <Clock className="w-3 h-3 mr-2" /> {t('assistance_step')}
                  </h3>
                  <div className="space-y-3">
                    {selectedWorkday.events?.map((e: any) => (
                      <div key={e.id} className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-50 border border-slate-100">
                        <span className="font-bold text-slate-600">{t(e.event_type.toLowerCase())}</span>
                        <span className="font-black text-indigo-600 tabular-nums">{format(new Date(e.event_time), 'HH:mm')}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Activities List */}
                <div>
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-4 flex items-center">
                    <Briefcase className="w-3 h-3 mr-2" /> {t('work_done_step')}
                  </h3>
                  <div className="space-y-4">
                    {selectedWorkday.activities?.map((a: any) => (
                      <div key={a.id} className="p-3 rounded-xl border border-slate-100 bg-slate-50/30">
                        <div className="flex justify-between items-start mb-1">
                          <h4 className="font-bold text-slate-700 text-sm">{a.activity_name}</h4>
                          <span className="text-[10px] font-black bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded">{a.hours_dedicated}h</span>
                        </div>
                        <p className="text-xs text-slate-500 line-clamp-2 italic leading-relaxed">{a.description}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Evidence Attachments */}
                <div>
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-4 flex items-center">
                    <ExternalLink className="w-3 h-3 mr-2" /> {t('evidence_step')} ({selectedWorkday.attachments?.length})
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedWorkday.attachments?.map((att: any) => (
                      <div key={att.id} className="flex flex-col space-y-1">
                        <a 
                          href={att.file_url} 
                          target="_blank" 
                          rel="noopener"
                          className="p-2 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-500 truncate bg-white hover:border-indigo-300 hover:text-indigo-600 flex items-center"
                        >
                          <FileText className="w-3 h-3 mr-1" /> {att.file_name}
                        </a>
                        {att.file_url.includes('drive.google.com') || att.storage_provider === 'drive' ? (
                          <a 
                            href={att.file_url} 
                            target="_blank" 
                            className="w-full mt-2 py-2 bg-green-600 text-white text-[10px] font-black uppercase tracking-widest rounded-lg flex items-center justify-center hover:bg-green-700 shadow-md shadow-green-100 transition-all"
                          >
                            <HardDrive className="w-3.5 h-3.5 mr-2" /> {t('view_on_drive')}
                          </a>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-slate-100 bg-slate-50/50 space-y-4">
                {filterStatus === 'sent' || filterStatus === 'under_review' ? (
                  <>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('review_comments')}</label>
                      <textarea 
                        className="w-full p-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder={t('review_placeholder')}
                        value={rejectionComment}
                        onChange={e => setRejectionComment(e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <button 
                        onClick={() => handleReject(selectedWorkday.id)}
                        className="py-3 bg-white border border-red-200 text-red-600 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-red-50 transition-all flex items-center justify-center"
                      >
                        <XCircle className="w-4 h-4 mr-2" /> {t('reject')}
                      </button>
                      <button 
                        onClick={() => handleAuthorize(selectedWorkday.id)}
                        className="py-3 bg-indigo-600 text-white rounded-xl font-black uppercase text-xs tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center justify-center"
                      >
                        <CheckCircle2 className="w-4 h-4 mr-2" /> {t('authorize')}
                      </button>
                    </div>
                  </>
                ) : (
                  <div className={cn(
                    "p-4 rounded-xl border text-center text-xs font-bold uppercase tracking-widest",
                    selectedWorkday.status === 'authorized' ? "bg-green-50 text-green-600 border-green-200" : "bg-red-50 text-red-600 border-red-200"
                  )}>
                    {selectedWorkday.status === 'authorized' ? t('workday_already_auth') : t('workday_already_rejected')}
                    {selectedWorkday.comments && <p className="mt-2 normal-case text-slate-500 font-medium italic">"{selectedWorkday.comments}"</p>}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-slate-100/50 rounded-2xl border border-dashed border-slate-300 p-12 text-center flex flex-col items-center justify-center min-h-[400px]">
              <MessageSquare className="w-12 h-12 text-slate-300 mb-4" />
              <p className="text-slate-400 text-sm font-bold uppercase tracking-widest">{t('select_workday_review')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
