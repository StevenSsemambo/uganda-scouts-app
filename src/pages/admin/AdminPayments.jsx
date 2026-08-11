import { useEffect, useState } from 'react'
import Layout from '../../components/Layout'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'
import { Button, Card, StatusPill, EmptyState, Select } from '../../components/ui'
import { formatUGX, formatDate } from '../../lib/format'
import { downloadCSV } from '../../lib/csv'

export default function AdminPayments() {
  const { user } = useAuth()
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending')

  async function load() {
    setLoading(true)
    let query = supabase
      .from('payments')
      .select('*, members(full_name, member_code, district, user_id)')
      .order('created_at', { ascending: false })
    if (filter !== 'all') query = query.eq('status', filter)
    const { data } = await query
    setPayments(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [filter])

  async function updateStatus(payment, status) {
    await supabase
      .from('payments')
      .update({ status, verified_by: user.id, verified_at: new Date().toISOString() })
      .eq('id', payment.id)

    const memberUserId = payment.members?.user_id
    if (memberUserId) {
      const notif = status === 'verified'
        ? {
            title: 'Payment Verified',
            body: `Your ${payment.purpose} payment of ${formatUGX(payment.amount)} has been verified. You can now download your receipt.`,
            type: 'payment_verified',
          }
        : {
            title: 'Payment Needs Attention',
            body: `Your ${payment.purpose} payment of ${formatUGX(payment.amount)} (ref: ${payment.reference_number}) was rejected. Please check the details and resubmit.`,
            type: 'payment_rejected',
          }
      await supabase.from('notifications').insert({ user_id: memberUserId, ...notif })
    }
    load()
  }

  function exportCSV() {
    downloadCSV('payments.csv', payments.map(p => ({
      member_name: p.members?.full_name,
      member_id: p.members?.member_code,
      district: p.members?.district,
      purpose: p.purpose,
      amount: p.amount,
      method: p.payment_method,
      reference: p.reference_number,
      payment_date: p.payment_date,
      status: p.status,
      year: p.year,
    })))
  }

  return (
    <Layout area="admin">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="font-display font-bold text-2xl mb-1">Verify Payments</h1>
          <p className="text-ink/60">Cross-check each entry against your bank/Mobile Money statement, then verify.</p>
        </div>
        <div className="flex gap-3">
          <Select value={filter} onChange={e => setFilter(e.target.value)} className="max-w-[160px]">
            <option value="pending">Pending</option>
            <option value="verified">Verified</option>
            <option value="rejected">Rejected</option>
            <option value="all">All</option>
          </Select>
          <Button onClick={exportCSV}>Download CSV</Button>
        </div>
      </div>

      {loading ? (
        <p className="text-ink/50">Loading…</p>
      ) : payments.length === 0 ? (
        <EmptyState title="Nothing here" hint="No payments match this filter." />
      ) : (
        <div className="space-y-3">
          {payments.map(p => (
            <Card key={p.id} className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <div className="font-medium">
                  {p.members?.full_name} <span className="text-ink/40 font-normal">· {p.members?.member_code}</span>
                </div>
                <div className="text-sm text-ink/60">{p.purpose} — {formatUGX(p.amount)} · {p.members?.district}</div>
                <div className="text-xs text-ink/45 mt-1">
                  Ref: {p.reference_number} · {formatDate(p.payment_date)} · {p.payment_method}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <StatusPill status={p.status} />
                {p.status === 'pending' && (
                  <>
                    <Button variant="primary" onClick={() => updateStatus(p, 'verified')}>Verify</Button>
                    <Button variant="danger" onClick={() => updateStatus(p, 'rejected')}>Reject</Button>
                  </>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </Layout>
  )
}
