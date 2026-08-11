import { useEffect, useState } from 'react'
import Layout from '../../components/Layout'
import { useMember } from '../../lib/useMember'
import { supabase } from '../../lib/supabaseClient'
import { DISTRICTS, districtCode } from '../../data/districts'
import { Button, Card, Field, Input, Select } from '../../components/ui'

export default function MemberProfile() {
  const { member, loading, reload } = useMember()
  const [form, setForm] = useState(null)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (member) setForm({ ...member })
  }, [member])

  function update(key, value) {
    setForm(f => ({ ...f, [key]: value }))
    setSaved(false)
  }

  async function handleSave(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    const { error } = await supabase
      .from('members')
      .update({
        full_name: form.full_name,
        category: form.category,
        membership_type: form.membership_type,
        district: form.district,
        district_code: districtCode(form.district),
        amount: Number(form.amount) || 0,
      })
      .eq('id', member.id)
    setBusy(false)
    if (error) { setError(error.message); return }
    setSaved(true)
    await reload()
  }

  if (loading || !form) {
    return <Layout area="member"><p className="text-ink/50">Loading…</p></Layout>
  }

  return (
    <Layout area="member">
      <h1 className="font-display font-bold text-2xl mb-1">My Information</h1>
      <p className="text-ink/60 mb-6">
        Correct any mistakes in your details below. Your Member ID ({member.member_code}) stays the same.
      </p>
      <Card className="max-w-lg">
        <form onSubmit={handleSave}>
          <Field label="Full Name">
            <Input value={form.full_name} onChange={e => update('full_name', e.target.value)} required />
          </Field>
          <Field label="Category">
            <Input value={form.category || ''} onChange={e => update('category', e.target.value)} />
          </Field>
          <Field label="Membership Type">
            <Select value={form.membership_type} onChange={e => update('membership_type', e.target.value)}>
              <option value="Annual">Annual</option>
              <option value="Life">Life</option>
            </Select>
          </Field>
          <Field label="District">
            <Select value={form.district} onChange={e => update('district', e.target.value)}>
              {DISTRICTS.map(d => <option key={d.code} value={d.name}>{d.name}</option>)}
            </Select>
          </Field>
          <Field label="Amount on Record (UGX)">
            <Input type="number" min="0" value={form.amount} onChange={e => update('amount', e.target.value)} />
          </Field>
          {error && <p className="text-clay text-sm mb-3">{error}</p>}
          {saved && <p className="text-moss text-sm mb-3">Saved successfully.</p>}
          <Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save Changes'}</Button>
        </form>
      </Card>
    </Layout>
  )
}
