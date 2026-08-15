import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import Layout from '../../components/Layout'
import { useMember } from '../../lib/useMember'
import { supabase } from '../../lib/supabaseClient'
import { Button, Card, Field, Input, Select, StatusPill, EmptyState } from '../../components/ui'
import { formatUGX, formatDate } from '../../lib/format'
import { generateReceiptPDF } from '../../lib/receipt'
import BankDetailsCard from '../../components/BankDetailsCard'
import { friendlyError } from '../../lib/friendlyError'

const PURPOSES = ['Registration Fee', 'Annual Subscription', 'Camp Fee', 'Life Membership Fee', 'Donation']
const METHODS = ['Bank Deposit (Stanbic)', 'MTN Mobile Money', 'Airtel Money', 'Cash to District Office', 'Other']

// These three always cost exactly the member's locked category fee — no
// legitimate reason the reported amount should ever differ from it, and
// letting it be typed freely is exactly how a partial payment slips
// through as if it were the full fee. Camp Fee and Donation have no fixed
// schedule anywhere in the system (camp fees vary by event, donations are
// inherently whatever the donor gives), so those stay free-entry.
const FIXED_FEE_PURPOSES = ['Registration Fee', 'Annual Subscription', 'Life Membership Fee']

export default function MemberPayments() {
  const { member, loading: memberLoading, error: memberError, reload: reloadMember } = useMember()
  const location = useLocation()
  const prefill = location.state || {}

  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  // Auto-open the form (and pre-fill it) when arriving straight from
  // registration, so the process visibly continues instead of stopping.
  const [showForm, setShowForm] = useState(Boolean(prefill.justRegistered))
  const initialPurpose = prefill.prefillPurpose || PURPOSES[0]
  const [form, setForm] = useState({
    amount: FIXED_FEE_PURPOSES.includes(initialPurpose) ? (member?.amount ?? prefill.prefillAmount ?? '') : (prefill.prefillAmount ?? ''),
    purpose: initialPurpose,
    payment_method: METHODS[0],
    reference_number: '',
    payment_date: '',
  })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function loadPayments() {
    if (!member) return
    setLoading(true)
    setLoadError('')
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('member_id', member.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      setPayments(data || [])
    } catch (err) {
      console.error('Failed to load payments:', err)
      setLoadError(friendlyError(err, 'Could not load your payments.'))
      setPayments([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadPayments() }, [member])

  function update(key, value) {
    setForm(f => {
      const next = { ...f, [key]: value }
      if (key === 'purpose') {
        next.amount = FIXED_FEE_PURPOSES.includes(value) ? (member?.amount ?? '') : ''
      }
      return next
    })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const { error } = await supabase.from('payments').insert({
        member_id: member.id,
        amount: Number(form.amount),
        purpose: form.purpose,
        payment_method: form.payment_method,
        reference_number: form.reference_number,
        payment_date: form.payment_date,
        year: new Date(form.payment_date).getFullYear() || new Date().getFullYear(),
      })
      if (error) throw error
      setForm({ amount: '', purpose: PURPOSES[0], payment_method: METHODS[0], reference_number: '', payment_date: '' })
      setShowForm(false)
      await loadPayments()
    } catch (err) {
      console.error('Failed to submit payment:', err)
      setError(friendlyError(err, "Couldn't submit this payment."))
    } finally {
      setBusy(false)
    }
  }

  function downloadReceipt(payment) {
    try {
      generateReceiptPDF({ member, payment })
    } catch (err) {
      console.error('Failed to generate receipt:', err)
      setError("Couldn't generate the receipt. Please try again.")
    }
  }

  if (memberLoading || loading) {
    return <Layout area="member"><p className="text-ink/50">Loading…</p></Layout>
  }

  if (memberError || !member) {
    return (
      <Layout area="member">
        <Card className="max-w-lg border-clay/50">
          <p className="text-sm text-clay mb-3">{memberError || 'Could not load your membership.'}</p>
          <Button variant="ghost" onClick={reloadMember}>Try Again</Button>
        </Card>
      </Layout>
    )
  }

  return (
    <Layout area="member">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="font-display font-bold text-2xl mb-1">Payments</h1>
          <p className="text-ink/60">Report a payment you've made, and track its verification status.</p>
        </div>
        <Button onClick={() => setShowForm(s => !s)}>
          {showForm ? 'Cancel' : '+ Report a Payment'}
        </Button>
      </div>

      {prefill.justRegistered && (
        <Card className="max-w-lg mb-4 border-ember/50 bg-ember-light/20">
          <p className="text-sm">
            <span className="font-semibold">Registration complete.</span> One step left — report the{' '}
            <span className="font-semibold">{formatUGX(prefill.prefillAmount)}</span> fee below once you've
            paid it via bank deposit or Mobile Money, so an admin can verify it.
          </p>
        </Card>
      )}

      <div className="max-w-lg mb-8">
        <BankDetailsCard memberCode={member.member_code} />
      </div>

      {showForm && (
        <Card className="max-w-lg mb-8">
          <form onSubmit={handleSubmit}>
            <Field label="Purpose">
              <Select value={form.purpose} onChange={e => update('purpose', e.target.value)}>
                {PURPOSES.map(p => <option key={p} value={p}>{p}</option>)}
              </Select>
            </Field>
            <Field
              label="Amount Paid (UGX)"
              hint={FIXED_FEE_PURPOSES.includes(form.purpose)
                ? 'Locked to your registered category fee — this must match exactly, no partial payments.'
                : 'Enter the exact amount you paid.'}
            >
              <Input
                type="number"
                min="0"
                value={form.amount}
                onChange={e => update('amount', e.target.value)}
                required
                readOnly={FIXED_FEE_PURPOSES.includes(form.purpose)}
                className={FIXED_FEE_PURPOSES.includes(form.purpose) ? 'bg-canvas-2 cursor-not-allowed' : ''}
              />
            </Field>
            <Field label="Payment Method">
              <Select value={form.payment_method} onChange={e => update('payment_method', e.target.value)}>
                {METHODS.map(m => <option key={m} value={m}>{m}</option>)}
              </Select>
            </Field>
            <Field label="Transaction Reference Number" hint="From your bank slip or Mobile Money confirmation SMS.">
              <Input value={form.reference_number} onChange={e => update('reference_number', e.target.value)} required />
            </Field>
            <Field label="Payment Date">
              <Input type="date" value={form.payment_date} onChange={e => update('payment_date', e.target.value)} required />
            </Field>
            {error && <p className="text-clay text-sm mb-3">{error}</p>}
            <Button type="submit" disabled={busy}>{busy ? 'Submitting…' : 'Submit for Verification'}</Button>
          </form>
        </Card>
      )}

      {payments.length === 0 ? (
        loadError ? (
          <Card className="max-w-lg border-clay/50">
            <p className="text-sm text-clay mb-3">{loadError}</p>
            <Button variant="ghost" onClick={loadPayments}>Try Again</Button>
          </Card>
        ) : (
          <EmptyState title="No payments reported yet" hint="Use the button above once you've made a payment." />
        )
      ) : (
        <div className="space-y-3">
          {payments.map(p => (
            <Card key={p.id} className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <div className="font-medium">{p.purpose} — {formatUGX(p.amount)}</div>
                <div className="text-sm text-ink/50">
                  Ref: {p.reference_number} · {formatDate(p.payment_date)} · {p.payment_method}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <StatusPill status={p.status} />
                {p.status === 'verified' ? (
                  <Button variant="ghost" onClick={() => downloadReceipt(p)}>Download Receipt</Button>
                ) : (
                  <span className="text-xs text-ink/40 max-w-[160px] text-right">
                    Receipt available once verified
                  </span>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </Layout>
  )
}
