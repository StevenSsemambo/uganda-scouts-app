import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../../components/Layout'
import { useMember } from '../../lib/useMember'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'
import { MEMBERSHIP_CATEGORIES, categoryFee } from '../../data/membershipCategories'
import { Button, Card, Field, Input, Select, DistrictInput } from '../../components/ui'
import { formatUGX } from '../../lib/format'
import { friendlyError } from '../../lib/friendlyError'

export default function MemberProfile() {
  const { member, loading, error: loadError, reload } = useMember()
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState(null)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  useEffect(() => {
    if (member) setForm({ ...member })
  }, [member])

  // If the member's stored category doesn't match one of the official
  // labels (e.g. an older record from before the fee schedule was wired
  // in), fall back to showing the first category rather than crashing.
  const currentFee = form ? (categoryFee(form.category) || MEMBERSHIP_CATEGORIES[0]) : null

  function update(key, value) {
    setForm(f => ({ ...f, [key]: value }))
    setSaved(false)
  }

  function updateCategory(categoryLabel) {
    const fee = categoryFee(categoryLabel)
    setForm(f => ({
      ...f,
      category: categoryLabel,
      membership_type: fee.membership_type,
      amount: fee.amount,
    }))
    setSaved(false)
  }

  async function handleSave(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const { error } = await supabase
        .from('members')
        .update({
          full_name: form.full_name,
          category: form.category,
          membership_type: form.membership_type,
          district: form.district.trim(),
          amount: form.amount,
        })
        .eq('id', member.id)
      if (error) throw error
      setSaved(true)
      await reload()
    } catch (err) {
      console.error('Failed to save profile:', err)
      setError(friendlyError(err, "Couldn't save your changes."))
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete() {
    setDeleteError('')
    setDeleting(true)
    try {
      const { error } = await supabase.from('members').delete().eq('id', member.id)
      if (error) throw error
      await reload()
      navigate('/')
    } catch (err) {
      console.error('Failed to delete membership:', err)
      setDeleteError(friendlyError(err, "Couldn't delete your membership."))
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return <Layout area="member"><p className="text-ink/50">Loading…</p></Layout>
  }

  if (loadError || !form) {
    return (
      <Layout area="member">
        <Card className="max-w-lg border-clay/50">
          <p className="text-sm text-clay mb-3">{loadError || 'Could not load your information.'}</p>
          <Button variant="ghost" onClick={reload}>Try Again</Button>
        </Card>
      </Layout>
    )
  }

  return (
    <Layout area="member">
      <h1 className="font-display font-bold text-2xl mb-1">My Information</h1>
      <p className="text-ink/60 mb-6">
        Correct any mistakes in your details below. Your Member ID ({member.member_code}) stays the same.
      </p>
      <Card className="max-w-lg mb-8">
        <form onSubmit={handleSave}>
          <Field label="Full Name">
            <Input value={form.full_name} onChange={e => update('full_name', e.target.value)} required />
          </Field>
          <Field label="Category" hint="Changing category updates your membership type and fee automatically.">
            <Select value={currentFee.category} onChange={e => updateCategory(e.target.value)}>
              {MEMBERSHIP_CATEGORIES.map(c => (
                <option key={c.category} value={c.category}>{c.category}</option>
              ))}
            </Select>
          </Field>
          <Field label="District">
            <DistrictInput value={form.district} onChange={e => update('district', e.target.value)} required />
          </Field>

          <div className="bg-canvas-2 rounded-lg p-4 mb-5 flex items-center justify-between">
            <div>
              <div className="text-xs text-ink/50">Membership Type</div>
              <div className="font-medium">{form.membership_type}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-ink/50">Fee</div>
              <div className="font-display font-bold text-lg text-forest">{formatUGX(form.amount)}</div>
            </div>
          </div>

          {error && <p className="text-clay text-sm mb-3">{error}</p>}
          {saved && <p className="text-moss text-sm mb-3">Saved successfully.</p>}
          <Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save Changes'}</Button>
        </form>
      </Card>

      <Card className="max-w-lg border-clay/40">
        <h2 className="font-display font-semibold text-clay mb-2">Delete My Membership</h2>
        <p className="text-sm text-ink/60 mb-4">
          This permanently removes your membership record, Member ID, and any payments you've
          reported. Your login itself is not deleted — you could register again later if needed.
          This cannot be undone.
        </p>
        <Field label={`Type DELETE to confirm`}>
          <Input value={confirmText} onChange={e => setConfirmText(e.target.value)} placeholder="DELETE" />
        </Field>
        {deleteError && <p className="text-clay text-sm mb-3">{deleteError}</p>}
        <Button
          variant="danger"
          disabled={confirmText !== 'DELETE' || deleting}
          onClick={handleDelete}
        >
          {deleting ? 'Deleting…' : 'Permanently Delete My Membership'}
        </Button>
      </Card>
    </Layout>
  )
}
