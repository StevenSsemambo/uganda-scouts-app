import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

// Loads the Association's bank deposit details from the database —
// editable live by full admins, so every place that shows them (member
// dashboard, registration, payments page, admin settings) always
// reflects the current account without needing a code deploy.
export function useBankDetails() {
  const [details, setDetails] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const reload = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { data, error: fetchError } = await supabase
        .from('bank_details')
        .select('*')
        .eq('id', 1)
        .maybeSingle()
      if (fetchError) throw fetchError
      setDetails(data || null)
    } catch (err) {
      console.error('Failed to load bank details:', err)
      setError('Could not load payment details right now.')
      setDetails(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { reload() }, [reload])

  return { details, loading, error, reload }
}
