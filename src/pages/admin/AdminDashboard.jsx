import { useEffect, useState } from 'react'
import Layout from '../../components/Layout'
import { supabase } from '../../lib/supabaseClient'
import { Card } from '../../components/ui'
import { useAuth } from '../../context/AuthContext'
import { MEMBERSHIP_CATEGORIES } from '../../data/membershipCategories'
import { formatUGX } from '../../lib/format'

export default function AdminDashboard() {
  const { isAdmin, isCategoryAdmin, managedCategory } = useAuth()
  const [stats, setStats] = useState(null)
  const [byCategory, setByCategory] = useState(null)

  useEffect(() => {
    async function load() {
      const [{ count: memberCount }, { data: members }, { data: pendingPayments }, { data: verifiedPayments }] =
        await Promise.all([
          supabase.from('members').select('*', { count: 'exact', head: true }),
          supabase.from('members').select('district, category'),
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

      // Full-admin-only breakdown: members and verified totals per category.
      if (isAdmin) {
        const { data: verifiedWithCategory } = await supabase
          .from('payments')
          .select('amount, members(category)')
          .eq('status', 'verified')

        const counts = {}
        for (const m of members || []) {
          counts[m.category] = (counts[m.category] || 0) + 1
        }
        const totals = {}
        for (const p of verifiedWithCategory || []) {
          const cat = p.members?.category
          if (!cat) continue
          totals[cat] = (totals[cat] || 0) + Number(p.amount)
        }
        setByCategory(
          MEMBERSHIP_CATEGORIES.map(c => ({
            category: c.category,
            count: counts[c.category] || 0,
            verifiedTotal: totals[c.category] || 0,
          }))
        )
      }
    }
    load()
  }, [isAdmin])

  return (
    <Layout area="admin">
      <h1 className="font-display font-bold text-2xl mb-1">Overview</h1>
      <p className="text-ink/60 mb-8">
        {isCategoryAdmin
          ? `Real-time totals for your category — "${managedCategory}".`
          : 'Real-time totals across every district.'}
      </p>

      {!stats ? (
        <p className="text-ink/50">Loading…</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          <StatCard label="Registered Members" value={stats.memberCount} />
          <StatCard label="Districts Represented" value={stats.districtCount} />
          <StatCard label="Payments Awaiting Verification" value={stats.pendingCount} accent />
          <StatCard label="Total Verified Payments" value={formatUGX(stats.totalVerified)} />
        </div>
      )}

      {isAdmin && byCategory && (
        <>
          <h2 className="font-display font-bold text-lg mb-3">Members &amp; Verified Income by Category</h2>
          <Card className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-khaki/60 bg-canvas-2">
                  <th className="px-4 py-3 font-semibold text-ink/70">Category</th>
                  <th className="px-4 py-3 font-semibold text-ink/70">Members</th>
                  <th className="px-4 py-3 font-semibold text-ink/70">Verified Income</th>
                </tr>
              </thead>
              <tbody>
                {byCategory.map(row => (
                  <tr key={row.category} className="border-b border-khaki/30 last:border-0">
                    <td className="px-4 py-3">{row.category}</td>
                    <td className="px-4 py-3">{row.count}</td>
                    <td className="px-4 py-3">{formatUGX(row.verifiedTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
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
