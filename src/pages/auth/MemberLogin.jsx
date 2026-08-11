import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { Button, Card, Field, Input } from '../../components/ui'

// Passwordless member login: Name + Email -> a 6-digit code is emailed ->
// entering it signs the member in (creating their account on first use).
export default function MemberLogin() {
  const navigate = useNavigate()
  const [step, setStep] = useState('request') // 'request' | 'verify'
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function requestCode(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true, data: { name, role: 'member' } },
    })
    setBusy(false)
    if (error) { setError(error.message); return }
    setStep('verify')
  }

  async function verifyCode(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    const { error } = await supabase.auth.verifyOtp({ email, token: code, type: 'email' })
    setBusy(false)
    if (error) { setError(error.message); return }
    navigate('/member')
  }

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center px-6">
      <Card className="w-full max-w-sm">
        <h1 className="font-display font-bold text-xl mb-1">Member Login</h1>
        <p className="text-sm text-ink/60 mb-6">
          {step === 'request'
            ? 'Enter your name and email — we\'ll send you a one-time login code.'
            : `Enter the 6-digit code sent to ${email}.`}
        </p>

        {step === 'request' ? (
          <form onSubmit={requestCode}>
            <Field label="Full Name">
              <Input value={name} onChange={e => setName(e.target.value)} required placeholder="e.g. Nakato Sarah" />
            </Field>
            <Field label="Email">
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@example.com" />
            </Field>
            {error && <p className="text-clay text-sm mb-3">{error}</p>}
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? 'Sending code…' : 'Send Login Code'}
            </Button>
          </form>
        ) : (
          <form onSubmit={verifyCode}>
            <Field label="6-Digit Code">
              <Input value={code} onChange={e => setCode(e.target.value)} required maxLength={6} placeholder="123456" />
            </Field>
            {error && <p className="text-clay text-sm mb-3">{error}</p>}
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? 'Verifying…' : 'Verify & Continue'}
            </Button>
            <button
              type="button"
              className="text-sm text-forest underline mt-3 block mx-auto"
              onClick={() => setStep('request')}
            >
              Use a different email
            </button>
          </form>
        )}
      </Card>
    </div>
  )
}
