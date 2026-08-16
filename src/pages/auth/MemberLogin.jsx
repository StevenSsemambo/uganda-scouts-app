import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { friendlyAuthError, friendlyError } from '../../lib/friendlyError'
import { isValidUsername, usernameToEmail, sanitizeUsername, suggestUsernameFromName } from '../../lib/username'
import { MEMBERSHIP_CATEGORIES, categoryFee } from '../../data/membershipCategories'
import { Button, Card, Field, Input, Select, DistrictInput } from '../../components/ui'
import { formatUGX } from '../../lib/format'
import BankDetailsCard from '../../components/BankDetailsCard'

// Members sign up and log in with just a username + password — no email
// required. Behind the scenes this uses Supabase's normal email auth
// with a deterministic synthetic address derived from the username; the
// member never sees or types that address.
//
// Signup used to be two separate screens (create an account, then a
// second "complete your registration" page asking for the name again
// plus category/district) -- the client flagged this as confusing for
// less tech-comfortable members. It's now one continuous form: name,
// category, district, username (auto-suggested from the name, editable),
// and a single password field with a show/hide toggle instead of a
// second "confirm password" field to retype. One submit creates the
// login AND the membership record together.
export default function MemberLogin() {
  const navigate = useNavigate()
  const [mode, setMode] = useState('login') // 'login' | 'signup'

  // --- login ---
  const [loginUsername, setLoginUsername] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loginBusy, setLoginBusy] = useState(false)
  const [showLoginPassword, setShowLoginPassword] = useState(false)

  // --- signup + registration, combined ---
  const [name, setName] = useState('')
  const [category, setCategory] = useState(MEMBERSHIP_CATEGORIES[0].category)
  const [district, setDistrict] = useState('')
  const [username, setUsername] = useState('')
  const [usernameTouched, setUsernameTouched] = useState(false)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [signupError, setSignupError] = useState('')
  const [signupBusy, setSignupBusy] = useState(false)

  const selectedFee = categoryFee(category)

  function handleNameChange(value) {
    setName(value)
    // Keep auto-suggesting from the name right up until they actually
    // type into the username field themselves -- then leave it alone.
    if (!usernameTouched) setUsername(suggestUsernameFromName(value))
  }

  function handleUsernameChange(value) {
    setUsernameTouched(true)
    setUsername(sanitizeUsername(value))
  }

  async function handleLogin(e) {
    e.preventDefault()
    setLoginError('')
    if (!isValidUsername(loginUsername)) {
      setLoginError('Enter your username to sign in.')
      return
    }
    setLoginBusy(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: usernameToEmail(loginUsername),
        password: loginPassword,
      })
      if (error) throw error

      // A member promoted to District Admin (or full Admin) still uses
      // this same login page and the same credentials -- there's no
      // separate admin login they'd know to use instead. Without this
      // check they'd land on /member every time regardless of their
      // actual role, with no obvious way to reach their real dashboard.
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .maybeSingle()

      if (profile?.role === 'admin' || profile?.role === 'district_admin') {
        navigate('/admin', { replace: true })
      } else {
        navigate('/member', { replace: true })
      }
    } catch (err) {
      console.error('Login failed:', err)
      setLoginError(friendlyAuthError(err))
    } finally {
      setLoginBusy(false)
    }
  }

  async function handleSignup(e) {
    e.preventDefault()
    setSignupError('')
    if (!name.trim()) {
      setSignupError('Enter your full name.')
      return
    }
    if (!district.trim()) {
      setSignupError('Enter your district.')
      return
    }
    if (!isValidUsername(username)) {
      setSignupError('Username needs to be at least 3 characters — letters, numbers, and underscores only.')
      return
    }
    if (password.length < 6) {
      setSignupError('Password must be at least 6 characters.')
      return
    }
    setSignupBusy(true)
    try {
      const { data, error } = await supabase.auth.signUp({
        email: usernameToEmail(username),
        password,
        options: {
          data: { name: name.trim(), username, role: 'member', has_password: true },
        },
      })
      if (error) throw error

      const year = new Date().getFullYear()
      const { error: memberError } = await supabase.from('members').insert({
        user_id: data.user.id,
        full_name: name.trim(),
        category,
        membership_type: selectedFee.membership_type,
        district: district.trim(),
        amount: selectedFee.amount,
        year,
      })
      // The account itself was created successfully even if this second
      // step fails -- don't strand them on an error with no way forward.
      // MemberDashboard already has a fallback for exactly this: if they
      // land on /member with an account but no membership record yet,
      // it shows CompleteRegistration to finish just that part.
      if (memberError) {
        console.error('Account created but membership record failed:', memberError)
        navigate('/member', { replace: true })
        return
      }

      navigate('/member/payments', {
        state: {
          prefillAmount: selectedFee.amount,
          prefillPurpose: selectedFee.membership_type === 'Life' ? 'Life Membership Fee' : 'Registration Fee',
          justRegistered: true,
        },
      })
    } catch (err) {
      console.error('Signup failed:', err)
      setSignupError(friendlyError(err, friendlyAuthError(err)))
    } finally {
      setSignupBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center px-6 py-12">
      <Card className="w-full max-w-sm">
        <Link to="/" className="text-sm text-forest font-medium hover:underline inline-flex items-center gap-1 mb-4">
          <span aria-hidden="true">←</span> Back to Home
        </Link>
        <h1 className="font-display font-bold text-xl mb-1">
          {mode === 'login' ? 'Member Login' : 'Join the Association'}
        </h1>

        {mode === 'login' ? (
          <>
            <p className="text-sm text-ink/60 mb-6">Sign in with your username and password.</p>
            <form onSubmit={handleLogin}>
              <Field label="Username">
                <Input
                  value={loginUsername}
                  onChange={e => setLoginUsername(e.target.value.toLowerCase())}
                  required
                  placeholder="e.g. nakatosarah"
                  autoCapitalize="none"
                  autoComplete="username"
                  name="username"
                />
              </Field>
              <Field label="Password">
                <div className="flex gap-2">
                  <Input
                    type={showLoginPassword ? 'text' : 'password'}
                    value={loginPassword}
                    onChange={e => setLoginPassword(e.target.value)}
                    required
                    className="flex-1"
                    autoComplete="current-password"
                    name="password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(s => !s)}
                    className="text-xs text-ink/50 shrink-0 px-2"
                  >
                    {showLoginPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </Field>
              {loginError && <p className="text-clay text-sm mb-3">{loginError}</p>}
              <Button type="submit" className="w-full" disabled={loginBusy}>
                {loginBusy ? 'Signing in…' : 'Login'}
              </Button>
            </form>
            <p className="text-xs text-ink/50 text-center mt-4">
              Forgotten your password? Ask your Association admin to set a new one for you.
            </p>
            <button
              type="button"
              className="text-sm text-forest underline mt-3 block mx-auto"
              onClick={() => { setMode('signup'); setLoginError('') }}
            >
              New here? Join now
            </button>
          </>
        ) : (
          <>
            <p className="text-sm text-ink/60 mb-6">
              A few details and you're set — your fee is worked out automatically.
            </p>
            <form onSubmit={handleSignup}>
              <Field label="Full Name">
                <Input value={name} onChange={e => handleNameChange(e.target.value)} required placeholder="e.g. Nakato Sarah" autoComplete="name" />
              </Field>
              <Field label="Category" hint="Your fee is set automatically from this.">
                <Select value={category} onChange={e => setCategory(e.target.value)}>
                  {MEMBERSHIP_CATEGORIES.map(c => (
                    <option key={c.category} value={c.category}>{c.category}</option>
                  ))}
                </Select>
              </Field>
              <Field label="District">
                <DistrictInput value={district} onChange={e => setDistrict(e.target.value)} required />
              </Field>

              <div className="bg-canvas-2 rounded-lg p-4 mb-5 flex items-center justify-between">
                <div>
                  <div className="text-xs text-ink/50">Membership Type</div>
                  <div className="font-medium">{selectedFee.membership_type}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-ink/50">Fee Due</div>
                  <div className="font-display font-bold text-lg text-forest">{formatUGX(selectedFee.amount)}</div>
                </div>
              </div>

              <Field label="Username" hint="We've suggested one from your name — change it if you'd like.">
                <Input
                  value={username}
                  onChange={e => handleUsernameChange(e.target.value)}
                  required
                  placeholder="e.g. nakatosarah"
                  autoCapitalize="none"
                  autoComplete="username"
                  name="username"
                />
              </Field>
              <Field label="Password" hint="At least 6 characters.">
                <div className="flex gap-2">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="flex-1"
                    autoComplete="new-password"
                    name="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(s => !s)}
                    className="text-xs text-ink/50 shrink-0 px-2"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </Field>

              {signupError && <p className="text-clay text-sm mb-3">{signupError}</p>}
              <Button type="submit" className="w-full" disabled={signupBusy}>
                {signupBusy ? 'Setting up your account…' : 'Join & Register'}
              </Button>
            </form>

            <div className="mt-5">
              <BankDetailsCard />
            </div>

            <button
              type="button"
              className="text-sm text-forest underline mt-4 block mx-auto"
              onClick={() => { setMode('login'); setSignupError('') }}
            >
              Already have an account? Login
            </button>
          </>
        )}
      </Card>
    </div>
  )
}
