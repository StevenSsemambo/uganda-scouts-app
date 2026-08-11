import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import { useAuth } from '../context/AuthContext'

// Loads (and lets you refresh) the members-table row tied to the
// currently signed-in member. Returns null while it doesn't exist yet
// (i.e. the member hasn't completed registration).
export function useMember() {
  const { user } = useAuth()
  const [member, setMember] = useState(null)
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    if (!user) { setMember(null); setLoading(false); return }
    setLoading(true)
    const { data } = await supabase
      .from('members')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()
    setMember(data || null)
    setLoading(false)
  }, [user])

  useEffect(() => { reload() }, [reload])

  return { member, loading, reload }
}
