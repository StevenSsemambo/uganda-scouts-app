import { useEffect, useState } from 'react'
import Layout from '../../components/Layout'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'
import { useBankDetails } from '../../lib/useBankDetails'
import { Button, Card, Field, Input } from '../../components/ui'
import BankDetailsCard from '../../components/BankDetailsCard'
import { friendlyError } from '../../lib/friendlyError'

export default function AdminBankDetails() {
  const { user } = useAuth()
  const { details, loading, error: loadError, reload } = useBankDetails()
  const [form, setForm] = useState(null)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (details) setForm({ ...details })
  }, [details])

  function update(key, value) {
    setForm(f => ({ ...f, [key]: value }))
    setSaved(false)
  }

  async function handleSave(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const { error } = await supabase
        .from('bank_details')
        .update({
          bank_name: form.bank_name,
          account_name: form.account_name,
          account_number: form.account_number,
          branch: form.branch,
          swift_code: form.swift_code,
          updated_by: user.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', 1)
      if (error) throw error
      setSaved(true)
      await reload()
    } catch (err) {
      console.error('Failed to save bank details:', err)
      setError(friendlyError(err, "Couldn't save changes."))
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return <Layout area="admin"><p className="text-ink/50">Loading…</p></Layout>
  }

  if (loadError || !form) {
    return (
      <Layout area="admin">
        <Card className="max-w-lg border-clay/50">
          <p className="text-sm text-clay mb-3">{loadError || 'Could not load bank details.'}</p>
          <Button variant="ghost" onClick={reload}>Try Again</Button>
        </Card>
      </Layout>
    )
  }

  return (
    <Layout area="admin">
      <h1 className="font-display font-bold text-2xl mb-1">Bank Details</h1>
      <p className="text-ink/60 mb-6">
        Shown to every member on registration, the Payments page, and their dashboard until
        their first payment is verified. Changes here take effect immediately, everywhere.
      </p>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="max-w-lg">
          <form onSubmit={handleSave}>
            <Field label="Bank Name">
              <Input value={form.bank_name} onChange={e => update('bank_name', e.target.value)} required />
            </Field>
            <Field label="Account Name" hint="Leave blank to hide this row from members.">
              <Input value={form.account_name} onChange={e => update('account_name', e.target.value)} placeholder="e.g. Uganda Scouts Association" />
            </Field>
            <Field label="Account Number">
              <Input value={form.account_number} onChange={e => update('account_number', e.target.value)} required />
            </Field>
            <Field label="Branch" hint="Optional — leave blank to hide.">
              <Input value={form.branch} onChange={e => update('branch', e.target.value)} />
            </Field>
            <Field label="SWIFT Code" hint="Optional — only needed for deposits from outside Uganda.">
              <Input value={form.swift_code} onChange={e => update('swift_code', e.target.value)} />
            </Field>
            {error && <p className="text-clay text-sm mb-3">{error}</p>}
            {saved && <p className="text-moss text-sm mb-3">Saved — this is now live for every member.</p>}
            <Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save Changes'}</Button>
          </form>
        </Card>

        <div>
          <p className="text-sm text-ink/50 mb-3">This is exactly what members currently see (reflects saved changes):</p>
          <BankDetailsCard memberCode="J-2026-001" />
        </div>
      </div>
    </Layout>
  )
}
