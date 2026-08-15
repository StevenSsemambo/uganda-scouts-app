import { useEffect, useState, useCallback } from 'react'
import Layout from '../../components/Layout'
import { supabase } from '../../lib/supabaseClient'
import { Button, Card } from '../../components/ui'
import { useAuth } from '../../context/AuthContext'
import { MEMBERSHIP_CATEGORIES } from '../../data/membershipCategories'
import { formatUGX } from '../../lib/format'
import { generateSummaryReportPDF, generatePerDistrictReportPDF } from '../../lib/summaryReport'
import { friendlyError } from '../../lib/friendlyError'

export default function AdminDashboard() {
  const { isAdmin, isDistrictAdmin, managedDistrict, profile } = useAuth()
  const [stats, setStats] = useState(null)
  const [byCategory, setByCategory] = useState(null)
  const [byDistrict, setByDistrict] = useState(null)
  const [byDistrictSections, setByDistrictSections] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [pdfError, setPdfError] = useState('')

  const load = useCallback(async () => {
    setLoadError('')
    try {
      const [
        { count: memberCount, error: countError },
        { data: members, error: membersError },
        { data: pendingPayments, error: pendingError },
        { data: verifiedPayments, error: verifiedError },
      ] = await Promise.all([
        supabase.from('members').select('*', { count: 'exact', head: true }),
        supabase.from('members').select('district, category'),
        supabase.from('payments').select('id').eq('status', 'pending'),
        supabase.from('payments').select('amount').eq('status', 'verified'),
      ])
      if (countError) throw countError
      if (membersError) throw membersError
      if (pendingError) throw pendingError
      if (verifiedError) throw verifiedError

      const districtSet = new Set((members || []).map(m => m.district))
      const totalVerified = (verifiedPayments || []).reduce((sum, p) => sum + Number(p.amount), 0)

      setStats({
        memberCount: memberCount || 0,
        districtCount: districtSet.size,
        pendingCount: (pendingPayments || []).length,
        totalVerified,
      })

      // Members/payments breakdowns feed both the on-screen tables and the
      // printable PDF summary. A District Admin gets this too -- Row Level
      // Security already scopes both `members` and the payments join to
      // just their own district, so this naturally becomes "my district's
      // report" for them without any extra filtering here.
      if (isAdmin || isDistrictAdmin) {
        const { data: verifiedWithBoth, error: joinError } = await supabase
          .from('payments')
          .select('member_id, amount, members(category, district)')
          .eq('status', 'verified')
        if (joinError) throw joinError

        const catCounts = {}
        const distCounts = {}
        for (const m of members || []) {
          catCounts[m.category] = (catCounts[m.category] || 0) + 1
          distCounts[m.district] = (distCounts[m.district] || 0) + 1
        }
        const catTotals = {}
        const distTotals = {}
        // Distinct members with at least one verified payment, per category
        // and per district — for school categories this is literally "how
        // many schools have paid", since each school registers as one member.
        const catPaidMembers = {}
        const distPaidMembers = {}
        for (const p of verifiedWithBoth || []) {
          const cat = p.members?.category
          const dist = p.members?.district
          if (cat) {
            catTotals[cat] = (catTotals[cat] || 0) + Number(p.amount)
            if (!catPaidMembers[cat]) catPaidMembers[cat] = new Set()
            catPaidMembers[cat].add(p.member_id)
          }
          if (dist) {
            distTotals[dist] = (distTotals[dist] || 0) + Number(p.amount)
            if (!distPaidMembers[dist]) distPaidMembers[dist] = new Set()
            distPaidMembers[dist].add(p.member_id)
          }
        }

        setByCategory(
          MEMBERSHIP_CATEGORIES.map(c => ({
            category: c.category,
            count: catCounts[c.category] || 0,
            paidCount: catPaidMembers[c.category]?.size || 0,
            verifiedTotal: catTotals[c.category] || 0,
          }))
        )

        // Only districts that actually appear in the data, sorted by member
        // count. District is free text now, so this is derived from what
        // people typed rather than a fixed ~130-item official list.
        const districtList = Object.keys(distCounts)
          .filter(d => distCounts[d] > 0)
          .map(d => ({
            district: d,
            count: distCounts[d] || 0,
            paidCount: distPaidMembers[d]?.size || 0,
            verifiedTotal: distTotals[d] || 0,
          }))
          .sort((a, b) => a.district.localeCompare(b.district))

        setByDistrict([...districtList].sort((a, b) => b.count - a.count))

        // For the full admin's per-district sectioned report: the same
        // category breakdown as above, but computed separately within
        // each district, so each district's section is self-contained --
        // exactly what a district admin would print for just their own
        // district, stacked one after another in one PDF.
        if (isAdmin) {
          const catCountsByDistrict = {}
          const catTotalsByDistrict = {}
          const catPaidByDistrict = {}
          for (const m of members || []) {
            if (!catCountsByDistrict[m.district]) catCountsByDistrict[m.district] = {}
            catCountsByDistrict[m.district][m.category] = (catCountsByDistrict[m.district][m.category] || 0) + 1
          }
          for (const p of verifiedWithBoth || []) {
            const cat = p.members?.category
            const dist = p.members?.district
            if (!cat || !dist) continue
            if (!catTotalsByDistrict[dist]) catTotalsByDistrict[dist] = {}
            if (!catPaidByDistrict[dist]) catPaidByDistrict[dist] = {}
            catTotalsByDistrict[dist][cat] = (catTotalsByDistrict[dist][cat] || 0) + Number(p.amount)
            if (!catPaidByDistrict[dist][cat]) catPaidByDistrict[dist][cat] = new Set()
            catPaidByDistrict[dist][cat].add(p.member_id)
          }

          setByDistrictSections(
            districtList.map(d => ({
              district: d.district,
              count: d.count,
              verifiedTotal: d.verifiedTotal,
              categories: MEMBERSHIP_CATEGORIES
                .map(c => ({
                  category: c.category,
                  count: catCountsByDistrict[d.district]?.[c.category] || 0,
                  paidCount: catPaidByDistrict[d.district]?.[c.category]?.size || 0,
                  verifiedTotal: catTotalsByDistrict[d.district]?.[c.category] || 0,
                }))
                .filter(c => c.count > 0), // skip categories nobody in this district registered under
            }))
          )
        }
      }
    } catch (err) {
      console.error('Failed to load dashboard stats:', err)
      setLoadError(friendlyError(err, 'Could not load the overview.'))
    }
  }, [isAdmin, isDistrictAdmin])

  useEffect(() => { load() }, [load])

  function downloadPDF() {
    if (!stats || !byCategory) return
    setPdfError('')
    try {
      generateSummaryReportPDF({
        stats,
        byCategory,
        byDistrict: isAdmin ? byDistrict : null,
        scopeLabel: isDistrictAdmin ? `District Report — ${managedDistrict}` : 'All Districts',
        generatedByName: profile?.name,
      })
    } catch (err) {
      console.error('Failed to generate PDF summary:', err)
      setPdfError("Couldn't generate the PDF. Please try again.")
    }
  }

  function downloadPerDistrictPDF() {
    if (!stats || !byDistrictSections) return
    setPdfError('')
    try {
      generatePerDistrictReportPDF({
        stats,
        byDistrictSections,
        generatedByName: profile?.name,
      })
    } catch (err) {
      console.error('Failed to generate per-district PDF:', err)
      setPdfError("Couldn't generate the PDF. Please try again.")
    }
  }

  return (
    <Layout area="admin">
      <div className="flex items-start justify-between flex-wrap gap-3 mb-1">
        <h1 className="font-display font-bold text-2xl">Overview</h1>
        <div className="flex gap-3 flex-wrap">
          {(isAdmin || isDistrictAdmin) && (
            <Button onClick={downloadPDF} disabled={!stats || !byCategory}>
              Download PDF Summary
            </Button>
          )}
          {isAdmin && (
            <Button variant="secondary" onClick={downloadPerDistrictPDF} disabled={!stats || !byDistrictSections}>
              Download Per-District Report
            </Button>
          )}
        </div>
      </div>
      <p className="text-ink/60 mb-8">
        {isDistrictAdmin
          ? `Real-time totals for your district — "${managedDistrict}".`
          : 'Real-time totals across every district.'}
      </p>

      {pdfError && (
        <Card className="max-w-lg mb-6 border-clay/50">
          <p className="text-sm text-clay">{pdfError}</p>
        </Card>
      )}

      {loadError ? (
        <Card className="max-w-lg mb-8 border-clay/50">
          <p className="text-sm text-clay mb-3">{loadError}</p>
          <Button variant="ghost" onClick={load}>Try Again</Button>
        </Card>
      ) : !stats ? (
        <p className="text-ink/50">Loading…</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          <StatCard label="Registered Members" value={stats.memberCount} />
          <StatCard label="Districts Represented" value={stats.districtCount} />
          <StatCard label="Payments Awaiting Verification" value={stats.pendingCount} accent />
          <StatCard label="Total Verified Payments" value={formatUGX(stats.totalVerified)} />
        </div>
      )}

      {(isAdmin || isDistrictAdmin) && byCategory && (
        <div className="mb-10">
          <h2 className="font-display font-bold text-lg mb-3">
            {isDistrictAdmin ? `Members & Verified Income by Category — ${managedDistrict}` : 'Members & Verified Income by Category'}
          </h2>
          <Card className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-khaki/60 bg-canvas-2">
                  <th className="px-4 py-3 font-semibold text-ink/70">Category</th>
                  <th className="px-4 py-3 font-semibold text-ink/70">Members</th>
                  <th className="px-4 py-3 font-semibold text-ink/70">Paid</th>
                  <th className="px-4 py-3 font-semibold text-ink/70">Verified Income</th>
                </tr>
              </thead>
              <tbody>
                {byCategory.map(row => (
                  <tr key={row.category} className="border-b border-khaki/30 last:border-0">
                    <td className="px-4 py-3">
                      {row.category}
                      {row.category.startsWith('Unit Registration') && (
                        <span className="block text-xs text-ink/40">{row.paidCount} school{row.paidCount === 1 ? '' : 's'} paid</span>
                      )}
                    </td>
                    <td className="px-4 py-3">{row.count}</td>
                    <td className="px-4 py-3">{row.paidCount}</td>
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
