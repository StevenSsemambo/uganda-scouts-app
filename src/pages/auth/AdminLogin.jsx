import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { friendlyAuthError } from '../../lib/friendlyError'
import { Button, Card, Field, Input } from '../../components/ui'

export default function AdminLogin() {
  const navigate = useNavigate()
  const [mode, setMode] = useState('login') // 'login' | 'forgot'
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [resetSent, setResetSent] = useState(false)
  const [busy, setBusy] = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    // Admins sign in with their registered email + password. We accept
    // "Name" as the field label per the spec, but resolve the admin's
    // stored email from their profile name for convenience if an email
    // wasn't typed directly.
    const identifier = name.includes('@') ? name : null
    if (!identifier) {
      setBusy(false)
      setError('Please sign in using the admin email address registered by the Association.')
      return
    }
    const { data, error } = await supabase.auth.signInWithPassword({
      email: identifier,
      password,
    })
    setBusy(false)
    if (error) { setError(friendlyAuthError(error)); return }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single()

    if (profile?.role !== 'admin' && profile?.role !== 'category_admin') {
      await supabase.auth.signOut()
      setError('This account is not registered as an admin.')
      return
    }
    navigate('/admin', { replace: true })
  }

  async function handleForgotPassword(e) {
    e.preventDefault()
    setError('')
    if (!name.includes('@')) {
      setError('Enter your admin email address first.')
      return
    }
    setBusy(true)
    const { error } = await supabase.auth.resetPasswordForEmail(name, {
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
        <h1 className="font-display font-bold text-xl mb-1">Admin Login</h1>

        {mode === 'login' ? (
          <>
            <p className="text-sm text-ink/60 mb-6">Sign in with your registered admin email and password.</p>
            <form onSubmit={handleLogin}>
              <Field label="Admin Email" hint="Use the email your admin account was created with.">
                <Input value={name} onChange={e => setName(e.target.value)} required placeholder="admin@ugandascouts.org" />
              </Field>
              <Field label="Password">
                <Input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
              </Field>
              {error && <p className="text-clay text-sm mb-3">{error}</p>}
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? 'Signing in…' : 'Sign In'}
              </Button>
            </form>
            <button
              type="button"
              className="text-sm text-ink/50 underline mt-4 block mx-auto"
              onClick={() => { setMode('forgot'); setError(''); setResetSent(false) }}
            >
              Forgot your password?
            </button>
          </>
        ) : (
          <>
            <p className="text-sm text-ink/60 mb-6">
              {resetSent
                ? `We've sent a password reset link to ${name}. Open it on this device to set a new password.`
                : "Enter your admin email and we'll send you a link to set a new password."}
            </p>
            {!resetSent && (
              <form onSubmit={handleForgotPassword}>
                <Field label="Admin Email">
                  <Input value={name} onChange={e => setName(e.target.value)} required placeholder="admin@ugandascouts.org" />
                </Field>
                {error && <p className="text-clay text-sm mb-3">{error}</p>}
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? 'Sending…' : 'Send Reset Link'}
                </Button>
              </form>
            )}
            <button
              type="button"
              className="text-sm text-forest underline mt-4 block mx-auto"
              onClick={() => { setMode('login'); setError(''); setResetSent(false) }}
            >
              Back to Login
            </button>
          </>
        )}
      </Card>
    </div>
  )
}
