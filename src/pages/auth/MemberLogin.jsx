import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { friendlyAuthError } from '../../lib/friendlyError'
import { isValidUsername, usernameToEmail } from '../../lib/username'
import { Button, Card, Field, Input } from '../../components/ui'

// Members sign up and log in with just Name + Username + Password — no
// email required. Behind the scenes this uses Supabase's normal email
// auth with a deterministic synthetic address derived from the
// username; the member never sees or types that address.
export default function MemberLogin() {
  const navigate = useNavigate()
  const [mode, setMode] = useState('login') // 'login' | 'signup'

  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    setError('')
    if (!isValidUsername(username)) {
      setError('Enter your username to sign in.')
      return
    }
    setBusy(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: usernameToEmail(username),
        password,
      })
      if (error) throw error
      navigate('/member', { replace: true })
    } catch (err) {
      console.error('Login failed:', err)
      setError(friendlyAuthError(err))
    } finally {
      setBusy(false)
    }
  }

  async function handleSignup(e) {
    e.preventDefault()
    setError('')
    if (!isValidUsername(username)) {
      setError('Username must be 3-20 characters: lowercase letters, numbers, and underscores only.')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (password !== confirm) {
      setError("Passwords don't match.")
      return
    }
    setBusy(true)
    try {
      const { error } = await supabase.auth.signUp({
        email: usernameToEmail(username),
        password,
        options: {
          data: { name, username, role: 'member', has_password: true },
        },
      })
      if (error) throw error
      navigate('/member', { replace: true })
    } catch (err) {
      console.error('Signup failed:', err)
      setError(friendlyAuthError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center px-6">
      <Card className="w-full max-w-sm">
        <Link to="/" className="text-sm text-forest font-medium hover:underline inline-flex items-center gap-1 mb-4">
          <span aria-hidden="true">←</span> Back to Home
        </Link>
        <h1 className="font-display font-bold text-xl mb-1">
          {mode === 'login' ? 'Member Login' : 'Create Your Account'}
        </h1>

        {mode === 'login' ? (
          <>
            <p className="text-sm text-ink/60 mb-6">Sign in with your username and password.</p>
            <form onSubmit={handleLogin}>
              <Field label="Username">
                <Input
                  value={username}
                  onChange={e => setUsername(e.target.value.toLowerCase())}
                  required
                  placeholder="e.g. nakatosarah"
                  autoCapitalize="none"
                />
              </Field>
              <Field label="Password">
                <Input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
              </Field>
              {error && <p className="text-clay text-sm mb-3">{error}</p>}
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? 'Signing in…' : 'Login'}
              </Button>
            </form>
            <p className="text-xs text-ink/50 text-center mt-4">
              Forgotten your password? Ask your Association admin to set a new one for you.
            </p>
            <button
              type="button"
              className="text-sm text-forest underline mt-3 block mx-auto"
              onClick={() => { setMode('signup'); setError('') }}
            >
              New here? Create an account
            </button>
          </>
        ) : (
          <>
            <p className="text-sm text-ink/60 mb-6">
              Choose a username and password — no email needed.
            </p>
            <form onSubmit={handleSignup}>
              <Field label="Full Name">
                <Input value={name} onChange={e => setName(e.target.value)} required placeholder="e.g. Nakato Sarah" />
              </Field>
              <Field label="Username" hint="Lowercase letters, numbers, and underscores only.">
                <Input
                  value={username}
                  onChange={e => setUsername(e.target.value.toLowerCase())}
                  required
                  placeholder="e.g. nakatosarah"
                  autoCapitalize="none"
                />
              </Field>
              <Field label="Password">
                <Input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
              </Field>
              <Field label="Confirm Password">
                <Input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required minLength={6} />
              </Field>
              {error && <p className="text-clay text-sm mb-3">{error}</p>}
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? 'Creating account…' : 'Create Account'}
              </Button>
            </form>
            <button
              type="button"
              className="text-sm text-forest underline mt-4 block mx-auto"
              onClick={() => { setMode('login'); setError('') }}
            >
              Already have an account? Login
            </button>
          </>
        )}
      </Card>
    </div>
  )
}
