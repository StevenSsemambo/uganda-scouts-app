import { useEffect, useState } from 'react'
import Layout from '../../components/Layout'
import { supabase } from '../../lib/supabaseClient'
import { Card } from '../../components/ui'
import { formatUGX } from '../../lib/format'

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    async function load() {
      const [{ count: memberCount }, { data: members }, { data: pendingPayments }, { data: verifiedPayments }] =
        await Promise.all([
          supabase.from('members').select('*', { count: 'exact', head: true }),
          supabase.from('members').select('district'),
          supabase.from('payments').select('id').eq('status', 'pending'),
          supabase.from('payments').select('amount').eq('status', 'verified'),
        ])

      const districtSet = new Set((members || []).map(m => m.district))
      const totalVerified = (verifiedPayments || []).reduce((sum, p) => sum + Number(p.amount), 0)

      setStats({
        memberCount: memberCount || 0,
        districtCount: districtSet.size,
        pendingCount: (pendingPayments || []).length,
        totalVerified,
      })
    }
    load()
  }, [])

  return (
    <Layout area="admin">
      <h1 className="font-display font-bold text-2xl mb-1">Overview</h1>
      <p className="text-ink/60 mb-8">Real-time totals across every district.</p>

      {!stats ? (
        <p className="text-ink/50">Loading…</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Registered Members" value={stats.memberCount} />
          <StatCard label="Districts Represented" value={stats.districtCount} />
          <StatCard label="Payments Awaiting Verification" value={stats.pendingCount} accent />
          <StatCard label="Total Verified Payments" value={formatUGX(stats.totalVerified)} />
        </div>
      )}
    </Layout>
  )
}

function StatCard({ label, value, accent }) {
  return (
    <Card className={accent && value > 0 ? 'border-clay/50 bg-clay-light/40' : ''}>
      <div className="text-3xl font-display font-bold text-forest mb-1">{value}</div>
      <div className="text-sm text-ink/60">{label}</div>
    </Card>
  )
}
