import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { friendlyAuthError } from '../../lib/friendlyError'
import { Button, Card, Field, Input } from '../../components/ui'

// Three ways in:
// - "Login" (default): normal email + password, for anyone who has
//   already set a password from their dashboard after their first visit.
// - "Get a login link": the original passwordless flow, for first-time
//   signups or anyone who hasn't set a password yet.
// - "Forgot password": emails a reset link for anyone who has a
//   password but can't remember it.
export default function MemberLogin() {
  const navigate = useNavigate()
  const [mode, setMode] = useState('password') // 'password' | 'link' | 'forgot'
  const [sent, setSent] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function loginWithPassword(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setBusy(false)
    if (error) {
      setError(friendlyAuthError(error))
      return
    }
    navigate('/member', { replace: true })
  }

  async function requestLink(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        data: { name, role: 'member' },
        emailRedirectTo: `${window.location.origin}/`,
      },
    })
    setBusy(false)
    if (error) { setError(friendlyAuthError(error)); return }
    setSent(true)
  }

  async function requestPasswordReset(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setBusy(false)
    if (error) { setError(friendlyAuthError(error)); return }
    setResetSent(true)
  }

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center px-6">
      <Card className="w-full max-w-sm">
        <Link to="/" className="text-sm text-forest font-medium hover:underline inline-flex items-center gap-1 mb-4">
          <span aria-hidden="true">←</span> Back to Home
        </Link>
        <h1 className="font-display font-bold text-xl mb-1">Member Login</h1>

        {mode === 'password' && (
          <>
            <p className="text-sm text-ink/60 mb-6">Sign in with your email and password.</p>
            <form onSubmit={loginWithPassword}>
              <Field label="Email">
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@example.com" />
              </Field>
              <Field label="Password">
                <Input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
              </Field>
              {error && <p className="text-clay text-sm mb-3">{error}</p>}
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? 'Signing in…' : 'Login'}
              </Button>
            </form>
            <div className="flex flex-col items-center gap-2 mt-4">
              <button
                type="button"
                className="text-sm text-forest underline"
                onClick={() => { setMode('link'); setError('') }}
              >
                New here, or haven't set a password? Get a login link
              </button>
              <button
                type="button"
                className="text-sm text-ink/50 underline"
                onClick={() => { setMode('forgot'); setError(''); setResetSent(false) }}
              >
                Forgot your password?
              </button>
            </div>
          </>
        )}

        {mode === 'link' && !sent && (
          <>
            <p className="text-sm text-ink/60 mb-6">
              Enter your name and email — we'll send you a link to sign in.
            </p>
            <form onSubmit={requestLink}>
              <Field label="Full Name">
                <Input value={name} onChange={e => setName(e.target.value)} required placeholder="e.g. Nakato Sarah" />
              </Field>
              <Field label="Email">
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@example.com" />
              </Field>
              {error && <p className="text-clay text-sm mb-3">{error}</p>}
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? 'Sending link…' : 'Send Login Link'}
              </Button>
            </form>
            <button
              type="button"
              className="text-sm text-forest underline mt-4 block mx-auto"
              onClick={() => { setMode('password'); setError('') }}
            >
              Already have a password? Login instead
            </button>
          </>
        )}

        {mode === 'link' && sent && (
          <div>
            <p className="text-sm text-ink/70 mb-4">
              We've sent a sign-in link to <span className="font-medium">{email}</span>.
              Open your email on this device and tap the link to continue — it will
              bring you straight back here, signed in.
            </p>
            <p className="text-xs text-ink/50 mb-4">
              Once you're in, set a password from your dashboard so you can log in directly next time.
            </p>
            <Button variant="ghost" className="w-full" onClick={() => setSent(false)}>
              Use a different email
            </Button>
          </div>
        )}

        {mode === 'forgot' && !resetSent && (
          <>
            <p className="text-sm text-ink/60 mb-6">
              Enter your email and we'll send you a link to set a new password.
            </p>
            <form onSubmit={requestPasswordReset}>
              <Field label="Email">
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@example.com" />
              </Field>
              {error && <p className="text-clay text-sm mb-3">{error}</p>}
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? 'Sending…' : 'Send Reset Link'}
              </Button>
            </form>
            <button
              type="button"
              className="text-sm text-forest underline mt-4 block mx-auto"
              onClick={() => { setMode('password'); setError('') }}
            >
              Back to Login
            </button>
          </>
        )}

        {mode === 'forgot' && resetSent && (
          <div>
            <p className="text-sm text-ink/70 mb-4">
              We've sent a password reset link to <span className="font-medium">{email}</span>.
              Open it on this device to set a new password.
            </p>
            <Button variant="ghost" className="w-full" onClick={() => { setMode('password'); setResetSent(false) }}>
              Back to Login
            </Button>
          </div>
        )}
      </Card>
    </div>
  )
}
