import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'
import { friendlyAuthError } from '../../lib/friendlyError'
import { Button, Card, Field, Input } from '../../components/ui'

// Landed on after clicking a password-reset email link (either
// self-requested, or sent by an admin on a member's behalf). Supabase
// auto-establishes a temporary "recovery" session from the link, which
// is enough to call updateUser({ password }) without needing the old one.
export default function ResetPassword() {
  const navigate = useNavigate()
  const { user, refreshProfile } = useAuth()
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
    if (pwError) { setBusy(false); setError(friendlyAuthError(pwError)); return }

    if (user) {
      await supabase.from('profiles').update({ has_password: true }).eq('id', user.id)
      await refreshProfile()
    }
    setBusy(false)
    setDone(true)
  }

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center px-6">
      <Card className="w-full max-w-sm">
        <h1 className="font-display font-bold text-xl mb-1">Set a New Password</h1>

        {done ? (
          <>
            <p className="text-sm text-ink/70 mb-4">
              Your password has been updated. You can now log in with it directly.
            </p>
            <Button className="w-full" onClick={() => navigate('/member/login', { replace: true })}>
              Go to Login
            </Button>
          </>
        ) : (
          <>
            <p className="text-sm text-ink/60 mb-6">Choose a new password for your account.</p>
            <form onSubmit={handleSubmit}>
              <Field label="New Password">
                <Input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
              </Field>
              <Field label="Confirm Password">
                <Input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required minLength={6} />
              </Field>
              {error && <p className="text-clay text-sm mb-3">{error}</p>}
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? 'Saving…' : 'Set Password'}
              </Button>
            </form>
          </>
        )}
      </Card>
    </div>
  )
}
