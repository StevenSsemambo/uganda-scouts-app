import { useEffect, useState } from 'react'
import Layout from '../../components/Layout'
import { useMember } from '../../lib/useMember'
import { supabase } from '../../lib/supabaseClient'
import { Button, Card, Field, Input, Select, StatusPill, EmptyState } from '../../components/ui'
import { formatUGX, formatDate } from '../../lib/format'
import { generateReceiptPDF } from '../../lib/receipt'

const PURPOSES = ['Registration Fee', 'Annual Subscription', 'Camp Fee', 'Life Membership Fee', 'Donation']
const METHODS = ['Bank Deposit (Stanbic)', 'MTN Mobile Money', 'Airtel Money', 'Cash to District Office', 'Other']

export default function MemberPayments() {
  const { member, loading: memberLoading } = useMember()
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    amount: '', purpose: PURPOSES[0], payment_method: METHODS[0],
    reference_number: '', payment_date: '',
  })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function loadPayments() {
    if (!member) return
    setLoading(true)
    const { data } = await supabase
      .from('payments')
      .select('*')
      .eq('member_id', member.id)
      .order('created_at', { ascending: false })
    setPayments(data || [])
    setLoading(false)
  }

  useEffect(() => { loadPayments() }, [member])

  function update(key, value) { setForm(f => ({ ...f, [key]: value })) }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    const { error } = await supabase.from('payments').insert({
      member_id: member.id,
      amount: Number(form.amount),
      purpose: form.purpose,
      payment_method: form.payment_method,
      reference_number: form.reference_number,
      payment_date: form.payment_date,
      year: new Date(form.payment_date).getFullYear() || new Date().getFullYear(),
    })
    setBusy(false)
    if (error) { setError(error.message); return }
    setForm({ amount: '', purpose: PURPOSES[0], payment_method: METHODS[0], reference_number: '', payment_date: '' })
    setShowForm(false)
    loadPayments()
  }

  function downloadReceipt(payment) {
    generateReceiptPDF({ member, payment })
  }

  if (memberLoading || loading) {
    return <Layout area="member"><p className="text-ink/50">Loading…</p></Layout>
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

      {showForm && (
        <Card className="max-w-lg mb-8">
          <form onSubmit={handleSubmit}>
            <Field label="Purpose">
              <Select value={form.purpose} onChange={e => update('purpose', e.target.value)}>
                {PURPOSES.map(p => <option key={p} value={p}>{p}</option>)}
              </Select>
            </Field>
            <Field label="Amount Paid (UGX)">
              <Input type="number" min="0" value={form.amount} onChange={e => update('amount', e.target.value)} required />
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
        <EmptyState title="No payments reported yet" hint="Use the button above once you've made a payment." />
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
                <Button variant="ghost" onClick={() => downloadReceipt(p)}>Download Receipt</Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </Layout>
  )
}
