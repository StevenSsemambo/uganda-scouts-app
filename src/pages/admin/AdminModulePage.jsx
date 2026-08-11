import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import Layout from '../../components/Layout'
import { supabase } from '../../lib/supabaseClient'
import { MODULES } from '../../data/modules'
import { Button, Card, EmptyState } from '../../components/ui'
import { downloadCSV } from '../../lib/csv'
import { formatUGX } from '../../lib/format'

export default function AdminModulePage() {
  const { moduleKey } = useParams()
  const mod = MODULES[moduleKey]
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  async function load() {
    if (!mod) return
    setLoading(true)
    const { data } = await supabase
      .from(mod.table)
      .select('*')
      .order('created_at', { ascending: false })
    setRows(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [moduleKey])

  async function handleDelete(id) {
    if (!confirm('Remove this record?')) return
    await supabase.from(mod.table).delete().eq('id', id)
    load()
  }

  function exportCSV() {
    downloadCSV(`${mod.table}.csv`, rows.map(({ id, submitted_by, ...rest }) => rest))
  }

  if (!mod) {
    return <Layout area="admin"><EmptyState title="Unknown module" /></Layout>
  }

  const columns = mod.fields.map(f => f.key)

  return (
    <Layout area="admin">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="font-display font-bold text-2xl mb-1">{mod.label}</h1>
          <p className="text-ink/60">{rows.length} record{rows.length === 1 ? '' : 's'} submitted so far.</p>
        </div>
        <Button onClick={exportCSV}>Download CSV</Button>
      </div>

      {loading ? (
        <p className="text-ink/50">Loading…</p>
      ) : rows.length === 0 ? (
        <EmptyState title={`No ${mod.label.toLowerCase()} yet`} hint="Records members submit will appear here." />
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-khaki/60 bg-canvas-2">
                {mod.fields.map(f => <th key={f.key} className="px-4 py-3 font-semibold text-ink/70">{f.label}</th>)}
                <th className="px-4 py-3 font-semibold text-ink/70">Year</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.id} className="border-b border-khaki/30 last:border-0">
                  {columns.map(col => (
                    <td key={col} className="px-4 py-3">
                      {col === 'amount' ? formatUGX(row[col]) : (row[col] ?? '—')}
                    </td>
                  ))}
                  <td className="px-4 py-3">{row.year}</td>
                  <td className="px-4 py-3 text-right">
                    <button className="text-clay text-xs font-medium hover:underline" onClick={() => handleDelete(row.id)}>
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </Layout>
  )
}
