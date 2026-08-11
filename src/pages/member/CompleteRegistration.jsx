import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'
import { useMember } from '../../lib/useMember'
import { DISTRICTS, districtCode } from '../../data/districts'
import { Button, Card, Field, Input, Select } from '../../components/ui'

const CATEGORIES = ['Cub Scout', 'Scout', 'Rover Scout', 'Leader', 'Commissioner', 'Trainer', 'Other']

export default function CompleteRegistration() {
  const { user, profile } = useAuth()
  const { reload } = useMember()
  const [form, setForm] = useState({
    full_name: profile?.name || '',
    category: CATEGORIES[0],
    membership_type: 'Annual',
    district: DISTRICTS[0].name,
    amount: '',
  })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  function update(key, value) {
    setForm(f => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    const year = new Date().getFullYear()
    const { error } = await supabase.from('members').insert({
      user_id: user.id,
      full_name: form.full_name,
      category: form.category,
      membership_type: form.membership_type,
      district: form.district,
      district_code: districtCode(form.district),
      amount: Number(form.amount) || 0,
      year,
    })
    setBusy(false)
    if (error) { setError(error.message); return }
    await reload()
  }

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center px-6 py-12">
      <Card className="w-full max-w-lg">
        <h1 className="font-display font-bold text-xl mb-1">Complete Your Registration</h1>
        <p className="text-sm text-ink/60 mb-6">
          This creates your official membership record and assigns your member ID.
        </p>
        <form onSubmit={handleSubmit}>
          <Field label="Full Name">
            <Input value={form.full_name} onChange={e => update('full_name', e.target.value)} required />
          </Field>
          <Field label="Category">
            <Select value={form.category} onChange={e => update('category', e.target.value)}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </Select>
          </Field>
          <Field label="Membership Type">
            <Select value={form.membership_type} onChange={e => update('membership_type', e.target.value)}>
              <option value="Annual">Annual</option>
              <option value="Life">Life</option>
            </Select>
          </Field>
          <Field label="District" hint="Your member ID will be generated from this district.">
            <Select value={form.district} onChange={e => update('district', e.target.value)}>
              {DISTRICTS.map(d => <option key={d.code} value={d.name}>{d.name}</option>)}
            </Select>
          </Field>
          <Field label="Membership Amount (UGX)" hint="The registration/membership fee amount for your category.">
            <Input type="number" min="0" value={form.amount} onChange={e => update('amount', e.target.value)} required />
          </Field>
          {error && <p className="text-clay text-sm mb-3">{error}</p>}
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? 'Creating your record…' : 'Complete Registration'}
          </Button>
        </form>
      </Card>
    </div>
  )
}
