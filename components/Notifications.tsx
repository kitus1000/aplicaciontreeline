'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/utils/supabase/client'
import { useI18n } from '@/lib/i18n'
import { Bell, Check, X, Clock } from 'lucide-react'
import { cn } from '@/utils/cn'

export default function Notifications() {
  const { t, language } = useI18n()
  const [notifications, setNotifications] = useState<any[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    fetchNotifications()
    const subscription = subscribe()
    return () => {
      subscription.unsubscribe()
    }
  }, [])

  async function fetchNotifications() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('app_notifications')
      .select('*')
      .eq('employee_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10)

    if (data) {
      setNotifications(data)
      setUnreadCount(data.filter(n => !n.is_read).length)
    }
  }

  function subscribe() {
    return supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'app_notifications' },
        (payload) => {
          setNotifications(prev => [payload.new, ...prev].slice(0, 10))
          setUnreadCount(c => c + 1)
        }
      )
      .subscribe()
  }

  async function markAsRead(id: string) {
    const { error } = await supabase
      .from('app_notifications')
      .update({ is_read: true })
      .eq('id', id)

    if (!error) {
      setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: true } : n))
      setUnreadCount(prev => Math.max(0, prev - 1))
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 h-4 w-4 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-slate-900">
            {unreadCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <div className="absolute top-full left-0 mt-2 w-80 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-widest text-white">{t('notifications')}</h3>
            <button onClick={() => setShowDropdown(false)}><X className="w-4 h-4 text-slate-500" /></button>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-500 italic text-xs">
                {t('no_notifications')}
              </div>
            ) : (
              notifications.map((n) => (
                <div 
                  key={n.id} 
                  className={cn(
                    "p-4 border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors relative group",
                    !n.is_read && "bg-indigo-500/5"
                  )}
                >
                  {!n.is_read && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500" />
                  )}
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-[10px] font-black text-indigo-400 uppercase tracking-wider">
                      {language === 'es' ? n.title_es : n.title_en}
                    </span>
                    <span className="text-[9px] text-slate-500 tabular-nums flex items-center">
                      <Clock className="w-3 h-3 mr-1" />
                      {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {language === 'es' ? n.message_es : n.message_en}
                  </p>
                  {!n.is_read && (
                    <button 
                      onClick={() => markAsRead(n.id)}
                      className="mt-2 text-[9px] font-black text-indigo-400 hover:text-indigo-300 uppercase tracking-widest flex items-center"
                    >
                      <Check className="w-3 h-3 mr-1" />
                      {t('mark_as_read')}
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
