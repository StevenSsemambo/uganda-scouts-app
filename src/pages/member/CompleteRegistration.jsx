import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'
import { useMember } from '../../lib/useMember'
import { MEMBERSHIP_CATEGORIES, categoryFee } from '../../data/membershipCategories'
import { Button, Card, Field, Input, Select, DistrictInput } from '../../components/ui'
import { formatUGX } from '../../lib/format'
import BankDetailsCard from '../../components/BankDetailsCard'
import { friendlyError } from '../../lib/friendlyError'

export default function CompleteRegistration() {
  const { user, profile } = useAuth()
  const { reload } = useMember()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    full_name: profile?.name || '',
    category: MEMBERSHIP_CATEGORIES[0].category,
    district: '',
  })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const selectedFee = categoryFee(form.category)

  function update(key, value) {
    setForm(f => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const year = new Date().getFullYear()
      const { error } = await supabase.from('members').insert({
        user_id: user.id,
        full_name: form.full_name,
        category: form.category,
        membership_type: selectedFee.membership_type,
        district: form.district.trim(),
        amount: selectedFee.amount,
        year,
      }).select().single()
      if (error) throw error
      await reload()
      // Send them straight into reporting the payment for the fee they just
      // registered under — registration alone doesn't complete the process.
      navigate('/member/payments', {
        state: {
          prefillAmount: selectedFee.amount,
          prefillPurpose: selectedFee.membership_type === 'Life' ? 'Life Membership Fee' : 'Registration Fee',
          justRegistered: true,
        },
      })
    } catch (err) {
      console.error('Failed to complete registration:', err)
      setError(friendlyError(err, "Couldn't complete your registration."))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center px-6 py-12">
      <Card className="w-full max-w-lg">
        <h1 className="font-display font-bold text-xl mb-1">Complete Your Registration</h1>
        <p className="text-sm text-ink/60 mb-6">
          This creates your official membership record and assigns your member ID.
          After this, you'll report the payment for the fee shown below.
        </p>
        <form onSubmit={handleSubmit}>
          <Field label="Full Name">
            <Input value={form.full_name} onChange={e => update('full_name', e.target.value)} required />
          </Field>
          <Field label="Category" hint="Your membership type and fee are set automatically from your category.">
            <Select value={form.category} onChange={e => update('category', e.target.value)}>
              {MEMBERSHIP_CATEGORIES.map(c => (
                <option key={c.category} value={c.category}>{c.category}</option>
              ))}
            </Select>
          </Field>
          <Field label="District" hint="Your member ID will be generated from this district.">
            <DistrictInput value={form.district} onChange={e => update('district', e.target.value)} required />
          </Field>

          <div className="bg-canvas-2 rounded-lg p-4 mb-5 flex items-center justify-between">
            <div>
              <div className="text-xs text-ink/50">Membership Type</div>
              <div className="font-medium">{selectedFee.membership_type}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-ink/50">Fee Due</div>
              <div className="font-display font-bold text-lg text-forest">{formatUGX(selectedFee.amount)}</div>
            </div>
          </div>

          {error && <p className="text-clay text-sm mb-3">{error}</p>}
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? 'Creating your record…' : 'Complete Registration & Report Payment'}
          </Button>
        </form>

        <div className="mt-6">
          <BankDetailsCard />
        </div>
      </Card>
    </div>
  )
}
