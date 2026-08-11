import { useEffect, useMemo, useState } from 'react'
import Layout from '../../components/Layout'
import { supabase } from '../../lib/supabaseClient'
import { DISTRICTS } from '../../data/districts'
import { Button, Card, Input, Select, EmptyState } from '../../components/ui'
import { formatUGX } from '../../lib/format'
import { downloadCSV } from '../../lib/csv'

export default function AdminMembers() {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [districtFilter, setDistrictFilter] = useState('')

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data } = await supabase
        .from('members')
        .select('*')
        .order('created_at', { ascending: false })
      setMembers(data || [])
      setLoading(false)
    }
    load()
  }, [])

  const filtered = useMemo(() => {
    return members.filter(m => {
      const matchesSearch = !search || m.full_name.toLowerCase().includes(search.toLowerCase()) || (m.member_code || '').toLowerCase().includes(search.toLowerCase())
      const matchesDistrict = !districtFilter || m.district === districtFilter
      return matchesSearch && matchesDistrict
    })
  }, [members, search, districtFilter])

  function exportCSV() {
    downloadCSV('members.csv', filtered.map(m => ({
      member_id: m.member_code,
      name: m.full_name,
      category: m.category,
      district: m.district,
      membership_type: m.membership_type,
      amount: m.amount,
      year: m.year,
      registered_on: m.created_at,
    })))
  }

  return (
    <Layout area="admin">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="font-display font-bold text-2xl mb-1">Members</h1>
          <p className="text-ink/60">{filtered.length} of {members.length} members shown.</p>
        </div>
        <Button onClick={exportCSV}>Download CSV</Button>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <Input
          placeholder="Search by name or member ID…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={districtFilter} onChange={e => setDistrictFilter(e.target.value)} className="max-w-xs">
          <option value="">All Districts</option>
          {DISTRICTS.map(d => <option key={d.code} value={d.name}>{d.name}</option>)}
        </Select>
      </div>

      {loading ? (
        <p className="text-ink/50">Loading…</p>
      ) : filtered.length === 0 ? (
        <EmptyState title="No members found" hint="Try a different search or filter." />
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-khaki/60 bg-canvas-2">
                <Th>Member ID</Th><Th>Name</Th><Th>Category</Th><Th>District</Th>
                <Th>Type</Th><Th>Amount</Th><Th>Year</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(m => (
                <tr key={m.id} className="border-b border-khaki/30 last:border-0">
                  <Td className="font-mono text-xs">{m.member_code}</Td>
                  <Td>{m.full_name}</Td>
                  <Td>{m.category}</Td>
                  <Td>{m.district}</Td>
                  <Td>{m.membership_type}</Td>
                  <Td>{formatUGX(m.amount)}</Td>
                  <Td>{m.year}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </Layout>
  )
}

function Th({ children }) { return <th className="px-4 py-3 font-semibold text-ink/70">{children}</th> }
function Td({ children, className = '' }) { return <td className={`px-4 py-3 ${className}`}>{children}</td> }
