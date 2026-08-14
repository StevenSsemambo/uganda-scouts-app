import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { friendlyAuthError } from '../../lib/friendlyError'
import { isValidUsername, usernameToEmail } from '../../lib/username'
import { Button, Card, Field, Input } from '../../components/ui'

export default function AdminLogin() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    setError('')
    if (!isValidUsername(username)) {
      setError('Enter your admin username to sign in.')
      return
    }
    setBusy(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: usernameToEmail(username),
        password,
      })
      if (error) throw error

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .maybeSingle()
      if (profileError) throw profileError

      if (profile?.role !== 'admin' && profile?.role !== 'category_admin') {
        await supabase.auth.signOut()
        setError('This account is not registered as an admin.')
        return
      }
      navigate('/admin', { replace: true })
    } catch (err) {
      console.error('Admin login failed:', err)
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
        <h1 className="font-display font-bold text-xl mb-1">Admin Login</h1>
        <p className="text-sm text-ink/60 mb-6">Sign in with your admin username and password.</p>
        <form onSubmit={handleLogin}>
          <Field label="Username">
            <Input
              value={username}
              onChange={e => setUsername(e.target.value.toLowerCase())}
              required
              placeholder="admin"
              autoCapitalize="none"
            />
          </Field>
          <Field label="Password">
            <Input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          </Field>
          {error && <p className="text-clay text-sm mb-3">{error}</p>}
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign In'}
          </Button>
        </form>
        <p className="text-xs text-ink/50 text-center mt-4">
          Forgotten your password? Another admin can set a new one for you from the Members page.
        </p>
      </Card>
    </div>
  )
}
