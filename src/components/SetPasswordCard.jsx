import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { Button, Card, Field, Input } from './ui'

// Shown to a signed-in member who hasn't set a password yet. Since they're
// already authenticated (via the emailed link), we can attach a password
// to their account right here — no email step needed. After this, they
// can log in directly with email + password instead of requesting a new
// link every time.
export default function SetPasswordCard() {
  const { refreshProfile, user } = useAuth()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
    if (password !== confirm) { setError("Passwords don't match."); return }

    setBusy(true)
    const { error: pwError } = await supabase.auth.updateUser({ password })
    if (pwError) { setBusy(false); setError(pwError.message); return }

    const { error: profileError } = await supabase
      .from('profiles')
      .update({ has_password: true })
      .eq('id', user.id)
    setBusy(false)
    if (profileError) { setError(profileError.message); return }

    setDone(true)
    refreshProfile()
  }

  if (done) return null

  return (
    <Card className="max-w-lg mb-8 border-ember/50 bg-ember-light/15">
      <h2 className="font-display font-semibold mb-1">Set a Password</h2>
      <p className="text-sm text-ink/60 mb-4">
        You signed in with an emailed link this time. Set a password now so you can log in
        directly with your email and password next time — no more waiting on email links.
      </p>
      <form onSubmit={handleSubmit}>
        <div className="grid sm:grid-cols-2 gap-3 mb-3">
          <Field label="New Password">
            <Input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
          </Field>
          <Field label="Confirm Password">
            <Input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required minLength={6} />
          </Field>
        </div>
        {error && <p className="text-clay text-sm mb-3">{error}</p>}
        <Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Set Password'}</Button>
      </form>
    </Card>
  )
}
