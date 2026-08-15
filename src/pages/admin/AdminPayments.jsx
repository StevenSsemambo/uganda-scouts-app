import { useEffect, useMemo, useState } from 'react'
import Layout from '../../components/Layout'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'
import { Button, Card, StatusPill, EmptyState, Select } from '../../components/ui'
import { formatUGX, formatDate } from '../../lib/format'
import { downloadTablePDF } from '../../lib/tableReport'
import { friendlyError } from '../../lib/friendlyError'

// The client specifically wants a payment's "reason" to show Primary vs
// Secondary/Tertiary when the payer is a school, since a bare category
// label doesn't make that distinction obvious at a glance.
function schoolLevel(category) {
  if (category === 'Unit Registration — Primary School') return 'Primary'
  if (category === 'Unit Registration — Secondary / Tertiary') return 'Secondary / Tertiary'
  return null
}

export default function AdminPayments() {
  const { user, isAdmin } = useAuth()
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [filter, setFilter] = useState('pending')
  const [districtFilter, setDistrictFilter] = useState('')
  const [busyId, setBusyId] = useState(null)
  const [actionError, setActionError] = useState('')

  async function load() {
    setLoading(true)
    setLoadError('')
    try {
      let query = supabase
        .from('payments')
        .select('*, members(full_name, member_code, district, user_id, category)')
        .order('created_at', { ascending: false })
      if (filter !== 'all') query = query.eq('status', filter)
      const { data, error } = await query
      if (error) throw error
      setPayments(data || [])
    } catch (err) {
      console.error('Failed to load payments:', err)
      setLoadError(friendlyError(err, 'Could not load payments.'))
      setPayments([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [filter])

  // District is free text now — build filter options from whatever's
  // actually on these payments' member records, same pattern as Members.
  const districtOptions = useMemo(() => {
    const set = new Set(payments.map(p => p.members?.district).filter(Boolean))
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [payments])

  const filteredPayments = useMemo(() => {
    return payments.filter(p => !districtFilter || p.members?.district === districtFilter)
  }, [payments, districtFilter])

  // "How many schools paid for that" — counted from verified payments in
  // the currently filtered view, distinct by member so a school with two
  // payments for the same fee isn't double-counted, split by level since
  // that's the distinction the client asked for.
  const schoolsPaidSummary = useMemo(() => {
    const seen = { Primary: new Set(), 'Secondary / Tertiary': new Set() }
    for (const p of filteredPayments) {
      if (p.status !== 'verified') continue
      const level = schoolLevel(p.members?.category)
      if (level) seen[level].add(p.member_id)
    }
    return { primary: seen.Primary.size, secondaryTertiary: seen['Secondary / Tertiary'].size }
  }, [filteredPayments])

  async function updateStatus(payment, status) {
    setBusyId(payment.id)
    setActionError('')
    try {
      const { error } = await supabase
        .from('payments')
        .update({ status, verified_by: user.id, verified_at: new Date().toISOString() })
        .eq('id', payment.id)
      if (error) throw error

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
      await load()
    } catch (err) {
      console.error('Failed to update payment status:', err)
      setActionError(friendlyError(err, "Couldn't update this payment."))
    } finally {
      setBusyId(null)
    }
  }

  function exportPDF() {
    downloadTablePDF({
      title: 'Payments Report',
      subtitle: `Filter: ${filter}${districtFilter ? `  ·  District: ${districtFilter}` : ''}`,
      filename: `payments-report-${new Date().toISOString().slice(0, 10)}.pdf`,
      rows: filteredPayments.map(p => ({
        member_name: p.members?.full_name,
        member_id: p.members?.member_code,
        district: p.members?.district,
        category: p.members?.category,
        school_level: schoolLevel(p.members?.category) || '',
        purpose: p.purpose,
        amount: p.amount,
        method: p.payment_method,
        reference: p.reference_number,
        payment_date: p.payment_date,
        status: p.status,
        year: p.year,
      })),
    })
  }

  return (
    <Layout area="admin">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="font-display font-bold text-2xl mb-1">Verify Payments</h1>
          <p className="text-ink/60">Cross-check each entry against your bank/Mobile Money statement, then verify.</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <Select value={filter} onChange={e => setFilter(e.target.value)} className="max-w-[160px]">
            <option value="pending">Pending</option>
            <option value="verified">Verified</option>
            <option value="rejected">Rejected</option>
            <option value="all">All</option>
          </Select>
          {isAdmin && (
            <Select value={districtFilter} onChange={e => setDistrictFilter(e.target.value)} className="max-w-[180px]">
              <option value="">All Districts</option>
              {districtOptions.map(d => <option key={d} value={d}>{d}</option>)}
            </Select>
          )}
          <Button onClick={exportPDF}>Download PDF</Button>
        </div>
      </div>

      {actionError && (
        <Card className="max-w-lg mb-4 border-clay/50">
          <p className="text-sm text-clay">{actionError}</p>
        </Card>
      )}

      {(schoolsPaidSummary.primary > 0 || schoolsPaidSummary.secondaryTertiary > 0) && (
        <Card className="max-w-lg mb-4 bg-canvas-2">
          <p className="text-sm">
            <span className="font-semibold">Schools paid so far{districtFilter ? ` in ${districtFilter}` : ''}:</span>{' '}
            {schoolsPaidSummary.primary} Primary, {schoolsPaidSummary.secondaryTertiary} Secondary/Tertiary
          </p>
        </Card>
      )}

      {loading ? (
        <p className="text-ink/50">Loading…</p>
      ) : loadError ? (
        <Card className="max-w-lg border-clay/50">
          <p className="text-sm text-clay mb-3">{loadError}</p>
          <Button variant="ghost" onClick={load}>Try Again</Button>
        </Card>
      ) : filteredPayments.length === 0 ? (
        <EmptyState title="Nothing here" hint="No payments match this filter." />
      ) : (
        <div className="space-y-3">
          {filteredPayments.map(p => (
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
                    <Button variant="primary" disabled={busyId === p.id} onClick={() => updateStatus(p, 'verified')}>
                      {busyId === p.id ? 'Working…' : 'Verify'}
                    </Button>
                    <Button variant="danger" disabled={busyId === p.id} onClick={() => updateStatus(p, 'rejected')}>
                      Reject
                    </Button>
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
