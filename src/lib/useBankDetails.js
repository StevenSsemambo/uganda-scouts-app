import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

// Loads the Association's bank deposit details from the database —
// editable live by full admins, so every place that shows them (member
// dashboard, registration, payments page, admin settings) always
// reflects the current account without needing a code deploy.
export function useBankDetails() {
  const [details, setDetails] = useState(null)
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('bank_details')
      .select('*')
      .eq('id', 1)
      .single()
    setDetails(data || null)
    setLoading(false)
  }, [])

  useEffect(() => { reload() }, [reload])

  return { details, loading, reload }
}
