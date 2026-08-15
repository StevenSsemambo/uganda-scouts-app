import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import { useAuth } from '../context/AuthContext'

// Loads the signed-in user's notifications and keeps them live via a
// realtime subscription, so a freshly-promoted District Admin (or a
// member whose payment just got verified) sees it appear without
// needing to refresh.
export function useNotifications() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    if (!user) { setNotifications([]); setLoading(false); return }
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)
      if (error) throw error
      setNotifications(data || [])
    } catch (err) {
      console.error('Failed to load notifications:', err)
      setNotifications([])
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { reload() }, [reload])

  useEffect(() => {
    if (!user) return
    let channel
    try {
      channel = supabase
        .channel(`notifications:${user.id}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
          (payload) => setNotifications(prev => [payload.new, ...prev])
        )
        .subscribe()
    } catch (err) {
      console.error('Failed to subscribe to notifications:', err)
    }
    return () => { if (channel) supabase.removeChannel(channel) }
  }, [user])

  async function markRead(id) {
    // Optimistic update — if the server call fails, silently reload to
    // resync rather than leaving the UI showing a state that didn't stick.
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    try {
      const { error } = await supabase.from('notifications').update({ read: true }).eq('id', id)
      if (error) throw error
    } catch (err) {
      console.error('Failed to mark notification read:', err)
      reload()
    }
  }

  async function markAllRead() {
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id)
    if (unreadIds.length === 0) return
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    try {
      const { error } = await supabase.from('notifications').update({ read: true }).in('id', unreadIds)
      if (error) throw error
    } catch (err) {
      console.error('Failed to mark all notifications read:', err)
      reload()
    }
  }

  const unreadCount = notifications.filter(n => !n.read).length

  return { notifications, loading, unreadCount, markRead, markAllRead, reload }
}
