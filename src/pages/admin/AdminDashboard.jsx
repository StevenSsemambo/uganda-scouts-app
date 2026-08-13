import { useEffect, useState } from 'react'
import Layout from '../../components/Layout'
import { supabase } from '../../lib/supabaseClient'
import { Button, Card } from '../../components/ui'
import { useAuth } from '../../context/AuthContext'
import { MEMBERSHIP_CATEGORIES } from '../../data/membershipCategories'
import { DISTRICTS } from '../../data/districts'
import { formatUGX } from '../../lib/format'
import { generateSummaryReportPDF } from '../../lib/summaryReport'

export default function AdminDashboard() {
  const { isAdmin, isCategoryAdmin, managedCategory, profile } = useAuth()
  const [stats, setStats] = useState(null)
  const [byCategory, setByCategory] = useState(null)
  const [byDistrict, setByDistrict] = useState(null)

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

      // Full-admin-only breakdowns: members and verified totals per
      // category and per district — also feeds the printable PDF summary.
      if (isAdmin) {
        const { data: verifiedWithBoth } = await supabase
          .from('payments')
          .select('amount, members(category, district)')
          .eq('status', 'verified')

        const catCounts = {}
        const distCounts = {}
        for (const m of members || []) {
          catCounts[m.category] = (catCounts[m.category] || 0) + 1
          distCounts[m.district] = (distCounts[m.district] || 0) + 1
        }
        const catTotals = {}
        const distTotals = {}
        for (const p of verifiedWithBoth || []) {
          const cat = p.members?.category
          const dist = p.members?.district
          if (cat) catTotals[cat] = (catTotals[cat] || 0) + Number(p.amount)
          if (dist) distTotals[dist] = (distTotals[dist] || 0) + Number(p.amount)
        }

        setByCategory(
          MEMBERSHIP_CATEGORIES.map(c => ({
            category: c.category,
            count: catCounts[c.category] || 0,
            verifiedTotal: catTotals[c.category] || 0,
          }))
        )

        // Only districts with at least one member, sorted by member count
        // — showing all ~130 official districts would mostly be zeros.
        setByDistrict(
          DISTRICTS
            .filter(d => distCounts[d.name] > 0)
            .map(d => ({
              district: d.name,
              count: distCounts[d.name] || 0,
              verifiedTotal: distTotals[d.name] || 0,
            }))
            .sort((a, b) => b.count - a.count)
        )
      }
    }
    load()
  }, [isAdmin])

  function downloadPDF() {
    if (!stats || !byCategory || !byDistrict) return
    generateSummaryReportPDF({
      stats,
      byCategory,
      byDistrict,
      generatedByName: profile?.name,
    })
  }

  return (
    <Layout area="admin">
      <div className="flex items-start justify-between flex-wrap gap-3 mb-1">
        <h1 className="font-display font-bold text-2xl">Overview</h1>
        {isAdmin && (
          <Button onClick={downloadPDF} disabled={!stats || !byCategory || !byDistrict}>
            Download PDF Summary
          </Button>
        )}
      </div>
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
        <div className="mb-10">
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
        </div>
      )}

      {isAdmin && byDistrict && (
        <>
          <h2 className="font-display font-bold text-lg mb-3">Members &amp; Verified Income by District</h2>
          <Card className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-khaki/60 bg-canvas-2">
                  <th className="px-4 py-3 font-semibold text-ink/70">District</th>
                  <th className="px-4 py-3 font-semibold text-ink/70">Members</th>
                  <th className="px-4 py-3 font-semibold text-ink/70">Verified Income</th>
                </tr>
              </thead>
              <tbody>
                {byDistrict.map(row => (
                  <tr key={row.district} className="border-b border-khaki/30 last:border-0">
                    <td className="px-4 py-3">{row.district}</td>
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
