import { useEffect, useState } from 'react'
import Layout from '../../components/Layout'
import { supabase } from '../../lib/supabaseClient'
import { MEMBERSHIP_CATEGORIES } from '../../data/membershipCategories'
import { Button, Card, Field, Input, Select, EmptyState } from '../../components/ui'

// Full-admin-only page for promoting an existing registered account
// (member or otherwise) into a Category Admin scoped to one membership
// category, or demoting one back to an ordinary member.
export default function AdminCategoryAdmins() {
  const [categoryAdmins, setCategoryAdmins] = useState([])
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [category, setCategory] = useState(MEMBERSHIP_CATEGORIES[0].category)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'category_admin')
      .order('managed_category')
    setCategoryAdmins(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function promote(e) {
    e.preventDefault()
    setError('')
    setStatus('')
    setBusy(true)

    const { data: found, error: findError } = await supabase
      .from('profiles')
      .select('id, name, email, role')
      .eq('email', email.trim())
      .maybeSingle()

    if (findError || !found) {
      setBusy(false)
      setError('No registered account found with that email. They need to sign up as a member first (via the normal member login), then you can promote them here.')
      return
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ role: 'category_admin', managed_category: category })
      .eq('id', found.id)

    setBusy(false)
    if (updateError) { setError(updateError.message); return }
    setStatus(`${found.name} (${found.email}) is now Category Admin for "${category}".`)
    setEmail('')
    load()
  }

  async function demote(id) {
    if (!confirm('Remove Category Admin access for this account? They will become a regular member again.')) return
    await supabase.from('profiles').update({ role: 'member', managed_category: null }).eq('id', id)
    load()
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
          <Field label="Their Email" hint="They must have already signed up once as a member.">
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="person@example.com" />
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
      ) : categoryAdmins.length === 0 ? (
        <EmptyState title="No Category Admins yet" hint="Promote someone using the form above." />
      ) : (
        <div className="space-y-3">
          {categoryAdmins.map(p => (
            <Card key={p.id} className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <div className="font-medium">{p.name}</div>
                <div className="text-sm text-ink/50">{p.email} · manages "{p.managed_category}"</div>
              </div>
              <Button variant="danger" onClick={() => demote(p.id)}>Remove Access</Button>
            </Card>
          ))}
        </div>
      )}
    </Layout>
  )
}
