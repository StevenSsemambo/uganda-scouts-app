import { useState } from 'react'
import Layout from '../../components/Layout'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'
import { Button, Card, Field, Input } from '../../components/ui'
import { friendlyError } from '../../lib/friendlyError'

// Lets any signed-in staff member (full Admin or Category Admin) change
// their own password. Since they're already authenticated, Supabase
// doesn't require re-entering the old password — same pattern as the
// member-side "set a password" flow.
export default function AdminAccount() {
  const { profile, user, isAdmin, isCategoryAdmin, managedCategory, refreshProfile } = useAuth()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setStatus('')
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
    if (password !== confirm) { setError("Passwords don't match."); return }

    setBusy(true)
    try {
      const { error: pwError } = await supabase.auth.updateUser({ password })
      if (pwError) throw pwError

      if (user) {
        await supabase.from('profiles').update({ has_password: true }).eq('id', user.id)
        await refreshProfile()
      }
      setStatus('Password updated successfully.')
      setPassword('')
      setConfirm('')
    } catch (err) {
      console.error('Failed to update password:', err)
      setError(friendlyError(err, "Couldn't update your password."))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Layout area="admin">
      <h1 className="font-display font-bold text-2xl mb-1">My Account</h1>
      <p className="text-ink/60 mb-6">
        {profile?.name} · @{profile?.username}
        {isAdmin && ' · Full Admin'}
        {isCategoryAdmin && ` · Category Admin (${managedCategory})`}
      </p>

      <Card className="max-w-md">
        <h2 className="font-display font-semibold mb-1">Change Password</h2>
        <p className="text-sm text-ink/60 mb-5">
          Update the password you use to sign in.
        </p>
        <form onSubmit={handleSubmit}>
          <Field label="New Password">
            <Input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
          </Field>
          <Field label="Confirm New Password">
            <Input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required minLength={6} />
          </Field>
          {error && <p className="text-clay text-sm mb-3">{error}</p>}
          {status && <p className="text-moss text-sm mb-3">{status}</p>}
          <Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Update Password'}</Button>
        </form>
      </Card>
    </Layout>
  )
}
