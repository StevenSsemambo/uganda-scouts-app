import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { Button, Card, Field, Input } from '../../components/ui'

// Passwordless member login: Name + Email -> Supabase emails a sign-in
// link -> clicking it signs the member in automatically (creating their
// account on first use). We use the link flow (not a typed code) because
// customizing the email template to reveal a typed OTP code requires a
// paid Supabase plan; the default link email works on every plan.
export default function MemberLogin() {
  const [sent, setSent] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

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
    if (error) { setError(error.message); return }
    setSent(true)
  }

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center px-6">
      <Card className="w-full max-w-sm">
        <h1 className="font-display font-bold text-xl mb-1">Member Login</h1>

        {!sent ? (
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
          </>
        ) : (
          <div>
            <p className="text-sm text-ink/70 mb-4">
              We've sent a sign-in link to <span className="font-medium">{email}</span>.
              Open your email on this device and tap the link to continue — it will
              bring you straight back here, signed in.
            </p>
            <p className="text-xs text-ink/50 mb-4">
              Don't see it? Check your spam folder, or make sure the email is correct.
            </p>
            <Button variant="ghost" className="w-full" onClick={() => setSent(false)}>
              Use a different email
            </Button>
          </div>
        )}
      </Card>
    </div>
  )
}
