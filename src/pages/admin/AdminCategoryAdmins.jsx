import { useEffect, useState } from 'react'
import Layout from '../../components/Layout'
import { supabase } from '../../lib/supabaseClient'
import { MEMBERSHIP_CATEGORIES } from '../../data/membershipCategories'
import { Button, Card, Field, Input, Select, EmptyState } from '../../components/ui'
import { friendlyError } from '../../lib/friendlyError'

// Full-admin-only page for promoting an existing registered account
// (member or otherwise) into a Category Admin scoped to one membership
// category, or demoting one back to an ordinary member.
export default function AdminCategoryAdmins() {
  const [categoryAdmins, setCategoryAdmins] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [username, setUsername] = useState('')
  const [category, setCategory] = useState(MEMBERSHIP_CATEGORIES[0].category)
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
        .eq('role', 'category_admin')
        .order('managed_category')
      if (error) throw error
      setCategoryAdmins(data || [])
    } catch (err) {
      console.error('Failed to load Category Admins:', err)
      setLoadError(friendlyError(err, 'Could not load Category Admins.'))
      setCategoryAdmins([])
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
        .update({ role: 'category_admin', managed_category: category })
        .eq('id', found.id)
      if (updateError) throw updateError

      setStatus(`${found.name} (@${found.username}) is now Category Admin for "${category}".`)
      setUsername('')
      await load()
    } catch (err) {
      console.error('Failed to promote account:', err)
      setError(friendlyError(err, "Couldn't complete that action."))
    } finally {
      setBusy(false)
    }
  }

  async function demote(id) {
    if (!confirm('Remove Category Admin access for this account? They will become a regular member again.')) return
    setDemoteBusyId(id)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: 'member', managed_category: null })
        .eq('id', id)
      if (error) throw error
      await load()
    } catch (err) {
      console.error('Failed to remove Category Admin access:', err)
      setError(friendlyError(err, "Couldn't remove access."))
    } finally {
      setDemoteBusyId(null)
    }
  }

  return (
    <Layout area="admin">
      <h1 className="font-display font-bold text-2xl mb-1">Category Admins</h1>
      <p className="text-ink/60 mb-6">
        A Category Admin can view and manage members — and verify payments — only within the one
        category they're assigned to (e.g. "Scout Leaders"). They sign in the same way members do.
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
          <Field label="Category to Manage">
            <Select value={category} onChange={e => setCategory(e.target.value)}>
              {MEMBERSHIP_CATEGORIES.map(c => <option key={c.category} value={c.category}>{c.category}</option>)}
            </Select>
          </Field>
          {error && <p className="text-clay text-sm mb-3">{error}</p>}
          {status && <p className="text-moss text-sm mb-3">{status}</p>}
          <Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Make Category Admin'}</Button>
        </form>
      </Card>

      <h2 className="font-display font-semibold text-lg mb-3">Current Category Admins</h2>
      {loading ? (
        <p className="text-ink/50">Loading…</p>
      ) : loadError ? (
        <Card className="max-w-lg border-clay/50">
          <p className="text-sm text-clay mb-3">{loadError}</p>
          <Button variant="ghost" onClick={load}>Try Again</Button>
        </Card>
      ) : categoryAdmins.length === 0 ? (
        <EmptyState title="No Category Admins yet" hint="Promote someone using the form above." />
      ) : (
        <div className="space-y-3">
          {categoryAdmins.map(p => (
            <Card key={p.id} className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <div className="font-medium">{p.name}</div>
                <div className="text-sm text-ink/50">@{p.username} · manages "{p.managed_category}"</div>
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
