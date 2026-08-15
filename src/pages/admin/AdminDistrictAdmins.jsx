import { useEffect, useState } from 'react'
import Layout from '../../components/Layout'
import { supabase } from '../../lib/supabaseClient'
import { Button, Card, Field, Input, EmptyState } from '../../components/ui'
import { friendlyError } from '../../lib/friendlyError'

// Full-admin-only page for promoting an existing registered account
// (member or otherwise) into a District Admin scoped to one district.
// District Admin replaces the old Category Admin model: there is exactly
// one District Admin login per district (not per category, not two people
// each with their own login) — that one admin can share the credentials
// with a second person in the district if they want help, per the client's
// decision. The admin then collects data/money and submits it on behalf
// of members in that district.
export default function AdminDistrictAdmins() {
  const [districtAdmins, setDistrictAdmins] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [username, setUsername] = useState('')
  const [district, setDistrict] = useState('')
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const [demoteBusyId, setDemoteBusyId] = useState(null)

  async function load() {
    setLoading(true)
    setLoadError('')
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'district_admin')
        .order('managed_district')
      if (error) throw error
      setDistrictAdmins(data || [])
    } catch (err) {
      console.error('Failed to load District Admins:', err)
      setLoadError(friendlyError(err, 'Could not load District Admins.'))
      setDistrictAdmins([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function promote(e) {
    e.preventDefault()
    setError('')
    setStatus('')
    setBusy(true)
    try {
      const districtName = district.trim()
      if (!districtName) {
        setError('Enter the district name.')
        return
      }

      // One District Admin per district — surface a clear error instead of
      // silently creating a second admin that RLS would then treat as a
      // duplicate scope for the same district.
      const { data: existing, error: existingError } = await supabase
        .from('profiles')
        .select('id, name, username')
        .eq('role', 'district_admin')
        .eq('managed_district', districtName)
        .maybeSingle()
      if (existingError) throw existingError
      if (existing) {
        setError(`${existing.name} (@${existing.username}) is already the District Admin for "${districtName}". Remove their access first if you want to replace them.`)
        return
      }

      const { data: found, error: findError } = await supabase
        .from('profiles')
        .select('id, name, username, role')
        .eq('username', username.trim().toLowerCase())
        .maybeSingle()
      if (findError) throw findError
      if (!found) {
        setError('No registered account found with that username. They need to sign up as a member first, then you can promote them here.')
        return
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ role: 'district_admin', managed_district: districtName })
        .eq('id', found.id)
      if (updateError) throw updateError

      setStatus(`${found.name} (@${found.username}) is now District Admin for "${districtName}".`)
      setUsername('')
      setDistrict('')
      await load()
    } catch (err) {
      console.error('Failed to promote account:', err)
      setError(friendlyError(err, "Couldn't complete that action."))
    } finally {
      setBusy(false)
    }
  }

  async function demote(id) {
    if (!confirm('Remove District Admin access for this account? They will become a regular member again.')) return
    setDemoteBusyId(id)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: 'member', managed_district: null })
        .eq('id', id)
      if (error) throw error
      await load()
    } catch (err) {
      console.error('Failed to remove District Admin access:', err)
      setError(friendlyError(err, "Couldn't remove access."))
    } finally {
      setDemoteBusyId(null)
    }
  }

  return (
    <Layout area="admin">
      <h1 className="font-display font-bold text-2xl mb-1">District Admins</h1>
      <p className="text-ink/60 mb-6">
        A District Admin can view and manage members, submit records, and verify payments — only
        within the one district they're assigned to. They can log in and enter data on behalf of
        scouts from that district. Each district has exactly one District Admin login; the admin
        can share their credentials with someone else helping them if needed.
      </p>

      <Card className="max-w-lg mb-8">
        <h2 className="font-display font-semibold mb-4">Promote a Registered Account</h2>
        <form onSubmit={promote}>
          <Field label="Their Username" hint="They must have already signed up once as a member.">
            <Input
              value={username}
              onChange={e => setUsername(e.target.value.toLowerCase())}
              required
              placeholder="e.g. nakatosarah"
              autoCapitalize="none"
            />
          </Field>
          <Field label="District to Manage" hint="Type the district name as it should appear on records.">
            <Input
              value={district}
              onChange={e => setDistrict(e.target.value)}
              required
              placeholder="e.g. Jinja"
            />
          </Field>
          {error && <p className="text-clay text-sm mb-3">{error}</p>}
          {status && <p className="text-moss text-sm mb-3">{status}</p>}
          <Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Make District Admin'}</Button>
        </form>
      </Card>

      <h2 className="font-display font-semibold text-lg mb-3">Current District Admins</h2>
      {loading ? (
        <p className="text-ink/50">Loading…</p>
      ) : loadError ? (
        <Card className="max-w-lg border-clay/50">
          <p className="text-sm text-clay mb-3">{loadError}</p>
          <Button variant="ghost" onClick={load}>Try Again</Button>
        </Card>
      ) : districtAdmins.length === 0 ? (
        <EmptyState title="No District Admins yet" hint="Promote someone using the form above." />
      ) : (
        <div className="space-y-3">
          {districtAdmins.map(p => (
            <Card key={p.id} className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <div className="font-medium">{p.name}</div>
                <div className="text-sm text-ink/50">@{p.username} · manages "{p.managed_district}"</div>
              </div>
              <Button variant="danger" disabled={demoteBusyId === p.id} onClick={() => demote(p.id)}>
                {demoteBusyId === p.id ? 'Removing…' : 'Remove Access'}
              </Button>
            </Card>
          ))}
        </div>
      )}
    </Layout>
  )
}
