import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import { useAuth } from '../context/AuthContext'

// Loads the signed-in user's notifications and keeps them live via a
// realtime subscription, so a freshly-promoted Category Admin (or a
// member whose payment just got verified) sees it appear without
// needing to refresh.
export function useNotifications() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    if (!user) { setNotifications([]); setLoading(false); return }
    setLoading(true)
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)
    setNotifications(data || [])
    setLoading(false)
  }, [user])

  useEffect(() => { reload() }, [reload])

  useEffect(() => {
    if (!user) return
    const userId = user.id

    // Guard: if a channel for this user is already registered (e.g. a
    // previous effect run's cleanup hasn't finished yet), reuse it instead
    // of calling .on() on an already-subscribed channel, which throws
    // "cannot add postgres_changes callbacks ... after subscribe()".
    const existing = supabase.getChannels().find(c => c.topic === `realtime:notifications:${userId}`)
    if (existing) return

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        (payload) => setNotifications(prev => [payload.new, ...prev])
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [user?.id]) // depend on the stable id, not the whole session/user object

  async function markRead(id) {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    await supabase.from('notifications').update({ read: true }).eq('id', id)
  }

  async function markAllRead() {
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id)
    if (unreadIds.length === 0) return
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    await supabase.from('notifications').update({ read: true }).in('id', unreadIds)
  }

  const unreadCount = notifications.filter(n => !n.read).length

  return { notifications, loading, unreadCount, markRead, markAllRead, reload }
}
